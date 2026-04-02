ALTER TABLE "canonical_records"
ADD COLUMN "source_snapshot" jsonb NOT NULL DEFAULT '{}'::jsonb;
