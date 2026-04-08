/**
 * Red Pages (Native Business Directory) data layer: CRUD, moderation, search indexing.
 */
import { eq, desc, asc, ilike, or, and, sql, notInArray } from 'drizzle-orm';
import { db, type DbExecutor } from '$lib/server/db';
import {
	redPagesBusinesses as rpTable,
	organizations,
	user as userTable
} from '$lib/server/db/schema';
import { indexDocument, removeDocument } from '$lib/server/meilisearch';
import { getSourceProvenanceByPublishedRecord } from '$lib/server/source-provenance';
import { sanitizeRichTextHtml } from '$lib/server/sanitize-rich-text';
import type { RedPagesItem } from '$lib/data/kb';
import type { RedPagesSearchDoc } from '$lib/server/meilisearch';
import { stripHtml } from '$lib/utils/format';
import { buildModerationFields } from '$lib/server/admin-content';

export type RedPagesRow = typeof rpTable.$inferSelect;
export type RedPagesInsert = typeof rpTable.$inferInsert;

function rowToItem(
	row: RedPagesRow,
	extra?: {
		organizationName?: string;
		organizationSlug?: string;
		submitterName?: string;
		submitterEmail?: string;
	}
): RedPagesItem {
	return {
		id: row.id,
		title: row.name,
		slug: row.slug,
		name: row.name,
		description: sanitizeRichTextHtml(row.description ?? undefined),
		coil: 'redpages',
		organizationId: row.organizationId ?? undefined,
		organizationName: extra?.organizationName ?? undefined,
		organizationSlug: extra?.organizationSlug ?? undefined,
		ownerName: row.ownerName ?? undefined,
		serviceType: row.serviceType ?? undefined,
		serviceTypes: row.serviceTypes ?? undefined,
		serviceArea: row.serviceArea ?? undefined,
		tags: row.tags ?? undefined,
		tribalAffiliation: row.tribalAffiliation ?? undefined,
		tribalAffiliations: row.tribalAffiliations ?? undefined,
		ownershipIdentity: row.ownershipIdentity ?? undefined,
		website: row.website ?? undefined,
		email: row.email ?? undefined,
		phone: row.phone ?? undefined,
		address: row.address ?? undefined,
		city: row.city ?? undefined,
		state: row.state ?? undefined,
		zip: row.zip ?? undefined,
		lat: row.lat ?? undefined,
		lng: row.lng ?? undefined,
		region: row.region ?? undefined,
		businessHours: Array.isArray(row.businessHours)
			? (row.businessHours as { day: string; open: string; close: string }[])
			: undefined,
		logoUrl: row.logoUrl ?? undefined,
		imageUrl: row.imageUrl ?? undefined,
		imageUrls: Array.isArray(row.imageUrls) ? (row.imageUrls as string[]) : undefined,
		certifications: row.certifications ?? undefined,
		socialLinks: row.socialLinks as Record<string, string> | undefined,
		status: row.status,
		source: row.source,
		featured: row.featured ?? undefined,
		unlisted: row.unlisted ?? undefined,
		createdAt: row.createdAt?.toISOString() ?? undefined,
		updatedAt: row.updatedAt?.toISOString() ?? undefined,
		publishedAt: row.publishedAt?.toISOString() ?? undefined,
		rejectedAt: row.rejectedAt?.toISOString() ?? undefined,
		verifiedAt: row.verifiedAt?.toISOString() ?? undefined,
		rejectionReason: row.rejectionReason ?? undefined,
		adminNotes: row.adminNotes ?? undefined,
		submittedById: row.submittedById ?? undefined,
		submitterName: extra?.submitterName ?? undefined,
		submitterEmail: extra?.submitterEmail ?? undefined,
		reviewedById: row.reviewedById ?? undefined,
		verified: row.verified ?? undefined
	};
}

function itemToSearchDoc(item: RedPagesItem): RedPagesSearchDoc {
	return {
		id: item.id,
		slug: item.slug ?? item.id,
		title: item.title,
		name: item.name ?? item.title,
		description: item.description ? stripHtml(item.description).slice(0, 2000) : undefined,
		coil: 'redpages',
		serviceType: item.serviceType,
		tribalAffiliation: item.tribalAffiliation,
		city: item.city,
		state: item.state,
		region: item.region,
		ownershipIdentity: item.ownershipIdentity,
		certifications: item.certifications
	};
}

// ── Slug helpers ──────────────────────────────────────────

function slugify(name: string): string {
	return (
		name
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '') || 'business'
	);
}

async function uniqueSlug(base: string): Promise<string> {
	let slug = base.slice(0, 100);
	let n = 0;
	while (true) {
		const existing = await db
			.select({ id: rpTable.id })
			.from(rpTable)
			.where(eq(rpTable.slug, slug))
			.limit(1);
		if (existing.length === 0) return slug;
		n += 1;
		slug = `${base.slice(0, 90)}-${n}`;
	}
}

