import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { importBatches } from '$lib/server/db/schema';
import { ingestSource, previewSource } from '$lib/server/ingestion/pipeline';
import { runSourceNow } from '$lib/server/ingestion/scheduler';
import { validateSourceConfig } from '$lib/server/ingestion/validation';
import { getRecentCandidatesForSource } from '$lib/server/import-candidates';
import { getFetchLogsForSource } from '$lib/server/source-fetch-log';
import { getSourceById, updateSource } from '$lib/server/sources';

function parseJsonField(value: FormDataEntryValue | null, fallback: object | Array<unknown>) {
	const raw = (value as string | null)?.trim();
	if (!raw) return fallback;
	return JSON.parse(raw);
}

function parseNullableString(value: FormDataEntryValue | null) {
	const raw = (value as string | null)?.trim();
	return raw ? raw : null;
}

function parseNullableDate(value: FormDataEntryValue | null) {
	const raw = (value as string | null)?.trim();
	return raw ? new Date(raw) : null;
}

export const load: PageServerLoad = async ({ params }) => {
	const detail = await getSourceById(params.id);
	if (!detail) throw error(404, 'Source not found');

	const [fetchLogs, batches, candidates] = await Promise.all([
		getFetchLogsForSource(params.id, 10),
		db
			.select()
			.from(importBatches)
			.where(eq(importBatches.sourceId, params.id))
			.orderBy(desc(importBatches.startedAt))
			.limit(10),
		getRecentCandidatesForSource(params.id, 10)
	]);

	const lastBatchMeta =
		batches
			.map((batch) => ({
				batchId: batch.id,
				meta: Array.isArray(batch.errors)
					? batch.errors.find(
							(entry) =>
								entry && typeof entry === 'object' && (entry as { stage?: string }).stage === 'meta'
						)
					: null
			}))
			.find((entry) => entry.meta)?.meta ?? null;

	const errorPatterns = fetchLogs.reduce<Record<string, number>>((acc, log) => {
		const key = log.errorCategory ?? log.status;
		if (!key) return acc;
		acc[key] = (acc[key] ?? 0) + 1;
		return acc;
	}, {});

	const validation = validateSourceConfig(detail.source);
	const candidateOutcomeSummary = {
		approved: candidates.filter((candidate) => candidate.status === 'approved').length,
		autoApproved: candidates.filter((candidate) => candidate.status === 'auto_approved').length,
		pending: candidates.filter((candidate) => candidate.status === 'pending_review').length,
		needsInfo: candidates.filter((candidate) => candidate.status === 'needs_info').length,
		rejected: candidates.filter((candidate) => candidate.status === 'rejected').length
	};
	const batchQualitySummary = {
		totalFetched: batches.reduce((sum, batch) => sum + batch.itemsFetched, 0),
		totalNormalized: batches.reduce((sum, batch) => sum + batch.itemsNormalized, 0),
		totalNew: batches.reduce((sum, batch) => sum + batch.itemsNew, 0),
		totalDuplicate: batches.reduce((sum, batch) => sum + batch.itemsDuplicate, 0),
		totalUpdated: batches.reduce((sum, batch) => sum + batch.itemsUpdated, 0),
		totalFailed: batches.reduce((sum, batch) => sum + batch.itemsFailed, 0)
	};

	return {
		source: detail.source,
		tags: detail.tags,
		fetchLogs,
		batches,
		candidates,
		lastBatchMeta,
		validation,
		publishSummary: {
			approved: candidates.filter((candidate) => candidate.status === 'approved').length,
			autoApproved: candidates.filter((candidate) => candidate.status === 'auto_approved').length
		},
		errorPatterns,
		candidateOutcomeSummary,
		batchQualitySummary
	};
};

type SourceDetailActionDeps = {
	updateSource: typeof updateSource;
	previewSource: typeof previewSource;
	ingestSource: typeof ingestSource;
	runSourceNow: typeof runSourceNow;
};

