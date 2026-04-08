/**
 * Funding data layer: CRUD, moderation, search indexing.
 */
import { eq, desc, asc, gte, ilike, or, and, sql, isNull, notInArray } from 'drizzle-orm';
import { db, type DbExecutor } from '$lib/server/db';
import { funding as fundingTable, organizations, user as userTable } from '$lib/server/db/schema';
import { indexDocument, removeDocument } from '$lib/server/meilisearch';
import { getSourceProvenanceByPublishedRecord } from '$lib/server/source-provenance';
import { sanitizeRichTextHtml } from '$lib/server/sanitize-rich-text';
import { resolveAbsoluteUrl } from '$lib/config/public-assets';
import type { FundingItem } from '$lib/data/kb';
import type { FundingSearchDoc } from '$lib/server/meilisearch';
import { stripHtml } from '$lib/utils/format';
import { buildModerationFields } from '$lib/server/admin-content';

export type FundingRow = typeof fundingTable.$inferSelect;
export type FundingInsert = typeof fundingTable.$inferInsert;

function rowToItem(
	row: FundingRow,
	extra?: {
		organizationName?: string;
		organizationSlug?: string;
		submitterName?: string;
		submitterEmail?: string;
	}
): FundingItem {
	const imageUrl = resolveAbsoluteUrl(row.imageUrl) ?? undefined;
	const imageUrls = Array.isArray(row.imageUrls)
		? (row.imageUrls as string[]).map((url) => resolveAbsoluteUrl(url) ?? url)
		: [];

	return {
		id: row.id,
		slug: row.slug,
		title: row.title,
		description: sanitizeRichTextHtml(row.description ?? undefined),
		coil: 'funding',
		funderName: row.funderName ?? undefined,
		organizationId: row.organizationId ?? undefined,
		organizationName: extra?.organizationName ?? undefined,
		organizationSlug: extra?.organizationSlug ?? undefined,
		fundingType: row.fundingType ?? undefined,
		fundingTypes: row.fundingTypes ?? undefined,
		eligibilityType: row.eligibilityType ?? undefined,
		eligibilityTypes: row.eligibilityTypes ?? undefined,
		focusAreas: row.focusAreas ?? undefined,
		tags: row.tags ?? undefined,
		applicationStatus: row.applicationStatus,
		openDate: row.openDate?.toISOString() ?? undefined,
		deadline: row.deadline?.toISOString() ?? undefined,
		awardDate: row.awardDate?.toISOString() ?? undefined,
		fundingCycleNotes: row.fundingCycleNotes ?? undefined,
		isRecurring: row.isRecurring ?? undefined,
		recurringSchedule: row.recurringSchedule ?? undefined,
		amountMin: row.amountMin,
		amountMax: row.amountMax,
		amountDescription: row.amountDescription ?? undefined,
		fundingTerm: row.fundingTerm ?? undefined,
		matchRequired: row.matchRequired ?? undefined,
		matchRequirements: row.matchRequirements ?? undefined,
		eligibleCosts: row.eligibleCosts ?? undefined,
		region: row.region ?? undefined,
		geographicRestrictions: row.geographicRestrictions ?? undefined,
		applyUrl: row.applyUrl ?? undefined,
		contactEmail: row.contactEmail ?? undefined,
		contactName: row.contactName ?? undefined,
		contactPhone: row.contactPhone ?? undefined,
		imageUrl,
		imageUrls,
		status: row.status,
		source: row.source,
		featured: row.featured ?? undefined,
		unlisted: row.unlisted ?? undefined,
		createdAt: row.createdAt?.toISOString() ?? undefined,
		updatedAt: row.updatedAt?.toISOString() ?? undefined,
		publishedAt: row.publishedAt?.toISOString() ?? undefined,
		rejectedAt: row.rejectedAt?.toISOString() ?? undefined,
		rejectionReason: row.rejectionReason ?? undefined,
		adminNotes: row.adminNotes ?? undefined,
		submittedById: row.submittedById ?? undefined,
		submitterName: extra?.submitterName ?? undefined,
		submitterEmail: extra?.submitterEmail ?? undefined,
		reviewedById: row.reviewedById ?? undefined
	};
}

