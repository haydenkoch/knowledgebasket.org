import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { sourceFetchLog, sources } from '$lib/server/db/schema';

export type SourceFetchLogRow = typeof sourceFetchLog.$inferSelect;
export type SourceFetchLogInsert = typeof sourceFetchLog.$inferInsert;

export async function getFetchLogsForSource(
	sourceId: string,
	limit = 20
): Promise<SourceFetchLogRow[]> {
	return db
		.select()
		.from(sourceFetchLog)
		.where(eq(sourceFetchLog.sourceId, sourceId))
		.orderBy(desc(sourceFetchLog.attemptedAt))
		.limit(limit);
}

export async function createFetchLog(
	data: Omit<SourceFetchLogInsert, 'id' | 'attemptedAt'>
): Promise<SourceFetchLogRow> {
	const [row] = await db.insert(sourceFetchLog).values(data).returning();
	if (!row) throw new Error('Insert did not return row');
	return row;
}

export async function getRecentFailures(limit = 20): Promise<
	Array<{
		log: SourceFetchLogRow;
		sourceName: string;
		sourceSlug: string;
	}>
> {
	const rows = await db
		.select({
			log: sourceFetchLog,
			sourceName: sources.name,
			sourceSlug: sources.slug
		})
		.from(sourceFetchLog)
		.innerJoin(sources, eq(sourceFetchLog.sourceId, sources.id))
		.where(
			and(
				eq(sources.enabled, true),
				sql`${sourceFetchLog.status} in ('failure', 'timeout', 'partial')`
			)
		)
		.orderBy(desc(sourceFetchLog.attemptedAt))
		.limit(limit);

	return rows.map((row) => ({
		log: row.log,
		sourceName: row.sourceName,
		sourceSlug: row.sourceSlug
	}));
}

export async function getFetchLogSummary(): Promise<{
	totalAttempts: number;
	successes: number;
	failures: number;
	changedContent: number;
}> {
	const [summary] = await db
		.select({
			totalAttempts: sql<number>`count(*)::int`,
			successes: sql<number>`count(*) filter (where ${sourceFetchLog.status} = 'success')::int`,
			failures:
				sql<number>`count(*) filter (where ${sourceFetchLog.status} in ('failure', 'timeout'))::int`,
			changedContent:
				sql<number>`count(*) filter (where ${sourceFetchLog.contentChanged} = true)::int`
		})
		.from(sourceFetchLog);

	return {
		totalAttempts: summary?.totalAttempts ?? 0,
		successes: summary?.successes ?? 0,
		failures: summary?.failures ?? 0,
		changedContent: summary?.changedContent ?? 0
	};
}
