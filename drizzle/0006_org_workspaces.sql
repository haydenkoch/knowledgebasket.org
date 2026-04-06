ALTER TABLE "user_org_memberships"
	ALTER COLUMN "role" SET DEFAULT 'editor';
--> statement-breakpoint
ALTER TABLE "user_org_memberships"
	ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active' NOT NULL,
	ADD COLUMN IF NOT EXISTS "invited_by_id" text,
	ADD COLUMN IF NOT EXISTS "accepted_at" timestamp with time zone,
	ADD COLUMN IF NOT EXISTS "revoked_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "user_org_memberships"
	ADD CONSTRAINT "user_org_memberships_invited_by_id_user_id_fk"
	FOREIGN KEY ("invited_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_org_memberships_invited_by_id_idx"
	ON "user_org_memberships" USING btree ("invited_by_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organization_claim_requests" (
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
ALTER TABLE "organization_claim_requests"
	ADD CONSTRAINT "organization_claim_requests_org_id_fk"
	FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "organization_claim_requests"
	ADD CONSTRAINT "organization_claim_requests_requester_user_id_fk"
	FOREIGN KEY ("requester_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "organization_claim_requests"
	ADD CONSTRAINT "organization_claim_requests_reviewed_by_id_fk"
	FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organization_claim_requests_org_id_idx"
	ON "organization_claim_requests" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organization_claim_requests_requester_id_idx"
	ON "organization_claim_requests" USING btree ("requester_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organization_claim_requests_status_idx"
	ON "organization_claim_requests" USING btree ("status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organization_invites" (
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
ALTER TABLE "organization_invites"
	ADD CONSTRAINT "organization_invites_org_id_fk"
	FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "organization_invites"
	ADD CONSTRAINT "organization_invites_invited_by_id_fk"
	FOREIGN KEY ("invited_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organization_invites_org_id_idx"
	ON "organization_invites" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organization_invites_email_idx"
	ON "organization_invites" USING btree ("email");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organization_invites_invited_by_id_idx"
	ON "organization_invites" USING btree ("invited_by_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "personal_calendar_feeds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rotated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "personal_calendar_feeds_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "personal_calendar_feeds_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "personal_calendar_feeds"
	ADD CONSTRAINT "personal_calendar_feeds_user_id_fk"
	FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "personal_calendar_feeds_token_idx"
	ON "personal_calendar_feeds" USING btree ("token");
