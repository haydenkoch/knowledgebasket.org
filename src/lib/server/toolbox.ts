/**
 * Toolbox (Resources) data layer: CRUD, moderation, search indexing.
 * Supports both hosted content (articles/guides) and external links.
 */
import { eq, desc, asc, ilike, or, and, sql, notInArray } from 'drizzle-orm';
import { db, type DbExecutor } from '$lib/server/db';
import {
	toolboxResources as tbTable,
	organizations,
	user as userTable
} from '$lib/server/db/schema';
import { indexDocument, removeDocument } from '$lib/server/meilisearch';
import { getSourceProvenanceByPublishedRecord } from '$lib/server/source-provenance';
import type { ToolboxItem } from '$lib/data/kb';
import type { ToolboxSearchDoc } from '$lib/server/meilisearch';
import { stripHtml } from '$lib/utils/format';
import { buildModerationFields } from '$lib/server/admin-content';

export type ToolboxRow = typeof tbTable.$inferSelect;
export type ToolboxInsert = typeof tbTable.$inferInsert;

function rowToItem(
	row: ToolboxRow,
	extra?: {
		organizationName?: string;
		organizationSlug?: string;
		submitterName?: string;
		submitterEmail?: string;
	}
): ToolboxItem {
	return {
		id: row.id,
		slug: row.slug,
		title: row.title,
		description: row.description ?? undefined,
		body: row.body ?? undefined,
		coil: 'toolbox',
		sourceName: row.sourceName ?? undefined,
		organizationId: row.organizationId ?? undefined,
		organizationName: extra?.organizationName ?? undefined,
		organizationSlug: extra?.organizationSlug ?? undefined,
		resourceType: row.resourceType,
		mediaType: row.mediaType ?? undefined,
		category: row.category ?? undefined,
		categories: row.categories ?? undefined,
		tags: row.tags ?? undefined,
		contentMode: row.contentMode,
		externalUrl: row.externalUrl ?? undefined,
		fileUrl: row.fileUrl ?? undefined,
		imageUrl: row.imageUrl ?? undefined,
		imageUrls: (row.imageUrls as string[] | null) ?? [],
		author: row.author ?? undefined,
		publishDate: row.publishDate?.toISOString() ?? undefined,
		lastReviewedAt: row.lastReviewedAt?.toISOString() ?? undefined,
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

function itemToSearchDoc(item: ToolboxItem): ToolboxSearchDoc {
	return {
		id: item.id,
		slug: item.slug ?? item.id,
		title: item.title,
		description: item.description ? stripHtml(item.description).slice(0, 2000) : undefined,
		coil: 'toolbox',
		body: item.body ? stripHtml(item.body).slice(0, 5000) : undefined,
		sourceName: item.sourceName,
		author: item.author,
		category: item.category,
		resourceType: item.resourceType,
		mediaType: item.mediaType
	};
}

// ── Slug helpers ──────────────────────────────────────────

function slugify(title: string): string {
	return (
		title
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '') || 'resource'
	);
}

async function uniqueSlug(base: string): Promise<string> {
	let slug = base.slice(0, 100);
	let n = 0;
	while (true) {
		const existing = await db
			.select({ id: tbTable.id })
			.from(tbTable)
			.where(eq(tbTable.slug, slug))
			.limit(1);
		if (existing.length === 0) return slug;
		n += 1;
		slug = `${base.slice(0, 90)}-${n}`;
	}
}

// ── Public queries ────────────────────────────────────────

export async function getPublishedResources(): Promise<ToolboxItem[]> {
	const rows = await db
		.select()
		.from(tbTable)
		.where(eq(tbTable.status, 'published'))
		.orderBy(desc(tbTable.publishedAt));
	return rows.map((r) => rowToItem(r));
}

export async function getRecentResources(limit: number): Promise<ToolboxItem[]> {
	const rows = await db
		.select()
		.from(tbTable)
		.where(eq(tbTable.status, 'published'))
		.orderBy(desc(tbTable.publishedAt))
		.limit(limit);
	return rows.map((r) => rowToItem(r));
}

export async function queryResourcesForHomepage(opts: {
	limit: number;
	sortBy: string;
	sortDir: 'asc' | 'desc';
	excludedIds?: string[];
	searchQuery?: string;
}): Promise<ToolboxItem[]> {
	const conditions = [eq(tbTable.status, 'published')];
	if (opts.excludedIds?.length) conditions.push(notInArray(tbTable.id, opts.excludedIds));
	if (opts.searchQuery?.trim()) {
		const query = `%${opts.searchQuery.trim()}%`;
		conditions.push(
			or(
				ilike(tbTable.title, query),
				ilike(tbTable.description, query),
				ilike(tbTable.sourceName, query),
				ilike(tbTable.category, query),
				ilike(tbTable.mediaType, query)
			)!
		);
	}

	const sortCol = opts.sortBy === 'title' ? tbTable.title : tbTable.publishedAt;
	const orderFn = opts.sortDir === 'asc' ? asc : desc;

	const rows = await db
		.select()
		.from(tbTable)
		.where(and(...conditions))
		.orderBy(orderFn(sortCol))
		.limit(opts.limit);
	return rows.map((r) => rowToItem(r));
}

export async function searchResourcesFromDb(q: string, limit = 10) {
	const term = q?.trim();
	if (!term || term.length < 2) return [];
	const rows = await db
		.select({ id: tbTable.id, title: tbTable.title, slug: tbTable.slug })
		.from(tbTable)
		.where(
			and(
				eq(tbTable.status, 'published'),
				or(ilike(tbTable.title, `%${term}%`), ilike(tbTable.sourceName, `%${term}%`))
			)
		)
		.limit(limit);
	return rows.map((r) => ({ id: r.id, title: r.title, slug: r.slug }));
}

export async function getResourceBySlug(slug: string): Promise<ToolboxItem | null> {
	const rows = await db
		.select({
			resource: tbTable,
			orgName: organizations.name,
			orgSlug: organizations.slug
		})
		.from(tbTable)
		.leftJoin(organizations, eq(tbTable.organizationId, organizations.id))
		.where(eq(tbTable.slug, slug))
		.limit(1);
	const r = rows[0];
	if (!r) return null;
	const item = rowToItem(r.resource, {
		organizationName: r.orgName ?? undefined,
		organizationSlug: r.orgSlug ?? undefined
	});
	item.provenance = await getSourceProvenanceByPublishedRecord('toolbox', r.resource.id);
	return item;
}

export async function getResourceById(id: string): Promise<ToolboxItem | null> {
	const [row] = await db
		.select({
			resource: tbTable,
			orgName: organizations.name,
			orgSlug: organizations.slug,
			submitterName: userTable.name,
			submitterEmail: userTable.email
		})
		.from(tbTable)
		.leftJoin(organizations, eq(tbTable.organizationId, organizations.id))
		.leftJoin(userTable, eq(tbTable.submittedById, userTable.id))
		.where(eq(tbTable.id, id))
		.limit(1);
	if (!row) return null;
	return rowToItem(row.resource, {
		organizationName: row.orgName ?? undefined,
		organizationSlug: row.orgSlug ?? undefined,
		submitterName: row.submitterName ?? undefined,
		submitterEmail: row.submitterEmail ?? undefined
	});
}

export async function getResourcesByOrganizationId(orgId: string): Promise<ToolboxItem[]> {
	const rows = await db
		.select()
		.from(tbTable)
		.where(and(eq(tbTable.organizationId, orgId), eq(tbTable.status, 'published')))
		.orderBy(desc(tbTable.publishedAt));
	return rows.map((r) => rowToItem(r));
}

export async function getResourcesByOrganizationIdForWorkspace(
	orgId: string
): Promise<ToolboxItem[]> {
	const rows = await db
		.select()
		.from(tbTable)
		.where(eq(tbTable.organizationId, orgId))
		.orderBy(desc(tbTable.updatedAt));
	return rows.map((row) => rowToItem(row));
}

// ── Admin queries ─────────────────────────────────────────

export async function getResourcesForAdmin(opts: {
	status?: string;
	search?: string;
	page?: number;
	limit?: number;
	sort?: 'updated' | 'title';
	order?: 'asc' | 'desc';
}): Promise<{ items: ToolboxItem[]; total: number }> {
	const page = opts.page ?? 1;
	const limit = opts.limit ?? 25;
	const offset = (page - 1) * limit;

	const conditions = [];
	if (opts.status && opts.status !== 'all') {
		conditions.push(eq(tbTable.status, opts.status));
	}
	if (opts.search) {
		conditions.push(
			or(ilike(tbTable.title, `%${opts.search}%`), ilike(tbTable.sourceName, `%${opts.search}%`))!
		);
	}

	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const [countResult] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(tbTable)
		.where(where);
	const total = countResult?.count ?? 0;

	const orderColumn = opts.sort === 'title' ? tbTable.title : tbTable.updatedAt;
	const orderByClause = (opts.order ?? 'desc') === 'asc' ? asc(orderColumn) : desc(orderColumn);

	const rows = await db
		.select({
			resource: tbTable,
			orgName: organizations.name,
			submitterName: userTable.name,
			submitterEmail: userTable.email
		})
		.from(tbTable)
		.leftJoin(organizations, eq(tbTable.organizationId, organizations.id))
		.leftJoin(userTable, eq(tbTable.submittedById, userTable.id))
		.where(where)
		.orderBy(orderByClause)
		.limit(limit)
		.offset(offset);

	const items = rows.map((r) =>
		rowToItem(r.resource, {
			organizationName: r.orgName ?? undefined,
			submitterName: r.submitterName ?? undefined,
			submitterEmail: r.submitterEmail ?? undefined
		})
	);
	return { items, total };
}

export async function getResourceStatusCounts(): Promise<Record<string, number>> {
	const rows = await db
		.select({ status: tbTable.status, count: sql<number>`count(*)::int` })
		.from(tbTable)
		.groupBy(tbTable.status);
	const counts: Record<string, number> = {};
	for (const row of rows) counts[row.status] = row.count;
	return counts;
}

// ── Create / Update / Delete ──────────────────────────────

export async function createResource(
	data: Omit<ToolboxInsert, 'id' | 'slug' | 'createdAt' | 'updatedAt'>,
	database: DbExecutor = db
): Promise<ToolboxRow> {
	const slug = await uniqueSlug(slugify(data.title));
	const [row] = await database
		.insert(tbTable)
		.values({ ...data, slug })
		.returning();
	if (!row) throw new Error('Insert did not return row');
	if (row.status === 'published') {
		await indexDocument('toolbox', itemToSearchDoc(rowToItem(row)));
	}
	return row;
}

export async function updateResource(
	id: string,
	data: Partial<Omit<ToolboxInsert, 'id' | 'createdAt'>>,
	database: DbExecutor = db
): Promise<ToolboxRow | null> {
	const [row] = await database.update(tbTable).set(data).where(eq(tbTable.id, id)).returning();
	if (!row) return null;
	if (row.status === 'published') {
		await indexDocument('toolbox', itemToSearchDoc(rowToItem(row)));
	} else {
		await removeDocument('toolbox', row.id);
	}
	return row;
}

export async function deleteResource(id: string): Promise<boolean> {
	const result = await db.delete(tbTable).where(eq(tbTable.id, id)).returning();
	if (result.length > 0) await removeDocument('toolbox', id);
	return result.length > 0;
}

// ── Moderation ────────────────────────────────────────────

export async function approveResource(id: string, reviewerId: string): Promise<ToolboxRow | null> {
	const current = await getResourceById(id);
	if (!current) return null;
	return updateResource(
		id,
		buildModerationFields(current, {
			status: 'published',
			reviewerId
		})
	);
}

export async function rejectResource(
	id: string,
	reviewerId: string,
	reason?: string
): Promise<ToolboxRow | null> {
	const current = await getResourceById(id);
	if (!current) return null;
	return updateResource(
		id,
		buildModerationFields(current, {
			status: 'rejected',
			reviewerId,
			rejectionReason: reason
		})
	);
}

export async function bulkApproveResources(ids: string[], reviewerId: string): Promise<number> {
	let count = 0;
	for (const id of ids) {
		const result = await approveResource(id, reviewerId);
		if (result) count++;
	}
	return count;
}

export async function bulkRejectResources(
	ids: string[],
	reviewerId: string,
	reason?: string
): Promise<number> {
	let count = 0;
	for (const id of ids) {
		const result = await rejectResource(id, reviewerId, reason);
		if (result) count++;
	}
	return count;
}

export async function bulkDeleteResources(ids: string[]): Promise<number> {
	let count = 0;
	for (const id of ids) {
		const result = await deleteResource(id);
		if (result) count++;
	}
	return count;
}
