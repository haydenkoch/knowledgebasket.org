# Knowledge Basket Full Site And System Audit

Date: 2026-04-05  
Scope: current `/Users/hayden/Desktop/kb/site` workspace plus supporting local services and parent-repo docs where they define product/ops behavior.

## Status Update

Post-audit implementation work in the same workspace has already closed several of the highest-risk gaps that were open at audit time.

Implemented since this audit snapshot:

- shared server-side admin authorization now protects `/admin` page loads and admin mutations
- rate limiting is now in place for auth, public submission, search, and privileged operational endpoints
- search readiness now distinguishes `offline`, `partial`, and `ready`, and public search falls back truthfully to database-backed results
- mobile peek/drawer accessibility warning was fixed
- uploads now target S3-compatible object storage instead of local-disk-only writes
- a production runbook, health endpoint, structured server logging, and a fuller launch seed flow now exist
- organization and venue pages now surface cross-coil related content rather than remaining event-only shells

Still materially open after the implementation pass:

- deeper source-ops/admin ergonomics and backlog burn-down
- broader end-to-end QA coverage beyond the current regression suite
- bundle-size reduction and chunking cleanup called out by `pnpm build`
- final launch-polish work across all public/admin surfaces

## Executive Summary

Knowledge Basket is not production-ready.

The codebase has real product substance. All major coils exist. Events is a credible baseline. Shared browse primitives, Better Auth, Drizzle models, public submissions, admin CRUD, and a sophisticated source-ingestion schema are already in place. This is not a stub project.

What blocks launch is not lack of ambition. It is trust, operability, and consistency:

- admin actions are not consistently protected server-side
- search truthfulness breaks when Meilisearch is healthy but index coverage is incomplete
- the import/source-ops system is structurally strong but not yet operationally ready
- non-event coils exist in code, but local fixtures, indexing, and QA are too thin to prove launch readiness
- the current workspace includes active uncommitted WIP that already regresses lint, tests, and accessibility
- production concerns like rate limiting, observability, backup/recovery, and storage alignment are still incomplete

The platform is best described as an internal alpha or tightly managed operator beta, not a public-launch candidate.

## Current Production-Readiness Assessment

Overall rating: **Not launch-ready**

Release posture by area:

| Area                       | Status                          | Assessment                                                                            |
| -------------------------- | ------------------------------- | ------------------------------------------------------------------------------------- |
| Public product shell       | In active transition            | Home/search/sidebar work is moving fast, but the current workspace is unstable.       |
| Events                     | Strongest baseline              | Usable foundation, but still blocked by security/search/mobile/accessibility issues.  |
| Funding                    | Implemented but under-validated | Public/admin routes exist, but local data, indexing, and QA are too thin.             |
| Red Pages                  | Implemented but under-validated | Same pattern as Funding.                                                              |
| Jobs                       | Implemented but under-validated | Same pattern as Funding.                                                              |
| Toolbox                    | Implemented but under-validated | Same pattern as Funding.                                                              |
| Organizations / venues     | Thin                            | Detail pages are too event-centric for a multi-coil product.                          |
| Auth / roles / permissions | Partially implemented           | Layout gating exists, but action-level enforcement is inconsistent and unsafe.        |
| Search / discovery         | Not trustworthy yet             | Search behavior is misleading under partial Meilisearch readiness.                    |
| Source ingestion           | Structurally advanced           | Schema and UI depth are good, but ops health and review backlog are not launch-ready. |
| Admin / moderation         | Partially production-like       | Some strong tooling exists, but ergonomics and auth consistency are not there yet.    |
| QA / testing               | Inadequate                      | No end-to-end coverage for critical launch flows.                                     |
| Observability / ops        | Inadequate                      | Logging, metrics, alerting, and recovery planning are not at production level.        |

## What Is Done, Broken, Missing, And Risky

### Done

- All five coils have real public routes, submit routes, and admin routes.
- Events is materially ahead and provides the best implementation baseline.
- Shared public layout primitives exist and already standardize the left-rail browse model.
- Better Auth is wired with login, verification, and reset flows.
- Admin CRUD exists across events, funding, red pages, jobs, and toolbox.
- Source ops has a serious schema: provenance, confidence, dedupe state, diagnostics, canonical matching, batch/run tracking.
- Search infrastructure exists with per-coil index definitions and reindex operations.

