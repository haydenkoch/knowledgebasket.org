ALTER TABLE "organizations"
ADD COLUMN "aliases" text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE "venues"
ADD COLUMN "aliases" text[] NOT NULL DEFAULT '{}'::text[];
