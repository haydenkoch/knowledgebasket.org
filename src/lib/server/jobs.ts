/**
 * Jobs data layer: CRUD, moderation, interest tracking, search indexing.
 */
import { eq, desc, asc, ilike, or, and, sql, notInArray } from 'drizzle-orm';
import { db, type DbExecutor } from '$lib/server/db';
import {
	jobs as jobsTable,
	jobInterests,
	organizations,
	user as userTable
} from '$lib/server/db/schema';
import { indexDocument, removeDocument } from '$lib/server/meilisearch';
import { getSourceProvenanceByPublishedRecord } from '$lib/server/source-provenance';
import { sanitizeRichTextHtml } from '$lib/server/sanitize-rich-text';
import type { JobItem } from '$lib/data/kb';
import type { JobSearchDoc } from '$lib/server/meilisearch';
import { stripHtml } from '$lib/utils/format';
import { buildModerationFields } from '$lib/server/admin-content';

export type JobRow = typeof jobsTable.$inferSelect;
export type JobInsert = typeof jobsTable.$inferInsert;

function sanitizeJobRichTextFields<
	T extends {
		description?: string | null;
		qualifications?: string | null;
		benefits?: string | null;
		applicationInstructions?: string | null;
	}
>(data: T): T {
	const nextData = { ...data };

	if ('description' in nextData) {
		nextData.description = sanitizeRichTextHtml(nextData.description ?? undefined) ?? null;
	}
	if ('qualifications' in nextData) {
		nextData.qualifications = sanitizeRichTextHtml(nextData.qualifications ?? undefined) ?? null;
	}
	if ('benefits' in nextData) {
		nextData.benefits = sanitizeRichTextHtml(nextData.benefits ?? undefined) ?? null;
	}
	if ('applicationInstructions' in nextData) {
		nextData.applicationInstructions =
			sanitizeRichTextHtml(nextData.applicationInstructions ?? undefined) ?? null;
	}

	return nextData;
}

function rowToItem(
	row: JobRow,
	extra?: {
		organizationName?: string;
		organizationSlug?: string;
		interestCount?: number;
		userInterested?: boolean;
		submitterName?: string;
		submitterEmail?: string;
	}
): JobItem {
	return {
		id: row.id,
		slug: row.slug,
		title: row.title,
		description: sanitizeRichTextHtml(row.description ?? undefined),
		qualifications: sanitizeRichTextHtml(row.qualifications ?? undefined),
		coil: 'jobs',
		employerName: row.employerName ?? undefined,
		organizationId: row.organizationId ?? undefined,
		organizationName: extra?.organizationName ?? undefined,
		organizationSlug: extra?.organizationSlug ?? undefined,
		jobType: row.jobType ?? undefined,
		seniority: row.seniority ?? undefined,
		sector: row.sector ?? undefined,
		sectors: row.sectors ?? undefined,
		department: row.department ?? undefined,
		tags: row.tags ?? undefined,
		workArrangement: row.workArrangement ?? undefined,
		location: row.location ?? undefined,
		address: row.address ?? undefined,
		city: row.city ?? undefined,
		state: row.state ?? undefined,
		zip: row.zip ?? undefined,
		lat: row.lat ?? undefined,
		lng: row.lng ?? undefined,
		region: row.region ?? undefined,
		compensationType: row.compensationType ?? undefined,
		compensationMin: row.compensationMin,
		compensationMax: row.compensationMax,
		compensationDescription: row.compensationDescription ?? undefined,
		benefits: sanitizeRichTextHtml(row.benefits ?? undefined),
		applyUrl: row.applyUrl ?? undefined,
		applicationDeadline: row.applicationDeadline?.toISOString() ?? undefined,
		applicationInstructions: sanitizeRichTextHtml(row.applicationInstructions ?? undefined),
		indigenousPriority: row.indigenousPriority ?? undefined,
		tribalPreference: row.tribalPreference ?? undefined,
		imageUrl: row.imageUrl ?? undefined,
		imageUrls: (row.imageUrls as string[] | null) ?? [],
		status: row.status,
		source: row.source,
		featured: row.featured ?? undefined,
		unlisted: row.unlisted ?? undefined,
		createdAt: row.createdAt?.toISOString() ?? undefined,
		updatedAt: row.updatedAt?.toISOString() ?? undefined,
		publishedAt: row.publishedAt?.toISOString() ?? undefined,
		closedAt: row.closedAt?.toISOString() ?? undefined,
		rejectedAt: row.rejectedAt?.toISOString() ?? undefined,
		rejectionReason: row.rejectionReason ?? undefined,
		adminNotes: row.adminNotes ?? undefined,
		submittedById: row.submittedById ?? undefined,
		submitterName: extra?.submitterName ?? undefined,
		submitterEmail: extra?.submitterEmail ?? undefined,
		reviewedById: row.reviewedById ?? undefined,
		interestCount: extra?.interestCount,
		userInterested: extra?.userInterested
	};
}

