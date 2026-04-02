# Source Ops Handoff

This document is the current source-ops handoff and operator runbook for the app repo. It reflects what is actually implemented in `site/` today, what still needs refinement, and how to operate the system safely.

## Current Status

The source system is now a real end-to-end workflow, not just a registry MVP.

Implemented:

- Source registry schema, services, seed data, fetch logs, batches, canonical/source-link tables, and admin surfaces
- Ingestion runtime under `src/lib/server/ingestion/`
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
- Scheduled due-source execution through `POST /api/source-ops/run-due`
- Advisory-lock protection for scheduler-wide and per-source concurrent runs
- Controlled auto-approve for eligible new candidates

Still intentionally out of scope:

- Public attribution/provenance rendering on live content pages
- Multi-coil automated ingestion for a single source
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
- Review/publish services: [src/lib/server/import-candidates.ts](/Users/hayden/Desktop/kb/site/src/lib/server/import-candidates.ts)

### Ingestion runtime

- Runtime types: [src/lib/server/ingestion/types.ts](/Users/hayden/Desktop/kb/site/src/lib/server/ingestion/types.ts)
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
3. Parses source items
4. Normalizes items into a single target coil
5. Computes fingerprints, composite keys, and dedupe outcomes
6. Returns preview data without writing source-op rows

This powers the “Test source” flow on `/admin/sources/[id]`.

### Persisted ingest flow

`ingestSource(sourceId, options)`:

1. Runs the same preview pipeline
2. Writes `source_fetch_log`
3. Creates an `import_batches` row
4. Upserts `imported_candidates` for `new`, `update`, and `ambiguous`
5. Skips exact `duplicate` candidates from the review queue
6. Updates source runtime fields:
   - `lastCheckedAt`
   - `lastSuccessfulFetchAt`
   - `lastContentHash`
   - `lastContentChangeAt`
   - `consecutiveFailureCount`
   - `totalItemsImported`
   - `nextCheckAt`
   - `healthStatus`
7. Optionally auto-approves eligible candidates

### Scheduler flow

`runDueSources()`:

- selects due sources with:
  - `enabled = true`
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
- updates or creates the canonical record
- upserts source-to-canonical links
- writes merge history
- marks the candidate as approved or auto-approved

Supported publish targets:

- `events`
- `funding`
- `jobs`
- `red_pages`
- `toolbox`

## Operator Runbook

### Seed the starter sources

```bash
pnpm tsx scripts/seed-sources.ts
```

What this does:

- reads the starter source definitions from `kb-data`
- upserts by slug
- preserves the app repo as the publishing/runtime environment

### Test a single source manually

Use `/admin/sources/[id]` and run `Test source`.

Preview output includes:

- fetch summary
- parse errors
- normalized records
- dedupe result counts
- candidate preview metadata

This path does not write fetch logs, batches, or candidates.

### Run an import manually

Use `/admin/sources/[id]` and run `Run import`.

This path:

- performs a persisted ingest
- writes fetch/batch/candidate records
- updates runtime state
- may auto-approve candidates if the source is eligible

### Retry a source immediately

Use `/admin/sources/[id]` or `/admin/sources/health` and run `Retry source`.

This path uses the same scheduler-backed source execution service as automated runs.

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

The dashboard is derived from existing source, fetch-log, and batch data. There is no separate telemetry table.

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
- the repo still has no historical Drizzle baseline, so generated migrations must be inspected carefully
- bootstrap-style full-schema output from Drizzle should still be treated as suspect and manually reduced to additive changes only

## Remaining Gaps And Follow-Ups

These are the main follow-ups after the current implementation pass:

- tighten adapter configs for seeded HTML and RSS sources that still lean on generic heuristics
- add public-facing source attribution/provenance rendering
- refine per-coil merge rules so imported updates preserve curator-authored edits where needed
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
- Source registry, ingestion runtime, scheduler endpoint, review queue, and live-record publishing are implemented in the app repo.
- Adapter families currently implemented: ical, RSS, HTML selector, generic API JSON, Grants.gov, USAJobs, and CSV.
- Admin source testing, persisted imports, retry-now execution, due-source runs, and candidate-level review are live.
- Auto-approve exists but is intentionally narrow and only applies to eligible new candidates.

Focus on:
1. Tightening adapter configs and normalization quality for real seeded sources.
2. Hardening merge rules for update candidates across coils.
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
