# Knowledge Basket Full Site And System Audit

Date: 2026-04-05  
Scope: current `/Users/hayden/Desktop/kb/site` workspace, including uncommitted WIP, local database/search state, and current docs/specs where they define intended behavior.

## Executive Summary

Knowledge Basket is still **not production-ready**, but the current workspace is healthier than the previous audit snapshot.

Several formerly critical concerns have materially improved:

- admin page loads and admin POSTs are now guarded server-side
- rate limiting exists for auth, public submissions, search, and privileged operational endpoints
- search now has a real readiness model and degraded-mode messaging instead of pretending indexed search is always healthy
- uploads now target S3-compatible object storage rather than local-disk-only writes
- `pnpm check`, `pnpm test`, and `pnpm build` now pass

That improvement does **not** make the platform launch-ready. The blockers have shifted from “obviously broken baseline” to “trust, completeness, migration parity, operational maturity, and validation.”

The biggest remaining launch risks are:

1. the live local environment is still overwhelmingly events-only, so four public coils remain implemented but under-validated in practice
2. source ops is structurally impressive but operationally immature, with 54 candidates still pending review and only 1 active healthy source
3. database migration parity is not reliable enough for launch confidence; privacy/account features exist in code while the local DB still lacks `privacy_requests`
4. there is still no real end-to-end or automated accessibility test coverage
5. observability and deployment readiness remain thin relative to the product’s operational complexity
6. the workspace is in heavy active WIP, and `pnpm lint` is currently failing on broad formatting drift across product, admin, docs, and generated artifacts

The project now looks less like an internal alpha with broken guardrails and more like a serious product that still needs a hardening cycle before launch.

## Current Production-Readiness Rating

Overall rating: **Not launch-ready**

| Area                   | Status                                        | Assessment                                                                                                    |
| ---------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Public product shell   | In active refinement                          | Real product identity exists, but current WIP makes the shell less stable than a release candidate should be. |
| Events                 | Strongest baseline                            | Best end-to-end coil and still the operational reference implementation.                                      |
| Funding                | Implemented but under-validated               | Public/admin paths exist, but local data, search index coverage, and realistic QA remain too thin.            |
| Red Pages              | Implemented but under-validated               | Same pattern as Funding.                                                                                      |
| Jobs                   | Implemented but under-validated               | Same pattern as Funding.                                                                                      |
| Toolbox                | Implemented but under-validated               | Same pattern as Funding, plus the most editorial/scaffold feel.                                               |
| Organizations / venues | Improved but lightly proven                   | Cross-coil aggregation now exists, but local data is too sparse to validate real hub quality.                 |
| Auth / permissions     | Materially improved                           | No longer a top launch blocker, but still needs regression coverage.                                          |
| Search / discovery     | More truthful, still incomplete               | Degraded modes are handled better, but local indexing is still only `events`.                                 |
| Source ingestion       | Structurally advanced, operationally immature | Good system design, weak current queue health and source activation coverage.                                 |
| Admin / moderation     | Useful but incomplete                         | Better than before, but still lacks launch-grade bulk review, density, and verification.                      |
| QA / testing           | Inadequate                                    | Good handler/unit coverage, no real browser/e2e/a11y safety net.                                              |
| Observability / ops    | Inadequate                                    | Health endpoint and JSON logs exist, but dashboards, alerts, and recovery maturity are not there.             |

## What Is Done, Broken, Missing, And Risky

### Done

- All five coils have public list/detail/submit routes and matching server/domain services.
- Admin CRUD exists across events, funding, red pages, jobs, and toolbox.
- `/admin` protection is now enforced in `src/hooks.server.ts` and covered by `tests/admin-auth.test.ts`.
- Search has explicit readiness states in `src/lib/server/meilisearch.ts` and degraded-mode API behavior in `src/routes/api/search/+server.ts`.
- Source ops includes registry, staging, evidence, review, publishing, provenance, scheduler, and source-health surfaces.
- Object storage is wired through `src/lib/server/object-storage.ts` and `src/lib/server/upload.ts`.
- Organization and venue pages now aggregate cross-coil related content in `src/routes/o/[slug]/+page.server.ts` and `src/routes/v/[slug]/+page.server.ts`.

### Broken

