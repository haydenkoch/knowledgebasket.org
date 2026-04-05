CREATE TYPE "source_run_status" AS ENUM ('running', 'completed', 'failed', 'cancelled');
CREATE TYPE "source_run_stage" AS ENUM (
	'fetch',
	'discover',
	'detail_enrich',
	'structured_extract',
	'link_classify',
	'image_discover',
	'normalize',
	'entity_match',
	'quality_flag',
	'dedupe',
	'persist'
);
CREATE TYPE "source_run_stage_status" AS ENUM ('running', 'success', 'failure', 'partial', 'skipped');
CREATE TYPE "record_link_role" AS ENUM (
	'source_page',
	'detail_page',
	'canonical_item',
	'registration',
	'application',
	'organizer',
	'venue',
	'feed',
	'image_source',
	'attachment'
);
CREATE TYPE "record_image_role" AS ENUM (
	'feed',
	'detail',
	'structured',
	'attachment',
	'inline',
	'logo',
	'fallback',
	'unknown'
);

ALTER TABLE "sources"
	ADD COLUMN "quarantined" boolean NOT NULL DEFAULT false,
	ADD COLUMN "quarantine_reason" text,
	ADD COLUMN "adapter_version" text,
	ADD COLUMN "qa_notes" jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE "source_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL REFERENCES "sources"("id") ON DELETE cascade,
	"trigger" text NOT NULL,
	"trigger_run_id" text,
	"retry_of_run_id" uuid,
	"triggered_by" text REFERENCES "user"("id") ON DELETE set null,
	"adapter_type" text,
	"adapter_version" text,
	"status" "source_run_status" NOT NULL DEFAULT 'running',
	"started_at" timestamp with time zone NOT NULL DEFAULT now(),
	"completed_at" timestamp with time zone,
	"duration_ms" integer,
	"fetch_url" text,
	"content_hash" text,
	"content_changed" boolean,
	"items_fetched" integer NOT NULL DEFAULT 0,
	"items_parsed" integer NOT NULL DEFAULT 0,
	"items_normalized" integer NOT NULL DEFAULT 0,
	"items_new" integer NOT NULL DEFAULT 0,
	"items_duplicate" integer NOT NULL DEFAULT 0,
	"items_updated" integer NOT NULL DEFAULT 0,
	"items_failed" integer NOT NULL DEFAULT 0,
	"candidates_created" integer NOT NULL DEFAULT 0,
	"auto_approved_count" integer NOT NULL DEFAULT 0,
	"warnings" jsonb NOT NULL DEFAULT '[]'::jsonb,
	"errors" jsonb NOT NULL DEFAULT '[]'::jsonb,
	"metrics" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "source_runs_source_started_at_idx" ON "source_runs" ("source_id", "started_at" DESC);
CREATE INDEX "source_runs_trigger_run_id_idx" ON "source_runs" ("trigger_run_id");
CREATE INDEX "source_runs_status_idx" ON "source_runs" ("status");

CREATE TABLE "source_run_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_run_id" uuid NOT NULL REFERENCES "source_runs"("id") ON DELETE cascade,
	"stage" "source_run_stage" NOT NULL,
	"status" "source_run_stage_status" NOT NULL DEFAULT 'running',
	"started_at" timestamp with time zone NOT NULL DEFAULT now(),
	"completed_at" timestamp with time zone,
	"duration_ms" integer,
	"item_count" integer,
	"warnings" jsonb NOT NULL DEFAULT '[]'::jsonb,
	"errors" jsonb NOT NULL DEFAULT '[]'::jsonb,
	"metrics" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"details" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "source_run_stages_run_stage_unique" ON "source_run_stages" ("source_run_id", "stage");
CREATE INDEX "source_run_stages_status_idx" ON "source_run_stages" ("status");

ALTER TABLE "import_batches"
	ADD COLUMN "source_run_id" uuid REFERENCES "source_runs"("id") ON DELETE set null;

ALTER TABLE "imported_candidates"
	ADD COLUMN "field_provenance" jsonb NOT NULL DEFAULT '{}'::jsonb,
	ADD COLUMN "url_roles" jsonb NOT NULL DEFAULT '{}'::jsonb,
	ADD COLUMN "image_candidates" jsonb NOT NULL DEFAULT '[]'::jsonb,
	ADD COLUMN "quality_flags" jsonb NOT NULL DEFAULT '[]'::jsonb,
	ADD COLUMN "confidence" jsonb NOT NULL DEFAULT '{}'::jsonb,
	ADD COLUMN "diagnostics" jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE "record_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coil" "coil_type" NOT NULL,
	"published_record_id" uuid NOT NULL,
	"canonical_record_id" uuid REFERENCES "canonical_records"("id") ON DELETE cascade,
	"source_id" uuid REFERENCES "sources"("id") ON DELETE set null,
	"candidate_id" uuid REFERENCES "imported_candidates"("id") ON DELETE set null,
	"url" text NOT NULL,
	"role" "record_link_role" NOT NULL,
	"source_url" text,
	"provenance" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"confidence" real,
	"extracted" boolean NOT NULL DEFAULT true,
	"inferred" boolean NOT NULL DEFAULT false,
	"is_primary" boolean NOT NULL DEFAULT false,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "record_links_record_idx" ON "record_links" ("coil", "published_record_id");
CREATE INDEX "record_links_role_idx" ON "record_links" ("role");
CREATE INDEX "record_links_source_id_idx" ON "record_links" ("source_id");
CREATE UNIQUE INDEX "record_links_unique" ON "record_links" ("coil", "published_record_id", "role", "url");

CREATE TABLE "record_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coil" "coil_type" NOT NULL,
	"published_record_id" uuid NOT NULL,
	"canonical_record_id" uuid REFERENCES "canonical_records"("id") ON DELETE cascade,
	"source_id" uuid REFERENCES "sources"("id") ON DELETE set null,
	"candidate_id" uuid REFERENCES "imported_candidates"("id") ON DELETE set null,
	"image_url" text NOT NULL,
	"source_url" text,
	"role" "record_image_role" NOT NULL DEFAULT 'unknown',
	"width" integer,
	"height" integer,
	"mime_type" text,
	"file_size" integer,
	"quality_score" real,
	"is_meaningful" boolean NOT NULL DEFAULT true,
	"is_primary" boolean NOT NULL DEFAULT false,
	"metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "record_images_record_idx" ON "record_images" ("coil", "published_record_id");
CREATE INDEX "record_images_source_id_idx" ON "record_images" ("source_id");
CREATE UNIQUE INDEX "record_images_unique" ON "record_images" ("coil", "published_record_id", "image_url");
