# Source Ops Handoff

This document is the current source-ops handoff and operator runbook for the app repo. It reflects what is actually implemented in `site/` today, what still needs refinement, and how to operate the system safely.

## Current Status

The source system is now a real end-to-end workflow, not just a registry MVP.

Implemented:

- Source registry schema, services, seed data, fetch logs, batches, canonical/source-link tables, and admin surfaces
- Ingestion runtime under `src/lib/server/ingestion/`
- Shared staged-run persistence via `source_runs` and `source_run_stages`
- Candidate evidence storage for field provenance, URL roles, image candidates, quality flags, confidence, and diagnostics
- Optional AI enrichment for structured offers, people, parsed location parts, conservative field suggestions, and conflict detection
- Shared published evidence tables for `record_links` and `record_images`
- Adapter registry plus these adapter families:
  - `ical_generic`
  - `rss_generic`
  - `html_selector`
  - `api_json`
  - `grants_gov_api`
  - `usajobs_api`
  - `csv_import`
- Preview-only source testing on `/admin/sources/[id]`
- Persisted imports that create `source_fetch_log`, `import_batches`, and `imported_candidates`
- Dedupe fingerprinting and canonical matching during ingest
- Review queue plus candidate-level review page for update and ambiguous cases
- Approval publishing into real live coil tables through existing content services
- Merge-safe update publishing using canonical source snapshots to preserve curator edits
- Public source provenance rendering on imported live detail pages
- Scheduled due-source execution through `POST /api/source-ops/run-due`
- Advisory-lock protection for scheduler-wide and per-source concurrent runs
- Controlled auto-approve for eligible new candidates
- Expanded source-health diagnostics, source-quality summaries, and config validation in admin
- Source quarantine controls, adapter-version tracking, and QA note storage in the source registry
- Shared detail enrichment improvements for lazy-loaded images, JSON-LD, organizer/venue URLs, and multi-role link capture
- Curated starter HTML/RSS source configs in `kb-data` instead of relying on hidden adapter presets

Still intentionally out of scope:

- Headless-browser scraping
- A persisted “system reviewer” user row for auto-approvals

## Repo Source Of Truth

The app repo is now the implementation source of truth for source-ops behavior.

The external `kb-data/source-ops` workspace is still useful for:

- source inventory and starter seed data
- original design rationale
- adapter and dedupe reference material

Relevant external references:

- [/Users/hayden/Desktop/kb-data/source-ops/README.md](/Users/hayden/Desktop/kb-data/source-ops/README.md)
- [/Users/hayden/Desktop/kb-data/source-ops/docs/CODEX-HANDOFF.md](/Users/hayden/Desktop/kb-data/source-ops/docs/CODEX-HANDOFF.md)
- [/Users/hayden/Desktop/kb-data/source-ops/docs/07-integration-plan.md](/Users/hayden/Desktop/kb-data/source-ops/docs/07-integration-plan.md)
- [/Users/hayden/Desktop/kb-data/source-ops/docs/04-ingestion-pipeline-design.md](/Users/hayden/Desktop/kb-data/source-ops/docs/04-ingestion-pipeline-design.md)
- [/Users/hayden/Desktop/kb-data/source-ops/docs/05-review-and-moderation-flow.md](/Users/hayden/Desktop/kb-data/source-ops/docs/05-review-and-moderation-flow.md)
- [/Users/hayden/Desktop/kb-data/source-ops/data/seed-sources.json](/Users/hayden/Desktop/kb-data/source-ops/data/seed-sources.json)
- [/Users/hayden/Desktop/kb-data/source-ops/data/source-inventory.json](/Users/hayden/Desktop/kb-data/source-ops/data/source-inventory.json)

## Key Implementation Map

### Database and services

- Source-ops schema: [src/lib/server/db/schema/sources.ts](/Users/hayden/Desktop/kb/site/src/lib/server/db/schema/sources.ts)
- Schema barrel/relations: [src/lib/server/db/schema/index.ts](/Users/hayden/Desktop/kb/site/src/lib/server/db/schema/index.ts)
- Source registry services: [src/lib/server/sources.ts](/Users/hayden/Desktop/kb/site/src/lib/server/sources.ts)
- Fetch log services: [src/lib/server/source-fetch-log.ts](/Users/hayden/Desktop/kb/site/src/lib/server/source-fetch-log.ts)
- Source run services: [src/lib/server/ingestion/source-runs.ts](/Users/hayden/Desktop/kb/site/src/lib/server/ingestion/source-runs.ts)
- Review/publish services: [src/lib/server/import-candidates.ts](/Users/hayden/Desktop/kb/site/src/lib/server/import-candidates.ts)
- Merge planner: [src/lib/server/import-candidate-merge.ts](/Users/hayden/Desktop/kb/site/src/lib/server/import-candidate-merge.ts)
- Public provenance helper: [src/lib/server/source-provenance.ts](/Users/hayden/Desktop/kb/site/src/lib/server/source-provenance.ts)

