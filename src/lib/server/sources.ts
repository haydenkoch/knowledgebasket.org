import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { sourceTags, sources, user as userTable } from '$lib/server/db/schema';
import { normalizePublicHttpUrl } from '$lib/server/url-safety';

export type SourceRow = typeof sources.$inferSelect;
export type SourceInsert = typeof sources.$inferInsert;
export type SourceTagRow = typeof sourceTags.$inferSelect;

export type SourceTagInput = {
	tagKey: string;
	tagValue: string;
};

export type SourceDetail = {
	source: SourceRow;
	tags: SourceTagRow[];
};

export type SourceAdminListItem = SourceRow & {
	ownerName?: string;
	ownerEmail?: string;
};

function slugify(name: string): string {
	return (
		name
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '') || 'source'
	);
}

async function uniqueSlug(base: string): Promise<string> {
	let slug = base.slice(0, 100);
	let n = 0;
	while (true) {
		const existing = await db
			.select({ id: sources.id })
			.from(sources)
			.where(eq(sources.slug, slug))
			.limit(1);
		if (existing.length === 0) return slug;
		n += 1;
		slug = `${base.slice(0, 90)}-${n}`;
	}
}

function normalizeTags(tags?: SourceTagInput[]): SourceTagInput[] {
	if (!tags) return [];
	return tags
		.map((tag) => ({
			tagKey: tag.tagKey.trim(),
			tagValue: tag.tagValue.trim()
		}))
		.filter((tag) => tag.tagKey.length > 0 && tag.tagValue.length > 0);
}

function requireSafeSourceUrl(value: string | null | undefined, field: string): string {
	const normalized = normalizePublicHttpUrl(value);
	if (!normalized) {
		throw new Error(`${field} must be a valid public http or https URL.`);
	}
	return normalized;
}

function optionalSafeSourceUrl(value: string | null | undefined, field: string): string | null {
	if (!value?.trim()) return null;
	return requireSafeSourceUrl(value, field);
}

export async function getSourcesForAdmin(opts?: {
	status?: string;
	healthStatus?: string;
	enabled?: string | boolean;
	quarantined?: string | boolean;
	coil?: string;
	search?: string;
	page?: number;
	limit?: number;
	sort?: 'updated' | 'checked' | 'name' | 'created';
	order?: 'asc' | 'desc';
}): Promise<{ items: SourceAdminListItem[]; total: number }> {
	const page = opts?.page ?? 1;
	const limit = opts?.limit ?? 25;
	const offset = (page - 1) * limit;

	const conditions = [];

	if (opts?.status && opts.status !== 'all') {
		conditions.push(eq(sources.status, opts.status as SourceRow['status']));
	}

	if (opts?.healthStatus && opts.healthStatus !== 'all') {
		conditions.push(eq(sources.healthStatus, opts.healthStatus as SourceRow['healthStatus']));
	}

	if (typeof opts?.enabled === 'boolean') {
		conditions.push(eq(sources.enabled, opts.enabled));
	} else if (opts?.enabled === 'true') {
		conditions.push(eq(sources.enabled, true));
	} else if (opts?.enabled === 'false') {
		conditions.push(eq(sources.enabled, false));
	}

	if (typeof opts?.quarantined === 'boolean') {
		conditions.push(eq(sources.quarantined, opts.quarantined));
	} else if (opts?.quarantined === 'true') {
		conditions.push(eq(sources.quarantined, true));
	} else if (opts?.quarantined === 'false') {
		conditions.push(eq(sources.quarantined, false));
	}

	if (opts?.coil && opts.coil !== 'all') {
		conditions.push(sql`${sources.coils} @> ARRAY[${opts.coil}]::coil_type[]`);
	}

	if (opts?.search) {
		conditions.push(
			or(
				ilike(sources.name, `%${opts.search}%`),
				ilike(sources.slug, `%${opts.search}%`),
				ilike(sources.sourceUrl, `%${opts.search}%`),
				ilike(sources.fetchUrl, `%${opts.search}%`),
				ilike(sources.homepageUrl, `%${opts.search}%`)
			)!
		);
	}

	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const [countResult] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(sources)
		.where(where);
	const total = countResult?.count ?? 0;

	const orderColumn =
		opts?.sort === 'name'
			? sources.name
			: opts?.sort === 'created'
				? sources.createdAt
				: opts?.sort === 'checked'
					? sources.lastCheckedAt
					: sources.updatedAt;
	const orderByClause = (opts?.order ?? 'desc') === 'asc' ? asc(orderColumn) : desc(orderColumn);

	const rows = await db
		.select({
			source: sources,
			ownerName: userTable.name,
			ownerEmail: userTable.email
		})
		.from(sources)
		.leftJoin(userTable, eq(sources.ownerUserId, userTable.id))
		.where(where)
		.orderBy(orderByClause)
		.limit(limit)
		.offset(offset);

	return {
		items: rows.map((row) => ({
			...row.source,
			ownerName: row.ownerName ?? undefined,
			ownerEmail: row.ownerEmail ?? undefined
		})),
		total
	};
}

