import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { importBatches, sourceFetchLog, sources } from '$lib/server/db/schema';
import {
	countDueSources,
	getLatestSchedulerRunSummary,
	runDueSources,
	runSourceNow
} from '$lib/server/ingestion/scheduler';
import { getRecentFailures, getFetchLogSummary } from '$lib/server/source-fetch-log';
import { getSourceHealthSummary, getSourcesForAdmin } from '$lib/server/sources';

export const load: PageServerLoad = async () => {
	const [
		summary,
		fetchSummary,
		dueNowCount,
		latestSchedulerRun,
		stale,
		broken,
		authRequired,
		degraded,
		recentFailures,
		adapterStats,
		duplicateHeavy,
		lowYield
	] = await Promise.all([
		getSourceHealthSummary(),
		getFetchLogSummary(),
		countDueSources(),
		getLatestSchedulerRunSummary(),
		getSourcesForAdmin({ healthStatus: 'stale', limit: 10, sort: 'checked' }),
		getSourcesForAdmin({ healthStatus: 'broken', limit: 10, sort: 'checked' }),
		getSourcesForAdmin({ healthStatus: 'auth_required', limit: 10, sort: 'checked' }),
		getSourcesForAdmin({ healthStatus: 'degraded', limit: 10, sort: 'checked' }),
		getRecentFailures(15),
		getAdapterStats(),
		getDuplicateHeavySources(),
		getLowYieldSources()
	]);

	return {
		summary,
		fetchSummary,
		dueNowCount,
		latestSchedulerRun,
		stale: stale.items,
		broken: broken.items,
		authRequired: authRequired.items,
		degraded: degraded.items,
		recentFailures,
		adapterStats,
		duplicateHeavy,
		lowYield
	};
};

export const actions: Actions = {
	runDueNow: async ({ locals }) => {
		try {
			const runResult = await runDueSources({
				trigger: 'scheduler',
				triggeredBy: locals.user?.id ?? null
			});
			return { success: true, runResult };
		} catch (error) {
			return fail(400, {
				error: error instanceof Error ? error.message : 'Failed to run due sources'
			});
		}
	},
	retrySource: async ({ request, locals }) => {
		const formData = await request.formData();
		const sourceId = (formData.get('sourceId') as string | null)?.trim();
		if (!sourceId) return fail(400, { error: 'Source ID is required' });

		try {
			const retryResult = await runSourceNow(sourceId, 'admin_retry', {
				triggeredBy: locals.user?.id ?? null
			});
			return { success: true, retryResult };
		} catch (error) {
			return fail(400, {
				error: error instanceof Error ? error.message : 'Failed to retry source'
			});
		}
	}
};

async function getAdapterStats() {
	const rows = await db
		.select({
			adapterType: sources.adapterType,
			successes: sql<number>`count(*) filter (where ${sourceFetchLog.status} = 'success')::int`,
			failures: sql<number>`count(*) filter (where ${sourceFetchLog.status} in ('failure', 'timeout', 'partial'))::int`,
			totalSources: sql<number>`count(distinct ${sources.id})::int`
		})
		.from(sources)
		.leftJoin(sourceFetchLog, eq(sources.id, sourceFetchLog.sourceId))
		.where(sql`${sources.adapterType} is not null`)
		.groupBy(sources.adapterType)
		.orderBy(desc(sql`count(*) filter (where ${sourceFetchLog.status} = 'success')`));

	return rows.map((row) => ({
		adapterType: row.adapterType ?? 'unknown',
		successes: row.successes,
		failures: row.failures,
		totalSources: row.totalSources
	}));
}

async function getDuplicateHeavySources() {
	const rows = await db
		.select({
			sourceId: sources.id,
			sourceName: sources.name,
			duplicateRatio: sql<number>`round((sum(${importBatches.itemsDuplicate})::numeric / greatest(sum(${importBatches.itemsNormalized}), 1))::numeric, 3)`,
			totalDuplicate: sql<number>`sum(${importBatches.itemsDuplicate})::int`,
			totalNormalized: sql<number>`sum(${importBatches.itemsNormalized})::int`
		})
		.from(importBatches)
		.innerJoin(sources, eq(importBatches.sourceId, sources.id))
		.groupBy(sources.id, sources.name)
		.having(sql`sum(${importBatches.itemsNormalized}) > 0`)
		.orderBy(
			desc(
				sql`sum(${importBatches.itemsDuplicate})::numeric / greatest(sum(${importBatches.itemsNormalized}), 1)`
			)
		)
		.limit(10);

	return rows;
}

async function getLowYieldSources() {
	const rows = await db
		.select({
			sourceId: sources.id,
			sourceName: sources.name,
			yieldRatio: sql<number>`round((sum(${importBatches.itemsNew})::numeric / greatest(sum(${importBatches.itemsFetched}), 1))::numeric, 3)`,
			totalFetched: sql<number>`sum(${importBatches.itemsFetched})::int`,
			totalNew: sql<number>`sum(${importBatches.itemsNew})::int`
		})
		.from(importBatches)
		.innerJoin(sources, eq(importBatches.sourceId, sources.id))
		.groupBy(sources.id, sources.name)
		.having(sql`sum(${importBatches.itemsFetched}) > 0`)
		.orderBy(
			sql`sum(${importBatches.itemsNew})::numeric / greatest(sum(${importBatches.itemsFetched}), 1) asc`
		)
		.limit(10);

	return rows;
}
