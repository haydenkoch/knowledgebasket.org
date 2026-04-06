CREATE TYPE "public"."batch_status" AS ENUM('running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."candidate_priority" AS ENUM('low', 'normal', 'high');--> statement-breakpoint
CREATE TYPE "public"."candidate_status" AS ENUM('pending_review', 'approved', 'rejected', 'archived', 'needs_info', 'auto_approved');--> statement-breakpoint
CREATE TYPE "public"."coil_type" AS ENUM('events', 'funding', 'jobs', 'red_pages', 'toolbox');--> statement-breakpoint
CREATE TYPE "public"."dedupe_result" AS ENUM('new', 'duplicate', 'update', 'ambiguous');--> statement-breakpoint
CREATE TYPE "public"."dedupe_strategy" AS ENUM('url_match', 'title_fuzzy', 'composite_key', 'content_hash', 'external_id');--> statement-breakpoint
CREATE TYPE "public"."fetch_cadence" AS ENUM('hourly', 'every_6h', 'daily', 'weekly', 'biweekly', 'monthly', 'manual');--> statement-breakpoint
CREATE TYPE "public"."fetch_error_category" AS ENUM('network', 'timeout', 'rate_limit', 'server_error', 'auth', 'not_found', 'parse', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."fetch_status" AS ENUM('success', 'failure', 'partial', 'timeout', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."ingestion_method" AS ENUM('manual_only', 'manual_with_reminder', 'rss_import', 'ical_import', 'api_import', 'html_scrape', 'directory_sync', 'document_extraction', 'newsletter_triage', 'hybrid');--> statement-breakpoint
CREATE TYPE "public"."merge_type" AS ENUM('auto_merge', 'manual_merge', 'field_update');--> statement-breakpoint
CREATE TYPE "public"."rejection_reason" AS ENUM('duplicate', 'irrelevant', 'expired', 'low_quality', 'inaccurate', 'incomplete', 'out_of_scope', 'spam', 'other');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."source_category" AS ENUM('government_federal', 'government_state', 'government_tribal', 'nonprofit', 'foundation', 'aggregator', 'news_media', 'academic', 'professional_association', 'private_business', 'community');--> statement-breakpoint
CREATE TYPE "public"."source_health" AS ENUM('healthy', 'degraded', 'unhealthy', 'stale', 'broken', 'auth_required', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."source_status" AS ENUM('discovered', 'configuring', 'active', 'paused', 'deprecated', 'disabled', 'manual_only');--> statement-breakpoint

CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'contributor' NOT NULL,
	"bio" text,
	"avatar_url" text,
	"tribal_affiliation" text,
	"location" text,
	"newsletter_opt_in" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);--> statement-breakpoint

CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token"),
	CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint

CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint

CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"source_url" text NOT NULL,
	"homepage_url" text,
	"coils" "coil_type"[] DEFAULT '{}'::coil_type[] NOT NULL,
	"ingestion_method" "ingestion_method" DEFAULT 'manual_only' NOT NULL,
	"source_category" "source_category",
	"adapter_type" text,
	"adapter_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"fetch_cadence" "fetch_cadence" DEFAULT 'manual' NOT NULL,
	"fetch_url" text,
	"status" "source_status" DEFAULT 'discovered' NOT NULL,
	"health_status" "source_health" DEFAULT 'unknown' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"last_checked_at" timestamp with time zone,
	"last_successful_fetch_at" timestamp with time zone,
	"last_content_change_at" timestamp with time zone,
	"last_content_hash" text,
	"consecutive_failure_count" integer DEFAULT 0 NOT NULL,
	"total_items_imported" integer DEFAULT 0 NOT NULL,
	"next_check_at" timestamp with time zone,
	"steward_notes" text,
	"owner_user_id" text,
	"attribution_required" boolean DEFAULT true NOT NULL,
	"attribution_text" text,
	"review_required" boolean DEFAULT true NOT NULL,
	"auto_approve" boolean DEFAULT false NOT NULL,
	"confidence_score" integer,
	"risk_profile" jsonb DEFAULT '{"freshness":"medium","duplication":"medium","legal":"low","normalization":"medium","maintenance":"medium","moderation":"medium"}'::jsonb NOT NULL,
	"dedupe_strategies" "dedupe_strategy"[] DEFAULT '{url_match}'::dedupe_strategy[] NOT NULL,
	"dedupe_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deprecated_at" timestamp with time zone,
	"paused_at" timestamp with time zone,
	"pause_reason" text,
	CONSTRAINT "sources_slug_unique" UNIQUE("slug"),
	CONSTRAINT "sources_confidence_score_check" CHECK ("sources"."confidence_score" is null or ("sources"."confidence_score" >= 1 and "sources"."confidence_score" <= 5)),
	CONSTRAINT "sources_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action
);--> statement-breakpoint

CREATE TABLE "source_tags" (
	"source_id" uuid NOT NULL,
	"tag_key" text NOT NULL,
	"tag_value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_tags_source_id_tag_key_tag_value_pk" PRIMARY KEY("source_id","tag_key","tag_value"),
	CONSTRAINT "source_tags_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint

CREATE TABLE "source_fetch_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "fetch_status" NOT NULL,
	"http_status_code" integer,
	"response_time_ms" integer,
	"content_hash" text,
	"content_changed" boolean,
	"items_found" integer DEFAULT 0 NOT NULL,
	"items_new" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"error_category" "fetch_error_category",
	"response_bytes" integer,
	CONSTRAINT "source_fetch_log_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint

CREATE TABLE "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"fetch_log_id" uuid,
	"status" "batch_status" DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"items_fetched" integer DEFAULT 0 NOT NULL,
	"items_parsed" integer DEFAULT 0 NOT NULL,
	"items_normalized" integer DEFAULT 0 NOT NULL,
	"items_new" integer DEFAULT 0 NOT NULL,
	"items_duplicate" integer DEFAULT 0 NOT NULL,
	"items_updated" integer DEFAULT 0 NOT NULL,
	"items_failed" integer DEFAULT 0 NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "import_batches_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "import_batches_fetch_log_id_source_fetch_log_id_fk" FOREIGN KEY ("fetch_log_id") REFERENCES "public"."source_fetch_log"("id") ON DELETE set null ON UPDATE no action
);--> statement-breakpoint

CREATE TABLE "canonical_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coil" "coil_type" NOT NULL,
	"published_record_id" uuid NOT NULL,
	"canonical_title" text NOT NULL,
	"composite_key" text,
	"content_fingerprint" text,
	"canonical_url" text,
	"external_ids" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_count" integer DEFAULT 1 NOT NULL,
	"primary_source_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "canonical_records_primary_source_id_sources_id_fk" FOREIGN KEY ("primary_source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action
);--> statement-breakpoint

CREATE TABLE "imported_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"coil" "coil_type" NOT NULL,
	"status" "candidate_status" DEFAULT 'pending_review' NOT NULL,
	"priority" "candidate_priority" DEFAULT 'normal' NOT NULL,
	"raw_data" jsonb NOT NULL,
	"normalized_data" jsonb NOT NULL,
	"source_item_id" text,
	"source_item_url" text,
	"dedupe_result" "dedupe_result" DEFAULT 'new' NOT NULL,
	"dedupe_strategy_used" "dedupe_strategy",
	"matched_canonical_id" uuid,
	"content_fingerprint" text,
	"source_attribution" text,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" text,
	"review_notes" text,
	"rejection_reason" "rejection_reason",
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	CONSTRAINT "imported_candidates_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "imported_candidates_batch_id_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."import_batches"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "imported_candidates_matched_canonical_id_canonical_records_id_fk" FOREIGN KEY ("matched_canonical_id") REFERENCES "public"."canonical_records"("id") ON DELETE set null ON UPDATE no action,
	CONSTRAINT "imported_candidates_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action
);--> statement-breakpoint

