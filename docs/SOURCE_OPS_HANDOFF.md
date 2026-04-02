# Source Ops Handoff

This document captures the current source-ops implementation status in the app repo, the external design/source-data workspace it depends on, what has been verified, and what remains to finish the source system end to end in a fresh thread.

## External Context

The broader source-ops design and research live outside the app repo at:

- [/Users/hayden/Desktop/kb-data/source-ops/README.md](/Users/hayden/Desktop/kb-data/source-ops/README.md)
- [/Users/hayden/Desktop/kb-data/source-ops/docs/CODEX-HANDOFF.md](/Users/hayden/Desktop/kb-data/source-ops/docs/CODEX-HANDOFF.md)
- [/Users/hayden/Desktop/kb-data/source-ops/docs/07-integration-plan.md](/Users/hayden/Desktop/kb-data/source-ops/docs/07-integration-plan.md)
- [/Users/hayden/Desktop/kb-data/source-ops/docs/04-ingestion-pipeline-design.md](/Users/hayden/Desktop/kb-data/source-ops/docs/04-ingestion-pipeline-design.md)
- [/Users/hayden/Desktop/kb-data/source-ops/docs/05-review-and-moderation-flow.md](/Users/hayden/Desktop/kb-data/source-ops/docs/05-review-and-moderation-flow.md)
- [/Users/hayden/Desktop/kb-data/source-ops/data/seed-sources.json](/Users/hayden/Desktop/kb-data/source-ops/data/seed-sources.json)
- [/Users/hayden/Desktop/kb-data/source-ops/data/source-inventory.json](/Users/hayden/Desktop/kb-data/source-ops/data/source-inventory.json)
- [/Users/hayden/Desktop/kb-data/source-ops/src/adapters/ingestion-adapter-interface.ts](/Users/hayden/Desktop/kb-data/source-ops/src/adapters/ingestion-adapter-interface.ts)
- [/Users/hayden/Desktop/kb-data/source-ops/src/lib/dedupe.ts](/Users/hayden/Desktop/kb-data/source-ops/src/lib/dedupe.ts)

The app repo should treat `kb-data/source-ops` as the design/data source of truth for the source system until the relevant code is fully ported into `site/`.

## What Is Implemented In The App Repo

### Database and services

Implemented:

- New source-ops schema in [sources.ts](/Users/hayden/Desktop/kb/site/src/lib/server/db/schema/sources.ts)
- Schema barrel exports and relations in [index.ts](/Users/hayden/Desktop/kb/site/src/lib/server/db/schema/index.ts)
- Registry service in [sources.ts](/Users/hayden/Desktop/kb/site/src/lib/server/sources.ts)
- Review queue service in [import-candidates.ts](/Users/hayden/Desktop/kb/site/src/lib/server/import-candidates.ts)
- Fetch log service in [source-fetch-log.ts](/Users/hayden/Desktop/kb/site/src/lib/server/source-fetch-log.ts)
- Additive migration in [0000_graceful_true_believers.sql](/Users/hayden/Desktop/kb/site/drizzle/0000_graceful_true_believers.sql)

### Admin UI

Implemented:

