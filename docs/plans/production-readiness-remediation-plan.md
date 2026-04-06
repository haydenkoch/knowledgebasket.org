# Knowledge Basket Production-Readiness Remediation Plan

Date: 2026-04-05  
Scope: remediation roadmap derived from the refreshed audit in `docs/reviews/full-site-and-system-audit.md`

## Goal And Release Posture

Move Knowledge Basket from a materially improved but still under-validated multi-coil product to a launch-ready platform without changing the current product direction.

Working release posture:

- keep the **left-rail** public browse pattern
- treat Events as the strongest implementation baseline, but not the only launch standard
- prioritize truth, migration parity, operational safety, and validation ahead of additional feature expansion
- treat current broad WIP as something to stabilize before layering more launch promises on top

## Guiding Principles

- Fix production trust gaps before polishing already-good surfaces.
- Prefer proving existing features over expanding feature count.
- Treat current route/server/schema code as the present-state source of truth.
- Use docs to clarify implementation reality, not to overstate maturity.
- Separate “implemented” from “launch-validated”.

## Recommended Order Of Operations

1. Stabilize the workspace and migration baseline.
2. Make indexed search complete and provably truthful in live environments.
3. Reduce source-ops operational risk and moderation burden.
4. Add browser-level and accessibility verification.
5. Raise observability, deployment, and recovery maturity.
6. Do the final public/admin polish and launch-readiness pass.

## Workstreams

### Workstream 1: Baseline Stabilization And Migration Parity

Priority: **Immediate**

Objective:

- restore a clean engineering baseline
- stop feature code from outrunning applied schema state

Concrete tasks:

- Fix current `pnpm lint` failures and remove formatting drift from tracked app/docs/test artifacts.
- Decide whether `.claude/**`, generated `test-results/**`, and other auxiliary files should stay in lint scope; either normalize them or exclude them intentionally.
- Apply and verify all outstanding migrations in local/staging environments, especially:
  - `drizzle/0005_compliance_foundations.sql`
  - `drizzle/0006_org_workspaces.sql`
- Add a migration-parity verification step to the routine launch checklist.
- Introduce a shared schema-health pattern for newer subsystems so privacy/compliance features fail clearly rather than implicitly.

Exit criteria:

- `pnpm check`, `pnpm test`, `pnpm lint`, and `pnpm build` all pass cleanly
- local/staging DB schema matches current Drizzle schema for launch-critical features
- feature code no longer depends on missing tables/columns in normal environments

Dependencies:

- none

### Workstream 2: Search And Discovery Truthfulness

Priority: **Immediate**

Objective:

- make the real search experience match the intended multi-coil product promise

Concrete tasks:

- Ensure all intended public search scopes are created and indexed, not just `events`.
- Build or verify a repeatable full reindex flow across:
  - events
  - funding
  - red pages
  - jobs
  - toolbox
  - organizations
  - venues
- Seed enough non-event content to validate browse/search relevance and degraded states.
- Add explicit operator checks around missing-index and partial-readiness states.
- Verify `/search` and `/api/search` behavior in:
  - fully ready mode
  - host unavailable mode
  - partial missing-index mode
  - stale-settings mode

Exit criteria:

- Meilisearch has all intended indexes in local/staging launch environments
- multi-coil search is proven with realistic data
- degraded modes remain truthful and understandable when search is unhealthy

Dependencies:

- Workstream 1

### Workstream 3: Source Ops Operational Maturity

Priority: **Immediate**

Objective:

- make source ingestion sustainable for real operators, not just technically impressive

Concrete tasks:

- Burn down the current pending-review backlog to a manageable steady state.
- Define source activation criteria before launch:
  - field quality
  - attribution correctness
  - URL-role correctness
  - image behavior
  - dedupe quality
  - retryability
- Decide which starter sources are actually launch-worthy and which should remain discovered/paused.
- Improve moderation throughput where needed:
  - bulk review ergonomics
  - candidate prioritization
  - clearer queue segmentation
  - better stale/broken source surfacing
- Add runbook steps for:
  - reruns
  - retries
  - quarantining bad sources
  - reindex sync after publish

Exit criteria:

- source review backlog is manageable
- source activation is intentional and documented
- operators can diagnose and recover from bad-source scenarios

Dependencies:

- Workstream 1
- Workstream 2

### Workstream 4: QA And Accessibility Coverage

Priority: **Immediate**

Objective:

- give the team browser-level confidence in the real product

Concrete tasks:

- Add browser/e2e coverage for launch-critical flows:
  - public browse and left-rail filtering
  - mobile filter drawer behavior
  - detail pages
  - public submissions
  - auth flows
  - admin moderation
  - source candidate review
  - search readiness/fallback UX
- Add automated accessibility checks to CI.
- Add regression tests for migration-sensitive routes such as account/privacy.
- Keep existing service/unit tests, but stop relying on them as the only release gate.

Exit criteria:

- launch-critical public/admin flows have browser-level coverage
- automated a11y checks run in CI
- release confidence no longer depends on manual smoke testing alone

Dependencies:

- Workstreams 1 through 3

### Workstream 5: Observability, Deployment, And Recovery Readiness

Priority: **High**

Objective:

- make the platform supportable in production

Concrete tasks:

- Expand from JSON logs and optional Sentry into a real support posture:
  - error routing
  - alerting
  - dashboard visibility
  - source-ops health monitoring
  - search/index monitoring
- Define production ownership for:
  - `/api/health`
  - `/api/reindex`
  - `/api/source-ops/run-due`
- Verify backup and restore drills for:
  - Postgres
  - object storage
  - search rebuild
- Document deployment expectations for env vars, scheduler cadence, and secret management.
- Add runtime checks or startup visibility for critical env/config gaps.

Exit criteria:

- operators can detect, triage, and recover from likely incidents
- restore steps are documented and tested
- production env/config expectations are explicit and auditable

Dependencies:

- Workstreams 1 through 4

### Workstream 6: Data And Launch-Fidelity Seeding

Priority: **High**

Objective:

- prove the whole product under realistic content conditions

Concrete tasks:

- Create or import representative non-event content for funding, red pages, jobs, toolbox, organizations, and venues.
- Ensure seeded content exercises:
  - empty states
  - rich states
  - image states
  - cross-coil organization/venue hubs
  - search and filter facets
  - submission and moderation paths
- Align search indexing and homepage/admin previews with that richer data set.

Exit criteria:

- non-event coils can be judged as real products rather than as structurally complete empty shells
- search, browse, hubs, and admin workflows are validated on meaningful datasets

Dependencies:

- Workstreams 1 and 2

### Workstream 7: Final Public And Admin Polish

Priority: **Medium**

Objective:

- convert a technically credible product into a launch-credible one

Concrete tasks:

- Tighten left-rail browse quality across all coils with realistic content.
- Validate mobile search-plus-filter-drawer ergonomics end to end.
- Improve non-event detail pages and editorial rhythm, especially Toolbox.
- Refine admin information density and review throughput after backlog and QA work are in place.
- Reconcile and update stale product/ops docs in the same slices as final polish.

Exit criteria:

- public/admin surfaces feel intentional and trustworthy across all coils
- polish work is done on top of validated flows, not as a substitute for validation

Dependencies:

- Workstreams 1 through 6

## Quick Wins Vs Foundational Work

### Quick Wins

- clear `pnpm lint` drift
- apply missing migrations locally and in staging
- refresh stale workflow docs
- finish non-event index creation/reindex verification
- add explicit migration health warnings for privacy/compliance routes

### Foundational Work

- realistic multi-coil fixture strategy
- e2e and accessibility coverage
- source-ops operational backlog reduction
- production monitoring/alerting/recovery maturity

## Must Happen Before Soft Launch

- clean baseline: check/test/lint/build all green
- migration parity proven in launch environments
- all public search scopes indexed or intentionally excluded with truthful UX
- source review backlog reduced to a sustainable level
- browser coverage for core browse, auth, submission, and moderation flows
- automated accessibility checks in CI

## Must Happen Before Public Launch

- realistic content in all launch coils
- source activation policy documented and enforced
- production monitoring, alerting, and backup/restore drills in place
- final UX polish pass across public and admin surfaces
- documentation drift resolved for product, ops, and moderation workflows

## Post-Launch Follow-Up

- deeper performance follow-up on large server/client chunks, especially auth
- further admin throughput and moderation ergonomics improvements
- expansion of source coverage after current queue health is stable
- dormant feature decisions for notifications, follows, bookmarks, and related account capabilities

## Suggested Milestones / Phases

### Phase 1: Stabilize And Sync

- clean lint baseline
- apply/verify migrations
- remove schema drift surprises

### Phase 2: Search And Data Reality

- complete indexing
- seed real multi-coil content
- validate search/discovery truthfulness

### Phase 3: Source Ops And Moderation

- reduce queue backlog
- harden review workflows
- document operational rules

### Phase 4: QA And Accessibility

- add browser/e2e coverage
- add automated a11y checks
- verify launch-critical flows on desktop and mobile

### Phase 5: Production Ops

- metrics, alerts, backups, recovery drills
- deployment/env hardening

### Phase 6: Final Launch Polish

- refine public/admin UX
- close documentation drift
- run a final go/no-go audit

## Dependencies And Sequencing

- Migration parity comes before trusting QA outcomes.
- Realistic seed data comes before credible cross-coil UX judgments.
- Search validation depends on both index completeness and realistic content.
- Admin polish should follow backlog reduction and workflow verification, not precede them.
- Production launch decisions should wait until both browser QA and operational monitoring exist.

## Risks And Tradeoffs

- If the team prioritizes visual polish before migration parity and QA, the platform may look ready while remaining operationally brittle.
- If the team enables more sources before review throughput is sustainable, moderation load will outpace capacity quickly.
- If launch proceeds with empty non-event coils, the product may appear broader on paper than in user experience, which hurts trust.
- If the team treats passing `check`/`test`/`build` as sufficient, migration-state and browser-level failures will remain under-detected.
