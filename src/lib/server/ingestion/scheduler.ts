import * as Sentry from '@sentry/sveltekit';
import { and, asc, eq, isNull, lte, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { importBatches, sources } from '$lib/server/db/schema';
import { ingestSource } from './pipeline';
import { randomRunId } from './shared';
import type { SchedulerRunResult, SchedulerSourceRunResult, SourceRecord } from './types';

const DEFAULT_LIMIT = 10;

export async function selectDueSources(
	now = new Date(),
	limit = DEFAULT_LIMIT
): Promise<SourceRecord[]> {
	return db
		.select()
		.from(sources)
		.where(
			and(
				eq(sources.enabled, true),
				eq(sources.quarantined, false),
				eq(sources.status, 'active'),
				sql`${sources.adapterType} is not null`,
				sql`${sources.ingestionMethod} not in ('manual_only', 'manual_with_reminder')`,
				or(lte(sources.nextCheckAt, now), isNull(sources.lastCheckedAt))
			)
		)
		.orderBy(asc(sources.nextCheckAt), asc(sources.lastCheckedAt))
		.limit(limit);
}

export async function countDueSources(now = new Date()): Promise<number> {
	const [row] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(sources)
		.where(
			and(
				eq(sources.enabled, true),
				eq(sources.quarantined, false),
				eq(sources.status, 'active'),
				sql`${sources.adapterType} is not null`,
				sql`${sources.ingestionMethod} not in ('manual_only', 'manual_with_reminder')`,
				or(lte(sources.nextCheckAt, now), isNull(sources.lastCheckedAt))
			)
		);
	return row?.count ?? 0;
}

export async function runDueSources(options?: {
	now?: Date;
	limit?: number;
	trigger?: string;
	triggeredBy?: string | null;
}): Promise<SchedulerRunResult> {
	return Sentry.startSpan(
		{
			name: 'ingestion.run_due_sources',
			op: 'ingestion.scheduler',
			attributes: {
				'ingestion.trigger': options?.trigger ?? 'scheduler',
				'ingestion.limit': options?.limit ?? DEFAULT_LIMIT
			}
		},
		async () => {
			const now = options?.now ?? new Date();
			const limit = options?.limit ?? DEFAULT_LIMIT;
			const trigger = options?.trigger ?? 'scheduler';
			const triggerRunId = randomRunId();
			const startedAt = new Date();

			const hasLock = await tryAdvisoryLock('source-ops:run-due');
			if (!hasLock) {
				return {
					trigger,
					triggerRunId,
					startedAt: startedAt.toISOString(),
					completedAt: new Date().toISOString(),
					totalSelected: 0,
					totalProcessed: 0,
					totalSucceeded: 0,
					totalFailed: 1,
					totalCandidatesCreated: 0,
					totalAutoApproved: 0,
					results: [
						{
							sourceId: 'scheduler-lock',
							sourceName: 'Scheduler lock',
							success: false,
							batchId: null,
							fetchLogId: null,
							candidatesCreated: 0,
							autoApprovedCount: 0,
							error: 'A scheduled source-op run is already in progress.'
						}
					]
				};
			}

			try {
				const dueSources = await selectDueSources(now, limit);
				const results: SchedulerSourceRunResult[] = [];

				for (const source of dueSources) {
					results.push(
						await runSourceNow(source.id, trigger, {
							triggerRunId,
							triggeredBy: options?.triggeredBy ?? null
						})
					);
				}

				return {
					trigger,
					triggerRunId,
					startedAt: startedAt.toISOString(),
					completedAt: new Date().toISOString(),
					totalSelected: dueSources.length,
					totalProcessed: results.length,
					totalSucceeded: results.filter((result) => result.success).length,
					totalFailed: results.filter((result) => !result.success).length,
					totalCandidatesCreated: results.reduce(
						(sum, result) => sum + result.candidatesCreated,
						0
					),
					totalAutoApproved: results.reduce((sum, result) => sum + result.autoApprovedCount, 0),
					results
				};
			} finally {
				await releaseAdvisoryLock('source-ops:run-due');
			}
		}
	);
}

export async function runSourceNow(
	sourceId: string,
	trigger: string,
	options?: { triggerRunId?: string | null; triggeredBy?: string | null }
): Promise<SchedulerSourceRunResult> {
	return Sentry.startSpan(
		{
			name: 'ingestion.run_source_now',
			op: 'ingestion.scheduler',
			attributes: {
				'ingestion.source_id': sourceId,
				'ingestion.trigger': trigger
			}
		},
		async () => {
			const [source] = await db.select().from(sources).where(eq(sources.id, sourceId)).limit(1);
			if (!source) {
				return {
					sourceId,
					sourceName: 'Unknown source',
					success: false,
					batchId: null,
					fetchLogId: null,
					candidatesCreated: 0,
					autoApprovedCount: 0,
					error: 'Source not found'
				};
			}

			const lockKey = `source-ops:source:${sourceId}`;
			const hasLock = await tryAdvisoryLock(lockKey);
			if (!hasLock) {
				return {
					sourceId,
					sourceName: source.name,
					success: false,
					batchId: null,
					fetchLogId: null,
					candidatesCreated: 0,
					autoApprovedCount: 0,
					error: 'Source is already being ingested by another runner.'
				};
			}

			try {
				const result = await ingestSource(sourceId, {
					trigger,
					triggerRunId: options?.triggerRunId ?? null,
					triggeredBy: options?.triggeredBy ?? null,
					enableAutoApprove: true
				});
				return {
					sourceId,
					sourceName: source.name,
					success: result.success,
					batchId: result.batchId,
					fetchLogId: result.fetchLogId,
					candidatesCreated: result.candidatesCreated,
					autoApprovedCount: result.autoApprovedCount,
					error: result.errors[0] ?? null
				};
			} catch (error) {
				return {
					sourceId,
					sourceName: source.name,
					success: false,
					batchId: null,
					fetchLogId: null,
					candidatesCreated: 0,
					autoApprovedCount: 0,
					error: error instanceof Error ? error.message : 'Source run failed'
				};
			} finally {
				await releaseAdvisoryLock(lockKey);
			}
		}
	);
}

export async function getLatestSchedulerRunSummary() {
	const batches = await db
		.select({
			id: importBatches.id,
			sourceId: importBatches.sourceId,
			status: importBatches.status,
			startedAt: importBatches.startedAt,
			completedAt: importBatches.completedAt,
			itemsNew: importBatches.itemsNew,
			itemsUpdated: importBatches.itemsUpdated,
			errors: importBatches.errors,
			sourceName: sources.name
		})
		.from(importBatches)
		.innerJoin(sources, eq(importBatches.sourceId, sources.id))
		.orderBy(sql`${importBatches.startedAt} desc`)
		.limit(50);

	const runs = new Map<string, typeof batches>();
	for (const batch of batches) {
		const meta = getBatchMeta(batch.errors);
		if (!meta?.trigger_run_id || meta.trigger !== 'scheduler') continue;
		const existing = runs.get(meta.trigger_run_id) ?? [];
		existing.push(batch);
		runs.set(meta.trigger_run_id, existing);
	}

	const [latestRunId, latestBatches] = runs.entries().next().value ?? [];
	if (!latestRunId || !latestBatches) return null;

	return {
		triggerRunId: latestRunId,
		startedAt:
			latestBatches
				.map((batch) => batch.startedAt)
				.sort((left, right) => left.getTime() - right.getTime())[0] ?? null,
		completedAt:
			latestBatches
				.map((batch) => batch.completedAt)
				.filter((value): value is Date => value instanceof Date)
				.sort((left, right) => right.getTime() - left.getTime())[0] ?? null,
		totalSources: latestBatches.length,
		totalNew: latestBatches.reduce((sum, batch) => sum + batch.itemsNew, 0),
		totalUpdated: latestBatches.reduce((sum, batch) => sum + batch.itemsUpdated, 0),
		results: latestBatches.map((batch) => ({
			sourceId: batch.sourceId,
			sourceName: batch.sourceName,
			status: batch.status,
			startedAt: batch.startedAt,
			completedAt: batch.completedAt
		}))
	};
}

function getBatchMeta(value: unknown) {
	if (!Array.isArray(value)) return null;
	return value.find(
		(entry): entry is { stage?: string; trigger?: string; trigger_run_id?: string } =>
			Boolean(entry) && typeof entry === 'object' && (entry as { stage?: string }).stage === 'meta'
	);
}

async function tryAdvisoryLock(lockKey: string) {
	const [row] = await db.execute(
		sql<{ locked: boolean }[]>`select pg_try_advisory_lock(hashtext(${lockKey})) as locked`
	);
	return row?.locked ?? false;
}

async function releaseAdvisoryLock(lockKey: string) {
	await db.execute(sql`select pg_advisory_unlock(hashtext(${lockKey}))`);
}
