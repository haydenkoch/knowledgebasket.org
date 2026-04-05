# Knowledge Basket Codebase Audit

## Executive summary

Knowledge Basket is no longer a stubby early-stage starter. It is a real multi-coil product with a meaningful public surface, a fairly deep Events implementation, and a surprisingly ambitious source-ops system. The good news is that there is more here than the stale docs claim. The bad news is that the repo is carrying too much drift between product docs, design direction, operational reality, and implementation patterns.

The core pattern across the codebase is uneven maturity rather than absence. Events is materially ahead. Funding, Red Pages, Jobs, and Toolbox are not stubs, but they are also not operationally complete products. Source ops is powerful, but it is currently unstable at the type level and concentrated in large, hard-to-own files. Search exists, but the system boundary between "configured," "working," and "trustworthy" is too loose. The UI direction has drifted toward repeated left-rail scaffolds even though the stated design direction says not to keep moving that way.

### Overall assessment

- Overall codebase health: `fair but unstable in important areas`
- Best area: `Events public/admin implementation depth`
- Highest risk area: `source ops correctness and operational complexity`
- Biggest product-management risk: `stale specs and docs are now materially misleading`
- Biggest UX risk: `generic left-rail scaffold patterns spreading across coils`
- Biggest architecture risk: `large files and "shared" abstractions are hiding product-specific complexity instead of reducing it`

### Top strengths

- Events has real end-to-end depth across browse, detail, submission, admin CRUD, imports, duplicate handling, lists, and provenance-adjacent integrations.
- The schema and server layers already support more product surface than the older docs acknowledge, especially for non-event coils.
- Source ops is not fake. The app has real ingestion, candidate review, provenance, scheduler, and merge logic.
- The codebase has a coherent stack choice overall: SvelteKit, Drizzle, Better Auth, Meilisearch, Tailwind/Bits UI, and a consistent app/server split.
- CI is present and runs `check`, `lint`, `test`, and `build`.

### Top risks

- The canonical product spec at `/Users/hayden/Desktop/kb/spec.md` is stale enough to actively mislead prioritization and architecture decisions.
- `pnpm check` is failing in source-ops code, which directly undermines trust in the most operationally sensitive system in the repo.
- Search mode detection is based on configuration presence, not search availability. A configured-but-down Meilisearch instance can push the app into "all-coil" mode while returning empty results.
- Non-event coils have meaningful public and server support but lack dedicated admin CRUD surfaces, which means the product is ahead of its operating model.
- The current UI architecture is drifting toward repeated scaffold layouts and left-rail filters even where product direction explicitly points elsewhere.

### Verification snapshot

| Command      | Result                | Notes                                                                                                    |
| ------------ | --------------------- | -------------------------------------------------------------------------------------------------------- |
| `pnpm check` | Failing               | Type errors in `src/lib/server/import-candidates.ts` and `src/lib/server/ingestion/detail-enrichment.ts` |
| `pnpm lint`  | Failing               | Prettier drift in 19 files, concentrated in admin/source-review/shared component files                   |
| `pnpm test`  | Passing               | 39 tests across 5 files; mostly smoke/handler coverage                                                   |
| `pnpm build` | Passing with warnings | Large client chunk warning for `ksXY6fo_.js` at about 1.08 MB minified                                   |

### Readiness by area

| Area                | Readiness   | Notes                                                                              |
| ------------------- | ----------- | ---------------------------------------------------------------------------------- |
| Events              | Medium-high | Strong baseline, but some UX direction drift and large-file complexity             |
| Funding             | Medium      | Public and server foundations exist; admin depth is missing                        |
| Red Pages           | Medium      | Public and schema foundations exist; admin and moderation depth are missing        |
| Jobs                | Medium      | Public and server foundations exist; interest/bookmark ambitions are unsurfaced    |
| Toolbox             | Medium-low  | Public surface exists, but feels the most scaffold-driven                          |
| Source ops          | Medium-low  | Ambitious and powerful, but too risky while typecheck is red                       |
| Search              | Medium-low  | Functional, but operationally inconsistent and potentially misleading              |
| Auth/security       | Medium-low  | Basic route protection exists; role granularity and operational shortcuts are thin |
| Testing/reliability | Low-medium  | CI exists, but coverage is too narrow for the complexity now present               |
| Docs/product truth  | Low         | Current docs state is not dependable enough for planning                           |

## Repository / architecture map

### Root repository map

- `/Users/hayden/Desktop/kb/spec.md`
  - Product and technical specification for the wider KB project.
  - Major problem: badly stale relative to implementation, especially for non-event coils.
- `/Users/hayden/Desktop/kb/docker-compose.yml`
  - Local infra for Postgres, MinIO, Meilisearch, Redis, and Mailhog.
