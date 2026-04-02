import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { importBatches, importedCandidates, sourceFetchLog, sources } from '$lib/server/db/schema';
import {
	countDueSources,
	getLatestSchedulerRunSummary,
	runDueSources,
	runSourceNow
} from '$lib/server/ingestion/scheduler';
import { validateSourceConfig } from '$lib/server/ingestion/validation';
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
		lowYield,
		updateHeavy,
		approvalRates,
		recentSchedulerRuns,
		repeatedErrors,
		needsCuration
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
		getLowYieldSources(),
		getUpdateHeavySources(),
		getApprovalRates(),
		getRecentSchedulerRuns(),
		getRepeatedErrors(),
		getNeedsCurationSources()
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
		lowYield,
		updateHeavy,
		approvalRates,
		recentSchedulerRuns,
		repeatedErrors,
		needsCuration
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

async function getUpdateHeavySources() {
	const rows = await db
		.select({
			sourceId: sources.id,
			sourceName: sources.name,
			updateRatio: sql<number>`round((sum(${importBatches.itemsUpdated})::numeric / greatest(sum(${importBatches.itemsNormalized}), 1))::numeric, 3)`,
			totalUpdated: sql<number>`sum(${importBatches.itemsUpdated})::int`,
			totalNormalized: sql<number>`sum(${importBatches.itemsNormalized})::int`
		})
		.from(importBatches)
		.innerJoin(sources, eq(importBatches.sourceId, sources.id))
		.groupBy(sources.id, sources.name)
		.having(sql`sum(${importBatches.itemsNormalized}) > 0`)
		.orderBy(
			desc(
				sql`sum(${importBatches.itemsUpdated})::numeric / greatest(sum(${importBatches.itemsNormalized}), 1)`
			)
		)
		.limit(10);

	return rows;
}

async function getApprovalRates() {
	const rows = await db
		.select({
			sourceId: sources.id,
			sourceName: sources.name,
			approvalRatio: sql<number>`round((count(*) filter (where ${importedCandidates.status} in ('approved', 'auto_approved'))::numeric / greatest(count(*), 1))::numeric, 3)`,
			totalReviewed: sql<number>`count(*)::int`,
			totalApproved: sql<number>`count(*) filter (where ${importedCandidates.status} in ('approved', 'auto_approved'))::int`
		})
		.from(importedCandidates)
		.innerJoin(sources, eq(importedCandidates.sourceId, sources.id))
		.where(sql`${importedCandidates.status} not in ('pending_review')`)
		.groupBy(sources.id, sources.name)
		.orderBy(sql`count(*) desc`)
		.limit(10);

	return rows;
}

async function getRecentSchedulerRuns(limit = 6) {
	const batches = await db
		.select({
			id: importBatches.id,
			sourceId: importBatches.sourceId,
			sourceName: sources.name,
			status: importBatches.status,
			startedAt: importBatches.startedAt,
			completedAt: importBatches.completedAt,
			itemsNew: importBatches.itemsNew,
			itemsUpdated: importBatches.itemsUpdated,
			errors: importBatches.errors
		})
		.from(importBatches)
		.innerJoin(sources, eq(importBatches.sourceId, sources.id))
		.orderBy(desc(importBatches.startedAt))
		.limit(100);

	const grouped = new Map<
		string,
		Array<{
			id: string;
			sourceId: string;
			sourceName: string;
			status: string;
			startedAt: Date;
			completedAt: Date | null;
			itemsNew: number;
			itemsUpdated: number;
			errors: unknown;
		}>
	>();

	for (const batch of batches) {
		const meta = Array.isArray(batch.errors)
			? batch.errors.find(
					(entry) =>
						entry && typeof entry === 'object' && (entry as { stage?: string }).stage === 'meta'
				)
			: null;
		if (!meta || typeof meta !== 'object') continue;
		const runId = (meta as { trigger_run_id?: string }).trigger_run_id;
		if (!runId) continue;
		const existing = grouped.get(runId) ?? [];
		existing.push(batch);
		grouped.set(runId, existing);
	}

	return Array.from(grouped.entries())
		.slice(0, limit)
		.map(([triggerRunId, rows]) => ({
			triggerRunId,
			startedAt: rows.map((row) => row.startedAt).sort((a, b) => a.getTime() - b.getTime())[0] ?? null,
			completedAt:
				rows
					.map((row) => row.completedAt)
					.filter((value): value is Date => value instanceof Date)
					.sort((a, b) => b.getTime() - a.getTime())[0] ?? null,
			totalSources: rows.length,
			totalNew: rows.reduce((sum, row) => sum + row.itemsNew, 0),
			totalUpdated: rows.reduce((sum, row) => sum + row.itemsUpdated, 0)
		}));
}

async function getRepeatedErrors() {
	return db
		.select({
			sourceId: sources.id,
			sourceName: sources.name,
			errorCategory: sourceFetchLog.errorCategory,
			errorMessage: sourceFetchLog.errorMessage,
			count: sql<number>`count(*)::int`
		})
		.from(sourceFetchLog)
		.innerJoin(sources, eq(sourceFetchLog.sourceId, sources.id))
		.where(sql`${sourceFetchLog.status} in ('failure', 'timeout', 'partial')`)
		.groupBy(sources.id, sources.name, sourceFetchLog.errorCategory, sourceFetchLog.errorMessage)
		.orderBy(desc(sql`count(*)`))
		.limit(12);
}

async function getNeedsCurationSources() {
	const automated = await getSourcesForAdmin({ limit: 100, sort: 'checked' });
	const duplicateHeavy = await getDuplicateHeavySources();
	const lowYield = await getLowYieldSources();

	const duplicateMap = new Map(duplicateHeavy.map((row) => [row.sourceId, row]));
	const lowYieldMap = new Map(lowYield.map((row) => [row.sourceId, row]));

	return automated.items
		.filter((source) => source.adapterType)
		.map((source) => {
			const validation = validateSourceConfig(source);
			const reasons: string[] = [];
			if (!validation.valid) reasons.push('invalid config');
			if (source.healthStatus === 'broken' || source.healthStatus === 'auth_required') {
				reasons.push(source.healthStatus.replace(/_/g, ' '));
			}
			if (duplicateMap.get(source.id)?.duplicateRatio != null && duplicateMap.get(source.id)!.duplicateRatio >= 0.7) {
				reasons.push('duplicate heavy');
			}
			if (lowYieldMap.get(source.id)?.yieldRatio != null && lowYieldMap.get(source.id)!.yieldRatio <= 0.2) {
				reasons.push('low yield');
			}
			return {
				sourceId: source.id,
				sourceName: source.name,
				adapterType: source.adapterType,
				healthStatus: source.healthStatus,
				valid: validation.valid,
				reasons
			};
		})
		.filter((source) => source.reasons.length > 0)
		.slice(0, 12);
}
