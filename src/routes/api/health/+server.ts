import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { getSearchReadiness } from '$lib/server/meilisearch';
import { getObjectStorageHealth } from '$lib/server/object-storage';
import {
	getAccountLifecycleSchemaHealth,
	getPrivacyRequestsSchemaHealth
} from '$lib/server/privacy-schema';
import { getSourceHealthSummary } from '$lib/server/sources';
import { getSourceOpsSchemaHealth } from '$lib/server/source-ops-schema';
import { countDueSources } from '$lib/server/ingestion/scheduler';
import { getRuntimeConfigHealth } from '$lib/server/runtime-config';

export async function GET({ locals }) {
	const timestamp = new Date().toISOString();
	const runtimeConfig = getRuntimeConfigHealth({ enforceProduction: true });
	const canViewRuntimeDetails = locals.user?.role === 'admin' || locals.user?.role === 'moderator';

	const [
		database,
		searchReadiness,
		objectStorage,
		sourceSummary,
		dueSources,
		sourceOpsSchema,
		privacyRequestsSchema,
		accountLifecycleSchema
	] = await Promise.all([
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
			detail: 'host-unavailable' as const,
			settingsVersion: 'unknown',
			indexedScopes: [],
			missingScopes: [],
			mismatchedScopes: [],
			issues: [],
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
		countDueSources().catch(() => 0),
		getSourceOpsSchemaHealth().catch((error) => ({
			ok: false,
			missing: ['canonical_records.source_snapshot'],
			message: error instanceof Error ? error.message : 'Source-ops schema unavailable'
		})),
		getPrivacyRequestsSchemaHealth().catch((error) => ({
			ok: false,
			missing: ['privacy_requests'],
			message: error instanceof Error ? error.message : 'Privacy schema unavailable'
		})),
		getAccountLifecycleSchemaHealth().catch((error) => ({
			ok: false,
			missing: [
				'privacy_requests',
				'organization_claim_requests',
				'organization_invites',
				'personal_calendar_feeds'
			],
			message: error instanceof Error ? error.message : 'Account lifecycle schema unavailable'
		}))
	]);

	const schemaHealth = {
		ok: sourceOpsSchema.ok && privacyRequestsSchema.ok && accountLifecycleSchema.ok,
		checks: {
			sourceOps: sourceOpsSchema,
			privacyRequests: privacyRequestsSchema,
			accountLifecycle: accountLifecycleSchema
		}
	};

	const status =
		database.available &&
		searchReadiness.state === 'ready' &&
		runtimeConfig.ok &&
		schemaHealth.ok &&
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
			configuration: canViewRuntimeDetails ? runtimeConfig : { ok: runtimeConfig.ok },
			schema: schemaHealth,
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