function itemToSearchDoc(item: JobItem): JobSearchDoc {
	return {
		id: item.id,
		slug: item.slug ?? item.id,
		title: item.title,
		description: item.description ? stripHtml(item.description).slice(0, 2000) : undefined,
		coil: 'jobs',
		employerName: item.employerName,
		location: item.location,
		sector: item.sector,
		jobType: item.jobType,
		seniority: item.seniority,
		workArrangement: item.workArrangement,
		region: item.region,
		indigenousPriority: item.indigenousPriority,
		applicationDeadline: item.applicationDeadline
	};
}

// ── Slug helpers ──────────────────────────────────────────

function slugify(title: string): string {
	return (
		title
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '') || 'job'
	);
}

async function uniqueSlug(base: string): Promise<string> {
	let slug = base.slice(0, 100);
	let n = 0;
	while (true) {
		const existing = await db
			.select({ id: jobsTable.id })
			.from(jobsTable)
			.where(eq(jobsTable.slug, slug))
			.limit(1);
		if (existing.length === 0) return slug;
		n += 1;
		slug = `${base.slice(0, 90)}-${n}`;
	}
}

// ── Public queries ────────────────────────────────────────

export async function getPublishedJobs(): Promise<JobItem[]> {
	const rows = await db
		.select()
		.from(jobsTable)
		.where(eq(jobsTable.status, 'published'))
		.orderBy(desc(jobsTable.publishedAt));
	return rows.map((r) => rowToItem(r));
}

export async function getRecentJobs(limit: number): Promise<JobItem[]> {
	const rows = await db
		.select()
		.from(jobsTable)
		.where(eq(jobsTable.status, 'published'))
		.orderBy(desc(jobsTable.publishedAt))
		.limit(limit);
	return rows.map((r) => rowToItem(r));
}

export async function queryJobsForHomepage(opts: {
	limit: number;
	sortBy: string;
	sortDir: 'asc' | 'desc';
	excludedIds?: string[];
	searchQuery?: string;
}): Promise<JobItem[]> {
	const conditions = [eq(jobsTable.status, 'published')];
	if (opts.excludedIds?.length) conditions.push(notInArray(jobsTable.id, opts.excludedIds));
	if (opts.searchQuery?.trim()) {
		const query = `%${opts.searchQuery.trim()}%`;
		conditions.push(
			or(
				ilike(jobsTable.title, query),
				ilike(jobsTable.description, query),
				ilike(jobsTable.employerName, query),
				ilike(jobsTable.location, query),
				ilike(jobsTable.sector, query)
			)!
		);
	}

	const sortCol = opts.sortBy === 'title' ? jobsTable.title : jobsTable.publishedAt;
	const orderFn = opts.sortDir === 'asc' ? asc : desc;

	const rows = await db
		.select()
		.from(jobsTable)
		.where(and(...conditions))
		.orderBy(orderFn(sortCol))
		.limit(opts.limit);
	return rows.map((r) => rowToItem(r));
}

export async function searchJobsFromDb(q: string, limit = 10) {
	const term = q?.trim();
	if (!term || term.length < 2) return [];
	const rows = await db
		.select({ id: jobsTable.id, title: jobsTable.title, slug: jobsTable.slug })
		.from(jobsTable)
		.where(
			and(
				eq(jobsTable.status, 'published'),
				or(ilike(jobsTable.title, `%${term}%`), ilike(jobsTable.employerName, `%${term}%`))
			)
		)
		.limit(limit);
	return rows.map((r) => ({ id: r.id, title: r.title, slug: r.slug }));
}