### Ingestion runtime

- Runtime types: [src/lib/server/ingestion/types.ts](/Users/hayden/Desktop/kb/site/src/lib/server/ingestion/types.ts)
- Evidence helpers: [src/lib/server/ingestion/evidence.ts](/Users/hayden/Desktop/kb/site/src/lib/server/ingestion/evidence.ts)
- Detail enrichment: [src/lib/server/ingestion/detail-enrichment.ts](/Users/hayden/Desktop/kb/site/src/lib/server/ingestion/detail-enrichment.ts)
- AI enrichment: [src/lib/server/ingestion/ai-enrichment.ts](/Users/hayden/Desktop/kb/site/src/lib/server/ingestion/ai-enrichment.ts)
- Shared HTTP/parser helpers: [src/lib/server/ingestion/shared.ts](/Users/hayden/Desktop/kb/site/src/lib/server/ingestion/shared.ts)
- Adapter registry: [src/lib/server/ingestion/registry.ts](/Users/hayden/Desktop/kb/site/src/lib/server/ingestion/registry.ts)
- Dedupe engine: [src/lib/server/ingestion/dedupe.ts](/Users/hayden/Desktop/kb/site/src/lib/server/ingestion/dedupe.ts)
- Health/priority scheduling helpers: [src/lib/server/ingestion/status.ts](/Users/hayden/Desktop/kb/site/src/lib/server/ingestion/status.ts)
- Preview/import pipeline: [src/lib/server/ingestion/pipeline.ts](/Users/hayden/Desktop/kb/site/src/lib/server/ingestion/pipeline.ts)
- Due-source scheduler: [src/lib/server/ingestion/scheduler.ts](/Users/hayden/Desktop/kb/site/src/lib/server/ingestion/scheduler.ts)

### Adapters

- iCal: [src/lib/server/ingestion/adapters/ical-generic.ts](/Users/hayden/Desktop/kb/site/src/lib/server/ingestion/adapters/ical-generic.ts)
- RSS: [src/lib/server/ingestion/adapters/rss-generic.ts](/Users/hayden/Desktop/kb/site/src/lib/server/ingestion/adapters/rss-generic.ts)
- HTML: [src/lib/server/ingestion/adapters/html-selector.ts](/Users/hayden/Desktop/kb/site/src/lib/server/ingestion/adapters/html-selector.ts)
- Generic JSON/API: [src/lib/server/ingestion/adapters/api-json.ts](/Users/hayden/Desktop/kb/site/src/lib/server/ingestion/adapters/api-json.ts)
- Grants.gov: [src/lib/server/ingestion/adapters/grants-gov-api.ts](/Users/hayden/Desktop/kb/site/src/lib/server/ingestion/adapters/grants-gov-api.ts)
- USAJobs: [src/lib/server/ingestion/adapters/usajobs-api.ts](/Users/hayden/Desktop/kb/site/src/lib/server/ingestion/adapters/usajobs-api.ts)
- CSV: [src/lib/server/ingestion/adapters/csv-import.ts](/Users/hayden/Desktop/kb/site/src/lib/server/ingestion/adapters/csv-import.ts)

### Admin UI and endpoints