function itemToSearchDoc(item: FundingItem): FundingSearchDoc {
	return {
		id: item.id,
		slug: item.slug ?? item.id,
		title: item.title,
		description: item.description ? stripHtml(item.description).slice(0, 2000) : undefined,
		coil: 'funding',
		funderName: item.funderName,
		focusAreas: item.focusAreas,
		eligibilityType: item.eligibilityType,
		fundingType: item.fundingType,
		applicationStatus: item.applicationStatus,
		region: item.region,
		amountMin: item.amountMin ?? undefined,
		amountMax: item.amountMax ?? undefined,
		deadline: item.deadline
	};
}

// ── Slug helpers ──────────────────────────────────────────

function slugify(title: string): string {
	return (
		title
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '') || 'funding'
	);
}

async function uniqueSlug(base: string): Promise<string> {
	let slug = base.slice(0, 100);
	let n = 0;
	while (true) {
		const existing = await db
			.select({ id: fundingTable.id })
			.from(fundingTable)
			.where(eq(fundingTable.slug, slug))
			.limit(1);
		if (existing.length === 0) return slug;
		n += 1;
		slug = `${base.slice(0, 90)}-${n}`;
	}
}

// ── Public queries ────────────────────────────────────────

export async function getPublishedFunding(): Promise<FundingItem[]> {
	const rows = await db
		.select()
		.from(fundingTable)
		.where(eq(fundingTable.status, 'published'))
		.orderBy(asc(fundingTable.deadline));
	return rows.map((r) => rowToItem(r));
}

export async function getUpcomingFunding(limit: number): Promise<FundingItem[]> {
	const rows = await db
		.select()
		.from(fundingTable)
		.where(
			and(
				eq(fundingTable.status, 'published'),
				or(gte(fundingTable.deadline, new Date()), isNull(fundingTable.deadline))
			)
		)
		.orderBy(asc(fundingTable.deadline))
		.limit(limit);
	return rows.map((r) => rowToItem(r));
}

export async function getRecentFunding(limit: number): Promise<FundingItem[]> {
	const rows = await db
		.select()
		.from(fundingTable)
		.where(eq(fundingTable.status, 'published'))
		.orderBy(desc(fundingTable.publishedAt))
		.limit(limit);
	return rows.map((r) => rowToItem(r));
}

export async function queryFundingForHomepage(opts: {
	limit: number;
	sortBy: string;
	sortDir: 'asc' | 'desc';
	futureOnly: boolean;
	excludedIds?: string[];
	searchQuery?: string;
}): Promise<FundingItem[]> {
	const conditions = [eq(fundingTable.status, 'published')];
	if (opts.futureOnly) {
		conditions.push(or(gte(fundingTable.deadline, new Date()), isNull(fundingTable.deadline))!);
	}
	if (opts.excludedIds?.length) conditions.push(notInArray(fundingTable.id, opts.excludedIds));
	if (opts.searchQuery?.trim()) {
		const query = `%${opts.searchQuery.trim()}%`;
		conditions.push(
			or(
				ilike(fundingTable.title, query),
				ilike(fundingTable.description, query),
				ilike(fundingTable.funderName, query),
				ilike(fundingTable.region, query),
				ilike(fundingTable.eligibilityType, query)
			)!
		);
	}

	const sortCol =
		opts.sortBy === 'deadline'
			? fundingTable.deadline
			: opts.sortBy === 'title'
				? fundingTable.title
				: fundingTable.publishedAt;
	const orderFn = opts.sortDir === 'asc' ? asc : desc;

	const rows = await db
		.select()
		.from(fundingTable)
		.where(and(...conditions))
		.orderBy(orderFn(sortCol))
		.limit(opts.limit);
	return rows.map((r) => rowToItem(r));
}

