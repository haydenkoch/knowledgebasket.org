# Documentation Map

Knowledge Basket does not currently use a deep `docs/specs/**` or `docs/tasks/**` hierarchy. The active documentation layout is flatter and split between the repo root and the app repo.

## Current source-of-truth model

- Current implementation is authoritative for present-state behavior.
- Design-direction docs are authoritative for future-facing UX and product recommendations.
- Stale docs are not authoritative and should be updated when they conflict with code.
- Current browse/filter direction is to keep and refine the public left sidebar pattern, not replace it with a horizontal filter bar.
- Current shell direction is:
  - preserve the public header look and feel
  - use a sidebar-style mobile main nav
  - use a bottom drawer for mobile result filters
  - keep search exposed outside the mobile filter drawer where practical

For implementation truth, use:

- `src/routes/**`
- `src/lib/server/**`
- `src/lib/server/db/schema/**`

## Documentation layout

- `/Users/hayden/Desktop/kb/spec.md`
  - broader project spec and current product framing
- `docs/ADR-001-source-of-truth.md`
  - source-of-truth rules for current-state behavior
- `docs/ADR-002-curated-beta-coils.md`
  - product framing for non-event coils as curated beta surfaces
- `docs/DESIGN_SYSTEM.md`
  - design direction and UI guidance
- `docs/PERFORMANCE.md`
  - performance notes and follow-up work
- `docs/ANALYTICS_AND_MARKETING.md`
  - PostHog capture contract, event inventory, and marketing-email template usage
- `docs/SOURCE_OPS_HANDOFF.md`
  - source-ops and operational handoff context
- `docs/PRODUCTION_RUNBOOK.md`
  - launch operations, health checks, seed flows, scheduler, and backup/recovery notes
- `docs/ops-content-workflows.md`
  - moderation and operations workflow notes
- `docs/TAKEOVER_AUDIT.md`
  - earlier takeover context
- `docs/reviews/`
  - formal audit and review artifacts
- `docs/plans/`
  - remediation plans and implementation plans

## Working rule

If a doc conflicts with route, server, or schema behavior:

1. trust the code for current-state behavior
2. identify whether the doc or the code is directionally wrong
3. update the doc in the same implementation slice whenever practical