// ── Public queries ────────────────────────────────────────

export async function getPublishedBusinesses(): Promise<RedPagesItem[]> {
	const rows = await db
		.select()
		.from(rpTable)
		.where(eq(rpTable.status, 'published'))
		.orderBy(asc(rpTable.name));
	return rows.map((r) => rowToItem(r));
}

export async function getRecentBusinesses(limit: number): Promise<RedPagesItem[]> {
	const rows = await db
		.select()
		.from(rpTable)
		.where(eq(rpTable.status, 'published'))
		.orderBy(desc(rpTable.publishedAt))
		.limit(limit);
	return rows.map((r) => rowToItem(r));
}

export async function queryBusinessesForHomepage(opts: {
	limit: number;
	sortBy: string;
	sortDir: 'asc' | 'desc';
	excludedIds?: string[];
	searchQuery?: string;
}): Promise<RedPagesItem[]> {
	const conditions = [eq(rpTable.status, 'published')];
	if (opts.excludedIds?.length) conditions.push(notInArray(rpTable.id, opts.excludedIds));
	if (opts.searchQuery?.trim()) {
		const query = `%${opts.searchQuery.trim()}%`;
		conditions.push(
			or(
				ilike(rpTable.name, query),
				ilike(rpTable.description, query),
				ilike(rpTable.serviceType, query),
				ilike(rpTable.city, query),
				ilike(rpTable.state, query)
			)!
		);
	}

	const sortCol = opts.sortBy === 'name' ? rpTable.name : rpTable.createdAt;
	const orderFn = opts.sortDir === 'asc' ? asc : desc;

	const rows = await db
		.select()
		.from(rpTable)
		.where(and(...conditions))
		.orderBy(orderFn(sortCol))
		.limit(opts.limit);
	return rows.map((r) => rowToItem(r));
}

export async function searchBusinessesFromDb(q: string, limit = 10) {
	const term = q?.trim();
	if (!term || term.length < 2) return [];
	const rows = await db
		.select({ id: rpTable.id, title: rpTable.name, slug: rpTable.slug })
		.from(rpTable)
		.where(
			and(
				eq(rpTable.status, 'published'),
				or(ilike(rpTable.name, `%${term}%`), ilike(rpTable.serviceType, `%${term}%`))
			)
		)
		.limit(limit);
	return rows.map((r) => ({ id: r.id, title: r.title, slug: r.slug }));
}

export async function getBusinessBySlug(slug: string): Promise<RedPagesItem | null> {
	const rows = await db
		.select({
			business: rpTable,
			orgName: organizations.name,
			orgSlug: organizations.slug
		})
		.from(rpTable)
		.leftJoin(organizations, eq(rpTable.organizationId, organizations.id))
		.where(eq(rpTable.slug, slug))
		.limit(1);
	const r = rows[0];
	if (!r) return null;
	const item = rowToItem(r.business, {
		organizationName: r.orgName ?? undefined,
		organizationSlug: r.orgSlug ?? undefined
	});
	item.provenance = await getSourceProvenanceByPublishedRecord('redpages', r.business.id);
	return item;
}

export async function getBusinessById(id: string): Promise<RedPagesItem | null> {
	const [row] = await db
		.select({
			business: rpTable,
			orgName: organizations.name,
			orgSlug: organizations.slug,
			submitterName: userTable.name,
			submitterEmail: userTable.email
		})
		.from(rpTable)
		.leftJoin(organizations, eq(rpTable.organizationId, organizations.id))
		.leftJoin(userTable, eq(rpTable.submittedById, userTable.id))
		.where(eq(rpTable.id, id))
		.limit(1);
	if (!row) return null;
	return rowToItem(row.business, {
		organizationName: row.orgName ?? undefined,
		organizationSlug: row.orgSlug ?? undefined,
		submitterName: row.submitterName ?? undefined,
		submitterEmail: row.submitterEmail ?? undefined
	});
}

export async function getBusinessesByOrganizationId(orgId: string): Promise<RedPagesItem[]> {
	const rows = await db
		.select()
		.from(rpTable)
		.where(and(eq(rpTable.organizationId, orgId), eq(rpTable.status, 'published')))
		.orderBy(asc(rpTable.name));
	return rows.map((r) => rowToItem(r));
}

// ── Admin queries ─────────────────────────────────────────

