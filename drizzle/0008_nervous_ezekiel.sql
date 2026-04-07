CREATE TYPE "public"."record_image_role" AS ENUM('feed', 'detail', 'structured', 'attachment', 'inline', 'logo', 'fallback', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."record_link_role" AS ENUM('source_page', 'detail_page', 'canonical_item', 'registration', 'application', 'organizer', 'venue', 'feed', 'image_source', 'attachment');--> statement-breakpoint
CREATE TYPE "public"."source_run_stage" AS ENUM('fetch', 'discover', 'detail_enrich', 'structured_extract', 'ai_enrich', 'link_classify', 'image_discover', 'normalize', 'entity_match', 'quality_flag', 'dedupe', 'persist');--> statement-breakpoint
CREATE TYPE "public"."source_run_stage_status" AS ENUM('running', 'success', 'failure', 'partial', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."source_run_status" AS ENUM('running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TABLE "organization_claim_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"requester_user_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_email" text NOT NULL,
	"email_domain" text,
	"evidence" text,
	"review_notes" text,
	"reviewed_by_id" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"token" text NOT NULL,
	"invited_by_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "personal_calendar_feeds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rotated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "personal_calendar_feeds_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "personal_calendar_feeds_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "record_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coil" "coil_type" NOT NULL,
	"published_record_id" uuid NOT NULL,
	"canonical_record_id" uuid,
	"source_id" uuid,
	"candidate_id" uuid,
	"image_url" text NOT NULL,
	"source_url" text,
	"role" "record_image_role" DEFAULT 'unknown' NOT NULL,
	"width" integer,
	"height" integer,
	"mime_type" text,
	"file_size" integer,
	"quality_score" real,
	"is_meaningful" boolean DEFAULT true NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "record_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coil" "coil_type" NOT NULL,
	"published_record_id" uuid NOT NULL,
	"canonical_record_id" uuid,
	"source_id" uuid,
	"candidate_id" uuid,
	"url" text NOT NULL,
	"role" "record_link_role" NOT NULL,
	"source_url" text,
	"provenance" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"confidence" real,
	"extracted" boolean DEFAULT true NOT NULL,
	"inferred" boolean DEFAULT false NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_run_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_run_id" uuid NOT NULL,
	"stage" "source_run_stage" NOT NULL,
	"status" "source_run_stage_status" DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"duration_ms" integer,
	"item_count" integer,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"trigger" text NOT NULL,
	"trigger_run_id" text,
	"retry_of_run_id" uuid,
	"triggered_by" text,
	"adapter_type" text,
	"adapter_version" text,
	"status" "source_run_status" DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"duration_ms" integer,
	"fetch_url" text,
	"content_hash" text,
	"content_changed" boolean,
	"items_fetched" integer DEFAULT 0 NOT NULL,
	"items_parsed" integer DEFAULT 0 NOT NULL,
	"items_normalized" integer DEFAULT 0 NOT NULL,
	"items_new" integer DEFAULT 0 NOT NULL,
	"items_duplicate" integer DEFAULT 0 NOT NULL,
	"items_updated" integer DEFAULT 0 NOT NULL,
	"items_failed" integer DEFAULT 0 NOT NULL,
	"candidates_created" integer DEFAULT 0 NOT NULL,
	"auto_approved_count" integer DEFAULT 0 NOT NULL,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "privacy_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"request_type" text NOT NULL,
	"channel" text DEFAULT 'account' NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"verification_status" text DEFAULT 'verified' NOT NULL,
	"subject" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"resolution_notes" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"fulfilled_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_org_memberships" ALTER COLUMN "role" SET DEFAULT 'editor';--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "aliases" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "aliases" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "funding" ADD COLUMN "image_urls" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "image_urls" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "toolbox_resources" ADD COLUMN "image_urls" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "user_org_memberships" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_org_memberships" ADD COLUMN "invited_by_id" text;--> statement-breakpoint
ALTER TABLE "user_org_memberships" ADD COLUMN "accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_org_memberships" ADD COLUMN "revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "canonical_records" ADD COLUMN "source_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "import_batches" ADD COLUMN "source_run_id" uuid;--> statement-breakpoint
ALTER TABLE "imported_candidates" ADD COLUMN "field_provenance" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "imported_candidates" ADD COLUMN "url_roles" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "imported_candidates" ADD COLUMN "image_candidates" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "imported_candidates" ADD COLUMN "extracted_facts" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "imported_candidates" ADD COLUMN "quality_flags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "imported_candidates" ADD COLUMN "confidence" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "imported_candidates" ADD COLUMN "diagnostics" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "quarantined" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "quarantine_reason" text;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "adapter_version" text;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "qa_notes" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_claim_requests" ADD CONSTRAINT "organization_claim_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_claim_requests" ADD CONSTRAINT "organization_claim_requests_requester_user_id_user_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_claim_requests" ADD CONSTRAINT "organization_claim_requests_reviewed_by_id_user_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invites" ADD CONSTRAINT "organization_invites_invited_by_id_user_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_calendar_feeds" ADD CONSTRAINT "personal_calendar_feeds_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_images" ADD CONSTRAINT "record_images_canonical_record_id_canonical_records_id_fk" FOREIGN KEY ("canonical_record_id") REFERENCES "public"."canonical_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_images" ADD CONSTRAINT "record_images_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_images" ADD CONSTRAINT "record_images_candidate_id_imported_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."imported_candidates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_links" ADD CONSTRAINT "record_links_canonical_record_id_canonical_records_id_fk" FOREIGN KEY ("canonical_record_id") REFERENCES "public"."canonical_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_links" ADD CONSTRAINT "record_links_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "record_links" ADD CONSTRAINT "record_links_candidate_id_imported_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."imported_candidates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_run_stages" ADD CONSTRAINT "source_run_stages_source_run_id_source_runs_id_fk" FOREIGN KEY ("source_run_id") REFERENCES "public"."source_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_runs" ADD CONSTRAINT "source_runs_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_runs" ADD CONSTRAINT "source_runs_triggered_by_user_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_requests" ADD CONSTRAINT "privacy_requests_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organization_claim_requests_org_id_idx" ON "organization_claim_requests" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_claim_requests_requester_id_idx" ON "organization_claim_requests" USING btree ("requester_user_id");--> statement-breakpoint
CREATE INDEX "organization_claim_requests_status_idx" ON "organization_claim_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "organization_invites_org_id_idx" ON "organization_invites" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_invites_email_idx" ON "organization_invites" USING btree ("email");--> statement-breakpoint
CREATE INDEX "organization_invites_invited_by_id_idx" ON "organization_invites" USING btree ("invited_by_id");--> statement-breakpoint
CREATE INDEX "personal_calendar_feeds_token_idx" ON "personal_calendar_feeds" USING btree ("token");--> statement-breakpoint
CREATE INDEX "record_images_record_idx" ON "record_images" USING btree ("coil","published_record_id");--> statement-breakpoint
CREATE INDEX "record_images_source_id_idx" ON "record_images" USING btree ("source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "record_images_unique" ON "record_images" USING btree ("coil","published_record_id","image_url");--> statement-breakpoint
CREATE INDEX "record_links_record_idx" ON "record_links" USING btree ("coil","published_record_id");--> statement-breakpoint
CREATE INDEX "record_links_role_idx" ON "record_links" USING btree ("role");--> statement-breakpoint
CREATE INDEX "record_links_source_id_idx" ON "record_links" USING btree ("source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "record_links_unique" ON "record_links" USING btree ("coil","published_record_id","role","url");--> statement-breakpoint
CREATE UNIQUE INDEX "source_run_stages_run_stage_unique" ON "source_run_stages" USING btree ("source_run_id","stage");--> statement-breakpoint
CREATE INDEX "source_run_stages_status_idx" ON "source_run_stages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "source_runs_source_started_at_idx" ON "source_runs" USING btree ("source_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "source_runs_trigger_run_id_idx" ON "source_runs" USING btree ("trigger_run_id");--> statement-breakpoint
CREATE INDEX "source_runs_status_idx" ON "source_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "privacy_requests_user_id_idx" ON "privacy_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "privacy_requests_type_idx" ON "privacy_requests" USING btree ("request_type");--> statement-breakpoint
CREATE INDEX "privacy_requests_status_idx" ON "privacy_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "privacy_requests_requested_at_idx" ON "privacy_requests" USING btree ("requested_at");--> statement-breakpoint
ALTER TABLE "user_org_memberships" ADD CONSTRAINT "user_org_memberships_invited_by_id_user_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_source_run_id_source_runs_id_fk" FOREIGN KEY ("source_run_id") REFERENCES "public"."source_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "event_list_items_list_event_unique" ON "event_list_items" USING btree ("list_id","event_id");--> statement-breakpoint
CREATE INDEX "user_org_memberships_invited_by_id_idx" ON "user_org_memberships" USING btree ("invited_by_id");