- `/Users/hayden/Desktop/kb/data/`
  - CSV source data for all coils plus example-site inputs.
- `/Users/hayden/Desktop/kb/resources/`
  - Static resource library consumed through the app's `/resources/[...path]` endpoint.
- `/Users/hayden/Desktop/kb/site/`
  - Actual SvelteKit application.

### App map

- `src/routes/`
  - Public coil routes: `events`, `funding`, `red-pages`, `jobs`, `toolbox`
  - Shared public routes: `/`, `/about`, `/search`, `/o/[slug]`, `/v/[slug]`, `/resources/[...path]`
  - Auth routes: `/auth/**`
  - Admin routes: `/admin/**`
  - API routes: `/api/search`, `/api/reindex`, `/api/source-ops/run-due`, plus events submission geocoding and ICS feeds
- `src/lib/server/`
  - Domain data/services per coil: `events.ts`, `funding.ts`, `red-pages.ts`, `jobs.ts`, `toolbox.ts`
  - Shared operational services: `auth.ts`, `meilisearch.ts`, `search-ops.ts`, `upload.ts`, `settings.ts`, `public-load.ts`
  - Source ops subsystem: `sources.ts`, `source-fetch-log.ts`, `source-provenance.ts`, `import-candidates.ts`, `import-candidate-merge.ts`, `ingestion/**`
- `src/lib/server/db/schema/`
  - Domain tables split by concern: events, funding, red-pages, jobs, toolbox, organizations, venues, settings, taxonomy, content, sources
- `src/lib/components/`
  - `ui/`: Bits UI / shadcn-svelte style primitives
  - `molecules/` and `organisms/`: KB-specific composite UI
  - `organisms/admin/`: admin-specific composites
  - `reference/`: unused reference artifacts for the old events filter bar direction
- `src/lib/hooks/`
  - `use-events-filters.svelte.ts`: Events-specific filter logic
  - `use-coil-filters.svelte.ts`: generic non-event filter abstraction
- `tests/`
  - smoke, source-ops, search API, admin inbox, and action tests

### Responsibility boundaries that are clear

- Per-coil server modules are generally easy to find.
- Schema is split into reasonable domain files.
- Admin route protection is centralized in `src/routes/admin/+layout.server.ts`.
- Search, auth, uploads, and public fallback behavior each have recognizable home files.

### Responsibility boundaries that are blurred

- Source ops logic is spread across large server files and large admin route files, especially:
  - `src/lib/server/import-candidates.ts`
  - `src/lib/server/ingestion/pipeline.ts`
  - `src/routes/admin/sources/[id]/+page.svelte`
  - `src/routes/admin/sources/health/+page.svelte`
  - `src/routes/admin/sources/review/+page.svelte`
  - `src/routes/admin/sources/review/[id]/+page.svelte`
- Coil UI abstraction is partially real and partially misleading:
  - `KbSidebar` and `KbTwoColumnLayout` do reduce repetition
  - they also lock multiple coils into the same left-rail scaffold pattern, even where that pattern is not the desired direction
- "Implemented" product capability is split between route surfaces and server/schema surfaces. This is especially visible in non-event coils and in schema-only features like bookmarks/follows/notifications/content lists.

### Large-file hotspots

Approximate hotspots from line counts:

- `tests/source-ops.test.ts`: 1,896 lines
- `src/lib/server/import-candidates.ts`: 1,594 lines
- `src/lib/server/ingestion/pipeline.ts`: 1,368 lines
- `src/routes/admin/sources/[id]/+page.svelte`: 1,341 lines
- `src/lib/server/ingestion/detail-enrichment.ts`: 935 lines
- `src/lib/server/events.ts`: 849 lines
- `src/routes/events/[slug]/+page.svelte`: 822 lines
- `src/routes/admin/sources/health/+page.svelte`: 819 lines
- `src/routes/events/+page.svelte`: 811 lines
- `src/lib/components/organisms/KbHeader.svelte`: 802 lines
- `src/routes/events/submit/+page.svelte`: 795 lines

These files are not automatically wrong, but they are a signal that key product flows are accumulating too much responsibility in single units.

## Findings by category

### Finding 1: Missing expected docs structure and split source-of-truth model

- Status: `Confirmed`
- Severity: `High`
- Category: `Docs / Product truth`
- Description: The app repo does not contain the expected `docs/specs/`, `docs/adr/`, `docs/plans/`, and `docs/tasks/` structure. Instead, `site/docs/` is flat, while the broader product spec lives one directory up in `/Users/hayden/Desktop/kb/spec.md`.
- Why it matters: Planning instructions and operator expectations are now disconnected from the real docs layout. That makes it too easy to reference a "canonical doc system" that does not exist.
- Exact evidence with file paths and specific functions/components/routes:
  - `docs/` in `/Users/hayden/Desktop/kb/site` contains flat files such as `docs/ADR-001-source-of-truth.md`, `docs/ADR-002-curated-beta-coils.md`, `docs/DESIGN_SYSTEM.md`, `docs/PERFORMANCE.md`, `docs/SOURCE_OPS_HANDOFF.md`
  - no `docs/specs/`, `docs/adr/`, `docs/plans/`, or `docs/tasks/` directories existed before this audit writeup
  - broader product spec is `/Users/hayden/Desktop/kb/spec.md`