- Source list: [/Users/hayden/Desktop/kb/site/src/routes/admin/sources/+page.server.ts](/Users/hayden/Desktop/kb/site/src/routes/admin/sources/+page.server.ts) and [/Users/hayden/Desktop/kb/site/src/routes/admin/sources/+page.svelte](/Users/hayden/Desktop/kb/site/src/routes/admin/sources/+page.svelte)
- Source detail/edit: [/Users/hayden/Desktop/kb/site/src/routes/admin/sources/[id]/+page.server.ts](/Users/hayden/Desktop/kb/site/src/routes/admin/sources/[id]/+page.server.ts) and [/Users/hayden/Desktop/kb/site/src/routes/admin/sources/[id]/+page.svelte](/Users/hayden/Desktop/kb/site/src/routes/admin/sources/[id]/+page.svelte)
- Health dashboard: [/Users/hayden/Desktop/kb/site/src/routes/admin/sources/health/+page.server.ts](/Users/hayden/Desktop/kb/site/src/routes/admin/sources/health/+page.server.ts) and [/Users/hayden/Desktop/kb/site/src/routes/admin/sources/health/+page.svelte](/Users/hayden/Desktop/kb/site/src/routes/admin/sources/health/+page.svelte)
- Review queue: [/Users/hayden/Desktop/kb/site/src/routes/admin/sources/review/+page.server.ts](/Users/hayden/Desktop/kb/site/src/routes/admin/sources/review/+page.server.ts) and [/Users/hayden/Desktop/kb/site/src/routes/admin/sources/review/+page.svelte](/Users/hayden/Desktop/kb/site/src/routes/admin/sources/review/+page.svelte)
- Admin sidebar group added in [/Users/hayden/Desktop/kb/site/src/routes/admin/+layout.svelte](/Users/hayden/Desktop/kb/site/src/routes/admin/+layout.svelte)

### Seeding

Implemented:

- Seed script in [seed-sources.ts](/Users/hayden/Desktop/kb/site/scripts/seed-sources.ts)
- `tsx` added to [package.json](/Users/hayden/Desktop/kb/site/package.json)
- Script now resolves seed data from the real `kb-data` path and upserts by slug

Verified:

- `pnpm tsx scripts/seed-sources.ts` succeeds
- The 20 starter sources are seeded from `kb-data/source-ops/data/seed-sources.json`
- The previous field-mapping bug was fixed so snake_case source fields now import correctly

## What Has Been Verified

Ran successfully:

- `pnpm drizzle-kit generate`
- `pnpm drizzle-kit migrate`
- `pnpm check`
- `pnpm build`
- `pnpm tsx scripts/seed-sources.ts`

Important note about migrations:

- This repo did not have a prior Drizzle migration baseline.
- `drizzle-kit generate` produced a bootstrap migration for the entire schema.
- The migration file was manually reduced to additive source-ops objects only so it could apply cleanly to the existing database.
- If more migrations are generated later, inspect them carefully for unintended full-schema bootstrap output.

## What Is Not Implemented Yet

The current app repo does **not** yet contain the full source-ops ingestion runtime described in `kb-data`.

Missing major pieces:

- No ingestion pipeline orchestrator
- No adapter registry
- No real adapter implementations for `ical_generic`, `html_selector`, `grants_gov_api`, `usajobs_api`, `csv_import`, etc.
- No scheduler / due-source runner
- No generic “test source” preview flow
- No pipeline path that creates `import_batches` and `imported_candidates` from a live source fetch
- No dedupe engine ported from `kb-data/source-ops/src/lib/dedupe.ts`
- No approval flow that publishes into live coil tables (`events`, `funding`, `jobs`, `red_pages_businesses`, `toolbox_resources`)
- No computed source health engine based on fetch results/staleness/auth failures
- No bulk review / batch review / ambiguous-dedupe resolution UX

Current limitation of review approval:

- [approveCandidate()](/Users/hayden/Desktop/kb/site/src/lib/server/import-candidates.ts) only updates source-ops tables.
- It creates or updates canonical/source-link/audit data, but does **not** create or update a live published record.
- `canonicalRecords.publishedRecordId` is therefore currently a placeholder UUID, not a real live content row ID.

## Current Reality Of “Testing Sources”

There is no registry-backed source test runner yet.

What exists:

- The older standalone iCal helper in [ical-feed.ts](/Users/hayden/Desktop/kb/site/src/lib/server/ical-feed.ts)
- The manual event iCal import flow at [/Users/hayden/Desktop/kb/site/src/routes/admin/events/import/+page.server.ts](/Users/hayden/Desktop/kb/site/src/routes/admin/events/import/+page.server.ts)

What does not exist yet:

- Click-to-test source execution from `/admin/sources/[id]`
- Raw fetch preview for a configured source
- Parsed-item preview
- Normalized candidate preview
- Dedupe preview
- HTML scraper execution
- API adapter execution

