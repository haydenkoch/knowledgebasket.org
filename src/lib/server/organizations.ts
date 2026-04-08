import { and, desc, eq, ilike, inArray, isNotNull, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	events,
	funding,
	jobs,
	organizations,
	redPagesBusinesses,
	toolboxResources,
	venues
} from '$lib/server/db/schema';
import { stripHtml } from '$lib/utils/format';

export type OrganizationRow = typeof organizations.$inferSelect;
export type OrganizationInsert = typeof organizations.$inferInsert;

export type OrganizationMatchInput = {
	name?: string | null;
	website?: string | null;
	city?: string | null;
	state?: string | null;
	address?: string | null;
	limit?: number;
};

export type OrganizationMatchSuggestion = {
	organization: OrganizationRow;
	score: number;
	reasons: string[];
	usageCount: number;
};

export type OrganizationImpact = {
	organizationId: string;
	events: number;
	funding: number;
	jobs: number;
	redPages: number;
	toolbox: number;
	venues: number;
	total: number;
};

type OrganizationRowCompat = Omit<OrganizationRow, 'aliases'> & { aliases?: string[] | null };

const organizationSelectWithoutAliases = {
	id: organizations.id,
	slug: organizations.slug,
	name: organizations.name,
	description: organizations.description,
	website: organizations.website,
	email: organizations.email,
	phone: organizations.phone,
	logoUrl: organizations.logoUrl,
	orgType: organizations.orgType,
	orgTypes: organizations.orgTypes,
	region: organizations.region,
	address: organizations.address,
	city: organizations.city,
	state: organizations.state,
	zip: organizations.zip,
	lat: organizations.lat,
	lng: organizations.lng,
	tribalAffiliation: organizations.tribalAffiliation,
	tribalAffiliations: organizations.tribalAffiliations,
	socialLinks: organizations.socialLinks,
	verified: organizations.verified,
	verifiedAt: organizations.verifiedAt,
	verifiedById: organizations.verifiedById,
	verificationNotes: organizations.verificationNotes,
	createdAt: organizations.createdAt,
	updatedAt: organizations.updatedAt
};

const organizationSelectWithAliases = {
	...organizationSelectWithoutAliases,
	aliases: organizations.aliases
};

let hasOrganizationAliasesColumnPromise: Promise<boolean> | null = null;

function slugify(name: string): string {
	return (
		name
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '') || 'org'
	);
}

