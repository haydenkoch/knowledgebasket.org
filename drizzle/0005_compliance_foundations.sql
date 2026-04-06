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
ALTER TABLE "privacy_requests"
ADD CONSTRAINT "privacy_requests_user_id_user_id_fk"
FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "privacy_requests_user_id_idx" ON "privacy_requests" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "privacy_requests_type_idx" ON "privacy_requests" USING btree ("request_type");
--> statement-breakpoint
CREATE INDEX "privacy_requests_status_idx" ON "privacy_requests" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "privacy_requests_requested_at_idx" ON "privacy_requests" USING btree ("requested_at");