- `pnpm lint` currently fails due to formatting drift in 71 files, including app routes, admin routes, docs, and `test-results/.last-run.json`.
- Local search infrastructure is only partially built: Meilisearch currently exposes only the `events` index even though the code expects all public scopes.
- The privacy/account feature set is ahead of the local database: `src/lib/server/privacy.ts` and `src/routes/account/privacy/+page.server.ts` rely on `privacy_requests`, but the local DB does not have that table.
- Four public coils are live with zero local records, which makes product validation, search validation, and responsive QA mostly hypothetical outside Events.

### Missing

- realistic non-event fixture coverage
- browser-level regression coverage for public browsing, submissions, auth, moderation, and indexed search
- automated accessibility testing
- stronger operator tooling for source backlog reduction and routine review throughput
- production-grade error tracking, metrics, and alerting
- a reliable migration-parity workflow that prevents feature code from outrunning database state

### Risky

- the current worktree has broad uncommitted WIP across homepage, search, admin, privacy, org hubs, schema, and docs
- build output still includes a very large server auth chunk (`.svelte-kit/output/server/chunks/auth.js` at ~1.54 MB)
- current docs still contradict current behavior in multiple places, especially non-event workflow documentation

## Top Launch Blockers

1. **Critical**: Non-event public surfaces are implemented but still unproven in realistic data, indexing, and QA conditions.
2. **High**: Source ops is not operationally launch-ready with 54 pending-review candidates and only 1 active healthy source.
3. **High**: Database migration parity is unreliable; privacy features are live in code while the local DB still lacks `privacy_requests`.
4. **High**: There is no e2e or automated accessibility coverage for launch-critical flows.
5. **High**: Observability and production operations are still too thin for a multi-coil, ingestion-heavy platform.
6. **Medium**: The workspace is mid-flight, and `pnpm lint` currently fails on broad formatting drift, which weakens release confidence.

## Top High-Risk Technical Issues

- **High**: feature code is outpacing applied migrations in the local environment
- **High**: indexed search is only partially realized in practice despite more complete readiness logic in code
- **High**: source review volume and source activation depth are not yet operationally sustainable
- **Medium**: large server auth bundling suggests heavy cold-path coupling
- **Medium**: broad active WIP increases drift risk between docs, tests, and actual release intent

## Top UX And Product Issues

- The left-rail browse model is the correct direction, but non-event browse quality still cannot be trusted under realistic data density because those coils are empty locally.
- Mobile and responsive intent is stronger in architecture than in proof; without e2e/device coverage, current polish is hard to certify.
- Toolbox still feels the most editorially thin and scaffold-driven of the public coils.
- Organization and venue hubs are directionally right now, but sparse data means their product value is not yet proven.
- Active shell/homepage/admin WIP makes current UI stability lower than the code structure suggests.

## Missing Feature Inventory

- realistic launch seed/fixture coverage for funding, red pages, jobs, toolbox, organizations, and venues
- end-to-end tests for browse, filters, detail pages, submissions, auth, moderation, and search readiness modes
- automated accessibility checks in CI
- stronger admin bulk review and throughput tools for source candidates
- production monitoring stack beyond JSON logs, optional Sentry, and a health endpoint
- explicit migration health checks for privacy/compliance features similar to `src/lib/server/source-ops-schema.ts`

## Detailed Findings By System

### 1. Product And Feature Completeness

#### Finding 1.1: Four public coils are implemented but still under-validated in practice

- Severity: **Critical**
- Confidence: **High**
- Evidence:
  - public/admin routes exist under `src/routes/funding/**`, `src/routes/red-pages/**`, `src/routes/jobs/**`, and `src/routes/toolbox/**`
  - local DB counts are still `0` for `funding`, `red_pages_businesses`, `jobs`, and `toolbox_resources`
  - only `events` currently exists in Meilisearch
- Root cause: Product surface has advanced faster than seed data, index rollout, and full-flow verification.
- Launch impact: The non-event coils may be structurally implemented, but they are not currently proven as production-usable experiences.

#### Finding 1.2: Organization and venue hubs are directionally correct but lightly validated