export async function searchFundingFromDb(q: string, limit = 10) {
	const term = q?.trim();
	if (!term || term.length < 2) return [];
	const rows = await db
		.select({ id: fundingTable.id, title: fundingTable.title, slug: fundingTable.slug })
		.from(fundingTable)
		.where(
			and(
				eq(fundingTable.status, 'published'),
				or(ilike(fundingTable.title, `%${term}%`), ilike(fundingTable.funderName, `%${term}%`))
			)
		)
		.limit(limit);
	return rows.map((r) => ({ id: r.id, title: r.title, slug: r.slug }));
}

export async function getFundingBySlug(slug: string): Promise<FundingItem | null> {
	const rows = await db
		.select({
			funding: fundingTable,
			orgName: organizations.name,
			orgSlug: organizations.slug
		})
		.from(fundingTable)
		.leftJoin(organizations, eq(fundingTable.organizationId, organizations.id))
		.where(eq(fundingTable.slug, slug))
		.limit(1);
	const r = rows[0];
	if (!r) return null;
	const item = rowToItem(r.funding, {
		organizationName: r.orgName ?? undefined,
		organizationSlug: r.orgSlug ?? undefined
	});
	item.provenance = await getSourceProvenanceByPublishedRecord('funding', r.funding.id);
	return item;
}

export async function getFundingById(id: string): Promise<FundingItem | null> {
	const [row] = await db
		.select({
			funding: fundingTable,
			orgName: organizations.name,
			orgSlug: organizations.slug,
			submitterName: userTable.name,
			submitterEmail: userTable.email
		})
		.from(fundingTable)
		.leftJoin(organizations, eq(fundingTable.organizationId, organizations.id))
		.leftJoin(userTable, eq(fundingTable.submittedById, userTable.id))
		.where(eq(fundingTable.id, id))
		.limit(1);
	if (!row) return null;
	return rowToItem(row.funding, {
		organizationName: row.orgName ?? undefined,
		organizationSlug: row.orgSlug ?? undefined,
		submitterName: row.submitterName ?? undefined,
		submitterEmail: row.submitterEmail ?? undefined
	});
}

export async function getFundingByOrganizationId(orgId: string): Promise<FundingItem[]> {
	const rows = await db
		.select()
		.from(fundingTable)
		.where(and(eq(fundingTable.organizationId, orgId), eq(fundingTable.status, 'published')))
		.orderBy(asc(fundingTable.deadline));
	return rows.map((r) => rowToItem(r));
}

// ── Admin queries ─────────────────────────────────────────

export async function getFundingForAdmin(opts: {
	status?: string;
	search?: string;
	page?: number;
	limit?: number;
	sort?: 'updated' | 'deadline' | 'title';
	order?: 'asc' | 'desc';
}): Promise<{ items: FundingItem[]; total: number }> {
	const page = opts.page ?? 1;
	const limit = opts.limit ?? 25;
	const offset = (page - 1) * limit;

	const conditions = [];
	if (opts.status && opts.status !== 'all') {
		conditions.push(eq(fundingTable.status, opts.status));
	}
	if (opts.search) {
		conditions.push(
			or(
				ilike(fundingTable.title, `%${opts.search}%`),
				ilike(fundingTable.funderName, `%${opts.search}%`)
			)!
		);
	}

	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const [countResult] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(fundingTable)
		.where(where);
	const total = countResult?.count ?? 0;

	const orderColumn =
		opts.sort === 'title'
			? fundingTable.title
			: opts.sort === 'deadline'
				? fundingTable.deadline
				: fundingTable.updatedAt;
	const orderByClause = (opts.order ?? 'desc') === 'asc' ? asc(orderColumn) : desc(orderColumn);

	const rows = await db
		.select({
			funding: fundingTable,
			orgName: organizations.name,
			submitterName: userTable.name,
			submitterEmail: userTable.email
		})
		.from(fundingTable)
		.leftJoin(organizations, eq(fundingTable.organizationId, organizations.id))
		.leftJoin(userTable, eq(fundingTable.submittedById, userTable.id))
		.where(where)
		.orderBy(orderByClause)
		.limit(limit)
		.offset(offset);

	const items = rows.map((r) =>
		rowToItem(r.funding, {
			organizationName: r.orgName ?? undefined,
			submitterName: r.submitterName ?? undefined,
			submitterEmail: r.submitterEmail ?? undefined
		})
	);
	return { items, total };
}

