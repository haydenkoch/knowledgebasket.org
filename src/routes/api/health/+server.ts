import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { getSearchReadiness } from '$lib/server/meilisearch';
import { getObjectStorageHealth } from '$lib/server/object-storage';
import { getSourceHealthSummary } from '$lib/server/sources';
import { countDueSources } from '$lib/server/ingestion/scheduler';

export async function GET() {
	const timestamp = new Date().toISOString();

	const [database, searchReadiness, objectStorage, sourceSummary, dueSources] = await Promise.all([
		db
			.execute(sql`select 1 as ok`)
			.then(() => ({ available: true }))
			.catch((error) => ({
				available: false,
				error: error instanceof Error ? error.message : 'Database unavailable'
			})),
		getSearchReadiness().catch((error) => ({
			configured: false,
			available: false,
			state: 'offline' as const,
			requiredIndexes: [],
			availableIndexes: [],
			missingIndexes: [],
			error: error instanceof Error ? error.message : 'Search unavailable'
		})),
		getObjectStorageHealth(),
		getSourceHealthSummary().catch((error) => ({
			total: 0,
			enabled: 0,
			quarantined: 0,
			statusCounts: {},
			healthCounts: {},
			error: error instanceof Error ? error.message : 'Source health unavailable'
		})),
		countDueSources().catch(() => 0)
	]);

	const status =
		database.available &&
		searchReadiness.state === 'ready' &&
		(!objectStorage.configured || objectStorage.available)
			? 'ok'
			: 'degraded';

	return json({
		status,
		timestamp,
		services: {
			database,
			search: searchReadiness,
			objectStorage,
			sourceOps: {
				totalSources: sourceSummary.total,
				enabledSources: sourceSummary.enabled,
				quarantinedSources: sourceSummary.quarantined,
				dueSources,
				healthCounts: sourceSummary.healthCounts,
				...('error' in sourceSummary ? { error: sourceSummary.error } : {})
			}
		}
	});
}