- Recommended fix: Normalize the documentation model. Either move to the expected directory structure or explicitly document the actual structure and root-level product inputs.
- Estimated effort: `1-2 days`
- Classification: `quick win`

### Finding 2: Root spec is materially stale and misleading

- Status: `Confirmed`
- Severity: `Critical`
- Category: `Spec drift`
- Description: `/Users/hayden/Desktop/kb/spec.md` still describes Funding, Red Pages, Jobs, and Toolbox as "stub only," but the app now has schemas, public list/detail routes, submit flows, moderation functions, and search indexing support for all four.
- Why it matters: This is no longer harmless drift. It will cause wrong prioritization, wrong staffing assumptions, and bad cleanup decisions.
- Exact evidence with file paths and specific functions/components/routes:
  - stale claims in `/Users/hayden/Desktop/kb/spec.md`
  - live schemas in `src/lib/server/db/schema/funding.ts`, `src/lib/server/db/schema/red-pages.ts`, `src/lib/server/db/schema/jobs.ts`, `src/lib/server/db/schema/toolbox.ts`
  - public routes in `src/routes/funding/**`, `src/routes/red-pages/**`, `src/routes/jobs/**`, `src/routes/toolbox/**`
  - submit actions in `src/routes/funding/submit/+page.server.ts`, `src/routes/red-pages/submit/+page.server.ts`, `src/routes/jobs/submit/+page.server.ts`, `src/routes/toolbox/submit/+page.server.ts`
  - server CRUD/moderation in `src/lib/server/funding.ts`, `src/lib/server/red-pages.ts`, `src/lib/server/jobs.ts`, `src/lib/server/toolbox.ts`
- Recommended fix: Update or replace the root spec immediately so it reflects the implemented product surface and current priorities.
- Estimated effort: `2-3 days`
- Classification: `quick win`

### Finding 3: Source ops is currently type-broken

- Status: `Confirmed`
- Severity: `Critical`
- Category: `Correctness / Source ops`
- Description: `pnpm check` is failing in source-ops code due to broken typing around record image values and enrichment provenance source enums.
- Why it matters: Source ops is one of the highest-risk operational systems in the repo. If type safety is currently broken in the publish/enrichment pipeline, the team cannot trust changes in the import review flow.
- Exact evidence with file paths and specific functions/components/routes:
  - `src/lib/server/import-candidates.ts`
  - `src/lib/server/ingestion/detail-enrichment.ts`
  - current `pnpm check` errors include mismatch between `ImageCandidate` metadata and `Record<string, unknown>`, plus provenance source values like `"attachment"` and `"inline"` not matching the expected union
- Recommended fix: Make source-ops type health the first remediation stream before feature work or UI polish. Tighten shared types around image evidence, provenance source enums, and insert payload shaping.
- Estimated effort: `2-4 days`
- Classification: `quick win`

### Finding 4: CI is green on tests/build but red on quality gates

- Status: `Confirmed`
- Severity: `High`
- Category: `Reliability / DX`
- Description: The repo currently passes tests and build, but fails typecheck and lint. That means the codebase is shipping with a false sense of stability.
- Why it matters: Passing tests are not enough when the typed contract is broken and style drift is allowed to pile up in actively edited files.
- Exact evidence with file paths and specific functions/components/routes:
  - `pnpm check`: failing
  - `pnpm lint`: failing due to Prettier drift in 19 files
  - `pnpm test`: passing, 39 tests across 5 files
  - `pnpm build`: passing, but with chunk-size warning
  - CI workflow in `.github/workflows/*` runs all four checks
- Recommended fix: Re-establish "green means trustworthy" discipline. Typecheck and lint need to be restored before more structural work lands.
- Estimated effort: `1-2 days`
- Classification: `quick win`

### Finding 5: Search mode detection is too loose and can misreport system health

- Status: `Confirmed`
- Severity: `High`
- Category: `Search / Reliability`
- Description: Search treats Meilisearch as "enabled" when `MEILISEARCH_HOST` is present, not when the search service is actually reachable. That can push the UI into all-coil search mode even when backend search calls fail and return empty results.
- Why it matters: This creates a bad failure mode: the app can look like it has full search online while silently returning incomplete or empty search results.
- Exact evidence with file paths and specific functions/components/routes:
  - `src/lib/server/meilisearch.ts`: `isMeilisearchConfigured()` only checks `env.MEILISEARCH_HOST`
  - `src/routes/api/search/+server.ts`: uses `isMeilisearchConfigured()` to decide `mode`
  - `src/routes/search/+page.server.ts`: same logic for search page mode
  - `tests/search-api.test.ts`: explicitly expects `mode === 'all'` when Meilisearch is configured, even with an invalid host