CREATE TABLE "source_record_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"canonical_record_id" uuid NOT NULL,
	"source_item_id" text,
	"source_item_url" text,
	"source_attribution" text,
	"last_seen_at" timestamp with time zone,
	"last_sync_at" timestamp with time zone,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_record_links_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "source_record_links_canonical_record_id_canonical_records_id_fk" FOREIGN KEY ("canonical_record_id") REFERENCES "public"."canonical_records"("id") ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint

CREATE TABLE "merge_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canonical_record_id" uuid NOT NULL,
	"candidate_id" uuid,
	"source_id" uuid NOT NULL,
	"merge_type" "merge_type" NOT NULL,
	"fields_updated" text[] DEFAULT '{}'::text[] NOT NULL,
	"previous_data" jsonb,
	"new_data" jsonb,
	"merged_by" text,
	"merged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	CONSTRAINT "merge_history_canonical_record_id_canonical_records_id_fk" FOREIGN KEY ("canonical_record_id") REFERENCES "public"."canonical_records"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "merge_history_candidate_id_imported_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."imported_candidates"("id") ON DELETE set null ON UPDATE no action,
	CONSTRAINT "merge_history_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "merge_history_merged_by_user_id_fk" FOREIGN KEY ("merged_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action
);--> statement-breakpoint

