/**
 * Red Pages (Native Business Directory) data layer: CRUD, moderation, search indexing.
 */
import { eq, desc, asc, ilike, or, and, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	redPagesBusinesses as rpTable,
	organizations,
	user as userTable
} from '$lib/server/db/schema';
import { indexDocument, removeDocument } from '$lib/server/meilisearch';
import type { RedPagesItem } from '$lib/data/kb';
import type { RedPagesSearchDoc } from '$lib/server/meilisearch';
import { stripHtml } from '$lib/utils/format';

export type RedPagesRow = typeof rpTable.$inferSelect;
export type RedPagesInsert = typeof rpTable.$inferInsert;

function rowToItem(
	row: RedPagesRow,
	extra?: { organizationName?: string; organizationSlug?: string }
): RedPagesItem {
	return {
		id: row.id,
		title: row.name,
		slug: row.slug,
		name: row.name,
		description: row.description ?? undefined,
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
		publishedAt: row.publishedAt?.toISOString() ?? undefined,
		rejectedAt: row.rejectedAt?.toISOString() ?? undefined,
		rejectionReason: row.rejectionReason ?? undefined,
		adminNotes: row.adminNotes ?? undefined,
		submittedById: row.submittedById ?? undefined,
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
	// eslint-disable-next-line no-constant-condition
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
	return rowToItem(r.business, {
		organizationName: r.orgName ?? undefined,
		organizationSlug: r.orgSlug ?? undefined
	});
}

export async function getBusinessById(id: string): Promise<RedPagesItem | null> {
	const [row] = await db.select().from(rpTable).where(eq(rpTable.id, id)).limit(1);
	if (!row) return null;
	return rowToItem(row);
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
			or(
				ilike(rpTable.name, `%${opts.search}%`),
				ilike(rpTable.serviceType, `%${opts.search}%`)
			)!
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
			submitterName: userTable.name
		})
		.from(rpTable)
		.leftJoin(organizations, eq(rpTable.organizationId, organizations.id))
		.leftJoin(userTable, eq(rpTable.submittedById, userTable.id))
		.where(where)
		.orderBy(orderByClause)
		.limit(limit)
		.offset(offset);

	const items = rows.map((r) =>
		rowToItem(r.business, { organizationName: r.orgName ?? undefined })
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
	data: Omit<RedPagesInsert, 'id' | 'slug' | 'createdAt' | 'updatedAt'>
): Promise<RedPagesRow> {
	const slug = await uniqueSlug(slugify(data.name));
	const [row] = await db
		.insert(rpTable)
		.values({ ...data, slug })
		.returning();
	if (!row) throw new Error('Insert did not return row');
	if (row.status === 'published') {
		await indexDocument('redpages', itemToSearchDoc(rowToItem(row)));
	}
	return row;
}

export async function updateBusiness(
	id: string,
	data: Partial<Omit<RedPagesInsert, 'id' | 'createdAt'>>
): Promise<RedPagesRow | null> {
	const [row] = await db
		.update(rpTable)
		.set(data)
		.where(eq(rpTable.id, id))
		.returning();
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
	return updateBusiness(id, {
		status: 'published',
		publishedAt: new Date(),
		reviewedById: reviewerId
	});
}

export async function rejectBusiness(
	id: string,
	reviewerId: string,
	reason?: string
): Promise<RedPagesRow | null> {
	return updateBusiness(id, {
		status: 'rejected',
		rejectedAt: new Date(),
		reviewedById: reviewerId,
		rejectionReason: reason
	});
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