export function _createSourceDetailActions(
	deps: SourceDetailActionDeps = { updateSource, previewSource, ingestSource, runSourceNow }
): Actions {
	return {
		updateSource: async ({ params, request }) => {
			const fd = await request.formData();
			const name = (fd.get('name') as string)?.trim();
			const sourceUrl = (fd.get('sourceUrl') as string)?.trim();

			if (!name) return fail(400, { error: 'Name is required' });
			if (!sourceUrl) return fail(400, { error: 'Source URL is required' });

			try {
				await deps.updateSource(params.id, {
					name,
					description: parseNullableString(fd.get('description')),
					sourceUrl,
					homepageUrl: parseNullableString(fd.get('homepageUrl')),
					coils: fd.getAll('coils') as string[] as Array<
						'events' | 'funding' | 'jobs' | 'red_pages' | 'toolbox'
					>,
					ingestionMethod: ((fd.get('ingestionMethod') as string) || 'manual_only') as
						| 'manual_only'
						| 'manual_with_reminder'
						| 'rss_import'
						| 'ical_import'
						| 'api_import'
						| 'html_scrape'
						| 'directory_sync'
						| 'document_extraction'
						| 'newsletter_triage'
						| 'hybrid',
					sourceCategory: parseNullableString(fd.get('sourceCategory')) as
						| null
						| 'government_federal'
						| 'government_state'
						| 'government_tribal'
						| 'nonprofit'
						| 'foundation'
						| 'aggregator'
						| 'news_media'
						| 'academic'
						| 'professional_association'
						| 'private_business'
						| 'community',
					adapterType: parseNullableString(fd.get('adapterType')),
					adapterConfig: parseJsonField(fd.get('adapterConfig'), {}),
					fetchCadence: ((fd.get('fetchCadence') as string) || 'manual') as
						| 'hourly'
						| 'every_6h'
						| 'daily'
						| 'weekly'
						| 'biweekly'
						| 'monthly'
						| 'manual',
					fetchUrl: parseNullableString(fd.get('fetchUrl')),
					status: ((fd.get('status') as string) || 'discovered') as
						| 'discovered'
						| 'configuring'
						| 'active'
						| 'paused'
						| 'deprecated'
						| 'disabled'
						| 'manual_only',
					healthStatus: ((fd.get('healthStatus') as string) || 'unknown') as
						| 'healthy'
						| 'degraded'
						| 'unhealthy'
						| 'stale'
						| 'broken'
						| 'auth_required'
						| 'unknown',
					enabled: fd.has('enabled'),
					nextCheckAt: parseNullableDate(fd.get('nextCheckAt')),
					stewardNotes: parseNullableString(fd.get('stewardNotes')),
					ownerUserId: parseNullableString(fd.get('ownerUserId')),
					attributionRequired: fd.has('attributionRequired'),
					attributionText: parseNullableString(fd.get('attributionText')),
					reviewRequired: fd.has('reviewRequired'),
					autoApprove: fd.has('autoApprove'),
					confidenceScore: parseNullableString(fd.get('confidenceScore'))
						? Number(fd.get('confidenceScore'))
						: null,
					riskProfile: parseJsonField(fd.get('riskProfile'), {
						freshness: 'medium',
						duplication: 'medium',
						legal: 'low',
						normalization: 'medium',
						maintenance: 'medium',
						moderation: 'medium'
					}),
					dedupeStrategies: fd.getAll('dedupeStrategies') as string[] as Array<
						'url_match' | 'title_fuzzy' | 'composite_key' | 'content_hash' | 'external_id'
					>,
					dedupeConfig: parseJsonField(fd.get('dedupeConfig'), {}),
					pauseReason: parseNullableString(fd.get('pauseReason')),
					pausedAt: parseNullableDate(fd.get('pausedAt')),
					deprecatedAt: parseNullableDate(fd.get('deprecatedAt')),
					tags: (fd.getAll('tagKey') as string[]).map((tagKey, index) => ({
						tagKey,
						tagValue: ((fd.getAll('tagValue') as string[])[index] ?? '').trim()
					}))
				});
			} catch (err) {
				return fail(400, {
					error: err instanceof Error ? err.message : 'Failed to update source'
				});
			}

			return { success: true };
		},
		pauseSource: async ({ params, request }) => {
			const fd = await request.formData();
			await deps.updateSource(params.id, {
				status: 'paused',
				pausedAt: new Date(),
				pauseReason: parseNullableString(fd.get('pauseReason'))
			});
			return { success: true };
		},
		resumeSource: async ({ params }) => {
			await deps.updateSource(params.id, {
				status: 'active',
				pausedAt: null,
				pauseReason: null
			});
			return { success: true };
		},
		disableSource: async ({ params }) => {
			await deps.updateSource(params.id, {
				status: 'disabled',
				enabled: false
			});
			return { success: true };
		},
		deprecateSource: async ({ params }) => {
			await deps.updateSource(params.id, {
				status: 'deprecated',
				deprecatedAt: new Date(),
				enabled: false
			});
			return { success: true };
		},
		testSource: async ({ params }) => {
			try {
				const preview = await deps.previewSource(params.id);
				return {
					success: true,
					previewMode: 'test',
					preview
				};
			} catch (err) {
				return fail(400, {
					error: err instanceof Error ? err.message : 'Failed to test source'
				});
			}
		},
		runImport: async ({ params }) => {
			try {
				const result = await deps.ingestSource(params.id, {
					trigger: 'manual_import',
					enableAutoApprove: true
				});
				return {
					success: true,
					previewMode: 'import',
					importResult: result
				};
			} catch (err) {
				return fail(400, {
					error: err instanceof Error ? err.message : 'Failed to import source'
				});
			}
		},
		retrySource: async ({ params, locals }) => {
			try {
				const runResult = await deps.runSourceNow(params.id, 'admin_retry', {
					triggeredBy: locals.user?.id ?? null
				});
				return {
					success: true,
					runResult
				};
			} catch (err) {
				return fail(400, {
					error: err instanceof Error ? err.message : 'Failed to retry source'
				});
			}
		}
	};
}

export const actions = _createSourceDetailActions();