CREATE INDEX "canonical_records_coil_idx" ON "canonical_records" USING btree ("coil");--> statement-breakpoint
CREATE INDEX "canonical_records_content_fingerprint_idx" ON "canonical_records" USING btree ("content_fingerprint");--> statement-breakpoint
CREATE INDEX "canonical_records_composite_key_idx" ON "canonical_records" USING btree ("composite_key");--> statement-breakpoint
CREATE INDEX "canonical_records_canonical_url_idx" ON "canonical_records" USING btree ("canonical_url");--> statement-breakpoint
CREATE INDEX "canonical_records_canonical_title_idx" ON "canonical_records" USING btree ("canonical_title");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "import_batches_source_started_at_idx" ON "import_batches" USING btree ("source_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "imported_candidates_source_item_active_unique" ON "imported_candidates" USING btree ("source_id","source_item_id") WHERE "imported_candidates"."source_item_id" is not null and "imported_candidates"."status" not in ('rejected', 'archived');--> statement-breakpoint
CREATE UNIQUE INDEX "imported_candidates_fingerprint_active_unique" ON "imported_candidates" USING btree ("coil","content_fingerprint") WHERE "imported_candidates"."content_fingerprint" is not null and "imported_candidates"."status" not in ('rejected', 'archived');--> statement-breakpoint
CREATE INDEX "imported_candidates_review_queue_idx" ON "imported_candidates" USING btree ("coil","priority" DESC NULLS LAST,"imported_at") WHERE "imported_candidates"."status" = 'pending_review';--> statement-breakpoint
CREATE INDEX "imported_candidates_source_imported_at_idx" ON "imported_candidates" USING btree ("source_id","imported_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "imported_candidates_batch_id_idx" ON "imported_candidates" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "imported_candidates_content_fingerprint_idx" ON "imported_candidates" USING btree ("content_fingerprint");--> statement-breakpoint
CREATE INDEX "imported_candidates_dedupe_review_idx" ON "imported_candidates" USING btree ("dedupe_result") WHERE "imported_candidates"."dedupe_result" in ('duplicate', 'ambiguous');--> statement-breakpoint
CREATE INDEX "imported_candidates_expires_at_idx" ON "imported_candidates" USING btree ("expires_at") WHERE "imported_candidates"."status" = 'pending_review';--> statement-breakpoint
CREATE INDEX "merge_history_canonical_merged_at_idx" ON "merge_history" USING btree ("canonical_record_id","merged_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "merge_history_source_id_idx" ON "merge_history" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "source_fetch_log_source_attempted_at_idx" ON "source_fetch_log" USING btree ("source_id","attempted_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "source_fetch_log_status_idx" ON "source_fetch_log" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "source_record_links_source_canonical_unique" ON "source_record_links" USING btree ("source_id","canonical_record_id");--> statement-breakpoint
CREATE INDEX "source_record_links_canonical_record_id_idx" ON "source_record_links" USING btree ("canonical_record_id");--> statement-breakpoint
CREATE INDEX "source_record_links_source_id_idx" ON "source_record_links" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "sources_status_idx" ON "sources" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sources_health_status_idx" ON "sources" USING btree ("health_status");--> statement-breakpoint
CREATE INDEX "sources_enabled_true_idx" ON "sources" USING btree ("enabled") WHERE "sources"."enabled" = true;--> statement-breakpoint
CREATE INDEX "sources_next_check_at_idx" ON "sources" USING btree ("next_check_at") WHERE "sources"."enabled" = true and "sources"."status" = 'active';--> statement-breakpoint
CREATE INDEX "sources_coils_gin_idx" ON "sources" USING gin ("coils");--> statement-breakpoint
CREATE INDEX "sources_source_category_idx" ON "sources" USING btree ("source_category");--> statement-breakpoint
CREATE INDEX "sources_ingestion_method_idx" ON "sources" USING btree ("ingestion_method");--> statement-breakpoint
CREATE INDEX "sources_owner_user_id_idx" ON "sources" USING btree ("owner_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_source_url_active_unique" ON "sources" USING btree ("source_url") WHERE "sources"."status" not in ('deprecated', 'disabled');--> statement-breakpoint
CREATE UNIQUE INDEX "sources_fetch_url_active_unique" ON "sources" USING btree ("fetch_url") WHERE "sources"."fetch_url" is not null and "sources"."status" not in ('deprecated', 'disabled');