export async function getSourceById(id: string): Promise<SourceDetail | null> {
	const [source] = await db.select().from(sources).where(eq(sources.id, id)).limit(1);
	if (!source) return null;

	const tags = await db
		.select()
		.from(sourceTags)
		.where(eq(sourceTags.sourceId, id))
		.orderBy(asc(sourceTags.tagKey), asc(sourceTags.tagValue));

	return { source, tags };
}

export async function createSource(
	data: Omit<SourceInsert, 'id' | 'slug' | 'createdAt' | 'updatedAt'> & {
		tags?: SourceTagInput[];
	}
): Promise<SourceDetail> {
	const { tags = [], ...sourceData } = data;
	const normalizedSourceData = {
		...sourceData,
		sourceUrl: requireSafeSourceUrl(sourceData.sourceUrl, 'Source URL'),
		homepageUrl: optionalSafeSourceUrl(sourceData.homepageUrl, 'Homepage URL'),
		fetchUrl: optionalSafeSourceUrl(sourceData.fetchUrl, 'Fetch URL')
	};
	const slug = await uniqueSlug(slugify(normalizedSourceData.name));

	return db.transaction(async (tx) => {
		const [source] = await tx
			.insert(sources)
			.values({
				...normalizedSourceData,
				slug
			})
			.returning();

		if (!source) throw new Error('Insert did not return row');

		const normalizedTags = normalizeTags(tags);
		if (normalizedTags.length > 0) {
			await tx.insert(sourceTags).values(
				normalizedTags.map((tag) => ({
					sourceId: source.id,
					tagKey: tag.tagKey,
					tagValue: tag.tagValue
				}))
			);
		}

		const createdTags =
			normalizedTags.length > 0
				? await tx.select().from(sourceTags).where(eq(sourceTags.sourceId, source.id))
				: [];

		return { source, tags: createdTags };
	});
}

export async function updateSource(
	id: string,
	data: Partial<Omit<SourceInsert, 'id' | 'createdAt'>> & {
		tags?: SourceTagInput[];
	}
): Promise<SourceDetail | null> {
	const { tags, ...sourceData } = data;
	const normalizedSourceData = { ...sourceData };

	if ('sourceUrl' in normalizedSourceData) {
		normalizedSourceData.sourceUrl = requireSafeSourceUrl(
			normalizedSourceData.sourceUrl ?? null,
			'Source URL'
		);
	}

	if ('homepageUrl' in normalizedSourceData) {
		normalizedSourceData.homepageUrl = optionalSafeSourceUrl(
			normalizedSourceData.homepageUrl ?? null,
			'Homepage URL'
		);
	}

	if ('fetchUrl' in normalizedSourceData) {
		normalizedSourceData.fetchUrl = optionalSafeSourceUrl(
			normalizedSourceData.fetchUrl ?? null,
			'Fetch URL'
		);
	}

	return db.transaction(async (tx) => {
		const [source] = await tx
			.update(sources)
			.set(normalizedSourceData)
			.where(eq(sources.id, id))
			.returning();
		if (!source) return null;

		if (tags) {
			await tx.delete(sourceTags).where(eq(sourceTags.sourceId, id));
			const normalizedTags = normalizeTags(tags);
			if (normalizedTags.length > 0) {
				await tx.insert(sourceTags).values(
					normalizedTags.map((tag) => ({
						sourceId: id,
						tagKey: tag.tagKey,
						tagValue: tag.tagValue
					}))
				);
			}
		}

		const nextTags = await tx
			.select()
			.from(sourceTags)
			.where(eq(sourceTags.sourceId, id))
			.orderBy(asc(sourceTags.tagKey), asc(sourceTags.tagValue));

		return { source, tags: nextTags };
	});
}

export async function getSourceStatusCounts(): Promise<Record<string, number>> {
	const rows = await db
		.select({ status: sources.status, count: sql<number>`count(*)::int` })
		.from(sources)
		.groupBy(sources.status);

	const counts: Record<string, number> = {};
	for (const row of rows) counts[row.status] = row.count;
	return counts;
}

export async function getSourceHealthSummary(): Promise<{
	total: number;
	enabled: number;
	active: number;
	reviewRequired: number;
	quarantined: number;
	healthCounts: Record<string, number>;
}> {
	const [summary] = await db
		.select({
			total: sql<number>`count(*)::int`,
			enabled: sql<number>`count(*) filter (where ${sources.enabled} = true)::int`,
			active: sql<number>`count(*) filter (where ${sources.status} = 'active')::int`,
			reviewRequired: sql<number>`count(*) filter (where ${sources.reviewRequired} = true)::int`,
			quarantined: sql<number>`count(*) filter (where ${sources.quarantined} = true)::int`
		})
		.from(sources);

	const healthRows = await db
		.select({
			healthStatus: sources.healthStatus,
			count: sql<number>`count(*)::int`
		})
		.from(sources)
		.groupBy(sources.healthStatus);

	const healthCounts: Record<string, number> = {};
	for (const row of healthRows) healthCounts[row.healthStatus] = row.count;

	return {
		total: summary?.total ?? 0,
		enabled: summary?.enabled ?? 0,
		active: summary?.active ?? 0,
		reviewRequired: summary?.reviewRequired ?? 0,
		quarantined: summary?.quarantined ?? 0,
		healthCounts
	};
}
