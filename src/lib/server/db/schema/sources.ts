import { sql } from 'drizzle-orm';
import {
	boolean,
	check,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uuid,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { user } from '../auth.schema';

export const sourceStatusEnum = pgEnum('source_status', [
	'discovered',
	'configuring',
	'active',
	'paused',
	'deprecated',
	'disabled',
	'manual_only'
]);

export const sourceHealthEnum = pgEnum('source_health', [
	'healthy',
	'degraded',
	'unhealthy',
	'stale',
	'broken',
	'auth_required',
	'unknown'
]);

export const ingestionMethodEnum = pgEnum('ingestion_method', [
	'manual_only',
	'manual_with_reminder',
	'rss_import',
	'ical_import',
	'api_import',
	'html_scrape',
	'directory_sync',
	'document_extraction',
	'newsletter_triage',
	'hybrid'
]);

export const sourceCategoryEnum = pgEnum('source_category', [
	'government_federal',
	'government_state',
	'government_tribal',
	'nonprofit',
	'foundation',
	'aggregator',
	'news_media',
	'academic',
	'professional_association',
	'private_business',
	'community'
]);

export const fetchCadenceEnum = pgEnum('fetch_cadence', [
	'hourly',
	'every_6h',
	'daily',
	'weekly',
	'biweekly',
	'monthly',
	'manual'
]);

export const riskLevelEnum = pgEnum('risk_level', ['low', 'medium', 'high']);

export const dedupeStrategyEnum = pgEnum('dedupe_strategy', [
	'url_match',
	'title_fuzzy',
	'composite_key',
	'content_hash',
	'external_id'
]);

export const fetchStatusEnum = pgEnum('fetch_status', [
	'success',
	'failure',
	'partial',
	'timeout',
	'skipped'
]);

export const fetchErrorCategoryEnum = pgEnum('fetch_error_category', [
	'network',
	'timeout',
	'rate_limit',
	'server_error',
	'auth',
	'not_found',
	'parse',
	'unknown'
]);

export const candidateStatusEnum = pgEnum('candidate_status', [
	'pending_review',
	'approved',
	'rejected',
	'archived',
	'needs_info',
	'auto_approved'
]);

export const candidatePriorityEnum = pgEnum('candidate_priority', ['low', 'normal', 'high']);

export const dedupeResultEnum = pgEnum('dedupe_result', [
	'new',
	'duplicate',
	'update',
	'ambiguous'
]);

export const rejectionReasonEnum = pgEnum('rejection_reason', [
	'duplicate',
	'irrelevant',
	'expired',
	'low_quality',
	'inaccurate',
	'incomplete',
	'out_of_scope',
	'spam',
	'other'
]);

export const batchStatusEnum = pgEnum('batch_status', [
	'running',
	'completed',
	'failed',
	'cancelled'
]);

export const coilTypeEnum = pgEnum('coil_type', [
	'events',
	'funding',
	'jobs',
	'red_pages',
	'toolbox'
]);

export const mergeTypeEnum = pgEnum('merge_type', ['auto_merge', 'manual_merge', 'field_update']);

export const sources = pgTable(
	'sources',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		name: text('name').notNull(),
		slug: text('slug').notNull().unique(),
		description: text('description'),
		sourceUrl: text('source_url').notNull(),
		homepageUrl: text('homepage_url'),
		coils: coilTypeEnum('coils')
			.array()
			.notNull()
			.default(sql`'{}'::coil_type[]`),
		ingestionMethod: ingestionMethodEnum('ingestion_method').notNull().default('manual_only'),
		sourceCategory: sourceCategoryEnum('source_category'),
		adapterType: text('adapter_type'),
		adapterConfig: jsonb('adapter_config').notNull().default({}),
		fetchCadence: fetchCadenceEnum('fetch_cadence').notNull().default('manual'),
		fetchUrl: text('fetch_url'),
		status: sourceStatusEnum('status').notNull().default('discovered'),
		healthStatus: sourceHealthEnum('health_status').notNull().default('unknown'),
		enabled: boolean('enabled').notNull().default(false),
		lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
		lastSuccessfulFetchAt: timestamp('last_successful_fetch_at', { withTimezone: true }),
		lastContentChangeAt: timestamp('last_content_change_at', { withTimezone: true }),
		lastContentHash: text('last_content_hash'),
		consecutiveFailureCount: integer('consecutive_failure_count').notNull().default(0),
		totalItemsImported: integer('total_items_imported').notNull().default(0),
		nextCheckAt: timestamp('next_check_at', { withTimezone: true }),
		stewardNotes: text('steward_notes'),
		ownerUserId: text('owner_user_id').references(() => user.id, { onDelete: 'set null' }),
		attributionRequired: boolean('attribution_required').notNull().default(true),
		attributionText: text('attribution_text'),
		reviewRequired: boolean('review_required').notNull().default(true),
		autoApprove: boolean('auto_approve').notNull().default(false),
		confidenceScore: integer('confidence_score'),
		riskProfile: jsonb('risk_profile').notNull().default({
			freshness: 'medium',
			duplication: 'medium',
			legal: 'low',
			normalization: 'medium',
			maintenance: 'medium',
			moderation: 'medium'
		}),
		dedupeStrategies: dedupeStrategyEnum('dedupe_strategies')
			.array()
			.notNull()
			.default(sql`'{url_match}'::dedupe_strategy[]`),
		dedupeConfig: jsonb('dedupe_config').notNull().default({}),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
		deprecatedAt: timestamp('deprecated_at', { withTimezone: true }),
		pausedAt: timestamp('paused_at', { withTimezone: true }),
		pauseReason: text('pause_reason')
	},
	(t) => [
		check(
			'sources_confidence_score_check',
			sql`${t.confidenceScore} is null or (${t.confidenceScore} >= 1 and ${t.confidenceScore} <= 5)`
		),
		index('sources_status_idx').on(t.status),
		index('sources_health_status_idx').on(t.healthStatus),
		index('sources_enabled_true_idx')
			.on(t.enabled)
			.where(sql`${t.enabled} = true`),
		index('sources_next_check_at_idx')
			.on(t.nextCheckAt)
			.where(sql`${t.enabled} = true and ${t.status} = 'active'`),
		index('sources_coils_gin_idx').using('gin', t.coils),
		index('sources_source_category_idx').on(t.sourceCategory),
		index('sources_ingestion_method_idx').on(t.ingestionMethod),
		index('sources_owner_user_id_idx').on(t.ownerUserId),
		uniqueIndex('sources_source_url_active_unique')
			.on(t.sourceUrl)
			.where(sql`${t.status} not in ('deprecated', 'disabled')`),
		uniqueIndex('sources_fetch_url_active_unique')
			.on(t.fetchUrl)
			.where(sql`${t.fetchUrl} is not null and ${t.status} not in ('deprecated', 'disabled')`)
	]
);

