import { and, eq, inArray, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { importBatches, importedCandidates, sourceFetchLog, sources } from '$lib/server/db/schema';
import { getSourceById } from '$lib/server/sources';
import { approveCandidate } from '$lib/server/import-candidates';
import {
	compositeKey,
	contentFingerprint,
	createDedupeLookup,
	runDedupeStrategies
} from './dedupe';
import { adapterRegistry } from './registry';
import { computeCandidatePriority, computeHealthStatus, computeNextCheckAt } from './status';
import type {
	AdapterConfig,
	DedupeResult,
	IngestionExecutionOptions,
	IngestionPreviewResult,
	IngestionResult,
	NormalizedRecord,
	PreviewCandidate,
	SourceRecord
} from './types';

export async function previewSource(sourceId: string): Promise<IngestionPreviewResult> {
	const source = await loadSourceRecord(sourceId);
	const adapter = getAdapterForSource(source);
	const startedAt = Date.now();

	const fetchResult = await adapter.fetch(source);
	if (!fetchResult.success || !fetchResult.rawContent) {
		return {
			sourceId,
			adapterType: adapter.adapterType,
			fetchResult,
			parseResult: null,
			normalizeResult: null,
			candidates: [],
			dedupeCounts: emptyDedupeCounts(),
			durationMs: Date.now() - startedAt
		};
	}

	const config = buildAdapterConfig(source);
	const parseResult = await adapter.parse(fetchResult.rawContent, config);
	const normalizeResult = parseResult.success
		? await adapter.normalize(parseResult.items, source.coils[0], config)
		: null;

	const candidates =
		parseResult.success && normalizeResult
			? await buildPreviewCandidates(source, parseResult.items, normalizeResult.records)
			: [];

	return {
		sourceId,
		adapterType: adapter.adapterType,
		fetchResult,
		parseResult,
		normalizeResult,
		candidates,
		dedupeCounts: countDedupeResults(candidates),
		durationMs: Date.now() - startedAt
	};
}

export async function ingestSource(
	sourceId: string,
	options: IngestionExecutionOptions = {}
): Promise<IngestionResult> {
	const source = await loadSourceRecord(sourceId);
	const preview = await previewSource(sourceId);
	const now = new Date();
	const errors = collectPreviewErrors(preview);
	const contentChanged = preview.fetchResult.contentHash
		? preview.fetchResult.contentHash !== source.lastContentHash
		: null;

	let fetchLogId: string | null = null;
	let batchId: string | null = null;
	let autoApprovedCount = 0;
	const trigger = options.trigger ?? 'manual_import';
	const triggerRunId = options.triggerRunId ?? null;
	const triggeredBy = options.triggeredBy ?? null;

	if (!preview.fetchResult.success) {
		const [fetchLog] = await db
			.insert(sourceFetchLog)
			.values({
				sourceId: source.id,
				status: preview.fetchResult.status,
				httpStatusCode: preview.fetchResult.httpStatusCode,
				responseTimeMs: preview.fetchResult.responseTimeMs,
				contentHash: preview.fetchResult.contentHash,
				contentChanged,
				itemsFound: 0,
				itemsNew: 0,
				errorMessage: preview.fetchResult.errorMessage,
				errorCategory: preview.fetchResult.errorCategory,
				responseBytes: preview.fetchResult.contentSizeBytes
			})
			.returning({ id: sourceFetchLog.id });
		fetchLogId = fetchLog?.id ?? null;

		await updateSourceRuntimeState(source, {
			now,
			success: false,
			contentChanged,
			contentHash: preview.fetchResult.contentHash,
			errorCategory: preview.fetchResult.errorCategory
		});

		return {
			...preview,
			success: false,
			batchId,
			fetchLogId,
			candidatesCreated: 0,
			duplicatesSkipped: 0,
			updatesQueued: 0,
			autoApprovedCount,
			errors
		};
	}

	const dedupeCounts = countDedupeResults(preview.candidates);
	const [fetchLog] = await db
		.insert(sourceFetchLog)
		.values({
			sourceId: source.id,
			status:
				preview.parseResult?.errors.length || preview.normalizeResult?.errors.length
					? 'partial'
					: 'success',
			httpStatusCode: preview.fetchResult.httpStatusCode,
			responseTimeMs: preview.fetchResult.responseTimeMs,
			contentHash: preview.fetchResult.contentHash,
			contentChanged,
			itemsFound: preview.parseResult?.totalFound ?? 0,
			itemsNew: dedupeCounts.new,
			errorMessage: errors[0] ?? null,
			errorCategory: preview.parseResult?.errors.length ? 'parse' : null,
			responseBytes: preview.fetchResult.contentSizeBytes
		})
		.returning({ id: sourceFetchLog.id });
	fetchLogId = fetchLog?.id ?? null;

	const [batch] = await db
		.insert(importBatches)
		.values({
			sourceId: source.id,
			fetchLogId,
			status: 'running',
			itemsFetched: preview.parseResult?.totalFound ?? 0,
			itemsParsed: preview.parseResult?.items.length ?? 0,
			itemsNormalized: preview.normalizeResult?.records.length ?? 0,
			itemsNew: dedupeCounts.new,
			itemsDuplicate: dedupeCounts.duplicate,
			itemsUpdated: dedupeCounts.update,
			itemsFailed:
				(preview.parseResult?.errors.length ?? 0) + (preview.normalizeResult?.errors.length ?? 0),
			errors: buildBatchErrors(preview, {
				trigger,
				triggerRunId,
				triggeredBy,
				sourceSlug: source.slug
			})
		})
		.returning({ id: importBatches.id });
	batchId = batch?.id ?? null;

	let candidatesCreated = 0;
	let updatesQueued = 0;
	if (batchId) {
		for (const candidate of preview.candidates) {
			if (candidate.dedupe.result === 'duplicate') continue;
			const candidateId = await upsertImportedCandidate(source, batchId, candidate);
			candidatesCreated += 1;
			if (candidate.dedupe.result === 'update') updatesQueued += 1;
			if (candidateId && shouldAutoApproveCandidate(source, candidate, options)) {
				await approveCandidate(candidateId, null, {
					reviewNotes: 'Auto-approved by source-ops scheduler',
					allowAmbiguous: false
				});
				autoApprovedCount += 1;
			}
		}
	}

	await db
		.update(importBatches)
		.set({
			status: 'completed',
			completedAt: new Date()
		})
		.where(eq(importBatches.id, batchId!));

	await updateSourceRuntimeState(source, {
		now,
		success: true,
		contentChanged,
		contentHash: preview.fetchResult.contentHash,
		errorCategory: preview.parseResult?.errors.length ? 'parse' : null,
		itemsImportedDelta: candidatesCreated
	});

	return {
		...preview,
		success: true,
		batchId,
		fetchLogId,
		candidatesCreated,
		duplicatesSkipped: dedupeCounts.duplicate,
		updatesQueued,
		autoApprovedCount,
		errors
	};
}

async function buildPreviewCandidates(
	source: SourceRecord,
	parsedItems: Array<{
		fields: Record<string, unknown>;
		sourceItemId: string | null;
		sourceItemUrl: string | null;
	}>,
	normalizedRecords: NormalizedRecord[]
): Promise<PreviewCandidate[]> {
	const dedupeLookup = createDedupeLookup();
	const candidates: PreviewCandidate[] = [];

	for (let index = 0; index < normalizedRecords.length; index += 1) {
		const normalizedData = normalizedRecords[index]!;
		const parsedItem = parsedItems[index]!;
		const fingerprint = contentFingerprint(normalizedData);
		const key = compositeKey(normalizedData);
		const dedupe = await runDedupeStrategies(
			source.dedupeStrategies,
			normalizedData,
			source.id,
			dedupeLookup,
			{ externalId: parsedItem.sourceItemId }
		);

		candidates.push({
			index,
			rawData: parsedItem.fields,
			normalizedData,
			sourceItemId: parsedItem.sourceItemId,
			sourceItemUrl: parsedItem.sourceItemUrl,
			contentFingerprint: fingerprint,
			compositeKeyRaw: key.raw,
			compositeKeyHash: key.hash,
			dedupe,
			priority: computeCandidatePriority(
				source.confidenceScore,
				normalizedData.coil,
				normalizedData as unknown as Record<string, unknown>
			),
			sourceAttribution: source.attributionText ?? source.name,
			expiresAt: computeCandidateExpiry(normalizedData)
		});
	}

	return candidates;
}

async function upsertImportedCandidate(
	source: SourceRecord,
	batchId: string,
	candidate: PreviewCandidate
): Promise<string> {
	const existing = await findActiveCandidate(source.id, candidate);

	const values = {
		sourceId: source.id,
		batchId,
		coil: candidate.normalizedData.coil,
		status: 'pending_review' as const,
		priority: candidate.priority,
		rawData: candidate.rawData,
		normalizedData: candidate.normalizedData,
		sourceItemId: candidate.sourceItemId,
		sourceItemUrl: candidate.sourceItemUrl,
		dedupeResult: candidate.dedupe.result,
		dedupeStrategyUsed: candidate.dedupe.strategyUsed,
		matchedCanonicalId: candidate.dedupe.match?.canonicalRecordId ?? null,
		contentFingerprint: candidate.contentFingerprint,
		sourceAttribution: candidate.sourceAttribution,
		reviewedAt: null,
		reviewedBy: null,
		reviewNotes: null,
		rejectionReason: null,
		expiresAt: candidate.expiresAt
	};

	if (existing) {
		const [updated] = await db
			.update(importedCandidates)
			.set(values)
			.where(eq(importedCandidates.id, existing.id))
			.returning({ id: importedCandidates.id });
		return updated?.id ?? existing.id;
	}

	const [created] = await db.insert(importedCandidates).values(values).returning({
		id: importedCandidates.id
	});
	return created?.id ?? '';
}

async function findActiveCandidate(sourceId: string, candidate: PreviewCandidate) {
	const conditions = [];
	if (candidate.sourceItemId) {
		conditions.push(
			and(
				eq(importedCandidates.sourceId, sourceId),
				eq(importedCandidates.sourceItemId, candidate.sourceItemId)
			)
		);
	}
	if (candidate.contentFingerprint) {
		conditions.push(
			and(
				eq(importedCandidates.coil, candidate.normalizedData.coil),
				eq(importedCandidates.contentFingerprint, candidate.contentFingerprint)
			)
		);
	}

	if (conditions.length === 0) return null;

	const [existing] = await db
		.select({ id: importedCandidates.id })
		.from(importedCandidates)
		.where(
			and(
				or(...conditions)!,
				inArray(importedCandidates.status, ['pending_review', 'needs_info', 'auto_approved'])
			)
		)
		.limit(1);

	return existing ?? null;
}

async function loadSourceRecord(sourceId: string): Promise<SourceRecord> {
	const detail = await getSourceById(sourceId);
	if (!detail) throw new Error('Source not found');
	return detail.source;
}

function getAdapterForSource(source: SourceRecord) {
	const adapter = adapterRegistry.get(source.adapterType);
	if (!adapter) {
		throw new Error(
			`No ingestion adapter is registered for ${source.adapterType ?? 'unknown source'}`
		);
	}
	if (source.coils.length === 0) throw new Error('Source must have at least one configured coil');
	if (!adapter.supportedCoils.includes(source.coils[0])) {
		throw new Error(`Adapter ${adapter.adapterType} does not support ${source.coils[0]}`);
	}

	const validation = adapter.validateConfig(buildAdapterConfig(source), source);
	if (!validation.valid) {
		throw new Error(validation.errors.join(' '));
	}

	return adapter;
}

function buildAdapterConfig(source: SourceRecord): AdapterConfig {
	return {
		...(source.adapterConfig as AdapterConfig),
		__sourceSlug: source.slug,
		__sourceUrl: source.sourceUrl,
		__fetchUrl: source.fetchUrl
	};
}

function countDedupeResults(candidates: PreviewCandidate[]): Record<DedupeResult, number> {
	const counts = emptyDedupeCounts();
	for (const candidate of candidates) {
		counts[candidate.dedupe.result] += 1;
	}
	return counts;
}

function emptyDedupeCounts(): Record<DedupeResult, number> {
	return { new: 0, duplicate: 0, update: 0, ambiguous: 0 };
}

function computeCandidateExpiry(normalizedData: NormalizedRecord): Date | null {
	switch (normalizedData.coil) {
		case 'events':
			return normalizedData.end_date
				? new Date(normalizedData.end_date)
				: new Date(normalizedData.start_date);
		case 'funding':
			return normalizedData.deadline ? new Date(normalizedData.deadline) : null;
		case 'jobs':
			return normalizedData.closing_date ? new Date(normalizedData.closing_date) : null;
		default:
			return null;
	}
}

async function updateSourceRuntimeState(
	source: SourceRecord,
	options: {
		now: Date;
		success: boolean;
		contentChanged: boolean | null;
		contentHash: string | null;
		errorCategory: string | null;
		itemsImportedDelta?: number;
	}
): Promise<void> {
	const nextFailureCount = options.success ? 0 : source.consecutiveFailureCount + 1;
	const lastCheckedAt = options.now;
	const lastSuccessfulFetchAt = options.success ? options.now : source.lastSuccessfulFetchAt;
	const lastContentChangeAt =
		options.success && options.contentChanged ? options.now : source.lastContentChangeAt;
	const healthStatus = computeHealthStatus(
		nextFailureCount,
		lastContentChangeAt ?? null,
		lastCheckedAt,
		source.fetchCadence,
		options.errorCategory
	);

	await db
		.update(sources)
		.set({
			lastCheckedAt,
			lastSuccessfulFetchAt,
			lastContentHash: options.contentHash,
			lastContentChangeAt,
			consecutiveFailureCount: nextFailureCount,
			totalItemsImported: sql`${sources.totalItemsImported} + ${options.itemsImportedDelta ?? 0}`,
			nextCheckAt: computeNextCheckAt(source.fetchCadence, options.now),
			healthStatus
		})
		.where(eq(sources.id, source.id));
}

function collectPreviewErrors(preview: IngestionPreviewResult): string[] {
	const errors: string[] = [];
	if (preview.fetchResult.errorMessage) errors.push(preview.fetchResult.errorMessage);
	for (const error of preview.parseResult?.errors ?? []) errors.push(error.message);
	for (const error of preview.normalizeResult?.errors ?? []) errors.push(error.message);
	return errors;
}

function buildBatchErrors(
	preview: IngestionPreviewResult,
	meta: {
		trigger: string;
		triggerRunId: string | null;
		triggeredBy: string | null;
		sourceSlug: string;
	}
) {
	return [
		{
			stage: 'meta',
			trigger: meta.trigger,
			trigger_run_id: meta.triggerRunId,
			triggered_by: meta.triggeredBy,
			source_slug: meta.sourceSlug,
			recorded_at: new Date().toISOString()
		},
		...(preview.parseResult?.errors ?? []).map((error) => ({
			stage: 'parse',
			item_index: error.itemIndex,
			error: error.message
		})),
		...(preview.normalizeResult?.errors ?? []).map((error) => ({
			stage: 'normalize',
			item_index: error.itemIndex,
			error: error.message
		}))
	];
}

function shouldAutoApproveCandidate(
	source: SourceRecord,
	candidate: PreviewCandidate,
	options: IngestionExecutionOptions
) {
	return Boolean(
		options.enableAutoApprove &&
		source.autoApprove &&
		!source.reviewRequired &&
		(source.confidenceScore ?? 0) >= 4 &&
		candidate.dedupe.result === 'new'
	);
}