- Severity: **Medium**
- Confidence: **High**
- Evidence:
  - `src/routes/o/[slug]/+page.server.ts` now loads events, funding, jobs, red pages, toolbox, venues, follow state, and claim state
  - `src/routes/v/[slug]/+page.server.ts` now loads events plus related organization content
  - local DB counts remain `organizations|0` and `venues|1`
- Root cause: Shared entity architecture is ahead of realistic local fixture depth.
- Launch impact: Cross-coil hub design exists, but the team cannot yet trust hub quality under real-world data.

#### Finding 1.3: Current product shell work is still mid-flight

- Severity: **Medium**
- Confidence: **High**
- Evidence:
  - `git status --short` shows active edits across homepage, search, admin, privacy, org pages, shell, and docs
  - modified files include `src/routes/+page.svelte`, `src/lib/components/organisms/KbHeader.svelte`, `src/routes/search/+page.svelte`, `src/routes/admin/+page.svelte`, and many others
- Root cause: Release hardening and active feature/polish work are happening simultaneously in one workspace.
- Launch impact: Even where implementation direction is sound, the current workspace does not behave like a frozen release candidate.

### 2. Frontend UX/UI Audit

#### Finding 2.1: The desktop left rail is the right pattern, but coil quality is uneven

- Severity: **Medium**
- Confidence: **Medium**
- Evidence:
  - current design direction in `docs/DESIGN_SYSTEM.md` and `docs/README.md` explicitly preserves the public left filter rail
  - shared browse/search layout primitives exist under `src/lib/components/organisms/KbSidebar.svelte`, `KbTwoColumnLayout.svelte`, `KbSearch.svelte`, and `KbFilterSection.svelte`
  - non-event coils remain empty locally, limiting real UX validation
- Root cause: Shared browse architecture is ahead of cross-coil content density and QA.
- Launch impact: The overall pattern is now correct, but launch confidence is still limited by sparse proof outside Events.

#### Finding 2.2: Current UI polish work is broad enough to raise short-term regression risk

- Severity: **Medium**
- Confidence: **High**
- Evidence:
  - active modifications span public header, homepage, admin pages, search, event cards, list items, and multiple submit/detail pages
  - `pnpm lint` currently fails on broad formatter drift rather than a single isolated surface
- Root cause: Wide-scope UX churn without a clean stabilization pass.
- Launch impact: Product quality may be improving, but the workspace is not in a “settled enough to launch” state.

### 3. Accessibility Audit

#### Finding 3.1: Typecheck no longer reports Svelte a11y warnings, but there is still no automated accessibility coverage

- Severity: **High**
- Confidence: **High**
- Evidence:
  - `pnpm check` now passes with `0 errors and 0 warnings`
  - repo/tooling search finds no Playwright, axe, pa11y, or Lighthouse automation in `package.json`, `tests/**`, `.github/workflows/**`, or docs
- Root cause: Accessibility is currently dependent on ad hoc component correctness and manual review.
- Launch impact: The absence of automated a11y verification is still a launch risk, especially with active UI churn.

### 4. Auth, Roles, Permissions, And Security

#### Finding 4.1: Admin route protection is no longer a launch blocker

- Severity: **Low**
- Confidence: **High**
- Evidence:
  - `src/hooks.server.ts` applies `guardAdminRequest(event)` before route resolution
  - `src/lib/server/access-control.ts` returns login redirects for safe methods and `401/403` JSON for unsafe methods
  - `tests/admin-auth.test.ts` verifies unauthenticated admin page loads redirect and unauthenticated admin POSTs are blocked
- Root cause: Security hardening has already been applied since the prior audit.
- Launch impact: This should be treated as a closed former blocker, not a current blocker.

#### Finding 4.2: Rate limiting now exists, but no distributed enforcement strategy is present

- Severity: **Medium**
- Confidence: **High**
- Evidence:
  - `src/lib/server/rate-limit.ts` applies in-memory buckets only
  - policies cover auth, public submit, search API, and privileged ops
- Root cause: Abuse protection was added quickly without a shared distributed store.
- Launch impact: This is materially better than no throttling, but horizontal scale or multi-instance deployments will not share enforcement state.

#### Finding 4.3: CSP and resource-serving posture are improved

