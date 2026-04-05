import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { sourceRunStages, sourceRuns, sources } from '$lib/server/db/schema';
import type { IngestionStage, IngestionStageStatus } from './types';

export type SourceRunRow = typeof sourceRuns.$inferSelect;
export type SourceRunStageRow = typeof sourceRunStages.$inferSelect;

export async function createSourceRun(input: {
	sourceId: string;
	trigger: string;
	triggerRunId?: string | null;
	retryOfRunId?: string | null;
	triggeredBy?: string | null;
	adapterType?: string | null;
	adapterVersion?: string | null;
	fetchUrl?: string | null;
}) {
	const [row] = await db
		.insert(sourceRuns)
		.values({
			sourceId: input.sourceId,
			trigger: input.trigger,
			triggerRunId: input.triggerRunId ?? null,
			retryOfRunId: input.retryOfRunId ?? null,
			triggeredBy: input.triggeredBy ?? null,
			adapterType: input.adapterType ?? null,
			adapterVersion: input.adapterVersion ?? null,
			fetchUrl: input.fetchUrl ?? null
		})
		.returning();

	if (!row) throw new Error('Failed to create source run');
	return row;
}

export async function updateSourceRun(
	id: string,
	patch: Partial<
		Omit<typeof sourceRuns.$inferInsert, 'id' | 'sourceId' | 'createdAt' | 'updatedAt'>
	>
) {
	const [row] = await db.update(sourceRuns).set(patch).where(eq(sourceRuns.id, id)).returning();
	return row ?? null;
}

export async function recordSourceRunStage(
	sourceRunId: string,
	stage: IngestionStage,
	input: {
		status: IngestionStageStatus;
		startedAt?: Date;
		completedAt?: Date | null;
		durationMs?: number | null;
		itemCount?: number | null;
		warnings?: string[];
		errors?: string[];
		metrics?: Record<string, unknown>;
		details?: Record<string, unknown>;
	}
) {
	const values = {
		sourceRunId,
		stage,
		status: input.status,
		startedAt: input.startedAt ?? new Date(),
		completedAt: input.completedAt ?? null,
		durationMs: input.durationMs ?? null,
		itemCount: input.itemCount ?? null,
		warnings: input.warnings ?? [],
		errors: input.errors ?? [],
		metrics: input.metrics ?? {},
		details: input.details ?? {}
	};

	const [existing] = await db
		.select({ id: sourceRunStages.id })
		.from(sourceRunStages)
		.where(and(eq(sourceRunStages.sourceRunId, sourceRunId), eq(sourceRunStages.stage, stage)))
		.limit(1);

	if (existing) {
		const [updated] = await db
			.update(sourceRunStages)
			.set(values)
			.where(eq(sourceRunStages.id, existing.id))
			.returning();
		return updated ?? null;
	}

	const [created] = await db.insert(sourceRunStages).values(values).returning();
	return created ?? null;
}

export async function getRecentSourceRuns(sourceId: string, limit = 10) {
	return db
		.select()
		.from(sourceRuns)
		.where(eq(sourceRuns.sourceId, sourceId))
		.orderBy(desc(sourceRuns.startedAt))
		.limit(limit);
}

export async function getRunStages(sourceRunId: string) {
	return db
		.select()
		.from(sourceRunStages)
		.where(eq(sourceRunStages.sourceRunId, sourceRunId))
		.orderBy(sourceRunStages.startedAt);
}

export async function getSourceRunHealthMetrics(limit = 50) {
	const rows = await db
		.select({
			sourceId: sourceRuns.sourceId,
			sourceName: sources.name,
			totalRuns: sql<number>`count(*)::int`,
			failedRuns: sql<number>`count(*) filter (where ${sourceRuns.status} = 'failed')::int`,
			avgDurationMs: sql<number>`coalesce(avg(${sourceRuns.durationMs}), 0)::int`,
			missingImageRate: sql<number>`coalesce(avg(((${sourceRuns.metrics} ->> 'missingImageRate')::numeric)), 0)::float`,
			lowConfidenceRate: sql<number>`coalesce(avg(((${sourceRuns.metrics} ->> 'lowConfidenceRate')::numeric)), 0)::float`,
			enrichmentFailureRate: sql<number>`coalesce(avg(((${sourceRuns.metrics} ->> 'detailEnrichmentFailureRate')::numeric)), 0)::float`,
			aiConflictRate: sql<number>`coalesce(avg(((${sourceRuns.metrics} ->> 'aiConflictRate')::numeric)), 0)::float`
		})
		.from(sourceRuns)
		.innerJoin(sources, eq(sourceRuns.sourceId, sources.id))
		.groupBy(sourceRuns.sourceId, sources.name)
		.orderBy(desc(sql`count(*)`))
		.limit(limit);

	return rows;
}