export async function getBusinessesForAdmin(opts: {
	status?: string;
	search?: string;
	page?: number;
	limit?: number;
	sort?: 'updated' | 'name';
	order?: 'asc' | 'desc';
}): Promise<{ items: RedPagesItem[]; total: number }> {
	const page = opts.page ?? 1;
	const limit = opts.limit ?? 25;
	const offset = (page - 1) * limit;

	const conditions = [];
	if (opts.status && opts.status !== 'all') {
		conditions.push(eq(rpTable.status, opts.status));
	}
	if (opts.search) {
		conditions.push(
			or(ilike(rpTable.name, `%${opts.search}%`), ilike(rpTable.serviceType, `%${opts.search}%`))!
		);
	}

	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const [countResult] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(rpTable)
		.where(where);
	const total = countResult?.count ?? 0;

	const orderColumn = opts.sort === 'name' ? rpTable.name : rpTable.updatedAt;
	const orderByClause = (opts.order ?? 'desc') === 'asc' ? asc(orderColumn) : desc(orderColumn);

	const rows = await db
		.select({
			business: rpTable,
			orgName: organizations.name,
			submitterName: userTable.name,
			submitterEmail: userTable.email
		})
		.from(rpTable)
		.leftJoin(organizations, eq(rpTable.organizationId, organizations.id))
		.leftJoin(userTable, eq(rpTable.submittedById, userTable.id))
		.where(where)
		.orderBy(orderByClause)
		.limit(limit)
		.offset(offset);

	const items = rows.map((r) =>
		rowToItem(r.business, {
			organizationName: r.orgName ?? undefined,
			submitterName: r.submitterName ?? undefined,
			submitterEmail: r.submitterEmail ?? undefined
		})
	);
	return { items, total };
}

export async function getBusinessStatusCounts(): Promise<Record<string, number>> {
	const rows = await db
		.select({ status: rpTable.status, count: sql<number>`count(*)::int` })
		.from(rpTable)
		.groupBy(rpTable.status);
	const counts: Record<string, number> = {};
	for (const row of rows) counts[row.status] = row.count;
	return counts;
}

// ── Create / Update / Delete ──────────────────────────────

export async function createBusiness(
	data: Omit<RedPagesInsert, 'id' | 'slug' | 'createdAt' | 'updatedAt'>,
	database: DbExecutor = db
): Promise<RedPagesRow> {
	const slug = await uniqueSlug(slugify(data.name));
	const description = sanitizeRichTextHtml(data.description ?? undefined) ?? null;
	const [row] = await database
		.insert(rpTable)
		.values({ ...data, slug, description })
		.returning();
	if (!row) throw new Error('Insert did not return row');
	if (row.status === 'published') {
		await indexDocument('redpages', itemToSearchDoc(rowToItem(row)));
	}
	return row;
}

export async function updateBusiness(
	id: string,
	data: Partial<Omit<RedPagesInsert, 'id' | 'createdAt'>>,
	database: DbExecutor = db
): Promise<RedPagesRow | null> {
	const nextData = { ...data };
	if ('description' in nextData) {
		nextData.description = sanitizeRichTextHtml(nextData.description ?? undefined) ?? null;
	}

	const [row] = await database.update(rpTable).set(nextData).where(eq(rpTable.id, id)).returning();
	if (!row) return null;
	if (row.status === 'published') {
		await indexDocument('redpages', itemToSearchDoc(rowToItem(row)));
	} else {
		await removeDocument('redpages', row.id);
	}
	return row;
}

export async function deleteBusiness(id: string): Promise<boolean> {
	const result = await db.delete(rpTable).where(eq(rpTable.id, id)).returning();
	if (result.length > 0) await removeDocument('redpages', id);
	return result.length > 0;
}

// ── Moderation ────────────────────────────────────────────

export async function approveBusiness(id: string, reviewerId: string): Promise<RedPagesRow | null> {
	const current = await getBusinessById(id);
	if (!current) return null;
	return updateBusiness(
		id,
		buildModerationFields(current, {
			status: 'published',
			reviewerId
		})
	);
}

export async function rejectBusiness(
	id: string,
	reviewerId: string,
	reason?: string
): Promise<RedPagesRow | null> {
	const current = await getBusinessById(id);
	if (!current) return null;
	return updateBusiness(
		id,
		buildModerationFields(current, {
			status: 'rejected',
			reviewerId,
			rejectionReason: reason
		})
	);
}

export async function bulkApproveBusinesses(ids: string[], reviewerId: string): Promise<number> {
	let count = 0;
	for (const id of ids) {
		const result = await approveBusiness(id, reviewerId);
		if (result) count++;
	}
	return count;
}

export async function bulkRejectBusinesses(
	ids: string[],
	reviewerId: string,
	reason?: string
): Promise<number> {
	let count = 0;
	for (const id of ids) {
		const result = await rejectBusiness(id, reviewerId, reason);
		if (result) count++;
	}
	return count;
}

export async function bulkDeleteBusinesses(ids: string[]): Promise<number> {
	let count = 0;
	for (const id of ids) {
		const result = await deleteBusiness(id);
		if (result) count++;
	}
	return count;
}