- Severity: **Low**
- Confidence: **High**
- Evidence:
  - `src/hooks.server.ts` sets CSP, HSTS in non-dev, permissions policy, referrer policy, and `nosniff`
  - `src/routes/resources/[...path]/+server.ts` explicitly blocks inline HTML resources
  - `src/routes/uploads/[...path]/+server.ts` serves object-storage uploads through stable app paths
- Root cause: Security posture is now receiving deliberate attention.
- Launch impact: This area is improved and should not be overstated as a current blocker.

### 5. Data Model, Schema, And Content Integrity

#### Finding 5.1: Migration parity is still not reliable enough for launch confidence

- Severity: **High**
- Confidence: **High**
- Evidence:
  - `src/lib/server/db/schema/privacy.ts` defines `privacy_requests`
  - `drizzle/0005_compliance_foundations.sql` creates `privacy_requests`
  - local DB inspection shows `privacy_requests_table|false`
  - `src/routes/account/privacy/+page.server.ts` directly calls `createContentPrivacyRequest(...)`
  - `src/lib/server/privacy.ts` inserts into `privacyRequests` without a compatibility guard for writes
- Root cause: feature code and migrations are moving independently, and only some subsystems have explicit schema-health detection
- Launch impact: Environments can silently drift into “feature present in code, broken in runtime” states.

#### Finding 5.2: Source ops has partial schema-health protection; privacy does not

- Severity: **Medium**
- Confidence: **High**
- Evidence:
  - `src/lib/server/source-ops-schema.ts` checks for `canonical_records.source_snapshot` and exposes compatibility-mode messaging
  - no equivalent schema-health gate exists for privacy/compliance features
- Root cause: Schema-health strategy is subsystem-specific rather than platform-wide.
- Launch impact: Some features degrade gracefully under migration drift while others hard-fail.

### 6. Search, Discovery, And Filtering

#### Finding 6.1: Search truthfulness is much better than the older audit said

- Severity: **Low**
- Confidence: **High**
- Evidence:
  - `src/lib/server/meilisearch.ts` now distinguishes `not-configured`, `host-unavailable`, `missing-indexes`, `settings-mismatch`, and `ready`
  - `src/routes/api/search/+server.ts` returns degraded-mode payloads and logs compatibility mode
  - `tests/search-api.test.ts` verifies offline fallback behavior
- Root cause: Search hardening has already happened since the prior audit.
- Launch impact: This former blocker should now be treated as materially improved, not still critical.

#### Finding 6.2: Local indexed search is still incomplete in practice

- Severity: **High**
- Confidence: **High**
- Evidence:
  - Meilisearch `/indexes` currently returns only `events`
  - `src/lib/server/meilisearch.ts` expects indexes for `events`, `funding`, `redpages`, `jobs`, `toolbox`, `organizations`, `venues`, and `sources`
  - local DB non-event content is empty, limiting real indexing validation
- Root cause: Search architecture is broader than the currently seeded/indexed environment.
- Launch impact: Public claims of multi-coil discovery remain under-proven despite improved degraded-mode honesty.

### 7. Import / Scraping / Source Ingestion System

#### Finding 7.1: Source ops remains one of the highest-value systems and one of the least launch-ready operationally

- Severity: **High**
- Confidence: **High**
- Evidence:
  - current source counts: `sources|20`, `imported_candidates|57`
  - current candidate queue: `candidate_status|pending_review|54`
  - current source health: `source_status|discovered|unknown|19`, `source_status|active|healthy|1`
  - review actions and bulk actions exist in `src/routes/admin/sources/review/+page.server.ts`
  - source run, evidence, dedupe, and provenance systems are extensive across `src/lib/server/ingestion/**`
- Root cause: The implementation is ambitious, but operational adoption and steady-state review capacity are behind the system design.
- Launch impact: This is still a launch-critical subsystem that could create high operational burden immediately after launch.

#### Finding 7.2: Source review has good structure but limited throughput confidence

- Severity: **Medium**
- Confidence: **Medium**
- Evidence:
  - `src/routes/admin/sources/review/+page.server.ts` supports bulk approve/reject and candidate-level approve/reject/archive/needs-info flows
  - `tests/source-ops.test.ts` provides strong unit-level coverage for dedupe, adapters, enrichment, and merge planning
  - there is still no browser-level verification of the end-to-end moderation UX
