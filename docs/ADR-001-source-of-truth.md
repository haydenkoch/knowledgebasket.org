# ADR-001: Current Implementation Is The Source Of Truth

## Status

Accepted

## Context

Knowledge Basket has drift between planning docs, older handoff text, and the current implementation. The codebase already contains meaningful work across public routes, admin tooling, data models, and shared UI that older docs did not accurately describe.

## Decision

Treat the following as canonical:

- route/load/action code under `src/routes/**`
- server modules under `src/lib/server/**`
- schema definitions under `src/lib/server/db/schema/**`
- shared theme tokens under `src/lib/theme/theme.css`
- the root project spec at `/Users/hayden/Desktop/kb/spec.md` only when it matches implementation truth
- design-direction docs when deciding what should happen next, not what already exists

Docs are supporting artifacts. If a doc conflicts with the implementation, the implementation wins for current-state behavior until the doc is updated.

## Consequences

- Product planning must be grounded in repo inspection, not handoff assumptions.
- Docs should be updated as part of implementation slices instead of in a later cleanup pass.
- "Complete" in a plan or doc does not count unless the route and server behavior support the claim.
- Design guidance should not be overwritten just because a current implementation drifted from it.
- The active documentation map must be kept understandable even if the repo uses a flatter docs structure than older planning assumptions.