- Source list: [src/routes/admin/sources/+page.server.ts](/Users/hayden/Desktop/kb/site/src/routes/admin/sources/+page.server.ts) and [src/routes/admin/sources/+page.svelte](/Users/hayden/Desktop/kb/site/src/routes/admin/sources/+page.svelte)
- Source detail/test/import page: [src/routes/admin/sources/[id]/+page.server.ts](/Users/hayden/Desktop/kb/site/src/routes/admin/sources/[id]/+page.server.ts) and [src/routes/admin/sources/[id]/+page.svelte](/Users/hayden/Desktop/kb/site/src/routes/admin/sources/[id]/+page.svelte)
- Health dashboard: [src/routes/admin/sources/health/+page.server.ts](/Users/hayden/Desktop/kb/site/src/routes/admin/sources/health/+page.server.ts) and [src/routes/admin/sources/health/+page.svelte](/Users/hayden/Desktop/kb/site/src/routes/admin/sources/health/+page.svelte)
- Review queue: [src/routes/admin/sources/review/+page.server.ts](/Users/hayden/Desktop/kb/site/src/routes/admin/sources/review/+page.server.ts) and [src/routes/admin/sources/review/+page.svelte](/Users/hayden/Desktop/kb/site/src/routes/admin/sources/review/+page.svelte)
- Candidate decision page: [src/routes/admin/sources/review/[id]/+page.server.ts](/Users/hayden/Desktop/kb/site/src/routes/admin/sources/review/[id]/+page.server.ts) and [src/routes/admin/sources/review/[id]/+page.svelte](/Users/hayden/Desktop/kb/site/src/routes/admin/sources/review/[id]/+page.svelte)
- Scheduler endpoint: [src/routes/api/source-ops/run-due/+server.ts](/Users/hayden/Desktop/kb/site/src/routes/api/source-ops/run-due/+server.ts)

### Seeding

- Seed script: [scripts/seed-sources.ts](/Users/hayden/Desktop/kb/site/scripts/seed-sources.ts)
- Source seed data: `kb-data/source-ops/data/seed-sources.json`

## Runtime Behavior

### Preview flow

`previewSource(sourceId)`:

1. Loads the source record and validates adapter config
2. Fetches source content
3. Discovers feed/list/API items
4. Normalizes records into a shared multi-coil shape
5. Runs shared detail enrichment, structured extraction, link classification, and image discovery
6. Optionally runs AI enrichment with `gpt-5-mini` when `OPENAI_API_KEY` is configured and the record looks incomplete or conflicted
7. Runs entity matching, quality flagging, and dedupe checks
8. Returns staged preview data without writing source-op rows

This powers the “Test source” flow on `/admin/sources/[id]`.

### Persisted ingest flow

`ingestSource(sourceId, options)`:

1. Creates a `source_runs` row for the execution
2. Runs the same staged preview pipeline and writes `source_run_stages`
3. Writes `source_fetch_log`
4. Creates an `import_batches` row linked back to `source_runs`
5. Upserts `imported_candidates` for `new`, `update`, and `ambiguous`
6. Stores candidate evidence in JSONB:
   - `fieldProvenance`
   - `urlRoles`
   - `imageCandidates`
   - `extractedFacts`
   - `qualityFlags`
   - `confidence`
   - `diagnostics`
7. Skips exact `duplicate` candidates from the review queue
8. Updates source runtime fields:
   - `lastCheckedAt`
   - `lastSuccessfulFetchAt`
   - `lastContentHash`
   - `lastContentChangeAt`
   - `consecutiveFailureCount`
   - `totalItemsImported`
   - `nextCheckAt`
   - `healthStatus`
9. Updates run-level metrics such as missing-image rate, low-confidence rate, and detail-enrichment failure rate
10. Optionally auto-approves eligible candidates

### Scheduler flow

`runDueSources()`:

- selects due sources with:
  - `enabled = true`
  - `quarantined = false`
  - `status = 'active'`
  - non-null `adapterType`
  - `ingestionMethod` not in `manual_only`, `manual_with_reminder`
  - `nextCheckAt <= now` or `lastCheckedAt is null`
- runs sequentially with default batch size `10`
- acquires a global advisory lock for the scheduler run
- acquires a per-source advisory lock for each source execution

`runSourceNow(sourceId, trigger)` is used for:

- scheduler runs
- admin retry actions
- other explicit one-off execution paths

### Review and publish flow

Candidates move through `/admin/sources/review` and `/admin/sources/review/[id]`.

Current behavior:

- `new` candidates can be approved directly
- `update` candidates must have a canonical match and then publish into the matched live record
- `ambiguous` candidates must be resolved before approval
- bulk approve/reject is limited to safe `new` candidates without canonical matches

`approveCandidate()` now:

- creates or updates the real live content row in the target coil
- computes a merge plan for source-managed fields on update approvals
- preserves curator-edited live values when they differ from the last accepted source snapshot
- updates or creates the canonical record
- stores the latest accepted source-managed values in `canonical_records.source_snapshot`
- upserts source-to-canonical links
- syncs shared published `record_links` and `record_images` evidence
- writes merge history
- marks the candidate as approved or auto-approved

Supported publish targets:

- `events`
- `funding`
- `jobs`
- `red_pages`
- `toolbox`

### Public provenance flow

Imported public detail pages now resolve provenance from `canonical_records`, `source_record_links`, and `sources`.

