import { desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { events, venues } from '$lib/server/db/schema';

export type VenueRow = typeof venues.$inferSelect;
export type VenueInsert = typeof venues.$inferInsert;

export type VenueMatchInput = {
	name?: string | null;
	address?: string | null;
	city?: string | null;
	state?: string | null;
	organizationId?: string | null;
	limit?: number;
};

export type VenueMatchSuggestion = {
	venue: VenueRow;
	score: number;
	reasons: string[];
	eventCount: number;
};

export type VenueImpact = {
	venueId: string;
	events: number;
};

type VenueRowCompat = Omit<VenueRow, 'aliases'> & { aliases?: string[] | null };

const venueSelectWithoutAliases = {
	id: venues.id,
	slug: venues.slug,
	name: venues.name,
	description: venues.description,
	address: venues.address,
	city: venues.city,
	state: venues.state,
	zip: venues.zip,
	lat: venues.lat,
	lng: venues.lng,
	website: venues.website,
	imageUrl: venues.imageUrl,
	venueType: venues.venueType,
	organizationId: venues.organizationId,
	createdAt: venues.createdAt,
	updatedAt: venues.updatedAt
};

const venueSelectWithAliases = {
	...venueSelectWithoutAliases,
	aliases: venues.aliases
};

let hasVenueAliasesColumnPromise: Promise<boolean> | null = null;

function slugify(name: string): string {
	return (
		name
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '') || 'venue'
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

function parseAliasesInput(value?: string | string[] | null): string[] {
	if (!value) return [];
	const values = Array.isArray(value) ? value : value.split(/\r?\n|,/);
	return Array.from(new Set(values.map((entry) => entry.trim()).filter(Boolean)));
}

function normalizeVenueRow(row: VenueRowCompat): VenueRow {
	return {
		...row,
		aliases: row.aliases ?? []
	};
}

function venueSelection(includeAliases: boolean) {
	return includeAliases ? venueSelectWithAliases : venueSelectWithoutAliases;
}

async function hasVenueAliasesColumn(): Promise<boolean> {
	if (!hasVenueAliasesColumnPromise) {
		hasVenueAliasesColumnPromise = db
			.execute(
				sql<{ present: number }[]>`
					select 1 as present
					from information_schema.columns
					where table_schema = 'public'
						and table_name = 'venues'
						and column_name = 'aliases'
					limit 1
				`
			)
			.then((rows) => rows.length > 0)
			.catch(() => false);
	}

	return hasVenueAliasesColumnPromise;
}

function buildSearchWhere(search?: string, includeAliases = true) {
	if (!search?.trim()) return undefined;
	const pattern = `%${search.trim()}%`;
	const conditions = [
		ilike(venues.name, pattern),
		ilike(venues.address, pattern),
		ilike(venues.city, pattern),
		ilike(venues.state, pattern)
	];
	if (includeAliases) {
		conditions.push(sql`array_to_string(${venues.aliases}, ' ') ilike ${pattern}`);
	}
	return or(...conditions);
}

async function uniqueSlug(base: string): Promise<string> {
	let slug = base.slice(0, 100);
	let n = 0;
	while (true) {
		const existing = await db
			.select({ id: venues.id })
			.from(venues)
			.where(eq(venues.slug, slug))
			.limit(1);
		if (existing.length === 0) return slug;
		n += 1;
		slug = `${base.slice(0, 90)}-${n}`;
	}
}

export async function getVenues(opts?: {
	search?: string;
	page?: number;
	limit?: number;
}): Promise<{ venues: VenueRow[]; total: number }> {
	const includeAliases = await hasVenueAliasesColumn();
	const page = opts?.page ?? 1;
	const limit = opts?.limit ?? 50;
	const offset = (page - 1) * limit;

	const where = buildSearchWhere(opts?.search, includeAliases);

	const [countResult] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(venues)
		.where(where);
	const total = countResult?.count ?? 0;

	const rows = await db
		.select(venueSelection(includeAliases))
		.from(venues)
		.where(where)
		.orderBy(desc(venues.updatedAt))
		.limit(limit)
		.offset(offset);

	return { venues: rows.map((row) => normalizeVenueRow(row)), total };
}

export async function getVenueById(id: string): Promise<VenueRow | null> {
	const includeAliases = await hasVenueAliasesColumn();
	const [row] = await db
		.select(venueSelection(includeAliases))
		.from(venues)
		.where(eq(venues.id, id))
		.limit(1);
	return row ? normalizeVenueRow(row) : null;
}

export async function getVenueBySlug(slug: string): Promise<VenueRow | null> {
	const includeAliases = await hasVenueAliasesColumn();
	const [row] = await db
		.select(venueSelection(includeAliases))
		.from(venues)
		.where(eq(venues.slug, slug))
		.limit(1);
	return row ? normalizeVenueRow(row) : null;
}

export async function getVenuesByOrganizationId(organizationId: string): Promise<VenueRow[]> {
	const includeAliases = await hasVenueAliasesColumn();
	const rows = await db
		.select(venueSelection(includeAliases))
		.from(venues)
		.where(eq(venues.organizationId, organizationId))
		.orderBy(venues.name);

	return rows.map((row) => normalizeVenueRow(row));
}

export async function getAllVenues(): Promise<VenueRow[]> {
	const includeAliases = await hasVenueAliasesColumn();
	const rows = await db.select(venueSelection(includeAliases)).from(venues).orderBy(venues.name);
	return rows.map((row) => normalizeVenueRow(row));
}

export async function createVenue(
	data: Omit<VenueInsert, 'id' | 'slug' | 'createdAt' | 'updatedAt'> & {
		aliases?: string[] | string | null;
	}
): Promise<VenueRow> {
	const includeAliases = await hasVenueAliasesColumn();
	const slug = await uniqueSlug(slugify(data.name));
	const values = {
		...data,
		slug
	};
	const [row] = await db
		.insert(venues)
		.values(includeAliases ? { ...values, aliases: parseAliasesInput(data.aliases) } : values)
		.returning(venueSelection(includeAliases));
	if (!row) throw new Error('Insert did not return row');
	return normalizeVenueRow(row);
}

export async function updateVenue(
	id: string,
	data: Partial<Omit<VenueInsert, 'id' | 'createdAt'>> & {
		aliases?: string[] | string | null;
	}
): Promise<VenueRow | null> {
	const includeAliases = await hasVenueAliasesColumn();
	const values = {
		...data,
		...(data.aliases !== undefined ? { aliases: parseAliasesInput(data.aliases) } : {})
	};
	const { aliases, ...valuesWithoutAliases } = values;
	void aliases;
	const [row] = await db
		.update(venues)
		.set(includeAliases ? values : valuesWithoutAliases)
		.where(eq(venues.id, id))
		.returning(venueSelection(includeAliases));
	return row ? normalizeVenueRow(row) : null;
}

export async function deleteVenue(id: string): Promise<boolean> {
	const result = await db.delete(venues).where(eq(venues.id, id)).returning();
	return result.length > 0;
}

export async function getVenueImpact(id: string): Promise<VenueImpact> {
	const [result] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(events)
		.where(eq(events.venueId, id));
	return {
		venueId: id,
		events: result?.count ?? 0
	};
}

export async function suggestVenueMatches(input: VenueMatchInput): Promise<VenueMatchSuggestion[]> {
	const normalizedName = normalizeText(input.name);
	const normalizedAddress = normalizeText(input.address);
	const normalizedCity = normalizeText(input.city);
	const normalizedState = normalizeText(input.state);
	const terms = [input.name, input.address, input.city, input.state]
		.filter(Boolean)
		.join(' ')
		.trim();

	const { venues: rows } = await getVenues({
		search: terms || input.name || input.address || '',
		limit: Math.max(input.limit ?? 8, 12)
	});

	const suggestions = await Promise.all(
		rows.map(async (venue) => {
			let score = 0;
			const reasons: string[] = [];
			const venueName = normalizeText(venue.name);
			const venueAddress = normalizeText(venue.address);
			const venueCity = normalizeText(venue.city);
			const venueState = normalizeText(venue.state);
			const venueAliases = parseAliasesInput(venue.aliases).map((entry) => normalizeText(entry));

			if (normalizedName && venueName === normalizedName) {
				score += 7;
				reasons.push('Same venue name');
			} else if (normalizedName && venueAliases.includes(normalizedName)) {
				score += 6;
				reasons.push('Matches an alternate venue name');
			} else if (
				normalizedName &&
				(venueName.includes(normalizedName) || normalizedName.includes(venueName))
			) {
				score += 4;
				reasons.push('Very similar venue name');
			}

			if (normalizedAddress && venueAddress && normalizedAddress === venueAddress) {
				score += 5;
				reasons.push('Same address');
			}

			if (normalizedCity && venueCity && normalizedCity === venueCity) {
				score += 2;
				reasons.push('Same city');
			}

			if (normalizedState && venueState && normalizedState === venueState) {
				score += 1;
				reasons.push('Same state');
			}

			if (input.organizationId && venue.organizationId === input.organizationId) {
				score += 3;
				reasons.push('Linked to the same organization');
			}

			if (score <= 0) return null;

			const impact = await getVenueImpact(venue.id);
			return {
				venue,
				score,
				reasons,
				eventCount: impact.events
			} satisfies VenueMatchSuggestion;
		})
	);

	return suggestions
		.filter((entry): entry is VenueMatchSuggestion => Boolean(entry))
		.sort((left, right) => right.score - left.score || right.eventCount - left.eventCount)
		.slice(0, input.limit ?? 6);
}

export async function mergeVenues(keeperId: string, mergeIds: string[]): Promise<VenueRow | null> {
	const includeAliases = await hasVenueAliasesColumn();
	const ids = Array.from(new Set(mergeIds.filter((id) => id && id !== keeperId)));
	if (ids.length === 0) return getVenueById(keeperId);

	return db.transaction(async (tx) => {
		const selection = venueSelection(includeAliases);
		const [keeperRaw] = await tx
			.select(selection)
			.from(venues)
			.where(eq(venues.id, keeperId))
			.limit(1);
		if (!keeperRaw) return null;
		const keeper = normalizeVenueRow(keeperRaw);

		const mergeRows = (await tx.select(selection).from(venues).where(inArray(venues.id, ids))).map(
			(row) => normalizeVenueRow(row)
		);
		if (mergeRows.length === 0) return keeper;

		const nextAliases = Array.from(
			new Set(
				[
					...parseAliasesInput(keeper.aliases),
					...mergeRows.flatMap((row) => [row.name, ...parseAliasesInput(row.aliases)])
				].filter(Boolean)
			)
		).filter((alias) => normalizeText(alias) !== normalizeText(keeper.name));

		await tx
			.update(venues)
			.set(
				includeAliases
					? {
							description:
								keeper.description ?? mergeRows.find((row) => row.description)?.description ?? null,
							address: keeper.address ?? mergeRows.find((row) => row.address)?.address ?? null,
							city: keeper.city ?? mergeRows.find((row) => row.city)?.city ?? null,
							state: keeper.state ?? mergeRows.find((row) => row.state)?.state ?? null,
							zip: keeper.zip ?? mergeRows.find((row) => row.zip)?.zip ?? null,
							lat: keeper.lat ?? mergeRows.find((row) => row.lat != null)?.lat ?? null,
							lng: keeper.lng ?? mergeRows.find((row) => row.lng != null)?.lng ?? null,
							website: keeper.website ?? mergeRows.find((row) => row.website)?.website ?? null,
							imageUrl: keeper.imageUrl ?? mergeRows.find((row) => row.imageUrl)?.imageUrl ?? null,
							venueType:
								keeper.venueType ?? mergeRows.find((row) => row.venueType)?.venueType ?? null,
							organizationId:
								keeper.organizationId ??
								mergeRows.find((row) => row.organizationId)?.organizationId ??
								null,
							aliases: nextAliases
						}
					: {
							description:
								keeper.description ?? mergeRows.find((row) => row.description)?.description ?? null,
							address: keeper.address ?? mergeRows.find((row) => row.address)?.address ?? null,
							city: keeper.city ?? mergeRows.find((row) => row.city)?.city ?? null,
							state: keeper.state ?? mergeRows.find((row) => row.state)?.state ?? null,
							zip: keeper.zip ?? mergeRows.find((row) => row.zip)?.zip ?? null,
							lat: keeper.lat ?? mergeRows.find((row) => row.lat != null)?.lat ?? null,
							lng: keeper.lng ?? mergeRows.find((row) => row.lng != null)?.lng ?? null,
							website: keeper.website ?? mergeRows.find((row) => row.website)?.website ?? null,
							imageUrl: keeper.imageUrl ?? mergeRows.find((row) => row.imageUrl)?.imageUrl ?? null,
							venueType:
								keeper.venueType ?? mergeRows.find((row) => row.venueType)?.venueType ?? null,
							organizationId:
								keeper.organizationId ??
								mergeRows.find((row) => row.organizationId)?.organizationId ??
								null
						}
			)
			.where(eq(venues.id, keeperId));

		await tx.update(events).set({ venueId: keeperId }).where(inArray(events.venueId, ids));
		await tx.delete(venues).where(inArray(venues.id, ids));

		const [updated] = await tx
			.select(selection)
			.from(venues)
			.where(eq(venues.id, keeperId))
			.limit(1);
		return updated ? normalizeVenueRow(updated) : keeper;
	});
}