## Recommended Next Implementation Order

### Phase 1: Make source testing real

Build a minimal ingestion runtime with one working adapter first:

1. Create `src/lib/server/ingestion/`
2. Port the adapter interface concepts from `kb-data`
3. Implement `ical_generic` first using the existing [ical-feed.ts](/Users/hayden/Desktop/kb/site/src/lib/server/ical-feed.ts) logic as the starting point
4. Add a source test action on `/admin/sources/[id]` that:
   - fetches the source
   - parses items
   - normalizes them
   - shows preview output without publishing

### Phase 2: Create real candidate batches

After test preview works:

1. Create `import_batches` and `imported_candidates` from the ingestion run
2. Port the dedupe helpers from `kb-data/source-ops/src/lib/dedupe.ts`
3. Stamp candidates with `contentFingerprint`, composite key, and dedupe outcome

### Phase 3: Complete approval publishing

After candidates can be created:

1. Update `approveCandidate()` to publish into the correct live coil service
2. Use existing content services:
   - `createEvent()`
   - `createFunding()`
   - `createJob()`
   - red pages/toolbox equivalents
3. Replace placeholder `publishedRecordId` with the actual created/updated record ID

### Phase 4: Expand adapters

After `ical_generic` works:

1. `rss_generic`
2. `html_selector`
3. `grants_gov_api`
4. `usajobs_api`
5. `csv_import`

## Suggested Validation Checklist For The Next Thread

- `pnpm check`
- `pnpm build`
- `pnpm tsx scripts/seed-sources.ts`
- Create or repair one known source row from `kb-data`
- Run a test preview for one real ICS source
- Confirm parsed items are sorted sensibly for that coil
- Confirm normalization output matches the target coil schema
- Confirm candidate creation works for at least one source
- Confirm review approval creates a real live published record

## Copy-Paste Prompt For A Fresh Thread

Use this prompt in a new thread:

```text
Continue the Knowledge Basket source-ops build from the current app repo state.

Start by reading:
- /Users/hayden/Desktop/kb/site/docs/SOURCE_OPS_HANDOFF.md
- /Users/hayden/Desktop/kb-data/source-ops/docs/CODEX-HANDOFF.md
- /Users/hayden/Desktop/kb-data/source-ops/docs/07-integration-plan.md
- /Users/hayden/Desktop/kb-data/source-ops/docs/04-ingestion-pipeline-design.md
- /Users/hayden/Desktop/kb-data/source-ops/docs/05-review-and-moderation-flow.md
- /Users/hayden/Desktop/kb-data/source-ops/src/adapters/ingestion-adapter-interface.ts
- /Users/hayden/Desktop/kb-data/source-ops/src/lib/dedupe.ts

Current state:
- Source registry schema, services, admin pages, migration, and seeding are implemented in the app repo.
- The 20 starter sources from kb-data are already seeded correctly.
- There is no real ingestion runtime yet.
- There is no generic source test preview yet.
- Review approval does not publish into live coil tables yet.

Your goal is to finish the source system beyond the registry MVP:
1. Build a minimal ingestion runtime under src/lib/server/ingestion.
2. Implement a real `ical_generic` adapter first, using the existing iCal helper as the base.
3. Add a “test source” flow on /admin/sources/[id] that fetches, parses, normalizes, and previews output.
4. Create import batches and imported candidates from the ingestion run.
5. Port dedupe helpers from kb-data and apply them to candidates.
6. Update approveCandidate() so approval creates or updates real live coil records using the existing content services.

Constraints:
- Preserve existing app behavior outside source-ops.
- Keep changes additive where possible.
- Follow existing SvelteKit admin patterns.
- Inspect generated Drizzle migrations carefully because this repo had no original migration baseline.

Before coding, inspect the existing app code and the external kb-data docs so you can align implementation with the intended architecture rather than inventing a parallel one.
```

## Notes

- The app worktree may contain many unrelated user changes. Do not revert unrelated files.
- If a future thread updates the source-ops implementation materially, update this handoff doc so it stays useful.
