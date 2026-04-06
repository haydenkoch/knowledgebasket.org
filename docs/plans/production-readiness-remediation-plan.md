# Knowledge Basket Production-Readiness Remediation Plan

Date: 2026-04-05  
Scope: remediation roadmap based on the current workspace audit in `docs/reviews/full-site-and-system-audit.md`

## Status Update

This roadmap is no longer purely aspirational. A substantial blocker-clearing pass has already been implemented in the current workspace.

Completed or materially advanced:

- workspace stabilization and quality gates
- shared admin authz enforcement
- rate limiting for auth, submissions, search, and privileged operations
- truthful search readiness and database fallback behavior
- upload migration to S3-compatible object storage
- health endpoint, structured server logging, and production runbook scaffolding
- launch-data seed entrypoints for events, non-event coils, and source registry data
- cross-coil organization and venue hub pages

Remaining roadmap emphasis:

- source-ops operational maturity and moderation ergonomics
- more complete end-to-end/accessibility/import/search regression coverage
- final public/admin polish passes
- performance follow-up, especially large build chunks

## Goal

Move Knowledge Basket from an internal alpha / tightly managed beta state to a launch-ready platform without rewriting the stack or abandoning the current left-rail browse direction.

## Guiding Principles

- Fix trust and safety issues before polish work.
- Treat the **current workspace** as the baseline; stabilize active WIP before layering more features on top.
- Preserve the public **left-rail** browse/filter pattern and improve it. Do not reopen the horizontal-filter-bar debate.
- Use Events as the strongest implementation baseline, but do not assume its current UX is the finish line.
- Prioritize launch readiness over architectural perfection.

## Recommended Order Of Operations

1. Stabilize the current workspace.
2. Close security and authorization gaps.
3. Make search truthful and fully indexed.
4. Operationalize source ingestion and moderation.
5. Add QA, observability, and launch ops foundations.
6. Raise product polish across the public and admin surfaces.
7. Clean up documentation drift and final launch runbooks.

## Workstreams

### Workstream 1: Workspace Stabilization

Priority: **Immediate**

Objective: restore a reliable engineering baseline before broader launch work.

Tasks:

- Fix current `pnpm lint` failures.
- Fix current `pnpm test` failure in search mode reporting.
- Resolve the `MobilePeekPanel` accessibility warning.
- Re-run `pnpm check`, `pnpm lint`, `pnpm test`, and `pnpm build` until clean.
- Freeze core homepage/search/sidebar WIP behind a passing CI baseline before adding more UX churn.

Exit criteria:

- all local quality gates pass cleanly
- current public-shell changes are no longer in a half-validated state

Why first:

- Everything else becomes noisier and riskier if the workspace baseline stays unstable.

### Workstream 2: Security, Authz, And Abuse Hardening

Priority: **Immediate**

Objective: eliminate launch-blocking trust failures.

Tasks:

- Introduce a shared server-side admin authorization helper and apply it to:
  - all `/admin/**` actions
  - source review actions
  - bulk approve/reject/delete flows
  - operational admin endpoints where appropriate
- Stop relying on `/admin/+layout.server.ts` as the primary security boundary.
- Add explicit role checks for moderator/admin actions everywhere.
- Add rate limiting for:
  - login
  - forgot-password
  - public submission flows
  - search API
  - source-ops and reindex operational endpoints
- Audit same-origin HTML serving under `/resources/*` and choose one:
  - disallow HTML entirely
  - force download
  - isolate untrusted content to a safer origin/domain

Exit criteria:

- no admin or moderation action can be reached without explicit server-side authorization
- abuse-sensitive routes have enforceable throttling
- content-serving policy for HTML resources is explicit and safe

Dependencies:

- none

### Workstream 3: Search Truthfulness And Index Readiness

Priority: **Immediate**

Objective: make discovery behavior honest, predictable, and operable.

Tasks:

- Replace the current “Meilisearch health = search ready” model with a readiness model that tracks:
  - service unavailable
  - service reachable but indexes missing
  - service reachable but indexes stale/empty
  - fully ready
- Unify `/api/search` and `/search` fallback logic so API and page agree.
- Treat missing-index errors as operator-visible failures, not silent empty results.
- Ensure all five coils have:
  - index creation
  - reindex routines
  - health/reporting visibility