export async function getFundingStatusCounts(): Promise<Record<string, number>> {
	const rows = await db
		.select({ status: fundingTable.status, count: sql<number>`count(*)::int` })
		.from(fundingTable)
		.groupBy(fundingTable.status);
	const counts: Record<string, number> = {};
	for (const row of rows) counts[row.status] = row.count;
	return counts;
}

// ── Create / Update / Delete ──────────────────────────────

export async function createFunding(
	data: Omit<FundingInsert, 'id' | 'slug' | 'createdAt' | 'updatedAt'>,
	database: DbExecutor = db
): Promise<FundingRow> {
	const slug = await uniqueSlug(slugify(data.title));
	const description = sanitizeRichTextHtml(data.description ?? undefined) ?? null;
	const [row] = await database
		.insert(fundingTable)
		.values({ ...data, slug, description })
		.returning();
	if (!row) throw new Error('Insert did not return row');
	if (row.status === 'published') {
		await indexDocument('funding', itemToSearchDoc(rowToItem(row)));
	}
	return row;
}

export async function updateFunding(
	id: string,
	data: Partial<Omit<FundingInsert, 'id' | 'createdAt'>>,
	database: DbExecutor = db
): Promise<FundingRow | null> {
	const nextData = { ...data };
	if ('description' in nextData) {
		nextData.description = sanitizeRichTextHtml(nextData.description ?? undefined) ?? null;
	}

	const [row] = await database
		.update(fundingTable)
		.set(nextData)
		.where(eq(fundingTable.id, id))
		.returning();
	if (!row) return null;
	if (row.status === 'published') {
		await indexDocument('funding', itemToSearchDoc(rowToItem(row)));
	} else {
		await removeDocument('funding', row.id);
	}
	return row;
}

export async function deleteFunding(id: string): Promise<boolean> {
	const result = await db.delete(fundingTable).where(eq(fundingTable.id, id)).returning();
	if (result.length > 0) {
		await removeDocument('funding', id);
	}
	return result.length > 0;
}

// ── Moderation ────────────────────────────────────────────

export async function approveFunding(id: string, reviewerId: string): Promise<FundingRow | null> {
	const current = await getFundingById(id);
	if (!current) return null;
	return updateFunding(
		id,
		buildModerationFields(current, {
			status: 'published',
			reviewerId
		})
	);
}

export async function rejectFunding(
	id: string,
	reviewerId: string,
	reason?: string
): Promise<FundingRow | null> {
	const current = await getFundingById(id);
	if (!current) return null;
	return updateFunding(
		id,
		buildModerationFields(current, {
			status: 'rejected',
			reviewerId,
			rejectionReason: reason
		})
	);
}

export async function bulkApproveFunding(ids: string[], reviewerId: string): Promise<number> {
	let count = 0;
	for (const id of ids) {
		const result = await approveFunding(id, reviewerId);
		if (result) count++;
	}
	return count;
}

export async function bulkRejectFunding(
	ids: string[],
	reviewerId: string,
	reason?: string
): Promise<number> {
	let count = 0;
	for (const id of ids) {
		const result = await rejectFunding(id, reviewerId, reason);
		if (result) count++;
	}
	return count;
}

export async function bulkDeleteFunding(ids: string[]): Promise<number> {
	let count = 0;
	for (const id of ids) {
		const result = await deleteFunding(id);
		if (result) count++;
	}
	return count;
}