- Root cause: Backend sophistication outpaces workflow-level validation.
- Launch impact: Source ops is less risky than before at the service layer, but still not proven under real operator behavior.

### 8. Admin And Moderation Workflows

#### Finding 8.1: Admin is materially more useful than older docs imply

- Severity: **Low**
- Confidence: **High**
- Evidence:
  - admin surfaces exist for content, sources, organizations, venues, homepage, search, preview, and account
  - `src/lib/server/admin-review.ts` aggregates multi-coil moderation and source metrics
  - `/admin/inbox` now redirects to the main dashboard rather than acting as a dead-end surface
- Root cause: Documentation has lagged behind implementation.
- Launch impact: Admin should be treated as partially production-like, not as a stub.

#### Finding 8.2: Moderation ergonomics still need a launch-focused throughput pass

- Severity: **High**
- Confidence: **Medium**
- Evidence:
  - non-event content is still empty locally, limiting proof of moderation load
  - source review backlog is already significant before any public launch
  - browser/e2e coverage is absent for review flows
- Root cause: Admin breadth has expanded faster than operator workflow refinement and verification.
- Launch impact: A small moderator team would likely feel friction quickly in live conditions.

### 9. Performance And Reliability

#### Finding 9.1: Build is green, but bundle size and server chunk size still need attention

- Severity: **Medium**
- Confidence: **High**
- Evidence:
  - `pnpm build` passes
  - build output shows `.svelte-kit/output/server/chunks/auth.js` at approximately `1,541.83 kB`
  - build output also shows large server/client artifacts for admin/source/homepage surfaces
- Root cause: Heavy shared auth/runtime coupling and broad route/component payloads.
- Launch impact: This is not a ship blocker by itself, but it raises cold-path and maintainability risk.

#### Finding 9.2: Current reliability is better at compile/test time than at migration/runtime parity

- Severity: **Medium**
- Confidence: **High**
- Evidence:
  - `pnpm check`, `pnpm test`, and `pnpm build` all pass
  - runtime-facing schema drift still exists for privacy
- Root cause: CI-style checks do not fully model environment state.
- Launch impact: Green CI-style checks alone are not enough to claim launch readiness.

### 10. Testing And QA Readiness

#### Finding 10.1: Automated coverage is improving, but it is still mostly server/unit-focused

- Severity: **High**
- Confidence: **High**
- Evidence:
  - `pnpm test` passes with `11` test files and `59` tests
  - current suite covers admin auth, inbox behavior, search API, search service, source ops, org actions, and smoke tests
  - `tests/**` contains no Playwright/browser test stack
- Root cause: The project has good regression instincts at the handler/service layer, but not at the end-to-end UI layer.
- Launch impact: Core user trust flows are still under-protected against responsive/UI regressions.

#### Finding 10.2: There is no automated accessibility safety net

- Severity: **High**
- Confidence: **High**
- Evidence:
  - no axe/pa11y/Playwright/Lighthouse tooling in repo or CI
- Root cause: Accessibility verification is still manual-only.
- Launch impact: This is a compliance and trust risk, especially given ongoing design churn.

### 11. DevOps, Environment, And Production Readiness

#### Finding 11.1: Operational foundations exist, but production supportability is still thin

- Severity: **High**
- Confidence: **High**
- Evidence:
  - `docs/PRODUCTION_RUNBOOK.md` now documents health checks, scheduler, backups, and recovery basics
  - `src/routes/api/health/+server.ts` reports DB, search, object storage, and source-ops health
  - `src/lib/server/observability.ts` provides JSON logs and optional error webhook forwarding
  - no evidence of metrics, alert routing, dashboards, or incident automation
- Root cause: Launch ops groundwork exists, but not a full production support stack.
- Launch impact: The platform is more operable than before, but still too dependent on human inspection and ad hoc response.

#### Finding 11.2: Upload storage is now aligned with intended architecture

- Severity: **Low**
- Confidence: **High**
- Evidence:
  - `src/lib/server/object-storage.ts` uses S3-compatible APIs
  - `src/lib/server/upload.ts` writes uploads through object storage
  - `src/routes/uploads/[...path]/+server.ts` serves stored assets