- Update tests to cover:
  - Meilisearch down
  - Meilisearch up but partial indexes
  - Meilisearch fully ready
- Improve global search UX with at least:
  - coil-level narrowing
  - better empty/error messaging
  - keyboard-accessible suggestion behavior

Exit criteria:

- search behavior is truthful in every readiness mode
- all intended public coils are indexed and report healthy
- failing search infrastructure is visible to operators and understandable to users

Dependencies:

- Workstream 1

### Workstream 4: Source Ops Operationalization

Priority: **High**

Objective: turn the ingestion system from “promising” into “launch-usable.”

Tasks:

- Reduce the pending-review backlog to a manageable steady-state level.
- Define source lifecycle policy:
  - discovered
  - active
  - degraded
  - deprecated
  - disabled
- Establish acceptance criteria for enabling a source in production:
  - extraction quality
  - attribution correctness
  - URL-role correctness
  - image handling
  - dedupe behavior
  - retryability
- Remove or clearly retire overlapping legacy import paths where source ops should be canonical.
- Add runbook coverage for:
  - reruns
  - retries
  - stuck batches
  - bad-source rollback
  - index resync after publish
- Decompose the largest source-ops files after correctness is stable.

Exit criteria:

- source review queue is operationally sustainable
- source activation is intentional, measured, and documented
- import failures are diagnosable and recoverable

Dependencies:

- Workstream 2 for moderation safety
- Workstream 3 for search/index sync after publish

### Workstream 5: QA, Fixtures, And Verification

Priority: **High**

Objective: create enough confidence to change and launch the platform safely.

Tasks:

- Add realistic seed/fixture coverage for funding, red pages, jobs, toolbox, organizations, and venues.
- Add end-to-end tests for:
  - browse and filter
  - detail pages
  - public submissions
  - auth flows
  - admin moderation
  - source review publish/reject flows
  - search fallback modes
- Add automated accessibility checks to CI.
- Add regression tests for server-side authorization boundaries.
- Add search/index sync tests covering publish, unpublish, reject, and delete paths.

Exit criteria:

- the team can verify the full platform locally and in CI using realistic non-event data
- launch-critical flows have end-to-end coverage

Dependencies:

- Workstreams 1 through 4

### Workstream 6: Observability, Ops, And Deployment Readiness

Priority: **High**

Objective: make the platform supportable in production.

Tasks:

- Add production error tracking.
- Add structured logging for:
  - auth failures
  - moderation actions
  - source runs
  - search failures
  - upload failures
- Add core health endpoints / dashboards for:
  - database
  - Meilisearch
  - source run status
  - queue backlog
  - reindex status
- Define backup / restore procedures for:
  - Postgres
  - object storage / uploads
  - search reindex recovery
- Align upload architecture with MinIO / S3-compatible storage, or explicitly change the documented architecture if local-disk storage is intentionally staying.
- Document cron / scheduler requirements for source runs and maintenance tasks.

Exit criteria:

- the platform can be monitored, restored, and operated without tribal knowledge
- uploads and media persistence are compatible with real deployment expectations

Dependencies:

- Workstreams 2 through 5

### Workstream 7: Public Product And Admin Polish

Priority: **Medium**

Objective: lift the platform from “functional” to “credible and trustworthy.”

Tasks:

- Refine the shared left-rail browse system:
  - spacing
  - hierarchy
  - mobile containment
  - sticky behavior
  - filter readability
  - clearer empty/loading/error states
- Strengthen non-event browse/detail pages so they do not feel like thin clones of Events.
- Improve global search UX and keyboard access.
- Enrich organization and venue pages with cross-coil content relationships.
- Tighten admin ergonomics:
  - unified moderation concepts
  - clearer bulk actions
  - better information density
  - consistent review affordances across inbox and entity admin pages

Exit criteria:

- the product feels intentionally designed, not scaffolded
- moderators can work efficiently without switching mental models constantly

Dependencies:

- Workstreams 1 through 6

### Workstream 8: Documentation And Launch Governance

Priority: **Medium**

Objective: remove ambiguity before soft launch and public launch.

Tasks:

- Remove stale references that imply a horizontal filter-bar pivot.
- Update search/admin docs to describe partial-index failure modes accurately.
- Document canonical launch decisions:
  - left-rail browse direction
  - storage architecture
  - source-ops canonical workflow
  - moderation rules
  - operational ownership
- Add launch checklists and rollback steps.
- Update README and ops docs so they match actual implementation and deployment expectations.

Exit criteria:

- docs stop fighting the codebase
- launch behavior and operational responsibilities are explicit

Dependencies:

- completion of earlier workstreams so docs describe reality

## Quick Wins Vs Foundational Work

### Quick Wins

- Fix failing lint/test/a11y issues in the current workspace.
- Add explicit server-side guards to all admin actions.
- Make `/api/search` and `/search` agree on fallback behavior.
- Surface partial-index warnings in admin search tooling.
- Remove stale horizontal-filter references in historical plan docs.

### Foundational Work

- Introduce shared authz/rate-limit infrastructure.
- Build full search-readiness and index-parity handling.
- Expand fixtures and end-to-end coverage across all coils.
- Add observability, backup, and operational runbooks.
- Migrate uploads to S3-compatible storage or formally redefine the storage model.

## Milestones And Sequencing

### Phase 0: Stabilize The Workspace

- Restore quality gates.
- Freeze current homepage/search/sidebar refactor into a testable baseline.

### Phase 1: Launch Blockers

- Close admin authorization gaps.
- Add abuse protection to critical endpoints.
- Fix search truthfulness and index readiness behavior.

### Phase 2: Operational Foundations

- Operationalize source review and source activation.
- Add observability, health reporting, and recovery procedures.
- Align upload/storage architecture.

### Phase 3: Whole-Platform Verification

- Add non-event fixtures.
- Add end-to-end and accessibility testing.
- Validate public and admin flows coil by coil.

### Phase 4: Product Finish

- Polish public browse/detail/search UX.
- Improve cross-coil organization/venue presentation.
- Tighten moderator ergonomics.

### Phase 5: Launch Prep

- Clean documentation drift.
- Run soft-launch checklist.
- Complete rollback/runbook coverage.

## What Must Happen Before Soft Launch

- All current quality gates pass.
- Admin action authorization is fixed everywhere.
- Search readiness is truthful and all intended launch coils are indexed.
- Rate limiting exists on auth, submit, search, and operational endpoints.
- Source review backlog is reduced and operating procedures are defined.
- Error tracking and structured logging are active.
- Non-event coils have realistic seed data and validation coverage.
- Left-rail public browsing is stable on desktop and mobile.

## What Must Happen Before Public Launch

- End-to-end coverage exists for all launch-critical flows.
- Accessibility testing is part of CI and key issues are closed.
- Backup / restore procedures are documented and tested.
- Upload/storage architecture is production-compatible.
- Search, import, and moderation health are visible in operator tooling.
- Documentation and runbooks reflect actual behavior.
- Public detail pages and submit flows feel trustworthy and polished across all launch coils.

## What Can Wait Until Post-Launch

- Deep decomposition of every oversized route/server module after the platform is stable.
- More advanced search ranking and personalization.
- Richer editorial enhancements beyond the core browse/detail/search polish pass.
- Broader analytics and experimentation layers.

## Key Risks And Tradeoffs

- Fixing security and search truthfulness first will delay visible polish, but not doing so would make polish irrelevant.
- Source ops decomposition should follow correctness and operational stabilization, not precede it.
- If storage migration to S3-compatible uploads is too large for the first launch window, the team must explicitly narrow launch scope and document the tradeoff rather than silently carrying local-disk assumptions forward.
- If non-event coils cannot be meaningfully seeded, indexed, and validated in time, a narrower staged launch should be considered instead of pretending the full platform is equally ready.

## Recommended Launch Strategy

Preferred strategy:

- treat the next release as a **hardening milestone**, not a public launch
- do a **soft launch only after** security, search truthfulness, source-ops operations, and QA foundations are in place
- do a **public launch only after** the whole-platform verification and ops-readiness milestones are complete

This path preserves the current product direction, respects the real progress already made, and focuses effort on the issues that would most damage user trust if left unresolved.