- Recommended fix: Separate "configured" from "available." Search mode and admin reporting should reflect backend availability, not just env presence.
- Estimated effort: `2-3 days`
- Classification: `medium project`

### Finding 6: Search reindex surfaces are inconsistent

- Status: `Confirmed`
- Severity: `High`
- Category: `Search / Architecture`
- Description: Admin search operations support multi-coil rebuilds, but the public API endpoint `/api/reindex` only rebuilds events.
- Why it matters: The system has two overlapping operational stories for indexing. That increases the chance of operators doing the wrong rebuild and assuming search is consistent when it is not.
- Exact evidence with file paths and specific functions/components/routes:
  - multi-coil rebuilds in `src/lib/server/search-ops.ts`
  - admin search UI in `src/routes/admin/settings/search/+page.server.ts` and `src/routes/admin/settings/search/+page.svelte`
  - events-only reindex endpoint in `src/routes/api/reindex/+server.ts`
- Recommended fix: Collapse to one coherent indexing model. Either make `/api/reindex` multi-coil aware or retire it in favor of a clearly named events-only endpoint and a separate full reindex path.
- Estimated effort: `1-2 days`
- Classification: `quick win`

### Finding 7: Events no longer follows the desired filter-bar direction

- Status: `Confirmed`
- Severity: `High`
- Category: `UI/UX / Design drift`
- Description: The events page currently uses a left sidebar filter system, while the design docs explicitly say the horizontal filter bar direction should be preserved and refined.
- Why it matters: Events is the most mature coil and acts as a pattern donor. If it drifts in the wrong direction, the wrong pattern gets copied across the rest of the product.
- Exact evidence with file paths and specific functions/components/routes:
  - current left rail in `src/routes/events/+page.svelte`
  - filter UI in `src/lib/components/organisms/EventsSidebar.svelte`
  - generic rail wrapper in `src/lib/components/organisms/KbSidebar.svelte`
  - unused reference implementations in `src/lib/components/reference/EventsFilterBarReference.svelte` and `src/lib/components/reference/events-filter-bar-reference.html`
  - design-direction statement in `docs/DESIGN_SYSTEM.md`
- Recommended fix: Treat the current events sidebar as drift, not as the future baseline. Restore a horizontal filter approach in the eventual UI remediation phase instead of spreading the rail further.
- Estimated effort: `1-2 weeks`
- Classification: `medium project`

### Finding 8: Left-rail scaffold drift has spread across non-event coils

- Status: `Confirmed`
- Severity: `Medium`
- Category: `UI/UX / Architecture`
- Description: Funding, Jobs, Red Pages, and Toolbox all reuse `KbSidebar` and `KbTwoColumnLayout`, which spreads a generic left-rail scaffold across the product.
- Why it matters: This is not just shared code reuse. It is a shared product decision being encoded into a reusable abstraction, which makes it harder to reverse later.
- Exact evidence with file paths and specific functions/components/routes:
  - `src/lib/components/organisms/KbTwoColumnLayout.svelte`
  - `src/lib/components/organisms/KbSidebar.svelte`
  - `src/routes/funding/+page.svelte`
  - `src/routes/jobs/+page.svelte`
  - `src/routes/red-pages/+page.svelte`
  - `src/routes/toolbox/+page.svelte`
  - generic abstraction in `src/lib/hooks/use-coil-filters.svelte.ts`
- Recommended fix: Stop expanding the left-rail pattern. Treat these abstractions as transitional, not foundational, and redesign them only after operational gaps are fixed.
- Estimated effort: `1-2 weeks`
- Classification: `medium project`

### Finding 9: Non-event coils have server maturity without admin route maturity

- Status: `Confirmed`
- Severity: `High`
- Category: `Admin / Product operations`
- Description: Funding, Red Pages, Jobs, and Toolbox all have server-side CRUD and moderation functions, but there are no dedicated admin route trees for them. The shared inbox is carrying moderation for all of them.
- Why it matters: This is a classic product/ops mismatch. Public and data-layer scope has outpaced the operating surface needed to curate, fix, and publish content efficiently.
- Exact evidence with file paths and specific functions/components/routes:
  - server modules: `src/lib/server/funding.ts`, `src/lib/server/red-pages.ts`, `src/lib/server/jobs.ts`, `src/lib/server/toolbox.ts`
  - shared moderation route: `src/routes/admin/inbox/+page.server.ts`
  - admin route inventory includes dedicated CRUD only for events plus organizations/venues/sources/settings under `src/routes/admin/**`