export async function getJobBySlug(slug: string, userId?: string): Promise<JobItem | null> {
	const rows = await db
		.select({
			job: jobsTable,
			orgName: organizations.name,
			orgSlug: organizations.slug
		})
		.from(jobsTable)
		.leftJoin(organizations, eq(jobsTable.organizationId, organizations.id))
		.where(eq(jobsTable.slug, slug))
		.limit(1);
	const r = rows[0];
	if (!r) return null;

	// Get interest count
	const [countResult] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(jobInterests)
		.where(eq(jobInterests.jobId, r.job.id));
	const interestCount = countResult?.count ?? 0;

	// Check if current user is interested
	let userInterested = false;
	if (userId) {
		const [interest] = await db
			.select({ id: jobInterests.id })
			.from(jobInterests)
			.where(and(eq(jobInterests.jobId, r.job.id), eq(jobInterests.userId, userId)))
			.limit(1);
		userInterested = !!interest;
	}

	const item = rowToItem(r.job, {
		organizationName: r.orgName ?? undefined,
		organizationSlug: r.orgSlug ?? undefined,
		interestCount,
		userInterested
	});
	item.provenance = await getSourceProvenanceByPublishedRecord('jobs', r.job.id);
	return item;
}

export async function getJobById(id: string): Promise<JobItem | null> {
	const [row] = await db
		.select({
			job: jobsTable,
			orgName: organizations.name,
			orgSlug: organizations.slug,
			submitterName: userTable.name,
			submitterEmail: userTable.email
		})
		.from(jobsTable)
		.leftJoin(organizations, eq(jobsTable.organizationId, organizations.id))
		.leftJoin(userTable, eq(jobsTable.submittedById, userTable.id))
		.where(eq(jobsTable.id, id))
		.limit(1);
	if (!row) return null;
	return rowToItem(row.job, {
		organizationName: row.orgName ?? undefined,
		organizationSlug: row.orgSlug ?? undefined,
		submitterName: row.submitterName ?? undefined,
		submitterEmail: row.submitterEmail ?? undefined
	});
}

export async function getJobsByOrganizationId(orgId: string): Promise<JobItem[]> {
	const rows = await db
		.select()
		.from(jobsTable)
		.where(and(eq(jobsTable.organizationId, orgId), eq(jobsTable.status, 'published')))
		.orderBy(desc(jobsTable.publishedAt));
	return rows.map((r) => rowToItem(r));
}

export async function getJobsByOrganizationIdForWorkspace(orgId: string): Promise<JobItem[]> {
	const rows = await db
		.select()
		.from(jobsTable)
		.where(eq(jobsTable.organizationId, orgId))
		.orderBy(desc(jobsTable.updatedAt));
	return rows.map((row) => rowToItem(row));
}

// ── Interest tracking ─────────────────────────────────────

export async function toggleJobInterest(jobId: string, userId: string): Promise<boolean> {
	const [existing] = await db
		.select({ id: jobInterests.id })
		.from(jobInterests)
		.where(and(eq(jobInterests.jobId, jobId), eq(jobInterests.userId, userId)))
		.limit(1);

	if (existing) {
		await db.delete(jobInterests).where(eq(jobInterests.id, existing.id));
		return false; // no longer interested
	} else {
		await db.insert(jobInterests).values({ jobId, userId });
		return true; // now interested
	}
}

// ── Admin queries ─────────────────────────────────────────

