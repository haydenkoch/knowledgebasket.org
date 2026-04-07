import * as Sentry from '@sentry/sveltekit';
import { and, eq, inArray, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { importBatches, importedCandidates, sourceFetchLog, sources } from '$lib/server/db/schema';
import { suggestOrganizationMatches } from '$lib/server/organizations';
import { getSourceById } from '$lib/server/sources';
import { suggestVenueMatches } from '$lib/server/venues';
import { approveCandidate } from '$lib/server/import-candidates';
import {
	applyBestImage,
	computeConfidence,
	computeQualityFlags,
	addUrlEvidence,
	addFieldProvenance
} from './evidence';
import { applyAiEnrichment, shouldRunAiEnrichment } from './ai-enrichment';
import { enrichNormalizedRecords } from './detail-enrichment';
import {
	compositeKey,
	contentFingerprint,
	createDedupeLookup,
	normalizeUrl,
	runDedupeStrategies
} from './dedupe';
import { adapterRegistry } from './registry';
import { createSourceRun, recordSourceRunStage, updateSourceRun } from './source-runs';
import { computeCandidatePriority, computeHealthStatus, computeNextCheckAt } from './status';
import { buildAdapterConfig } from './validation';
import type {
	CandidateConfidence,
	DedupeResult,
	EntityMatchSuggestion,
	FieldProvenanceMap,
	ImageCandidate,
	IngestionExecutionOptions,
	IngestionPreviewResult,
	IngestionResult,
	IngestionStage,
	IngestionStageStatus,
	NormalizedRecord,
	PreviewCandidate,
	SourceRecord,
	StageDiagnostic,
	UrlEvidence,
	UrlRoleMap,
	AiExtractedFacts
} from './types';

type ParsedItem = {
	fields: Record<string, unknown>;
	sourceItemId: string | null;
	sourceItemUrl: string | null;
};

type CandidateArtifacts = {
	records: NormalizedRecord[];
	fieldProvenance: FieldProvenanceMap[];
	urlRoles: UrlRoleMap[];
	imageCandidates: ImageCandidate[][];
	extractedFacts: AiExtractedFacts[];
	qualityFlags: Array<ReturnType<typeof computeQualityFlags>>;
	confidence: CandidateConfidence[];
	diagnostics: Array<Record<string, unknown>>;
};

const ACTIVE_IMPORTED_CANDIDATE_STATUSES = [
	'pending_review',
	'needs_info',
	'approved',
	'auto_approved'
] as const;

export async function previewSource(sourceId: string): Promise<IngestionPreviewResult> {
	return Sentry.startSpan(
		{
			name: 'ingestion.preview_source',
			op: 'ingestion.preview',
			attributes: {
				'ingestion.source_id': sourceId
			}
		},
		async () => {
			const source = await loadSourceRecord(sourceId);
			return runPreview(source);
		}
	);
}

export async function ingestSource(
	sourceId: string,
	options: IngestionExecutionOptions = {}
): Promise<IngestionResult> {
	return Sentry.startSpan(
		{
			name: 'ingestion.ingest_source',
			op: 'ingestion.run',
			attributes: {
				'ingestion.source_id': sourceId,
				'ingestion.trigger': options.trigger ?? 'manual_import',
				'ingestion.auto_approve_enabled': Boolean(options.enableAutoApprove)
			}
		},
		async () => {
			const source = await loadSourceRecord(sourceId);
			const preview = await runPreview(source);
			const now = new Date();
			const errors = collectPreviewErrors(preview);
			const contentChanged = preview.fetchResult.contentHash
				? preview.fetchResult.contentHash !== source.lastContentHash
				: null;

			const trigger = options.trigger ?? 'manual_import';
			const triggerRunId = options.triggerRunId ?? null;
			const triggeredBy = options.triggeredBy ?? null;

			const sourceRun = await createSourceRun({
				sourceId: source.id,
				trigger,
				triggerRunId,
				triggeredBy,
				adapterType: preview.adapterType,
				adapterVersion: source.adapterVersion ?? '2026-04-ingestion-hardening',
				fetchUrl: source.fetchUrl ?? source.sourceUrl
			});

			for (const stage of preview.stages) {
				await recordSourceRunStage(sourceRun.id, stage.stage, {
					status: stage.status,
					startedAt: new Date(stage.startedAt),
					completedAt: stage.completedAt ? new Date(stage.completedAt) : null,
					durationMs: stage.durationMs,
					itemCount: stage.itemCount ?? null,
					warnings: stage.warnings,
					errors: stage.errors,
					metrics: stage.metrics,
					details: stage.details
				});
			}

			let fetchLogId: string | null = null;
			let batchId: string | null = null;
			let autoApprovedCount = 0;

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

				await updateSourceRun(sourceRun.id, {
					status: 'failed',
					completedAt: now,
					durationMs: preview.durationMs,
					contentHash: preview.fetchResult.contentHash,
					contentChanged,
					errors,
					metrics: buildRunMetrics(preview)
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
					sourceRunId: sourceRun.id,
					fetchLogId,
					status: 'running',
					itemsFetched: preview.parseResult?.totalFound ?? 0,
					itemsParsed: preview.parseResult?.items.length ?? 0,
					itemsNormalized: preview.normalizeResult?.records.length ?? 0,
					itemsNew: dedupeCounts.new,
					itemsDuplicate: dedupeCounts.duplicate,
					itemsUpdated: dedupeCounts.update,
					itemsFailed:
						(preview.parseResult?.errors.length ?? 0) +
						(preview.normalizeResult?.errors.length ?? 0),
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

			await updateSourceRun(sourceRun.id, {
				status: errors.length > 0 ? 'failed' : 'completed',
				completedAt: now,
				durationMs: preview.durationMs,
				contentHash: preview.fetchResult.contentHash,
				contentChanged,
				itemsFetched: preview.parseResult?.totalFound ?? 0,
				itemsParsed: preview.parseResult?.items.length ?? 0,
				itemsNormalized: preview.normalizeResult?.records.length ?? 0,
				itemsNew: dedupeCounts.new,
				itemsDuplicate: dedupeCounts.duplicate,
				itemsUpdated: dedupeCounts.update,
				itemsFailed:
					(preview.parseResult?.errors.length ?? 0) + (preview.normalizeResult?.errors.length ?? 0),
				candidatesCreated,
				autoApprovedCount,
				warnings: preview.stages.flatMap((stage) => stage.warnings),
				errors,
				metrics: buildRunMetrics(preview)
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
	);
}

async function runPreview(source: SourceRecord): Promise<IngestionPreviewResult> {
	const adapter = getAdapterForSource(source);
	const config = buildAdapterConfig(source);
	const stages: StageDiagnostic[] = [];
	const startedAt = Date.now();

	const fetchResult = await executeStage(
		stages,
		'fetch',
		async () => adapter.fetch(source),
		(result) => ({
			itemCount: result.success ? 1 : 0,
			errors: result.errorMessage ? [result.errorMessage] : [],
			metrics: {
				httpStatusCode: result.httpStatusCode,
				responseTimeMs: result.responseTimeMs
			}
		})
	);

	if (!fetchResult.success || !fetchResult.rawContent) {
		return {
			sourceId: source.id,
			adapterType: adapter.adapterType,
			fetchResult,
			parseResult: null,
			normalizeResult: null,
			candidates: [],
			dedupeCounts: emptyDedupeCounts(),
			durationMs: Date.now() - startedAt,
			stages
		};
	}

	const parseResult = await executeStage(
		stages,
		'discover',
		async () => adapter.parse(fetchResult.rawContent!, config),
		(result) => ({
			itemCount: result.items.length,
			errors: result.errors.map((error) => error.message)
		})
	);

	let normalizeResult = parseResult.success
		? await executeStage(
				stages,
				'normalize',
				async () => adapter.normalize(parseResult.items, source.coils[0], config),
				(result) => ({
					itemCount: result.records.length,
					errors: result.errors.map((error) => error.message)
				})
			)
		: null;

	if (!parseResult.success || !normalizeResult) {
		return {
			sourceId: source.id,
			adapterType: adapter.adapterType,
			fetchResult,
			parseResult,
			normalizeResult,
			candidates: [],
			dedupeCounts: emptyDedupeCounts(),
			durationMs: Date.now() - startedAt,
			stages
		};
	}

	const enrichment = await executeStage(
		stages,
		'detail_enrich',
		async () => enrichNormalizedRecords(config, parseResult.items, normalizeResult!.records),
		(result) => ({
			itemCount: result.records.length,
			warnings: result.warnings,
			metrics: {
				imageCandidateCount: result.imageCandidates.reduce((sum, items) => sum + items.length, 0)
			}
		})
	);

	normalizeResult = {
		...normalizeResult,
		records: enrichment.records,
		errors: [
			...normalizeResult.errors,
			...enrichment.warnings.map((message, index) => ({
				itemIndex: index,
				message,
				field: 'detailEnrichment',
				rawValue: null
			}))
		]
	};

	const structuredStageMetrics = enrichment.diagnostics.reduce(
		(sum, item) => sum + Number(item.structuredDataCount ?? 0),
		0
	);
	stages.push(
		buildSyntheticStage('structured_extract', {
			itemCount: normalizeResult.records.length,
			metrics: {
				structuredDataCount: structuredStageMetrics
			}
		})
	);

	const classified = await executeStage(
		stages,
		'link_classify',
		async () =>
			classifyLinkArtifacts(source, parseResult.items, normalizeResult!.records, enrichment),
		(result) => ({
			itemCount: result.records.length,
			metrics: {
				urlRoleCount: result.urlRoles.reduce(
					(sum, map) =>
						sum +
						Object.values(map).reduce(
							(inner, entries) => inner + ((entries as Array<unknown> | undefined)?.length ?? 0),
							0
						),
					0
				)
			}
		})
	);

	const imaged = await executeStage(
		stages,
		'image_discover',
		async () => applyImageArtifacts(parseResult.items, classified),
		(result) => ({
			itemCount: result.records.length,
			metrics: {
				imageCandidateCount: result.imageCandidates.reduce((sum, items) => sum + items.length, 0)
			}
		})
	);

	const aiEnriched = await executeStage(
		stages,
		'ai_enrich',
		async () => {
			if (!shouldRunAiEnrichment(source)) {
				return {
					...imaged,
					extractedFacts: imaged.records.map(() => emptyAiExtractedFacts()),
					stats: {
						attempted: 0,
						completed: 0,
						skipped: imaged.records.length,
						conflicts: 0
					}
				};
			}

			const enriched = await applyAiEnrichment(
				source,
				parseResult.items,
				imaged.records,
				imaged.fieldProvenance,
				imaged.urlRoles,
				imaged.diagnostics
			);
			return {
				...imaged,
				records: enriched.records,
				fieldProvenance: enriched.fieldProvenance,
				urlRoles: enriched.urlRoles,
				extractedFacts: enriched.extractedFacts,
				diagnostics: enriched.diagnostics,
				stats: enriched.stats
			};
		},
		(result) => ({
			status: result.stats.completed === 0 && result.stats.attempted === 0 ? 'skipped' : 'success',
			itemCount: result.records.length,
			errors: result.diagnostics
				.filter((entry) => entry.aiEnrichmentFailed === true)
				.map((entry) => String(entry.aiEnrichmentError ?? 'AI enrichment failed')),
			metrics: result.stats
		})
	);

	const matched = await executeStage(
		stages,
		'entity_match',
		async () => attachEntityMatches(aiEnriched),
		(result) => ({
			itemCount: result.records.length,
			metrics: {
				entitySuggestionCount: result.confidence.reduce(
					(sum, entry) => sum + (entry.entities?.length ?? 0),
					0
				)
			}
		})
	);

	const flagged = await executeStage(
		stages,
		'quality_flag',
		async () => applyQualityArtifacts(matched),
		(result) => ({
			itemCount: result.records.length,
			metrics: {
				flagCount: result.qualityFlags.reduce((sum, flags) => sum + flags.length, 0)
			}
		})
	);

	const candidates = await executeStage(
		stages,
		'dedupe',
		async () =>
			buildPreviewCandidates(source, parseResult.items, flagged.records, {
				fieldProvenance: flagged.fieldProvenance,
				urlRoles: flagged.urlRoles,
				imageCandidates: flagged.imageCandidates,
				extractedFacts: flagged.extractedFacts,
				qualityFlags: flagged.qualityFlags,
				confidence: flagged.confidence,
				diagnostics: flagged.diagnostics
			}),
		(result) => ({
			itemCount: result.length,
			metrics: countDedupeResults(result)
		})
	);

	return {
		sourceId: source.id,
		adapterType: adapter.adapterType,
		fetchResult,
		parseResult,
		normalizeResult: {
			...normalizeResult,
			records: flagged.records
		},
		candidates,
		dedupeCounts: countDedupeResults(candidates),
		durationMs: Date.now() - startedAt,
		stages
	};
}

async function buildPreviewCandidates(
	source: SourceRecord,
	parsedItems: ParsedItem[],
	normalizedRecords: NormalizedRecord[],
	artifacts: Omit<CandidateArtifacts, 'records'>
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
			expiresAt: computeCandidateExpiry(normalizedData),
			fieldProvenance: artifacts.fieldProvenance[index] ?? {},
			urlRoles: artifacts.urlRoles[index] ?? {},
			imageCandidates: artifacts.imageCandidates[index] ?? [],
			extractedFacts: artifacts.extractedFacts[index] ?? emptyAiExtractedFacts(),
			qualityFlags: artifacts.qualityFlags[index] ?? [],
			confidence: artifacts.confidence[index] ?? {},
			diagnostics: artifacts.diagnostics[index] ?? {}
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
		fieldProvenance: candidate.fieldProvenance,
		urlRoles: candidate.urlRoles,
		imageCandidates: candidate.imageCandidates,
		extractedFacts: candidate.extractedFacts,
		qualityFlags: candidate.qualityFlags,
		confidence: candidate.confidence,
		diagnostics: candidate.diagnostics,
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
				inArray(importedCandidates.status, [...ACTIVE_IMPORTED_CANDIDATE_STATUSES])
			)
		)
		.limit(1);

	return existing ?? null;
}

async function classifyLinkArtifacts(
	source: SourceRecord,
	parsedItems: ParsedItem[],
	records: NormalizedRecord[],
	enrichment: Awaited<ReturnType<typeof enrichNormalizedRecords>>
): Promise<CandidateArtifacts> {
	const nextRecords: NormalizedRecord[] = [];
	const fieldProvenance: FieldProvenanceMap[] = [];
	const urlRoles: UrlRoleMap[] = [];
	const imageCandidates: ImageCandidate[][] = [];
	const extractedFacts: AiExtractedFacts[] = [];
	const qualityFlags: Array<ReturnType<typeof computeQualityFlags>> = [];
	const confidence: CandidateConfidence[] = [];
	const diagnostics: Array<Record<string, unknown>> = [];

	for (let index = 0; index < records.length; index += 1) {
		const record = records[index]!;
		const parsedItem = parsedItems[index];
		let map = enrichment.urlRoles[index] ?? {};
		let provenance = mergeBaseFieldProvenance(record, enrichment.fieldProvenance[index] ?? {});
		const candidateDiagnostics = {
			...(enrichment.diagnostics[index] ?? {}),
			sourceFetchUrl: source.fetchUrl ?? source.sourceUrl
		};

		if (source.fetchUrl) {
			map = addUrlEvidence(map, {
				url: source.fetchUrl,
				role: 'feed',
				source: 'feed',
				confidence: 1,
				extracted: true
			});
		}

		if (parsedItem?.sourceItemUrl) {
			map = addUrlEvidence(map, {
				url: parsedItem.sourceItemUrl,
				role: 'detail_page',
				source: 'feed',
				confidence: 0.98,
				extracted: true
			});
		}

		const directRoles = directRolesForRecord(record, parsedItem);
		for (const evidence of directRoles) {
			map = addUrlEvidence(map, evidence);
		}

		const nextRecord = applyPreferredUrls(record, map);
		if (nextRecord.url && nextRecord.url !== record.url) {
			provenance = addFieldProvenance(provenance, 'url', {
				value: nextRecord.url,
				source: 'inferred',
				confidence: 0.86,
				note: 'Preferred canonical item URL after link classification'
			});
		}

		if (
			nextRecord.coil === 'events' &&
			nextRecord.registration_url &&
			nextRecord.registration_url !== (record.coil === 'events' ? record.registration_url : null)
		) {
			provenance = addFieldProvenance(provenance, 'registration_url', {
				value: nextRecord.registration_url,
				source: 'inferred',
				confidence: 0.84,
				note: 'Preferred registration/application URL after link classification'
			});
		}

		nextRecords.push(nextRecord);
		fieldProvenance.push(provenance);
		urlRoles.push(map);
		imageCandidates.push(enrichment.imageCandidates[index] ?? []);
		extractedFacts.push(emptyAiExtractedFacts());
		qualityFlags.push([]);
		confidence.push({});
		diagnostics.push(candidateDiagnostics);
	}

	return {
		records: nextRecords,
		fieldProvenance,
		urlRoles,
		imageCandidates,
		extractedFacts,
		qualityFlags,
		confidence,
		diagnostics
	};
}

async function applyImageArtifacts(
	parsedItems: ParsedItem[],
	artifacts: CandidateArtifacts
): Promise<CandidateArtifacts> {
	const nextRecords: NormalizedRecord[] = [];
	const nextImages: ImageCandidate[][] = [];

	for (let index = 0; index < artifacts.records.length; index += 1) {
		const record = artifacts.records[index]!;
		const rawData = parsedItems[index]?.fields ?? {};
		const candidates = [...(artifacts.imageCandidates[index] ?? [])];

		if (record.image_url) {
			candidates.push({
				url: record.image_url,
				role: 'feed',
				source: 'feed',
				confidence: 0.8,
				isMeaningful: true
			});
		}

		for (const attachment of readStringArray(rawData.attachments)) {
			candidates.push({
				url: attachment,
				role: 'attachment',
				source: 'attachment',
				confidence: 0.92,
				isMeaningful: true
			});
		}

		const withImage = applyBestImage(record, candidates);
		if (withImage.image_url && withImage.image_url !== record.image_url) {
			artifacts.fieldProvenance[index] = addFieldProvenance(
				artifacts.fieldProvenance[index] ?? {},
				'image_url',
				{
					value: withImage.image_url,
					source: 'inferred',
					confidence: 0.9,
					note: 'Best image candidate selected after image discovery'
				}
			);
		}

		nextRecords.push(withImage);
		nextImages.push(candidates);
	}

	return {
		...artifacts,
		records: nextRecords,
		imageCandidates: nextImages
	};
}

async function attachEntityMatches(artifacts: CandidateArtifacts): Promise<CandidateArtifacts> {
	const nextRecords: NormalizedRecord[] = [];
	const nextConfidence: CandidateConfidence[] = [];

	for (let index = 0; index < artifacts.records.length; index += 1) {
		const record = { ...artifacts.records[index]! };
		const map = artifacts.urlRoles[index] ?? {};
		const entitySuggestions: EntityMatchSuggestion[] = [];

		const organizationName = organizationNameForRecord(record);
		if (organizationName) {
			const orgSuggestions = await suggestOrganizationMatches({
				name: organizationName,
				website:
					firstUrl(map.organizer) ??
					firstUrl(map.canonical_item) ??
					(record.coil === 'funding' ? record.funder_url : null),
				city:
					record.coil === 'events'
						? record.location_city
						: record.coil === 'jobs'
							? record.location_city
							: undefined,
				state:
					record.coil === 'events'
						? record.location_state
						: record.coil === 'jobs'
							? record.location_state
							: undefined,
				address:
					record.coil === 'events'
						? record.location_address
						: record.coil === 'red_pages'
							? record.address
							: undefined,
				limit: 4
			});
			entitySuggestions.push(
				...orgSuggestions.map((suggestion) => ({
					entityType: 'organization' as const,
					entityId: suggestion.organization.id,
					label: suggestion.organization.name,
					score: suggestion.score,
					reasons: suggestion.reasons
				}))
			);

			if ('organization_id' in record && !record.organization_id && orgSuggestions[0]?.score >= 8) {
				(record as Record<string, unknown>).organization_id = orgSuggestions[0]!.organization.id;
			}
		}

		if (record.coil === 'events') {
			const venueName = record.location_name ?? record.location_address;
			if (venueName) {
				const venueSuggestions = await suggestVenueMatches({
					name: venueName,
					address: record.location_address,
					city: record.location_city,
					state: record.location_state,
					organizationId: record.organization_id,
					limit: 4
				});
				entitySuggestions.push(
					...venueSuggestions.map((suggestion) => ({
						entityType: 'venue' as const,
						entityId: suggestion.venue.id,
						label: suggestion.venue.name,
						score: suggestion.score,
						reasons: suggestion.reasons
					}))
				);
				if (!record.venue_id && venueSuggestions[0]?.score >= 8) {
					record.venue_id = venueSuggestions[0]!.venue.id;
				}
			}
		}

		nextRecords.push(record);
		nextConfidence.push({
			...(artifacts.confidence[index] ?? {}),
			entities: entitySuggestions
		});
	}

	return {
		...artifacts,
		records: nextRecords,
		confidence: nextConfidence
	};
}

async function applyQualityArtifacts(artifacts: CandidateArtifacts): Promise<CandidateArtifacts> {
	const qualityFlags = artifacts.records.map((record, index) =>
		computeQualityFlags(
			record,
			artifacts.urlRoles[index] ?? {},
			artifacts.imageCandidates[index] ?? [],
			artifacts.diagnostics[index] ?? {},
			artifacts.confidence[index],
			artifacts.extractedFacts[index]
		)
	);

	const confidence = artifacts.records.map((record, index) =>
		computeConfidence(record, qualityFlags[index]!, artifacts.confidence[index]?.entities ?? [])
	);

	return {
		...artifacts,
		qualityFlags,
		confidence
	};
}

function mergeBaseFieldProvenance(record: NormalizedRecord, existing: FieldProvenanceMap) {
	let merged = existing;
	for (const [field, value] of Object.entries(record)) {
		if (
			value === null ||
			value === undefined ||
			(Array.isArray(value) && value.length === 0) ||
			(typeof value === 'string' && value.trim().length === 0)
		) {
			continue;
		}
		merged = addFieldProvenance(merged, field, {
			value,
			source: 'feed',
			confidence: 0.82
		});
	}
	return merged;
}

function directRolesForRecord(
	record: NormalizedRecord,
	parsedItem: ParsedItem | undefined
): UrlEvidence[] {
	const roles: UrlEvidence[] = [];
	const detailUrl = normalizeUrl(parsedItem?.sourceItemUrl);

	if (record.coil === 'events') {
		if (record.url) {
			roles.push({
				url: record.url,
				role:
					detailUrl && normalizeUrl(record.url) === detailUrl ? 'detail_page' : 'canonical_item',
				source: 'adapter',
				confidence: 0.84,
				extracted: true
			});
		}
		if (record.registration_url) {
			roles.push({
				url: record.registration_url,
				role: 'registration',
				source: 'adapter',
				confidence: 0.84,
				extracted: true
			});
		}
	} else if (record.coil === 'funding' && record.application_url) {
		roles.push({
			url: record.application_url,
			role: 'application',
			source: 'adapter',
			confidence: 0.84,
			extracted: true
		});
		if (record.url) {
			roles.push({
				url: record.url,
				role: 'canonical_item',
				source: 'adapter',
				confidence: 0.76,
				extracted: true
			});
		}
	} else if (record.coil === 'jobs' && record.application_url) {
		roles.push({
			url: record.application_url,
			role: 'application',
			source: 'adapter',
			confidence: 0.84,
			extracted: true
		});
		if (record.url) {
			roles.push({
				url: record.url,
				role: 'canonical_item',
				source: 'adapter',
				confidence: 0.76,
				extracted: true
			});
		}
	} else if (record.coil === 'red_pages' && record.website) {
		roles.push({
			url: record.website,
			role: 'canonical_item',
			source: 'adapter',
			confidence: 0.82,
			extracted: true
		});
	} else if (record.coil === 'toolbox' && record.url) {
		roles.push({
			url: record.url,
			role: 'canonical_item',
			source: 'adapter',
			confidence: 0.82,
			extracted: true
		});
	}

	return roles;
}

function applyPreferredUrls(record: NormalizedRecord, urlRoles: UrlRoleMap): NormalizedRecord {
	const canonical = firstUrl(urlRoles.canonical_item) ?? firstUrl(urlRoles.detail_page);
	const registration = firstUrl(urlRoles.registration) ?? firstUrl(urlRoles.application);

	switch (record.coil) {
		case 'events':
			return {
				...record,
				url: canonical ?? record.url,
				registration_url: registration ?? record.registration_url
			};
		case 'funding':
			return {
				...record,
				url: canonical ?? record.url,
				application_url: firstUrl(urlRoles.application) ?? record.application_url
			};
		case 'jobs':
			return {
				...record,
				url: canonical ?? record.url,
				application_url: firstUrl(urlRoles.application) ?? record.application_url
			};
		case 'red_pages':
			return {
				...record,
				website: canonical ?? record.website,
				url: canonical ?? record.url
			};
		case 'toolbox':
			return {
				...record,
				url: canonical ?? record.url
			};
	}
}

function organizationNameForRecord(record: NormalizedRecord) {
	switch (record.coil) {
		case 'events':
		case 'jobs':
		case 'red_pages':
		case 'toolbox':
			return record.organization_name;
		case 'funding':
			return record.funder_name ?? record.organization_name;
	}
}

function firstUrl(entries: UrlEvidence[] | undefined) {
	return entries?.[0]?.url ?? null;
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
	for (const stage of preview.stages) errors.push(...stage.errors);
	return Array.from(new Set(errors.filter(Boolean)));
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
		...preview.stages.map((stage) => ({
			stage: stage.stage,
			status: stage.status,
			duration_ms: stage.durationMs,
			errors: stage.errors,
			warnings: stage.warnings,
			metrics: stage.metrics ?? {}
		})),
		...(preview.parseResult?.errors ?? []).map((error) => ({
			stage: 'discover',
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
		candidate.dedupe.result === 'new' &&
		(candidate.confidence.overall ?? 0) >= 0.82
	);
}

async function executeStage<T>(
	stages: StageDiagnostic[],
	stage: IngestionStage,
	run: () => Promise<T>,
	collect?: (result: T) => {
		status?: IngestionStageStatus;
		itemCount?: number;
		warnings?: string[];
		errors?: string[];
		metrics?: Record<string, unknown>;
		details?: Record<string, unknown>;
	}
): Promise<T> {
	return Sentry.startSpan(
		{
			name: `ingestion.stage.${stage}`,
			op: 'ingestion.stage',
			attributes: {
				'ingestion.stage': stage
			}
		},
		async () => {
			const startedAt = new Date();
			try {
				const result = await run();
				const details = collect?.(result) ?? {};
				stages.push({
					stage,
					status: details.status ?? (details.errors?.length ? 'partial' : 'success'),
					startedAt: startedAt.toISOString(),
					completedAt: new Date().toISOString(),
					durationMs: Date.now() - startedAt.getTime(),
					itemCount: details.itemCount,
					warnings: details.warnings ?? [],
					errors: details.errors ?? [],
					metrics: details.metrics ?? {},
					details: details.details ?? {}
				});
				return result;
			} catch (error) {
				stages.push({
					stage,
					status: 'failure',
					startedAt: startedAt.toISOString(),
					completedAt: new Date().toISOString(),
					durationMs: Date.now() - startedAt.getTime(),
					warnings: [],
					errors: [error instanceof Error ? error.message : 'Unknown stage failure'],
					metrics: {},
					details: {}
				});
				throw error;
			}
		}
	);
}

function buildSyntheticStage(
	stage: IngestionStage,
	input: {
		status?: IngestionStageStatus;
		itemCount?: number;
		warnings?: string[];
		errors?: string[];
		metrics?: Record<string, unknown>;
		details?: Record<string, unknown>;
	}
): StageDiagnostic {
	const now = new Date().toISOString();
	return {
		stage,
		status: input.status ?? (input.errors?.length ? 'partial' : 'success'),
		startedAt: now,
		completedAt: now,
		durationMs: 0,
		itemCount: input.itemCount,
		warnings: input.warnings ?? [],
		errors: input.errors ?? [],
		metrics: input.metrics ?? {},
		details: input.details ?? {}
	};
}

function buildRunMetrics(preview: IngestionPreviewResult) {
	const totalCandidates = preview.candidates.length || 1;
	const missingImageCount = preview.candidates.filter((candidate) =>
		candidate.qualityFlags.some((flag) => flag.code === 'missing_image')
	).length;
	const lowConfidenceCount = preview.candidates.filter(
		(candidate) => (candidate.confidence.overall ?? 1) < 0.75
	).length;
	const enrichmentFailureCount = preview.candidates.filter(
		(candidate) => candidate.diagnostics.detailEnrichmentFailed === true
	).length;
	const aiConflictCount = preview.candidates.filter(
		(candidate) => (candidate.extractedFacts.conflicts?.length ?? 0) > 0
	).length;

	return {
		missingImageRate: missingImageCount / totalCandidates,
		lowConfidenceRate: lowConfidenceCount / totalCandidates,
		detailEnrichmentFailureRate: enrichmentFailureCount / totalCandidates,
		aiConflictRate: aiConflictCount / totalCandidates,
		duplicateRate: preview.dedupeCounts.duplicate / totalCandidates,
		ambiguousRate: preview.dedupeCounts.ambiguous / totalCandidates
	};
}

function readStringArray(value: unknown) {
	if (Array.isArray(value)) {
		return value.filter(
			(entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
		);
	}
	return [];
}

function emptyAiExtractedFacts(): AiExtractedFacts {
	return {
		offers: [],
		people: [],
		locationParts: null,
		fieldSuggestions: [],
		conflicts: [],
		notes: [],
		model: null
	};
}