- Recommended fix: Build dedicated non-event admin list/edit routes and reduce the inbox back to a queue/triage role instead of making it the whole operating system.
- Estimated effort: `2-4 weeks`
- Classification: `deep refactor`

### Finding 10: Schema ambition is ahead of routed product reality

- Status: `Confirmed`
- Severity: `Medium`
- Category: `Architecture / Scope drift`
- Description: The schema already includes bookmarks, org follows, notifications, notification preferences, content lists, and content views. Most of these have no visible route or server surface. Job interests at least have partial server support, but still no route usage.
- Why it matters: This creates false signals of completeness and raises maintenance cost for features the product is not actually operating.
- Exact evidence with file paths and specific functions/components/routes:
  - schema-only features in `src/lib/server/db/schema/content.ts`
  - relations in `src/lib/server/db/schema/index.ts`
  - no route usage for bookmarks/follows/notifications/content lists in `src/routes/**`
  - partial server support for job interests in `src/lib/server/jobs.ts` via `toggleJobInterest`, but no route/component usage in `src/routes/jobs/**`
- Recommended fix: Reclassify these as dormant foundations. Either surface them deliberately or stop presenting them internally as implemented capability.
- Estimated effort: `2-5 days` for truth alignment, longer for implementation
- Classification: `quick win`

### Finding 11: Expected form stack is not actually in use

- Status: `Confirmed`
- Severity: `Medium`
- Category: `DX / Form architecture`
- Description: The repo expects Svelte SuperForms and FormSnap in the stack, but the current app code uses manual `FormData` handling and custom form state instead.
- Why it matters: This makes the stack description misleading and increases inconsistency across forms. It also means the app is not getting the validation and ergonomics benefits the stack implies.
- Exact evidence with file paths and specific functions/components/routes:
  - no usage found for `sveltekit-superforms`, `superForm`, `formsnap`, or `FormSnap` in `src/**`
  - manual submit handlers in `src/routes/events/submit/+page.server.ts`, `src/routes/funding/submit/+page.server.ts`, `src/routes/red-pages/submit/+page.server.ts`, `src/routes/jobs/submit/+page.server.ts`, `src/routes/toolbox/submit/+page.server.ts`
- Recommended fix: Either remove SuperForms/FormSnap from the expected architecture narrative or make an explicit decision to adopt them in a later remediation phase.
- Estimated effort: `1 day` for truth alignment, `1-3 weeks` for real adoption
- Classification: `quick win`

### Finding 12: File upload/storage implementation is behind the intended storage model

- Status: `Confirmed`
- Severity: `Medium`
- Category: `Infra / Storage`
- Description: The expected architecture mentions MinIO / S3-compatible storage, but uploads currently write directly to `static/uploads/<scope>`.
- Why it matters: This is operationally fragile, especially if the product grows into multi-instance or containerized deployment patterns where local filesystem state is not durable or shared.
- Exact evidence with file paths and specific functions/components/routes:
  - `src/lib/server/upload.ts` writes to `static/uploads/<scope>`
  - upload consumers include `src/routes/events/submit/+page.server.ts`, `src/routes/jobs/submit/+page.server.ts`, `src/routes/admin/organizations/[id]/+page.server.ts`, `src/routes/admin/venues/[id]/+page.server.ts`, `src/routes/admin/settings/branding/+page.server.ts`
  - root `docker-compose.yml` includes MinIO, but the app upload path is still local
- Recommended fix: Align the implementation story. Either document local-file upload as the current canonical mode or schedule a controlled migration to S3-compatible storage.
- Estimated effort: `2-5 days` for alignment, `1-2 weeks` for implementation
- Classification: `medium project`

### Finding 13: Global search UI is missing combobox-grade accessibility and interaction depth

- Status: `Confirmed`
- Severity: `Medium`
- Category: `Accessibility / UX`
- Description: `KbSearch` behaves like a search-autocomplete widget, but it lacks keyboard navigation, active-option management, combobox semantics, and stronger state announcement.
- Why it matters: Search is a primary navigation surface. Right now it is accessible enough to render, but not accessible enough to behave like a polished product search experience.
- Exact evidence with file paths and specific functions/components/routes:
  - `src/lib/components/organisms/KbSearch.svelte`
  - input does not expose combobox state like `aria-expanded`, `aria-controls`, active descendant, or keyboard arrow handling
  - result list is a plain `ul > li > a` menu opened/closed by focus/blur timing
- Recommended fix: Rebuild this as a proper accessible search/combo interaction, ideally sharing patterns with the command/menu primitives already in the repo.
- Estimated effort: `3-5 days`
- Classification: `medium project`