### Broken

- Server-side admin authorization is inconsistent. Unauthenticated POSTs can reach admin action logic.
- Search mode reporting is false under partial Meilisearch readiness.
- Global search can silently degrade into “no results” or `mode: "db"` while the UI still presents search as full multi-coil.
- Current workspace quality gates are failing.
- Mobile filter work introduces at least one confirmed Svelte accessibility warning.

### Missing

- Uniform server-side authorization helpers applied to every admin action and operational endpoint.
- Rate limiting and abuse protection for auth, submission, search, and operational endpoints.
- End-to-end QA coverage for public browse, search, submit, auth, moderation, and imports.
- Production-grade observability: error tracking, metrics, alerting, health dashboards, runbooks.
- Backup / restore / recovery procedures.
- Search readiness checks that account for missing indexes, not just service health.
- Multi-coil organization and venue presentation.
- Reliable non-event fixture/seeding strategy for local QA.

### Risky

- The current workspace contains active uncommitted changes across homepage, search, sidebar, and browse UX.
- Source ops depends on very large route/server files that are hard to own safely.
- Upload handling is still local-filesystem based despite S3-compatible storage being the intended architecture.
- Same-origin HTML resource serving increases content-trust risk if untrusted files enter the resource store.

## Top Launch Blockers

1. **Critical**: Admin and moderation actions are not consistently protected server-side.
2. **Critical**: Search truthfulness and search-mode handling are wrong when Meilisearch is reachable but only partially indexed.
3. **High**: Current workspace fails `pnpm lint` and `pnpm test`, and emits an accessibility warning in `pnpm check` / `pnpm build`.
4. **High**: Source ops is operationally incomplete: 54 candidates pending review, only 1 active source, only 1 healthy source.
5. **High**: Production safeguards are missing: rate limiting, observability, recovery planning, and storage alignment.
6. **High**: Non-event coils are implemented but not sufficiently seeded, indexed, or end-to-end validated to support public trust.

## Workspace Baseline And Audit Evidence

This audit used the **current workspace** as source of truth, including uncommitted changes.

### Git Working Tree

`git status --short` shows active WIP across homepage/search/sidebar/public shell and search server behavior, including:

- `src/routes/+page.svelte`
- `src/routes/+page.server.ts`
- `src/lib/components/organisms/KbSearch.svelte`
- `src/lib/components/organisms/KbSidebar.svelte`
- `src/lib/components/organisms/KbSubmitBanner.svelte`
- `src/lib/components/organisms/EventsSidebar.svelte`
- `src/routes/events/+page.svelte`
- `src/routes/api/search/+server.ts`
- new `src/lib/components/organisms/MobilePeekPanel.svelte`
- new homepage config/admin API work

`git diff --stat` currently reports 25 changed files with 1892 insertions and 298 deletions.

Implication: the public shell and browse experience are in the middle of a meaningful refactor. Findings below separate long-running platform issues from current-workspace instability where possible.

### Quality Gates