export const sourceTags = pgTable(
	'source_tags',
	{
		sourceId: uuid('source_id')
			.notNull()
			.references(() => sources.id, { onDelete: 'cascade' }),
		tagKey: text('tag_key').notNull(),
		tagValue: text('tag_value').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [primaryKey({ columns: [t.sourceId, t.tagKey, t.tagValue] })]
);

export const sourceFetchLog = pgTable(
	'source_fetch_log',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		sourceId: uuid('source_id')
			.notNull()
			.references(() => sources.id, { onDelete: 'cascade' }),
		attemptedAt: timestamp('attempted_at', { withTimezone: true }).defaultNow().notNull(),
		status: fetchStatusEnum('status').notNull(),
		httpStatusCode: integer('http_status_code'),
		responseTimeMs: integer('response_time_ms'),
		contentHash: text('content_hash'),
		contentChanged: boolean('content_changed'),
		itemsFound: integer('items_found').notNull().default(0),
		itemsNew: integer('items_new').notNull().default(0),
		errorMessage: text('error_message'),
		errorCategory: fetchErrorCategoryEnum('error_category'),
		responseBytes: integer('response_bytes')
	},
	(t) => [
		index('source_fetch_log_source_attempted_at_idx').on(t.sourceId, t.attemptedAt.desc()),
		index('source_fetch_log_status_idx').on(t.status)
	]
);

export const importBatches = pgTable(
	'import_batches',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		sourceId: uuid('source_id')
			.notNull()
			.references(() => sources.id, { onDelete: 'cascade' }),
		fetchLogId: uuid('fetch_log_id').references(() => sourceFetchLog.id, { onDelete: 'set null' }),
		status: batchStatusEnum('status').notNull().default('running'),
		startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
		completedAt: timestamp('completed_at', { withTimezone: true }),
		itemsFetched: integer('items_fetched').notNull().default(0),
		itemsParsed: integer('items_parsed').notNull().default(0),
		itemsNormalized: integer('items_normalized').notNull().default(0),
		itemsNew: integer('items_new').notNull().default(0),
		itemsDuplicate: integer('items_duplicate').notNull().default(0),
		itemsUpdated: integer('items_updated').notNull().default(0),
		itemsFailed: integer('items_failed').notNull().default(0),
		errors: jsonb('errors').notNull().default([])
	},
	(t) => [index('import_batches_source_started_at_idx').on(t.sourceId, t.startedAt.desc())]
);

export const canonicalRecords = pgTable(
	'canonical_records',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		coil: coilTypeEnum('coil').notNull(),
		publishedRecordId: uuid('published_record_id').notNull(),
		canonicalTitle: text('canonical_title').notNull(),
		compositeKey: text('composite_key'),
		contentFingerprint: text('content_fingerprint'),
		canonicalUrl: text('canonical_url'),
		externalIds: jsonb('external_ids').notNull().default({}),
		sourceSnapshot: jsonb('source_snapshot').notNull().default({}),
		sourceCount: integer('source_count').notNull().default(1),
		primarySourceId: uuid('primary_source_id').references(() => sources.id, {
			onDelete: 'set null'
		}),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(t) => [
		index('canonical_records_coil_idx').on(t.coil),
		index('canonical_records_content_fingerprint_idx').on(t.contentFingerprint),
		index('canonical_records_composite_key_idx').on(t.compositeKey),
		index('canonical_records_canonical_url_idx').on(t.canonicalUrl),
		index('canonical_records_canonical_title_idx').on(t.canonicalTitle)
	]
);