### Finding 14: Public data fallback can hide real outages behind empty-state behavior

- Status: `Confirmed`
- Severity: `Medium`
- Category: `Reliability / Observability`
- Description: Public list pages use `withPublicDataFallback()` to swallow backend failures and return fallback data plus a soft warning flag.
- Why it matters: This is a reasonable user-protection pattern, but in its current form it risks masking backend failures as "limited data" instead of clearly surfacing operational problems.
- Exact evidence with file paths and specific functions/components/routes:
  - `src/lib/server/public-load.ts`
  - used in `src/routes/events/+page.server.ts`, `src/routes/funding/+page.server.ts`, `src/routes/jobs/+page.server.ts`
  - behavior logs warnings server-side and returns fallback data with `unavailable: true`
- Recommended fix: Keep the pattern, but pair it with stronger operational alerting and a clearer separation between "no results" and "service degraded."
- Estimated effort: `2-3 days`
- Classification: `medium project`

### Finding 15: Source review/admin UX is concentrated in large route files

- Status: `Confirmed`
- Severity: `High`
- Category: `Admin UX / Maintainability`
- Description: The admin source system is valuable, but its route-layer ergonomics are packed into very large pages and action handlers, which will make future tuning and bug fixing slow.
- Why it matters: This is already one of the most complex operational subsystems in the product. Large files raise regression risk and make review ergonomics harder to evolve cleanly.
- Exact evidence with file paths and specific functions/components/routes:
  - `src/routes/admin/sources/[id]/+page.svelte`
  - `src/routes/admin/sources/health/+page.svelte`
  - `src/routes/admin/sources/review/+page.svelte`
  - `src/routes/admin/sources/review/[id]/+page.svelte`
  - paired server complexity in `src/routes/admin/sources/review/+page.server.ts`, `src/routes/admin/sources/review/[id]/+page.server.ts`, `src/lib/server/import-candidates.ts`
- Recommended fix: After type health is restored, decompose source review UI by responsibility: queue shell, evidence panels, entity-linking controls, and publish/reject action groups.
- Estimated effort: `2-3 weeks`
- Classification: `deep refactor`

### Finding 16: Role model is too coarse for the scope now present

- Status: `Inferred`
- Severity: `Medium`
- Category: `Security / Authorization`
- Description: The app currently distinguishes mainly between contributor, moderator, and admin. That is enough for basic route gating, but likely too coarse for the number of operational surfaces now present.
- Why it matters: As source ops, search ops, branding, and broader moderation expand, "moderator versus admin" may not be enough to safely separate responsibilities.
- Exact evidence with file paths and specific functions/components/routes:
  - Better Auth role field in `src/lib/server/auth.ts`
  - admin gate in `src/routes/admin/+layout.server.ts`
  - privileged endpoints `src/routes/api/reindex/+server.ts` and `src/routes/api/source-ops/run-due/+server.ts` treat moderator and admin as equivalent
  - direct role escalation script in `scripts/promote-user.mjs`
- Recommended fix: Define actual operational roles and permissions before the admin surface grows further.
- Estimated effort: `1-2 weeks`
- Classification: `medium project`

### Finding 17: Operational admin shortcut exists outside productized account management

- Status: `Confirmed`
- Severity: `Medium`
- Category: `Security / Ops`
- Description: User promotion to admin is handled by a standalone script that directly updates the database and verifies email at the same time.
- Why it matters: This is fine as a takeover tool, but not as a long-term operational model. It bypasses productized administration and mixes identity state changes with role escalation.
- Exact evidence with file paths and specific functions/components/routes:
  - `scripts/promote-user.mjs`
  - sets `email_verified = true` and `role = 'admin'`
  - admin account page `src/routes/admin/account/+page.svelte` is informational only
- Recommended fix: Keep the script as a break-glass tool if needed, but document it as such and avoid treating it as the normal user-admin workflow.
- Estimated effort: `1 day`
- Classification: `quick win`

### Finding 18: Reference/stale artifacts are still sitting in the live component tree

- Status: `Confirmed`
- Severity: `Low`
- Category: `Cleanup / Maintainability`
- Description: The events filter bar reference components are present in `src/lib/components/reference/` but have no imports or route usage.
- Why it matters: This is small on its own, but it contributes to uncertainty about what the actual current UI contract is versus what is experimental or historical.
- Exact evidence with file paths and specific functions/components/routes:
  - `src/lib/components/reference/EventsFilterBarReference.svelte`
  - `src/lib/components/reference/events-filter-bar-reference.html`
  - no imports or route usage found in `src/**`
- Recommended fix: Either remove them once the intended replacement is locked, or move them to a clearly labeled design-reference/archive location outside the production component tree.
- Estimated effort: `less than 1 day`
- Classification: `quick win`

## Spec alignment review