| Command      | Result               | Evidence                                                                                                                                             |
| ------------ | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check` | Pass with warning    | `src/lib/components/organisms/MobilePeekPanel.svelte:110-121` triggers `a11y_no_static_element_interactions`                                         |
| `pnpm lint`  | Fails                | Prettier drift in 6 files, including `KbSidebar`, `KbSearch`, `KbSubmitBanner`, `EventsSidebar`, `MobilePeekPanel`, `src/routes/events/+page.svelte` |
| `pnpm test`  | Fails                | `tests/search-api.test.ts:18-29` expects `mode === 'events-only'`, current behavior returns `mode === 'db'`                                          |
| `pnpm build` | Passes with warnings | Same `MobilePeekPanel` a11y warning; prior build output also surfaced a very large `server/chunks/auth.js` bundle (~1.54 MB)                         |

### Local Data And Search State

Current local database counts:

- `events`: 3
- `funding`: 0
- `red_pages_businesses`: 0
- `jobs`: 0
- `toolbox_resources`: 0
- `organizations`: 0
- `venues`: 1
- `sources`: 20
- `imported_candidates`: 57

Current source-ops state:

- sources by state: 19 `discovered` / `unknown`, 1 `active` / `healthy`
- imported candidates by status: 54 `pending_review`, 2 `approved/new`, 1 `approved/update`

Current Meilisearch state:

- Meilisearch health is up
- only the `events` index exists
- `events` index currently holds 5 documents

Implication: empty runtime results in non-event coils are partly a local-fixture problem, not proof that those coils are unimplemented. However, search/index/admin readiness still fails because the code assumes broader readiness than the system actually has.

## Coil-By-Coil Assessment

| Surface             | Status                                 | Notes                                                                                                                        |
| ------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Home / shared shell | Implemented but unstable               | Strong visual direction work is underway, but current WIP is not yet clean or fully verified.                                |
| Global search       | Implemented but misleading             | Search API/UI disagree under partial index coverage; no facets/sorts; limited keyboard semantics in header search.           |
| Events              | Best baseline, not launch-ready        | Richest public/admin experience, but security, mobile a11y, and search trust issues still block launch.                      |
| Funding             | Implemented but incomplete in practice | Browse/detail/submit/admin exist, but local data is empty and search/index parity is missing.                                |
| Red Pages           | Implemented but incomplete in practice | Same pattern as Funding.                                                                                                     |
| Jobs                | Implemented but incomplete in practice | Same pattern as Funding.                                                                                                     |
| Toolbox             | Implemented but incomplete in practice | Same pattern as Funding.                                                                                                     |
| Organization detail | Too thin                               | Only loads organization + upcoming events, not related funding/jobs/business/resources.                                      |
| Venue detail        | Too thin                               | Only loads venue + upcoming events, not broader place/context relationships.                                                 |
| Admin inbox         | Real but limited                       | Useful unified queue, but lacks bulk moderation and depends on inconsistent auth patterns elsewhere.                         |
| Source review       | Strongest admin workflow               | Bulk actions, quality flags, confidence, provenance, and diagnostics exist, but backlog/ops health are not production-ready. |

## Top UX And Product Issues

- The left-rail browse/filter model is now the correct direction, but it still feels more scaffolded than productized across shared coil pages.
- Search does not feel trustworthy: partial-index failure states are invisible to end users.
- Organization and venue pages under-serve the multi-coil product story.
- Non-event coils are difficult to judge as “launch-ready” because local seed/index/test coverage remains event-heavy.
- Mobile browse/filter work is in progress and currently ships with an accessibility warning.

## High-Risk Technical Issues

- Admin authorization relies too heavily on `/admin/+layout.server.ts` and is not consistently enforced in actions.
- `isMeilisearchAvailable()` checks service health only, not index completeness; `searchAll()` swallows multi-search failures into empty results.
- Search API and search page use different fallback semantics.
- Source ops and Events both rely on very large files, increasing regression risk.
- Upload storage is still local disk despite the intended MinIO/S3 direction.
- There is no visible observability stack for errors, metrics, or alerting.

## Missing Feature Inventory

- Shared server-side authorization helper for admin pages, actions, and operational POST endpoints.
- Rate limiting for login, forgot-password, public submission, search, and operational endpoints.
- Explicit search readiness state that distinguishes:
  - Meilisearch absent
  - Meilisearch reachable but partially indexed
  - Meilisearch fully ready
- Cross-coil organization and venue detail aggregation.
- End-to-end test coverage for:
  - public browse
  - search and filter behavior
  - auth flows
  - submissions
  - admin moderation
  - import review and publish paths
- Automated accessibility testing.
- Error tracking, metrics, alerting, dashboards, and recovery runbooks.
- Production storage abstraction for uploads and media lifecycle management.
- Seed/fixture strategy for non-event coils.

## Detailed Findings By System

### 1. Product And Feature Completeness

#### Finding 1.1: Non-event coils are real, but not yet proven production-usable

- Severity: **High**
- Confidence: **High**
- Evidence:
  - public/admin routes exist across `src/routes/funding`, `src/routes/red-pages`, `src/routes/jobs`, `src/routes/toolbox`
  - local DB counts for those content tables are all `0`
  - `package.json` only exposes `pnpm db:seed` for events
  - `README.md:88-89` explicitly says current seeding is event-only
- Impact: These coils may be implemented structurally, but the project cannot yet demonstrate their real launch quality, content integrity, or browse UX under realistic datasets.
- Root cause: Product development has moved ahead of seed data, indexing parity, and QA maturity.

#### Finding 1.2: Organization and venue pages are too event-centric for a multi-coil platform

- Severity: **Medium**
- Confidence: **High**
- Evidence:
  - `src/routes/o/[slug]/+page.server.ts:1-9`
  - `src/routes/v/[slug]/+page.server.ts:1-9`
- Impact: These surfaces undersell the platform’s cross-coil value and make organizations/venues feel like event metadata rather than reusable canonical entities.
- Root cause: The shared entity model exists, but the public aggregation layer has not caught up.

#### Finding 1.3: The current workspace is mid-flight on core public-shell changes

- Severity: **High**
- Confidence: **High**
- Evidence:
  - `git diff --stat` shows major edits in homepage/search/sidebar/layout areas
  - new `src/lib/components/organisms/MobilePeekPanel.svelte`
  - new homepage admin/config files
- Impact: It is too early to freeze the current public shell as a release candidate.
- Root cause: Significant UX improvements are in progress, but baseline hardening has not yet caught up.

### 2. Frontend UX / UI Audit

#### Finding 2.1: The left-rail browse model is correct, but still under-polished

- Severity: **Medium**
- Confidence: **Medium**
- Evidence:
  - shared browse primitives in `src/lib/components/organisms/KbTwoColumnLayout.svelte` and `src/lib/components/organisms/KbSidebar.svelte`
  - Events-specific browse still lives in a large, highly customized file: `src/routes/events/+page.svelte` (905 lines)
- Impact: The product direction is right, but the shared browse experience still risks feeling like a framework scaffold instead of a warm, editorial consumer product.
- Root cause: Shared abstractions were established before the interaction and visual system was fully refined.

#### Finding 2.2: Global search UX is too thin for a flagship discovery feature

- Severity: **High**
- Confidence: **High**
- Evidence:
  - `src/routes/search/+page.server.ts:14-47`
  - `src/routes/search/+page.svelte:12,81-105`
  - `src/lib/components/organisms/KbSearch.svelte:119-225`
- Impact: Search currently lacks robust filtering, trustworthy state messaging, and mature interaction design. That undermines one of the platform’s most important discovery promises.
- Root cause: Search infrastructure and search UX evolved separately and are not yet aligned.

#### Finding 2.3: Organizations, venues, and non-event coils lack strong detail-page differentiation

- Severity: **Medium**
- Confidence: **Medium**
- Evidence:
  - organization/venue detail pages only load events
  - non-event coil maturity depends heavily on shared layout reuse rather than fully differentiated detail ecosystems
- Impact: The platform risks feeling like “Events plus adjacent databases” instead of a coherent multi-coil product.
- Root cause: Events has served as the main pattern donor, but the other coils have not yet established equally strong identity and editorial rhythm.

### 3. Accessibility Audit

#### Finding 3.1: Current workspace introduces a confirmed pointer/semantics accessibility warning

- Severity: **High**
- Confidence: **High**
- Evidence:
  - `src/lib/components/organisms/MobilePeekPanel.svelte:110-121`
  - surfaced by both `pnpm check` and `pnpm build`
- Impact: Mobile browse/filter UX is landing with a known a11y issue in a critical interaction surface.
- Root cause: Pointer-driven interaction was added without matching semantics/role handling.

#### Finding 3.2: Header search lacks combobox-grade keyboard and screen-reader semantics

- Severity: **Medium**
- Confidence: **High**
- Evidence:
  - `src/lib/components/organisms/KbSearch.svelte:119-225`
  - input/dropdown uses plain input + `ul` patterns without combobox/listbox roles, active option state, or keyboard navigation model
- Impact: Search suggestions and result previews are harder to use with keyboard and assistive technology than they should be.
- Root cause: Search preview was implemented as a lightweight custom dropdown rather than an accessibility-first search component.

#### Finding 3.3: Accessibility coverage is far below launch standard

- Severity: **High**
- Confidence: **High**
- Evidence:
  - no automated accessibility tooling surfaced in repo scripts or test suite
  - no Playwright/axe/pa11y coverage found
- Impact: Known issues are likely undercounted, especially in dialogs, drawers, filters, and moderation forms.
- Root cause: Accessibility validation is largely manual today.

### 4. Auth, Roles, Permissions, And Security

#### Finding 4.1: Admin action authorization is dangerously inconsistent

- Severity: **Critical**
- Confidence: **High**
- Evidence:
  - `/admin/+layout.server.ts:4-8` guards load-time access only
  - `src/routes/admin/events/+page.server.ts:35-57`
  - `src/routes/admin/funding/+page.server.ts:41-63`
  - `src/routes/admin/sources/review/+page.server.ts:57-135`
  - repo-wide pattern: many admin actions call `locals.user!.id` without first enforcing auth in the action itself
  - runtime evidence:
    - unauthenticated `POST /admin/inbox?/review` returns a JSON 400/401-style action response instead of redirecting before action execution
    - unauthenticated `POST /admin/funding?/bulkDelete` reaches delete logic and only fails because the supplied ID is invalid
- Impact: Protected admin operations can be reached server-side without a guaranteed authorization gate. This is a launch blocker.
- Root cause: The app relies on layout guarding as if it were sufficient for action security, but form actions must enforce authorization themselves.

#### Finding 4.2: There is no visible rate limiting or abuse protection for public-sensitive flows

- Severity: **High**
- Confidence: **Medium**
- Evidence:
  - repo-wide search found no rate-limiting middleware or dependency
  - affected surfaces include auth, search, public submissions, and operational POST endpoints
- Impact: The platform is exposed to spam, brute-force, and operational abuse risk.
- Root cause: Security hardening has not yet caught up with feature breadth.

#### Finding 4.3: Resource serving allows same-origin HTML delivery

- Severity: **Medium**
- Confidence: **High**
- Evidence:
  - `src/routes/resources/[...path]/+server.ts:36-53`
  - `.html` is explicitly served as `text/html`
- Impact: If untrusted HTML enters the resource store, the app can serve active same-origin content.
- Root cause: Resource delivery is optimized for convenience rather than strict content safety boundaries.

#### Finding 4.4: Operational endpoints are protected in production, but still light on defense-in-depth

- Severity: **Medium**
- Confidence: **High**
- Evidence:
  - `src/routes/api/reindex/+server.ts:12-40`
  - `src/routes/api/source-ops/run-due/+server.ts:7-22`
- Impact: These routes are not the top current launch blocker, but they still rely mostly on shared secret or session checks without broader abuse controls, audit surfacing, or rate limiting.
- Root cause: Operational security is present but thin.

### 5. Data Model, Schema, And Content Integrity

#### Finding 5.1: Source-ops schema is strong, but the platform does not yet fully capitalize on it

- Severity: **Medium**
- Confidence: **High**
- Evidence:
  - `src/lib/server/db/schema/sources.ts:463-527`
  - imported candidates include provenance, URL roles, image candidates, quality flags, confidence, diagnostics, and dedupe constraints
- Impact: This is a strength, but it also highlights the gap between the sophistication of ingestion data and the overall production readiness of the rest of the system.
- Root cause: Source ops matured quickly; surrounding launch systems have not caught up.

#### Finding 5.2: Taxonomy setup mutates the database during page load

- Severity: **Medium**
- Confidence: **High**
- Evidence:
  - `src/routes/admin/settings/taxonomies/+page.server.ts:21-85`
- Impact: A GET load path writes seed data into the database. That is operationally surprising and makes state management harder to reason about.
- Root cause: Bootstrapping convenience was placed inside a normal page load instead of a dedicated migration or admin task.

#### Finding 5.3: Shared entities are present in schema but underused in public product design

- Severity: **Medium**
- Confidence: **Medium**
- Evidence:
  - organizations and venues exist as first-class tables and relations
  - public org/venue pages only render event relationships today
- Impact: Canonical modeling work is not yet paying full product dividends.
- Root cause: Shared data modeling advanced ahead of cross-coil presentation and discovery.

### 6. Search, Discovery, And Filtering

#### Finding 6.1: Search availability is measured by service health, not actual readiness

- Severity: **Critical**
- Confidence: **High**
- Evidence:
  - `src/lib/server/meilisearch.ts:322-351`
  - Meilisearch is considered “available” if `/health` responds
  - only the `events` index currently exists
- Impact: The system reports search as fully available even when four coil indexes are missing.
- Root cause: Search readiness logic stops at infrastructure health and never verifies index presence or completeness.

#### Finding 6.2: Search API and search page disagree about fallback behavior

- Severity: **Critical**
- Confidence: **High**
- Evidence:
  - API behavior: `src/routes/api/search/+server.ts:36-55`
  - page behavior: `src/routes/search/+page.server.ts:14-47`
  - runtime evidence:
    - `GET /api/search?q=tribal` returns `{"mode":"db"}`
    - `/search?q=tribal` renders with `searchMode: "all"` and no limited-search warning
  - `tests/search-api.test.ts:18-29` currently fails because expected fallback semantics no longer match reality
- Impact: Users and operators cannot trust what “search is working” means. This is a direct credibility problem.
- Root cause: API and page fallback logic evolved independently.

#### Finding 6.3: Meili multi-search failures are swallowed into empty results

- Severity: **High**
- Confidence: **High**
- Evidence:
  - `src/lib/server/meilisearch.ts:219-254`
  - missing-index errors are caught and converted to empty results
  - runtime server logs during `/search?q=tribal` show `Index 'funding' not found`
- Impact: Failures are masked as “no results,” which is misleading for users and dangerous for operators.
- Root cause: Error handling favors resilience but not truthfulness.

#### Finding 6.4: Global search lacks product-grade refinement controls

- Severity: **Medium**
- Confidence: **High**
- Evidence:
  - `src/routes/search/+page.svelte`
  - no visible sort controls, coil filters, or faceted narrowing
- Impact: Discovery feels weak compared with the platform’s multi-coil ambition.
- Root cause: Search indexing came before search experience maturity.

### 7. Import / Scraping / Source Ingestion

#### Finding 7.1: Source ops is the most sophisticated subsystem, but not yet operationally ready

- Severity: **High**
- Confidence: **High**
- Evidence:
  - 20 sources total, only 1 active and healthy
  - 57 imported candidates total, 54 still pending review
  - major implementation surfaces:
    - `src/lib/server/import-candidates.ts` (1599 lines)
    - `src/lib/server/ingestion/pipeline.ts` (1368 lines)
    - `src/routes/admin/sources/[id]/+page.svelte` (1341 lines)
    - `src/routes/admin/sources/health/+page.svelte` (819 lines)
    - `src/routes/admin/sources/review/+page.svelte` (585 lines)
- Impact: The import system has real depth, but its review load, source activation profile, and file complexity make it risky to operate at launch scale.
- Root cause: The system grew powerful quickly, but operational staffing, source activation discipline, and decomposition have not kept pace.

#### Finding 7.2: Legacy and newer ingestion paths overlap

- Severity: **Medium**
- Confidence: **Medium**
- Evidence:
  - `src/routes/admin/events/import/+page.server.ts`
  - newer source-ops pipeline and review surfaces under `src/routes/admin/sources/*`
- Impact: Multiple ingestion paths increase policy drift and operational confusion.
- Root cause: Newer ingestion architecture was layered on top of older event-import workflows rather than fully replacing them.

#### Finding 7.3: The review UI does expose confidence, quality flags, and diagnostics, which is a major strength

- Severity: **Low**
- Confidence: **High**
- Evidence:
  - `src/routes/admin/sources/review/+page.svelte:86-104`
  - `src/routes/admin/sources/review/[id]/+page.svelte:59-74,329`
  - `src/routes/admin/sources/[id]/+page.svelte:127,376,582-607,650,1172,1186`
- Impact: This is one of the strongest launch-positive systems in the repo and should be preserved.
- Root cause: Source ops has benefited from deeper systems thinking than other areas.

### 8. Admin And Moderation Workflows

#### Finding 8.1: Moderation ergonomics are uneven across admin surfaces

- Severity: **High**
- Confidence: **High**
- Evidence:
  - source review has bulk actions and rich review metadata
  - admin inbox exposes only a single `review` action in `src/routes/admin/inbox/+page.server.ts:58-134`
  - entity-specific admin pages implement separate bulk approve/reject/delete patterns
- Impact: Operators will switch between multiple moderation models with uneven density, affordances, and safety.
- Root cause: Admin tooling grew surface-by-surface rather than from a single moderation system design.

#### Finding 8.2: Bulk destructive actions are especially sensitive because auth enforcement is inconsistent

- Severity: **Critical**
- Confidence: **High**
- Evidence:
  - `src/routes/admin/events/+page.server.ts:35-57`
  - `src/routes/admin/funding/+page.server.ts:41-63`
  - similar patterns across jobs, red pages, toolbox, and source review actions
- Impact: Bulk moderation and deletion flows cannot be trusted for launch until authorization is fixed everywhere.
- Root cause: Action security was not standardized as these admin pages were added.

#### Finding 8.3: Large admin files increase training cost and change risk

- Severity: **Medium**
- Confidence: **High**
- Evidence:
  - `src/routes/admin/sources/[id]/+page.svelte` is 1341 lines
  - `src/routes/admin/sources/health/+page.svelte` is 819 lines
  - `src/routes/admin/sources/review/+page.svelte` is 585 lines
- Impact: Moderator and operator tooling becomes harder to evolve safely, especially under launch pressure.
- Root cause: Complex review/ops UIs have not yet been decomposed into stable subcomponents.

### 9. Performance And Reliability

#### Finding 9.1: The codebase has several oversized critical files

- Severity: **High**
- Confidence: **High**
- Evidence:
  - `src/lib/server/import-candidates.ts` 1599 lines
  - `src/lib/server/ingestion/pipeline.ts` 1368 lines
  - `src/routes/events/+page.svelte` 905 lines
- Impact: These hotspots raise regression risk, review difficulty, and latency in future bug fixes.
- Root cause: Product and operational complexity accumulated faster than decomposition/refactoring.

#### Finding 9.2: Search reliability currently depends on silent failure handling

- Severity: **High**
- Confidence: **High**
- Evidence:
  - `src/lib/server/meilisearch.ts:233-254`
  - search currently converts missing-index errors into empty responses
- Impact: Operational issues show up as subtle UX degradation instead of actionable system failures.
- Root cause: Reliability strategy favors graceful empty states over truthful fault handling.

#### Finding 9.3: Build output indicates bundle concentration that should be watched before launch

- Severity: **Medium**
- Confidence: **Medium**
- Evidence:
  - `pnpm build` passed but surfaced a very large `server/chunks/auth.js` artifact in prior output
- Impact: Large server bundles often correlate with cold-start, memory, and maintainability concerns.
- Root cause: Auth and related server dependencies have accumulated into a broad shared chunk.

### 10. Testing And QA Readiness

#### Finding 10.1: QA coverage is not sufficient for launch-critical flows

- Severity: **High**
- Confidence: **High**
- Evidence:
  - current test suite is limited to Vitest route/server tests and smoke coverage
  - no Playwright/Cypress-style end-to-end suite found
  - no automated accessibility suite found
- Impact: Critical flows can regress without detection, which is already happening in search mode behavior.
- Root cause: Test investment has focused on targeted logic checks rather than end-to-end product confidence.

#### Finding 10.2: Search behavior already has a live regression relative to tests

- Severity: **High**
- Confidence: **High**
- Evidence:
  - `tests/search-api.test.ts:18-29`
  - `pnpm test` currently fails on this case
- Impact: A user-facing discovery contract has already drifted from tested expectations.
- Root cause: Search fallback semantics changed without fully reconciling tests, UI, and API behavior.

#### Finding 10.3: Local seed strategy is too event-centric to support whole-platform QA

- Severity: **High**
- Confidence: **High**
- Evidence:
  - `package.json` only includes `db:seed`
  - `README.md:88-89` says seeding is currently event-only
  - non-event local table counts are zero
- Impact: The team cannot easily validate the full multi-coil product under realistic local conditions.
- Root cause: Seed/fixture work has not expanded with product scope.

### 11. DevOps, Environment, And Production Readiness

#### Finding 11.1: Upload architecture still conflicts with the intended S3-compatible storage direction

- Severity: **High**
- Confidence: **High**
- Evidence:
  - `.env.example:15-24` documents MinIO / S3-compatible storage
  - `src/lib/server/upload.ts:26-43` writes directly to `static/uploads/<scope>`
- Impact: Local disk uploads complicate scaling, portability, persistence, and media lifecycle management in real deployment.
- Root cause: Product upload features landed before storage abstraction was completed.

#### Finding 11.2: Observability and recovery posture are below launch standard

- Severity: **High**
- Confidence: **Medium**
- Evidence:
  - repo search found no integrated Sentry, Datadog, OpenTelemetry, or Prometheus setup
  - no backup/restore or recovery runbooks surfaced in current docs set
- Impact: Production incidents would be harder to detect, diagnose, and recover from.
- Root cause: Operations maturity has lagged behind feature development.

#### Finding 11.3: Local/dev infrastructure is present, but production operations are not fully documented

- Severity: **Medium**
- Confidence: **Medium**
- Evidence:
  - `README.md:48-71`
  - parent repo contains `../docker-compose.yml`
  - current docs still do not provide a production deployment, backup, restore, or incident-response standard
- Impact: The team can run local infrastructure, but that does not yet translate into an operationally safe launch.
- Root cause: Dev ergonomics were prioritized earlier than launch operations.

### 12. Documentation And Architecture Drift

#### Finding 12.1: Core docs now correctly preserve the left-rail direction, but stale contrary references remain

- Severity: **Medium**
- Confidence: **High**
- Evidence:
  - correct/current direction:
    - `README.md:121,130-131`
    - `docs/README.md:10-13`
    - `docs/DESIGN_SYSTEM.md:15-25`
  - stale contrary reference:
    - `docs/plans/cozy-jumping-russell.md:45,103`
- Impact: Team members can still encounter outdated “horizontal filter bar” guidance and make the wrong product tradeoffs.
- Root cause: Documentation cleanup has been partial rather than comprehensive.

#### Finding 12.2: Search docs and admin expectations drift from actual partial-index behavior

- Severity: **High**
- Confidence: **High**
- Evidence:
  - `src/routes/admin/settings/search/+page.svelte:92-105` frames the problem as “configured vs reachable”
  - actual runtime issue is broader: service reachable, indexes missing
- Impact: Operators can be misled about real search readiness.
- Root cause: Search documentation and operator UX do not reflect partial-index failure modes.

## Current Workspace Regressions Vs Longstanding Issues

### Current-workspace regressions / instability

- Failing `pnpm lint`
- Failing `pnpm test`
- Confirmed `MobilePeekPanel` accessibility warning
- Active homepage/search/sidebar/public-shell WIP

### Longstanding structural issues

- Inconsistent admin action authorization
- Search readiness based on Meili health rather than full index readiness
- Thin non-event QA and seed coverage
- Missing rate limiting and observability
- Upload/storage architecture drift
- Source ops operational backlog and file concentration

## Overall Conclusion

Knowledge Basket has enough real product and systems depth to justify pushing toward launch. It does **not** have enough trust, validation, or operational hardening to launch safely today.

The good news is that the project does not need a rewrite. The stack choice is coherent. The left-rail public browse model is now the correct product direction. The source-ops schema is stronger than the rest of the product in several respects. The platform’s path to production is a focused hardening effort, not a restart.

The bad news is that the next phase must be brutally disciplined:

- lock down admin authorization everywhere
- make search truthful under partial readiness
- stabilize the current workspace and restore quality gates
- operationalize source review and indexing
- add real QA, observability, and launch runbooks

Until that happens, a public launch would expose the platform to credibility, moderation, and operational risk that is too high.