Current behavior:

- provenance is attached in the public detail loaders for events, funding, jobs, red pages, and toolbox
- public detail pages render a compact “Imported from” card only when provenance exists
- provenance includes primary source name/slug, source URL, source item URL when available, attribution text, last synced timestamp, and total linked source count

List pages and search cards still do not render provenance.

## Operator Runbook

### Seed the starter sources

```bash
pnpm tsx scripts/seed-sources.ts
```

What this does:

- reads the starter source definitions from `kb-data`
- upserts by slug
- preserves the app repo as the publishing/runtime environment
- refreshes curated adapter config for the automated starter HTML/RSS sources

Starter source config ownership:

- canonical starter-source config lives in [/Users/hayden/Desktop/kb-data/source-ops/data/seed-sources.json](/Users/hayden/Desktop/kb-data/source-ops/data/seed-sources.json)
- the app DB is refreshed from that file via the seed script
- if a seeded HTML/RSS source needs selector or feed changes, update `kb-data` first and then re-run the seed script

### Test a single source manually

Use `/admin/sources/[id]` and run `Test source`.

Preview output includes:

- fetch summary
- parse errors
- normalized records
- staged diagnostics
- quality flags, confidence, URL roles, and image candidates
- extracted AI facts such as offers, people, location parts, and conflicts
- dedupe result counts
- candidate preview metadata

This path does not write fetch logs, batches, or candidates.

### Run an import manually

Use `/admin/sources/[id]` and run `Run import`.

This path:

- performs a persisted ingest
- writes run, fetch, batch, and candidate records
- updates runtime state
- may auto-approve candidates if the source is eligible

### Optional AI enrichment

If `OPENAI_API_KEY` is set, the pipeline can run an `ai_enrich` stage using `gpt-5-mini` through the OpenAI Responses API with strict JSON schema output.

Current behavior:

- AI enrichment is optional and conservative
- it only runs for records that still look incomplete or conflicted after deterministic parsing
- it stores flexible facts in `imported_candidates.extracted_facts`
- it can fill safe gaps such as `cost`, parsed city/state/ZIP, or organizer/provider names
- it does not silently overwrite conflicting dates or other high-risk fields; those become conflicts and quality flags instead
- per-source adapter config can tune `aiEnrichment.enabled`, `aiEnrichment.model`, `aiEnrichment.maxRecordsPerRun`, and `aiEnrichment.minDescriptionLength`

### Retry a source immediately

Use `/admin/sources/[id]` or `/admin/sources/health` and run `Retry source`.

This path uses the same scheduler-backed source execution service as automated runs.

### Curate a weak source safely

Recommended workflow for a newly added or noisy HTML/RSS source:

1. Update its config in `kb-data/source-ops/data/seed-sources.json`
2. Re-run `pnpm tsx scripts/seed-sources.ts`
3. Use `/admin/sources/[id]` to test the staged preview and inspect URL roles, image candidates, and quality flags
4. Quarantine the source if scheduled runs should stop until adapter/config fixes land
5. Re-run manually once the source preview is stable
6. Open `/admin/sources/[id]`
7. Check config validation warnings
8. Run `Test source`
9. Confirm normalized records and dedupe results look sane
10. Run `Run import`
11. Review a small sample of candidates before trusting the source more broadly

### Run due sources through the API

Production endpoint:

- `POST /api/source-ops/run-due`

Authentication:

- admin or moderator session, or
- `x-source-ops-secret` header matching `SOURCE_OPS_SECRET`

Notes:

- in development, the route is permissive
- the endpoint is stateless and intended for external cron invocation
- responses include run counts and per-source results

Example:

```bash
curl -X POST \
  -H "x-source-ops-secret: $SOURCE_OPS_SECRET" \
  http://localhost:5173/api/source-ops/run-due
```

### Auto-approve policy

Auto-approve is intentionally narrow.

A candidate is only auto-approved when all of these are true:

- ingest call enables auto-approve
- source has `autoApprove = true`
- source has `reviewRequired = false`
- source `confidenceScore >= 4`
- candidate dedupe result is `new`

Auto-approve never applies to:

- `update`
- `ambiguous`

Auto-approved candidates are published through the same real publish path as manual approvals.

## Health Dashboard Meaning

`/admin/sources/health` currently surfaces:

- due-now count
- latest scheduler run summary
- per-adapter success/failure patterns
- stale/broken/auth-required/degraded source groupings
- duplicate-heavy sources
- low-yield sources
- repeated fetch/parse error groupings
- update-heavy sources
- approval-rate summaries
- needs-curation sources derived from config validation, poor yield, or repeated failures