### Matches the current docs/design direction

- Events is still the strongest and most complete coil in the product.
- Non-event coils should still be treated as curated beta rather than fully complete operational products.
- The product should remain on the current core stack family: SvelteKit, TypeScript, Drizzle, Better Auth, Meilisearch, Tailwind/Bits UI.
- Source ops should be treated as a real subsystem, not a future placeholder.

### Partial matches

- Search exists, but full multi-coil reliability depends on Meilisearch health and coherent reindex flows.
- Public submissions exist for all coils, but moderation/admin parity does not.
- Uploads exist, but storage is still local-file based rather than properly aligned with the intended S3-compatible direction.
- Organizations and venues exist as cross-cutting entities, but their broader product role still feels more infrastructural than truly hub-driven.

### Missing relative to expected direction

- Dedicated admin CRUD/editing surfaces for non-event coils
- Productized use of bookmarks, follows, notifications, content lists, and content views
- SuperForms/FormSnap usage despite stack expectation
- A stable, truthful product documentation system inside the app repo
- Horizontal filter interaction alignment with the documented design direction

### Implemented differently than intended

- Current implementation is authoritative for reality, but product docs assumed docs-first truth; in practice, truth is split across code, flat app docs, and the root spec.
- Search reports "all-coil" mode based on configuration, not operational availability.
- The UI system is no longer "keep the events horizontal filter bar and refine it." It has drifted into reusable left rails.
- Non-event coils are no longer stub placeholders; they are partially built products.

### Overbuilt relative to current scope

- Schema includes multiple social/personalization features that are not surfaced.
- Source ops has grown into a sophisticated operational system before the simpler non-event admin foundations are complete.
- Some generic coil abstractions are optimizing for repetition before the product direction for those repeated surfaces is settled.

## UI/UX audit

### Public-facing issues

- The strongest design-direction mismatch is the spread of the left-rail sidebar pattern across coil pages.
- Funding, Jobs, Red Pages, and Toolbox look more like variations of a shared scaffold than distinct product surfaces with intentional hierarchy.
- Global search is visually serviceable but interaction-light and not polished enough to feel like a primary product surface.
- Events remains the warmest and most differentiated public coil, but even it has drifted away from the stated filter interaction direction.
- Toolbox feels the coldest and most generic of the public coils.

### Admin-facing issues

- The shared inbox is doing too much for non-event moderation.
- Source review is functionally rich but visually and structurally dense.
- Admin coverage is uneven: Events has dedicated CRUD; other coils mostly do not.
- The product has strong operational ambition in sources/search/settings, but not enough dedicated CRUD ergonomics in the content areas those systems feed.

### Accessibility issues

- `KbSearch` lacks proper combobox semantics and keyboard interaction.
- There are still explicit underline-on-hover patterns scattered through public and admin surfaces; this is not automatically wrong, but it is inconsistent and sometimes contradicts the desired product tone.
- Some left-rail and contained-layout patterns use `overflow-hidden` or constrained side containers in ways that merit runtime validation for clipping and keyboard/focus containment.
- A meaningful portion of hover/focus quality still needs browser validation rather than static confidence.

### Responsiveness issues

- The repeated two-column scaffold is likely carrying responsive compromise from one coil to the others.
- Events uses a more customized layout, but it still contains a constrained left rail and right sidebar arrangement that needs runtime validation on tablet widths.
- Search/autocomplete blur timing in `KbSearch` is fragile and may feel brittle on touch and keyboard flows.

### Visual consistency problems

- Too many coils inherit the same generic shell rhythm.
- Shared layouts are consistent in a technical sense but not consistently strong as product design.
- The product direction says "polished consumer product," but multiple non-event surfaces still read as structured data placed into scaffold cards and list shells.

### Recommendations that fit the current direction

- Do not preserve the current left-rail pattern as the future baseline.
- Use Events as the completeness baseline, not as the literal layout baseline.
- Defer broad visual redesign until source-ops/search/admin correctness is stabilized.
- When UI cleanup starts, prioritize restoring intentional interaction models and reducing scaffold repetition before adding new decorative polish.

## Technical quality audit

### Architecture

- Strongest area: domain/server/schema separation is understandable.
- Weakest area: source-ops complexity is concentrated into too few oversized modules.
- Repeated non-event coil patterns are serviceable but are beginning to encode the wrong UX assumptions.

### Performance

- Confirmed oversized build chunk indicates real bundle risk.
- Events and source-admin pages are large enough to be likely interaction hotspots.
- Search/autocomplete and heavy admin/editor paths should be profiled once correctness work is done.

### Security

- Basic admin route protection exists and is not the worst part of the system.
- Role granularity is thin for the operational surface now present.
- The admin promotion script is a pragmatic shortcut, not a durable operational workflow.

### Search / indexing