export const importedCandidates = pgTable(
	'imported_candidates',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		sourceId: uuid('source_id')
			.notNull()
			.references(() => sources.id, { onDelete: 'cascade' }),
		batchId: uuid('batch_id')
			.notNull()
			.references(() => importBatches.id, { onDelete: 'cascade' }),
		coil: coilTypeEnum('coil').notNull(),
		status: candidateStatusEnum('status').notNull().default('pending_review'),
		priority: candidatePriorityEnum('priority').notNull().default('normal'),
		rawData: jsonb('raw_data').notNull(),
		normalizedData: jsonb('normalized_data').notNull(),
		sourceItemId: text('source_item_id'),
		sourceItemUrl: text('source_item_url'),
		dedupeResult: dedupeResultEnum('dedupe_result').notNull().default('new'),
		dedupeStrategyUsed: dedupeStrategyEnum('dedupe_strategy_used'),
		matchedCanonicalId: uuid('matched_canonical_id').references(() => canonicalRecords.id, {
			onDelete: 'set null'
		}),
		contentFingerprint: text('content_fingerprint'),
		sourceAttribution: text('source_attribution'),
		reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
		reviewedBy: text('reviewed_by').references(() => user.id, { onDelete: 'set null' }),
		reviewNotes: text('review_notes'),
		rejectionReason: rejectionReasonEnum('rejection_reason'),
		importedAt: timestamp('imported_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
		expiresAt: timestamp('expires_at', { withTimezone: true })
	},
	(t) => [
		uniqueIndex('imported_candidates_source_item_active_unique')
			.on(t.sourceId, t.sourceItemId)
			.where(sql`${t.sourceItemId} is not null and ${t.status} not in ('rejected', 'archived')`),
		uniqueIndex('imported_candidates_fingerprint_active_unique')
			.on(t.coil, t.contentFingerprint)
			.where(
				sql`${t.contentFingerprint} is not null and ${t.status} not in ('rejected', 'archived')`
			),
		index('imported_candidates_review_queue_idx')
			.on(t.coil, t.priority.desc(), t.importedAt)
			.where(sql`${t.status} = 'pending_review'`),
		index('imported_candidates_source_imported_at_idx').on(t.sourceId, t.importedAt.desc()),
		index('imported_candidates_batch_id_idx').on(t.batchId),
		index('imported_candidates_content_fingerprint_idx').on(t.contentFingerprint),
		index('imported_candidates_dedupe_review_idx')
			.on(t.dedupeResult)
			.where(sql`${t.dedupeResult} in ('duplicate', 'ambiguous')`),
		index('imported_candidates_expires_at_idx')
			.on(t.expiresAt)
			.where(sql`${t.status} = 'pending_review'`)
	]
);

export const sourceRecordLinks = pgTable(
	'source_record_links',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		sourceId: uuid('source_id')
			.notNull()
			.references(() => sources.id, { onDelete: 'cascade' }),
		canonicalRecordId: uuid('canonical_record_id')
			.notNull()
			.references(() => canonicalRecords.id, { onDelete: 'cascade' }),
		sourceItemId: text('source_item_id'),
		sourceItemUrl: text('source_item_url'),
		sourceAttribution: text('source_attribution'),
		lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
		lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
		isPrimary: boolean('is_primary').notNull().default(false),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(t) => [
		uniqueIndex('source_record_links_source_canonical_unique').on(t.sourceId, t.canonicalRecordId),
		index('source_record_links_canonical_record_id_idx').on(t.canonicalRecordId),
		index('source_record_links_source_id_idx').on(t.sourceId)
	]
);

export const mergeHistory = pgTable(
	'merge_history',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		canonicalRecordId: uuid('canonical_record_id')
			.notNull()
			.references(() => canonicalRecords.id, { onDelete: 'cascade' }),
		candidateId: uuid('candidate_id').references(() => importedCandidates.id, {
			onDelete: 'set null'
		}),
		sourceId: uuid('source_id')
			.notNull()
			.references(() => sources.id, { onDelete: 'cascade' }),
		mergeType: mergeTypeEnum('merge_type').notNull(),
		fieldsUpdated: text('fields_updated')
			.array()
			.notNull()
			.default(sql`'{}'::text[]`),
		previousData: jsonb('previous_data'),
		newData: jsonb('new_data'),
		mergedBy: text('merged_by').references(() => user.id, { onDelete: 'set null' }),
		mergedAt: timestamp('merged_at', { withTimezone: true }).defaultNow().notNull(),
		notes: text('notes')
	},
	(t) => [
		index('merge_history_canonical_merged_at_idx').on(t.canonicalRecordId, t.mergedAt.desc()),
		index('merge_history_source_id_idx').on(t.sourceId)
	]
);