function normalizeText(value?: string | null): string {
	return (value ?? '')
		.trim()
		.toLowerCase()
		.replace(/&/g, ' and ')
		.replace(/[^a-z0-9]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function normalizeAliases(value?: string[] | null): string[] {
	return Array.from(new Set((value ?? []).map((entry) => normalizeText(entry)).filter(Boolean)));
}

function parseAliasesInput(value?: string | string[] | null): string[] {
	if (!value) return [];
	const values = Array.isArray(value) ? value : value.split(/\r?\n|,/);
	return Array.from(new Set(values.map((entry) => entry.trim()).filter(Boolean)));
}

function normalizeOrganizationRow(row: OrganizationRowCompat): OrganizationRow {
	return {
		...row,
		aliases: row.aliases ?? []
	};
}

function organizationSelection(includeAliases: boolean) {
	return includeAliases ? organizationSelectWithAliases : organizationSelectWithoutAliases;
}

async function hasOrganizationAliasesColumn(): Promise<boolean> {
	if (!hasOrganizationAliasesColumnPromise) {
		hasOrganizationAliasesColumnPromise = db
			.execute(
				sql<{ present: number }[]>`
					select 1 as present
					from information_schema.columns
					where table_schema = 'public'
						and table_name = 'organizations'
						and column_name = 'aliases'
					limit 1
				`
			)
			.then((rows) => rows.length > 0)
			.catch(() => false);
	}

	return hasOrganizationAliasesColumnPromise;
}

function domainFromWebsite(value?: string | null): string | null {
	if (!value) return null;
	try {
		return new URL(value).hostname.replace(/^www\./, '').toLowerCase();
	} catch {
		return null;
	}
}

async function uniqueSlug(base: string): Promise<string> {
	let slug = base.slice(0, 100);
	let n = 0;
	while (true) {
		const existing = await db
			.select({ id: organizations.id })
			.from(organizations)
			.where(eq(organizations.slug, slug))
			.limit(1);
		if (existing.length === 0) return slug;
		n += 1;
		slug = `${base.slice(0, 90)}-${n}`;
	}
}

function buildSearchWhere(search?: string, includeAliases = true) {
	if (!search?.trim()) return undefined;
	const pattern = `%${search.trim()}%`;
	const conditions = [
		ilike(organizations.name, pattern),
		ilike(organizations.website, pattern),
		ilike(organizations.email, pattern)
	];
	if (includeAliases) {
		conditions.push(sql`array_to_string(${organizations.aliases}, ' ') ilike ${pattern}`);
	}
	return or(...conditions);
}

function mergePreferred<T>(
	current: T | null | undefined,
	incoming: T | null | undefined
): T | null | undefined {
	return current ?? incoming;
}

export async function getOrganizations(opts?: {
	search?: string;
	page?: number;
	limit?: number;
}): Promise<{ orgs: OrganizationRow[]; total: number }> {
	const includeAliases = await hasOrganizationAliasesColumn();
	const page = opts?.page ?? 1;
	const limit = opts?.limit ?? 50;
	const offset = (page - 1) * limit;

	const where = buildSearchWhere(opts?.search, includeAliases);

	const [countResult] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(organizations)
		.where(where);
	const total = countResult?.count ?? 0;

	const orgs = await db
		.select(organizationSelection(includeAliases))
		.from(organizations)
		.where(where)
		.orderBy(desc(organizations.updatedAt))
		.limit(limit)
		.offset(offset);

	return { orgs: orgs.map((row) => normalizeOrganizationRow(row)), total };
}

export type OrganizationMapPoint = {
	id: string;
	slug: string;
	name: string;
	lat: number;
	lng: number;
	logoUrl: string | null;
	orgType: string | null;
	verified: boolean;
	city: string | null;
	state: string | null;
	description: string | null;
};

export async function getOrganizationMapPoints(opts?: {
	search?: string;
	limit?: number;
}): Promise<OrganizationMapPoint[]> {
	const includeAliases = await hasOrganizationAliasesColumn();
	const limit = opts?.limit ?? 500;
	const searchWhere = buildSearchWhere(opts?.search, includeAliases);
	const where = searchWhere
		? and(isNotNull(organizations.lat), isNotNull(organizations.lng), searchWhere)
		: and(isNotNull(organizations.lat), isNotNull(organizations.lng));

	const rows = await db
		.select({
			id: organizations.id,
			slug: organizations.slug,
			name: organizations.name,
			lat: organizations.lat,
			lng: organizations.lng,
			logoUrl: organizations.logoUrl,
			orgType: organizations.orgType,
			verified: organizations.verified,
			city: organizations.city,
			state: organizations.state,
			description: organizations.description
		})
		.from(organizations)
		.where(where)
		.orderBy(organizations.name)
		.limit(limit);

	return rows
		.filter(
			(row): row is typeof row & { lat: number; lng: number } =>
				typeof row.lat === 'number' &&
				typeof row.lng === 'number' &&
				Number.isFinite(row.lat) &&
				Number.isFinite(row.lng)
		)
		.map((row) => {
			const cleaned = row.description ? stripHtml(row.description).trim() : '';
			const truncated =
				cleaned.length > 160 ? `${cleaned.slice(0, 157).trimEnd()}…` : cleaned || null;
			return {
				id: row.id,
				slug: row.slug,
				name: row.name,
				lat: row.lat,
				lng: row.lng,
				logoUrl: row.logoUrl ?? null,
				orgType: row.orgType ?? null,
				verified: Boolean(row.verified),
				city: row.city ?? null,
				state: row.state ?? null,
				description: truncated
			};
		});
}

export async function getOrganizationById(id: string): Promise<OrganizationRow | null> {
	const includeAliases = await hasOrganizationAliasesColumn();
	const [row] = await db
		.select(organizationSelection(includeAliases))
		.from(organizations)
		.where(eq(organizations.id, id))
		.limit(1);
	return row ? normalizeOrganizationRow(row) : null;
}

export async function getOrganizationBySlug(slug: string): Promise<OrganizationRow | null> {
	const includeAliases = await hasOrganizationAliasesColumn();
	const [row] = await db
		.select(organizationSelection(includeAliases))
		.from(organizations)
		.where(eq(organizations.slug, slug))
		.limit(1);
	return row ? normalizeOrganizationRow(row) : null;
}

export async function getAllOrganizations(): Promise<OrganizationRow[]> {
	const includeAliases = await hasOrganizationAliasesColumn();
	const rows = await db
		.select(organizationSelection(includeAliases))
		.from(organizations)
		.orderBy(organizations.name);
	return rows.map((row) => normalizeOrganizationRow(row));
}

export async function createOrganization(
	data: Omit<OrganizationInsert, 'id' | 'slug' | 'createdAt' | 'updatedAt'> & {
		aliases?: string[] | string | null;
	}
): Promise<OrganizationRow> {
	const includeAliases = await hasOrganizationAliasesColumn();
	const slug = await uniqueSlug(slugify(data.name));
	const values = {
		...data,
		slug
	};
	const [row] = await db
		.insert(organizations)
		.values(includeAliases ? { ...values, aliases: parseAliasesInput(data.aliases) } : values)
		.returning(organizationSelection(includeAliases));
	if (!row) throw new Error('Insert did not return row');
	return normalizeOrganizationRow(row);
}

export async function updateOrganization(
	id: string,
	data: Partial<Omit<OrganizationInsert, 'id' | 'createdAt'>> & {
		aliases?: string[] | string | null;
	}
): Promise<OrganizationRow | null> {
	const includeAliases = await hasOrganizationAliasesColumn();
	const values = {
		...data,
		...(data.aliases !== undefined ? { aliases: parseAliasesInput(data.aliases) } : {})
	};
	const { aliases, ...valuesWithoutAliases } = values;
	void aliases;
	const [row] = await db
		.update(organizations)
		.set(includeAliases ? values : valuesWithoutAliases)
		.where(eq(organizations.id, id))
		.returning(organizationSelection(includeAliases));
	return row ? normalizeOrganizationRow(row) : null;
}

export async function deleteOrganization(id: string): Promise<boolean> {
	const result = await db.delete(organizations).where(eq(organizations.id, id)).returning();
	return result.length > 0;
}

export async function getOrganizationImpact(id: string): Promise<OrganizationImpact> {
	const [eventCount, fundingCount, jobCount, redPagesCount, toolboxCount, venueCount] =
		await Promise.all([
			countEventsByOrganization(id),
			countFundingByOrganization(id),
			countJobsByOrganization(id),
			countRedPagesByOrganization(id),
			countToolboxByOrganization(id),
			countVenuesByOrganization(id)
		]);

	return {
		organizationId: id,
		events: eventCount,
		funding: fundingCount,
		jobs: jobCount,
		redPages: redPagesCount,
		toolbox: toolboxCount,
		venues: venueCount,
		total: eventCount + fundingCount + jobCount + redPagesCount + toolboxCount + venueCount
	};
}

export async function suggestOrganizationMatches(
	input: OrganizationMatchInput
): Promise<OrganizationMatchSuggestion[]> {
	const normalizedName = normalizeText(input.name);
	const normalizedAddress = normalizeText(input.address);
	const normalizedCity = normalizeText(input.city);
	const normalizedState = normalizeText(input.state);
	const domain = domainFromWebsite(input.website);
	const terms = [input.name, input.website, input.city, input.state]
		.filter(Boolean)
		.join(' ')
		.trim();

	const { orgs } = await getOrganizations({
		search: terms || input.name || input.website || '',
		limit: Math.max(input.limit ?? 8, 12)
	});

	const suggestions = await Promise.all(
		orgs.map(async (organization) => {
			let score = 0;
			const reasons: string[] = [];
			const orgName = normalizeText(organization.name);
			const orgAliases = normalizeAliases(organization.aliases);
			const orgDomain = domainFromWebsite(organization.website);
			const orgCity = normalizeText(organization.city);
			const orgState = normalizeText(organization.state);
			const orgAddress = normalizeText(organization.address);

			if (normalizedName && orgName === normalizedName) {
				score += 7;
				reasons.push('Same name');
			} else if (normalizedName && orgAliases.includes(normalizedName)) {
				score += 6;
				reasons.push('Matches an alternate name');
			} else if (
				normalizedName &&
				(orgName.includes(normalizedName) || normalizedName.includes(orgName))
			) {
				score += 4;
				reasons.push('Very similar name');
			}

			if (domain && orgDomain === domain) {
				score += 5;
				reasons.push('Same website domain');
			}

			if (normalizedCity && orgCity && normalizedCity === orgCity) {
				score += 2;
				reasons.push('Same city');
			}

			if (normalizedState && orgState && normalizedState === orgState) {
				score += 1;
				reasons.push('Same state');
			}

			if (normalizedAddress && orgAddress && normalizedAddress === orgAddress) {
				score += 3;
				reasons.push('Same address');
			}

			if (score <= 0) return null;

			const impact = await getOrganizationImpact(organization.id);
			return {
				organization,
				score,
				reasons,
				usageCount: impact.total
			} satisfies OrganizationMatchSuggestion;
		})
	);

	return suggestions
		.filter((entry): entry is OrganizationMatchSuggestion => Boolean(entry))
		.sort((left, right) => right.score - left.score || right.usageCount - left.usageCount)
		.slice(0, input.limit ?? 6);
}

export async function mergeOrganizations(
	keeperId: string,
	mergeIds: string[]
): Promise<OrganizationRow | null> {
	const includeAliases = await hasOrganizationAliasesColumn();
	const ids = Array.from(new Set(mergeIds.filter((id) => id && id !== keeperId)));
	if (ids.length === 0) return getOrganizationById(keeperId);

	return db.transaction(async (tx) => {
		const selection = organizationSelection(includeAliases);
		const [keeperRaw] = await tx
			.select(selection)
			.from(organizations)
			.where(eq(organizations.id, keeperId))
			.limit(1);
		if (!keeperRaw) return null;
		const keeper = normalizeOrganizationRow(keeperRaw);

		const mergeRows = (
			await tx.select(selection).from(organizations).where(inArray(organizations.id, ids))
		).map((row) => normalizeOrganizationRow(row));
		if (mergeRows.length === 0) return keeper;

		const nextAliases = Array.from(
			new Set(
				[
					...parseAliasesInput(keeper.aliases),
					...mergeRows.flatMap((row) => [row.name, ...parseAliasesInput(row.aliases)])
				].filter(Boolean)
			)
		).filter((alias) => normalizeText(alias) !== normalizeText(keeper.name));

		const mergedValues = {
			description: mergePreferred(
				keeper.description,
				mergeRows.find((row) => row.description)?.description
			),
			website: mergePreferred(keeper.website, mergeRows.find((row) => row.website)?.website),
			email: mergePreferred(keeper.email, mergeRows.find((row) => row.email)?.email),
			phone: mergePreferred(keeper.phone, mergeRows.find((row) => row.phone)?.phone),
			logoUrl: mergePreferred(keeper.logoUrl, mergeRows.find((row) => row.logoUrl)?.logoUrl),
			orgType: mergePreferred(keeper.orgType, mergeRows.find((row) => row.orgType)?.orgType),
			region: mergePreferred(keeper.region, mergeRows.find((row) => row.region)?.region),
			address: mergePreferred(keeper.address, mergeRows.find((row) => row.address)?.address),
			city: mergePreferred(keeper.city, mergeRows.find((row) => row.city)?.city),
			state: mergePreferred(keeper.state, mergeRows.find((row) => row.state)?.state),
			zip: mergePreferred(keeper.zip, mergeRows.find((row) => row.zip)?.zip),
			lat: mergePreferred(keeper.lat, mergeRows.find((row) => row.lat != null)?.lat),
			lng: mergePreferred(keeper.lng, mergeRows.find((row) => row.lng != null)?.lng),
			aliases: nextAliases
		};
		const { aliases, ...mergedValuesWithoutAliases } = mergedValues;
		void aliases;

		await tx
			.update(organizations)
			.set(includeAliases ? mergedValues : mergedValuesWithoutAliases)
			.where(eq(organizations.id, keeperId));
		await tx
			.update(venues)
			.set({ organizationId: keeperId })
			.where(inArray(venues.organizationId, ids));
		await tx
			.update(events)
			.set({ organizationId: keeperId })
			.where(inArray(events.organizationId, ids));
		await tx
			.update(funding)
			.set({ organizationId: keeperId })
			.where(inArray(funding.organizationId, ids));
		await tx
			.update(jobs)
			.set({ organizationId: keeperId })
			.where(inArray(jobs.organizationId, ids));
		await tx
			.update(redPagesBusinesses)
			.set({ organizationId: keeperId })
			.where(inArray(redPagesBusinesses.organizationId, ids));
		await tx
			.update(toolboxResources)
			.set({ organizationId: keeperId })
			.where(inArray(toolboxResources.organizationId, ids));
		await tx.delete(organizations).where(inArray(organizations.id, ids));

		const [updated] = await tx
			.select(selection)
			.from(organizations)
			.where(eq(organizations.id, keeperId))
			.limit(1);
		return updated ? normalizeOrganizationRow(updated) : keeper;
	});
}

async function countEventsByOrganization(id: string) {
	const [result] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(events)
		.where(eq(events.organizationId, id));
	return result?.count ?? 0;
}

async function countFundingByOrganization(id: string) {
	const [result] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(funding)
		.where(eq(funding.organizationId, id));
	return result?.count ?? 0;
}

async function countJobsByOrganization(id: string) {
	const [result] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(jobs)
		.where(eq(jobs.organizationId, id));
	return result?.count ?? 0;
}

async function countRedPagesByOrganization(id: string) {
	const [result] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(redPagesBusinesses)
		.where(eq(redPagesBusinesses.organizationId, id));
	return result?.count ?? 0;
}

async function countToolboxByOrganization(id: string) {
	const [result] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(toolboxResources)
		.where(eq(toolboxResources.organizationId, id));
	return result?.count ?? 0;
}

async function countVenuesByOrganization(id: string) {
	const [result] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(venues)
		.where(eq(venues.organizationId, id));
	return result?.count ?? 0;
}