export async function getJobsForAdmin(opts: {
	status?: string;
	search?: string;
	page?: number;
	limit?: number;
	sort?: 'updated' | 'deadline' | 'title';
	order?: 'asc' | 'desc';
}): Promise<{ items: JobItem[]; total: number }> {
	const page = opts.page ?? 1;
	const limit = opts.limit ?? 25;
	const offset = (page - 1) * limit;

	const conditions = [];
	if (opts.status && opts.status !== 'all') {
		conditions.push(eq(jobsTable.status, opts.status));
	}
	if (opts.search) {
		conditions.push(
			or(
				ilike(jobsTable.title, `%${opts.search}%`),
				ilike(jobsTable.employerName, `%${opts.search}%`)
			)!
		);
	}

	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const [countResult] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(jobsTable)
		.where(where);
	const total = countResult?.count ?? 0;

	const orderColumn =
		opts.sort === 'title'
			? jobsTable.title
			: opts.sort === 'deadline'
				? jobsTable.applicationDeadline
				: jobsTable.updatedAt;
	const orderByClause = (opts.order ?? 'desc') === 'asc' ? asc(orderColumn) : desc(orderColumn);

	const rows = await db
		.select({
			job: jobsTable,
			orgName: organizations.name,
			submitterName: userTable.name,
			submitterEmail: userTable.email
		})
		.from(jobsTable)
		.leftJoin(organizations, eq(jobsTable.organizationId, organizations.id))
		.leftJoin(userTable, eq(jobsTable.submittedById, userTable.id))
		.where(where)
		.orderBy(orderByClause)
		.limit(limit)
		.offset(offset);

	const items = rows.map((r) =>
		rowToItem(r.job, {
			organizationName: r.orgName ?? undefined,
			submitterName: r.submitterName ?? undefined,
			submitterEmail: r.submitterEmail ?? undefined
		})
	);
	return { items, total };
}

export async function getJobStatusCounts(): Promise<Record<string, number>> {
	const rows = await db
		.select({ status: jobsTable.status, count: sql<number>`count(*)::int` })
		.from(jobsTable)
		.groupBy(jobsTable.status);
	const counts: Record<string, number> = {};
	for (const row of rows) counts[row.status] = row.count;
	return counts;
}

// ── Create / Update / Delete ──────────────────────────────

export async function createJob(
	data: Omit<JobInsert, 'id' | 'slug' | 'createdAt' | 'updatedAt'>,
	database: DbExecutor = db
): Promise<JobRow> {
	const slug = await uniqueSlug(slugify(data.title));
	const nextData = sanitizeJobRichTextFields(data);
	const [row] = await database
		.insert(jobsTable)
		.values({ ...nextData, slug })
		.returning();
	if (!row) throw new Error('Insert did not return row');
	if (row.status === 'published') {
		await indexDocument('jobs', itemToSearchDoc(rowToItem(row)));
	}
	return row;
}

export async function updateJob(
	id: string,
	data: Partial<Omit<JobInsert, 'id' | 'createdAt'>>,
	database: DbExecutor = db
): Promise<JobRow | null> {
	const nextData = sanitizeJobRichTextFields(data);
	const [row] = await database
		.update(jobsTable)
		.set(nextData)
		.where(eq(jobsTable.id, id))
		.returning();
	if (!row) return null;
	if (row.status === 'published') {
		await indexDocument('jobs', itemToSearchDoc(rowToItem(row)));
	} else {
		await removeDocument('jobs', row.id);
	}
	return row;
}

export async function deleteJob(id: string): Promise<boolean> {
	const result = await db.delete(jobsTable).where(eq(jobsTable.id, id)).returning();
	if (result.length > 0) await removeDocument('jobs', id);
	return result.length > 0;
}

// ── Moderation ────────────────────────────────────────────

export async function approveJob(id: string, reviewerId: string): Promise<JobRow | null> {
	const current = await getJobById(id);
	if (!current) return null;
	return updateJob(
		id,
		buildModerationFields(current, {
			status: 'published',
			reviewerId
		})
	);
}

export async function rejectJob(
	id: string,
	reviewerId: string,
	reason?: string
): Promise<JobRow | null> {
	const current = await getJobById(id);
	if (!current) return null;
	return updateJob(
		id,
		buildModerationFields(current, {
			status: 'rejected',
			reviewerId,
			rejectionReason: reason
		})
	);
}

export async function bulkApproveJobs(ids: string[], reviewerId: string): Promise<number> {
	let count = 0;
	for (const id of ids) {
		const result = await approveJob(id, reviewerId);
		if (result) count++;
	}
	return count;
}

export async function bulkRejectJobs(
	ids: string[],
	reviewerId: string,
	reason?: string
): Promise<number> {
	let count = 0;
	for (const id of ids) {
		const result = await rejectJob(id, reviewerId, reason);
		if (result) count++;
	}
	return count;
}

export async function bulkDeleteJobs(ids: string[]): Promise<number> {
	let count = 0;
	for (const id of ids) {
		const result = await deleteJob(id);
		if (result) count++;
	}
	return count;
}