The dashboard is derived from existing source, fetch-log, and batch data. There is no separate telemetry table.

`/admin/sources/[id]` now also surfaces:

- config validation status
- batch quality summary
- candidate outcome summary
- recent repeated errors
- next-check and recent runtime context stored on the source row

## Verified State

Verified successfully in the app repo:

- `pnpm drizzle-kit generate`
- `pnpm drizzle-kit migrate`
- `pnpm tsx scripts/seed-sources.ts`
- `pnpm check`
- `pnpm test`
- `pnpm build`

Additional notes:

- the 20 starter sources seed correctly from `kb-data`
- curated HTML/RSS source configs are now seeded from `kb-data` into the app DB
- the Native California source now uses `ical_generic` plus HTML detail enrichment instead of public-side runtime feed merging
- source review can run in compatibility mode if `canonical_records.source_snapshot` is missing, but the latest migration should still be applied so merge history has a persisted source baseline
- organization and venue aliases are now additive schema changes and should be present locally before testing duplicate merge workflows
- the repo still has no historical Drizzle baseline, so generated migrations must be inspected carefully
- bootstrap-style full-schema output from Drizzle should still be treated as suspect and manually reduced to additive changes only
- schema-health results are cached in-process, so after applying migrations during local dev you should restart the Svelte server before trusting admin warnings

## Remaining Gaps And Follow-Ups

These are the main follow-ups after the current implementation pass:

- improve weak/publicly limited starter sources whose sites still do not expose good structured listings even after config curation
- add richer field-by-field reviewer controls if operators need manual override at approve time
- deepen detail enrichment beyond single-image/single-page extraction when event pages expose galleries, schedule fragments, or richer org/venue metadata
- decide whether schema-health caching should auto-refresh in development so warnings clear without a restart
- consider provenance on public list/search surfaces only if it improves UX enough to justify the clutter
- add stronger operational reporting if scheduler volume grows beyond what fetch-log and batch summaries comfortably show
- decide whether a persisted system reviewer identity is worth adding for audit clarity
- revisit multi-coil automated ingestion only after single-coil source behavior is fully trusted

## Suggested Next Thread Prompt

Use this prompt if a future thread needs to continue source-ops work:

```text
Continue the Knowledge Basket source-ops implementation from the current app repo state.

Start by reading:
- /Users/hayden/Desktop/kb/site/docs/SOURCE_OPS_HANDOFF.md
- /Users/hayden/Desktop/kb/site/src/lib/server/ingestion/pipeline.ts
- /Users/hayden/Desktop/kb/site/src/lib/server/ingestion/scheduler.ts
- /Users/hayden/Desktop/kb/site/src/lib/server/import-candidates.ts
- /Users/hayden/Desktop/kb/site/src/routes/admin/sources/health/+page.server.ts
- /Users/hayden/Desktop/kb/site/src/routes/admin/sources/review/[id]/+page.server.ts
- /Users/hayden/Desktop/kb-data/source-ops/docs/CODEX-HANDOFF.md
- /Users/hayden/Desktop/kb-data/source-ops/docs/07-integration-plan.md

Current state:
- Source registry, ingestion runtime, scheduler endpoint, review queue, live-record publishing, and source-aware merge previews are implemented in the app repo.
- Adapter families currently implemented: ical, RSS, HTML selector, generic API JSON, Grants.gov, USAJobs, and CSV.
- Admin source testing, persisted imports, retry-now execution, due-source runs, candidate-level review, and search reindex operations are live.
- Auto-approve exists but is intentionally narrow and only applies to eligible new candidates.
- Organization/venue linking, creation from imported data, aliases, duplicate suggestions, and merge flows are now part of the admin stack.

Focus on:
1. Tightening adapter configs and normalization quality for real seeded sources.
2. Hardening merge rules for update candidates across coils and enriching source baselines once snapshot storage is guaranteed everywhere.
3. Adding public provenance/attribution rendering if needed.
4. Improving operator diagnostics only if current fetch-log and batch views prove insufficient.

Constraints:
- Preserve existing app behavior outside source-ops.
- Keep migrations additive and manually reviewed.
- Follow existing SvelteKit admin patterns.
- Do not revert unrelated worktree changes.
```

## Notes

- The app worktree may contain unrelated user changes in future threads. Do not revert them.
- If source-ops behavior changes materially again, update this handoff doc in the same pass.