- Root cause: Storage alignment work has already landed.
- Launch impact: This former architecture mismatch should be considered largely closed.

### 12. Documentation And Architecture Drift

#### Finding 12.1: `docs/ops-content-workflows.md` is now materially stale

- Severity: **High**
- Confidence: **High**
- Evidence:
  - doc says non-event submission pages exist but server actions are not yet operational
  - current server actions are live in:
    - `src/routes/funding/submit/+page.server.ts`
    - `src/routes/red-pages/submit/+page.server.ts`
    - `src/routes/jobs/submit/+page.server.ts`
    - `src/routes/toolbox/submit/+page.server.ts`
- Root cause: Workflow docs were not updated as non-event submission handling landed.
- Launch impact: Operators and future engineers can make bad assumptions about what is actually live.

#### Finding 12.2: The previous audit is now partly obsolete and should not be treated as current truth

- Severity: **Medium**
- Confidence: **High**
- Evidence:
  - old audit says `pnpm check` passes with warnings; current `pnpm check` is clean
  - old audit says `pnpm test` fails; current `pnpm test` passes with `59` tests
  - old audit treats admin request protection and rate limiting as unresolved launch blockers; current code/tests show both are implemented
- Root cause: remediation work landed after the previous audit, but the doc remained in place
- Launch impact: Reusing the older audit without revalidation would mis-prioritize current launch work.

## Documentation Drift Appendix

Current doc conflicts that matter:

- `docs/ops-content-workflows.md` still says non-event submission actions are not operational; route code shows they are live.
- `docs/reviews/full-site-and-system-audit.md` no longer reflects the current quality baseline or auth/search hardening state.
- `/Users/hayden/Desktop/kb/spec.md` is directionally closer to current truth than older docs, but its “implemented but under-validated” framing is more accurate than any “fully launch-ready” reading.

## Evidence Appendix

### Workspace Baseline

- `git status --short` shows broad active WIP across public shell, admin, privacy, org hubs, search, schema, and docs.

### Quality Gates

| Command      | Current result | Notes                                                                                             |
| ------------ | -------------- | ------------------------------------------------------------------------------------------------- |
| `pnpm check` | Pass           | `svelte-check found 0 errors and 0 warnings`                                                      |
| `pnpm test`  | Pass           | `11` files, `59` tests passing                                                                    |
| `pnpm lint`  | Fail           | Prettier drift in `71` files, including app code, docs, skills, and `test-results/.last-run.json` |
| `pnpm build` | Pass           | Build succeeds; server auth chunk still ~`1.54 MB`                                                |

### Local Data State

- `events|3`
- `funding|0`
- `red_pages_businesses|0`
- `jobs|0`
- `toolbox_resources|0`
- `organizations|0`
- `venues|1`
- `sources|20`
- `imported_candidates|57`
- `privacy_requests_table|false`

### Source Ops State

- `candidate_status|pending_review|54`
- `candidate_status|approved|3`
- `source_status|discovered|unknown|19`
- `source_status|active|healthy|1`

### Search State

- Meilisearch currently exposes only `events`
- readiness logic in `src/lib/server/meilisearch.ts` would correctly classify missing scopes as partial, but the local environment is still incomplete

### Important Code Paths Reviewed

- auth / admin protection:
  - `src/hooks.server.ts`
  - `src/lib/server/access-control.ts`
  - `tests/admin-auth.test.ts`
- search:
  - `src/lib/server/meilisearch.ts`
  - `src/lib/server/search-service.ts`
  - `src/routes/api/search/+server.ts`
  - `tests/search-api.test.ts`
- source ops:
  - `src/lib/server/ingestion/**`
  - `src/routes/admin/sources/review/+page.server.ts`
  - `src/lib/server/source-ops-schema.ts`
  - `tests/source-ops.test.ts`
- storage / security:
  - `src/lib/server/object-storage.ts`
  - `src/lib/server/upload.ts`
  - `src/routes/uploads/[...path]/+server.ts`
  - `src/routes/resources/[...path]/+server.ts`
- migration-parity concern:
  - `src/lib/server/db/schema/privacy.ts`
  - `drizzle/0005_compliance_foundations.sql`
  - `src/lib/server/privacy.ts`
  - `src/routes/account/privacy/+page.server.ts`
