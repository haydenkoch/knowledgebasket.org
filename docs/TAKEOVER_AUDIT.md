# Knowledge Basket Takeover Audit

## Product Status

- Public list/detail routes exist for Events, Funding, Red Pages, Jobs, and Toolbox.
- Public organization and venue pages exist.
- The admin shell and settings surfaces exist.
- Events has meaningful operational tooling: moderation, editing, lists, import, duplicate review, branding, search settings, and public submission.
- Non-event coils are visibly present but do not yet have equivalent operational support.

## Implemented Vs Partial

### Implemented

- Events list, cards, calendar, and detail views
- Event admin review/edit flows
- Event list curation
- iCal import
- duplicate merge tools
- organization and venue public pages
- branding uploads
- search settings page

### Partial

- global search
- taxonomy/settings management
- non-event public depth
- admin org/venue workflows
- submission experience consistency

### Missing or intentionally deferred

- full non-event submission/review parity
- robust automated testing
- finalized deployment adapter
- launch-ready metadata and release process

## Key Mismatches

- The repo previously described non-event coils as stubbed, but they are already implemented as public surfaces.
- The header linked to `/about` before a real route existed.
- Global search UI and API had drifted into incompatible payload contracts.
- `/events?q=` existed as a navigation pattern but was not consumed by the events page.
- Non-event submission pages look live, but their actions still return `503`.

## Architecture Reality

- Route code is the real product contract.
- Shared server logic exists for more domains than the UI currently exposes.
- The codebase mixes shadcn primitives, Tailwind utilities, scoped CSS, and KB-specific classes.
- Several important flows still depend on large route files that should be decomposed over time.

## Immediate Priorities

1. Keep Phase 1 stabilization green.
2. Preserve and refine the events filter bar instead of replacing it.
3. Standardize shared public/admin patterns.
4. Move Funding and Jobs forward first for non-event operational parity.