- Good ambition, inconsistent operational contract.
- Multi-coil indexing exists, but endpoint/story consistency is weak.
- Search availability and search configuration are not separated clearly enough.

### Data integrity

- Strong schema coverage overall.
- Source-ops type failures are the most immediate integrity warning.
- Schema-only features are building conceptual debt.

### Testing

- Tests are not absent, which is good.
- They are too narrow for the complexity of source ops, admin flows, and public UX behavior.
- The fact that tests pass while source-ops typecheck fails is a direct sign that coverage is missing the most fragile contracts.

### DX / tooling

- CI is present and useful.
- Documentation truth is not.
- Stack expectations and actual code choices have diverged enough to confuse future contributors.

### Maintainability

- Several core modules are now too large.
- Some abstractions are helpful, but others are spreading product drift instead of reducing it.
- The repo needs structural cleanup after correctness and ops foundations are stabilized, not before.

## Coil-by-coil assessment

### Events

- Current state: `most complete coil and the real implementation baseline`
- Implementation quality: `strong, but not always directionally correct`
- Gaps vs intended product:
  - filter UX drift away from desired horizontal model
  - large route/page complexity
  - likely room for better modularization around filters, detail rendering, and calendar behavior
- Suggested priority: `keep stable, do not use as a literal layout template for the rest`

### Funding

- Current state: `real public coil with schema, submit, detail, admin service layer, and search indexing support`
- Implementation quality: `functional but clearly below Events`
- Gaps vs intended product:
  - no dedicated admin CRUD surface
  - generic left-rail/list-card product feel
  - relies on inbox moderation rather than purpose-built operations
- Suggested priority: `high`

### Red Pages

- Current state: `real public coil with directory-style presentation and schema depth`
- Implementation quality: `solid public baseline, weak operations`
- Gaps vs intended product:
  - no dedicated admin CRUD surface
  - public UX still partly scaffold-shaped
  - business directory credibility needs stronger moderation and curation ergonomics
- Suggested priority: `medium-high`

### Jobs

- Current state: `real public coil with server depth and some dormant interest logic`
- Implementation quality: `better data model than surfaced product`
- Gaps vs intended product:
  - no dedicated admin CRUD surface
  - interest feature exists in service layer but is unsurfaced
  - public UX is still generic relative to likely user expectations
- Suggested priority: `high`

### Toolbox

- Current state: `real public coil, but the most visibly scaffolded`
- Implementation quality: `functional but product-light`
- Gaps vs intended product:
  - weakest distinct identity
  - no dedicated admin CRUD surface
  - subsection filtering and structure feel like a stopgap
- Suggested priority: `medium`

## Cleanup candidates

### Confirmed cleanup candidates

- `src/lib/components/reference/EventsFilterBarReference.svelte`
  - no route or component imports found
  - appears to be superseded reference material, not live UI
- `src/lib/components/reference/events-filter-bar-reference.html`
  - same status as above

### Confirmed dormant foundations, not dead code

- `src/lib/server/db/schema/content.ts`
  - bookmarks, follows, notifications, notification preferences, content lists, content views
  - keep classified as `implemented in schema but not surfaced`, not dead
- `src/lib/server/jobs.ts`
  - `toggleJobInterest()` and related interest count/user-interest logic
  - keep classified as `partially surfaced foundation`, not dead

### Uncertain cleanup candidates that need follow-up validation

- `src/lib/components/organisms/KbTwoColumnLayout.svelte`
  - not dead, but likely should be treated as transitional rather than foundational
- `src/lib/components/organisms/KbSidebar.svelte`
  - actively used, so not removable yet
  - may become a cleanup target if the product realigns around horizontal filter interactions
- dormant schema ambitions in `content.ts`
  - do not remove blindly
  - decide feature-by-feature whether to activate, freeze, or defer

## Final recommendation

Do not start with a broad UI rewrite. The codebase is not in "polish first" shape. The next moves should be operational and truth-alignment work.

Recommended order of operations:

1. Restore source-ops correctness and type health.
2. Fix the product-truth layer by updating the spec/docs to match what exists.
3. Make search/index behavior coherent and trustworthy.
4. Build dedicated non-event admin foundations so public scope has matching operator support.
5. Only then start UI cleanup, using design direction rather than current scaffold reuse as the baseline.

What to avoid touching too early:

- Do not generalize more coil abstractions before the right UX direction is locked.
- Do not treat the current left-rail pattern as the future system.
- Do not expand dormant schema features like bookmarks/follows/notifications before core operating surfaces are stabilized.
- Do not add more source-ops complexity until the current source-ops type and review model is trustworthy again.

The product is farther along than the docs admit, but less operationally ready than the UI sometimes suggests. The right move now is to stabilize truth, correctness, and operating foundations before adding more surface area.
