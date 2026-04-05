# Knowledge Basket Codebase Remediation Plan

## Phase 1: Critical correctness and product-truth fixes

### Objective

Restore trust in the repo by fixing the systems that currently make the codebase hard to rely on: source-ops type health, documentation truth, and search/index contract clarity.

### Ordered workstreams

1. Source-ops correctness and type health
2. Product-truth and doc/spec alignment
3. Search/index consistency and truthful reporting
4. Restore a clean quality baseline in CI

### Concrete target areas

- `src/lib/server/import-candidates.ts`
- `src/lib/server/ingestion/detail-enrichment.ts`
- shared source-ops evidence/provenance/image types under `src/lib/server/ingestion/**`
- `/Users/hayden/Desktop/kb/spec.md`
- `site/docs/` docs that currently describe the product
- `src/lib/server/meilisearch.ts`
- `src/lib/server/search-ops.ts`
- `src/routes/api/search/+server.ts`
- `src/routes/search/+page.server.ts`
- `src/routes/api/reindex/+server.ts`
- CI baseline: `pnpm check`, `pnpm lint`, `pnpm test`, `pnpm build`

### Dependencies and sequencing

- Start with source-ops type health before any search or docs rewrite, because those failures are current correctness blockers.
- Update docs/spec immediately after the code truth is confirmed, so the team stops making decisions from stale documents.
- Clean up search/index behavior only after current search truth is documented and verified.
- Restore clean `check` and `lint` at the end of the phase so the repo has a trustworthy baseline again.

### Expected payoff

- The codebase becomes trustworthy enough to change safely.
- Source-ops work stops sitting on a broken type foundation.
- The team gets one coherent narrative about what the product actually is.
- Search stops overreporting health and confusing operators.

### What not to touch yet

- Do not redesign public coil layouts yet.
- Do not add new source adapters or import complexity yet.
- Do not activate dormant schema features like bookmarks/follows/notifications yet.

## Phase 2: Missing operational foundations and structural cleanup

### Objective

Bring operations up to the level of the public product by closing the biggest mismatch in the repo: non-event coils have meaningful public/server support but weak admin support.

### Ordered workstreams

1. Dedicated non-event admin route foundations
2. Moderation model cleanup
3. Source-review and admin structure decomposition
4. Truthful classification of dormant features and abstractions

### Concrete target areas

- new admin route trees for:
  - funding
  - jobs
  - red-pages
  - toolbox
- existing moderation surface:
  - `src/routes/admin/inbox/+page.server.ts`
  - `src/routes/admin/inbox/+page.svelte`
- source-admin complexity:
  - `src/routes/admin/sources/[id]/+page.svelte`
  - `src/routes/admin/sources/health/+page.svelte`
  - `src/routes/admin/sources/review/+page.svelte`
  - `src/routes/admin/sources/review/[id]/+page.svelte`
  - `src/lib/server/import-candidates.ts`
- dormant foundations to classify and document:
  - `src/lib/server/db/schema/content.ts`
  - `src/lib/server/jobs.ts` interest support
  - any other schema/service features that exist without routed product support

### Dependencies and sequencing

- This phase depends on Phase 1 being complete. Do not build more admin surface on top of broken source-ops types or stale product truth.
- Stand up minimum dedicated CRUD/edit routes for non-event coils before redesigning moderation UX in detail.
- Once non-event CRUD exists, shrink the inbox back toward triage and queue management instead of making it the only operating surface.
- Decompose source-review UI only after correctness is restored, otherwise the team will be refactoring unstable behavior.

### Expected payoff

- Public product scope will have matching operator support.
- Moderation will be more efficient and less overloaded into a single inbox.
- Source-admin complexity will become easier to reason about and safer to maintain.
- The repo will stop implying features are "present" just because schema exists.

### What not to touch yet

- Do not do a whole-design-system rewrite.
- Do not remove shared abstractions like `KbSidebar` or `KbTwoColumnLayout` before replacement direction is locked.
- Do not expand personalization/social features yet.

## Phase 3: UX/admin/product polish

### Objective

Realign the user experience with the actual design direction: reduce scaffold feel, improve accessibility, and stop repeating the wrong layout assumptions across coils.

### Ordered workstreams

1. Events filter-direction realignment
2. Non-event coil layout and hierarchy cleanup
3. Global search interaction/accessibility upgrade
4. Admin usability and workflow polish
5. Responsive, overflow, and focus-state cleanup

### Concrete target areas

- events experience:
  - `src/routes/events/+page.svelte`
  - `src/lib/components/organisms/EventsSidebar.svelte`
  - `src/lib/components/organisms/KbSidebar.svelte`
  - `src/lib/components/reference/*`
- generic non-event layout:
  - `src/lib/components/organisms/KbTwoColumnLayout.svelte`
  - `src/routes/funding/+page.svelte`
  - `src/routes/jobs/+page.svelte`
  - `src/routes/red-pages/+page.svelte`
  - `src/routes/toolbox/+page.svelte`
- global search:
  - `src/lib/components/organisms/KbSearch.svelte`
  - `src/routes/search/+page.svelte`
- public and admin hover/focus/link styling:
  - `src/routes/layout.css`
  - `src/lib/components/organisms/KbHeader.svelte`
  - relevant public/admin list and card components

### Dependencies and sequencing

- Only begin this phase once Phase 2 gives non-event coils real operational support.
- Start with Events, because it is currently the pattern donor and currently the most directionally wrong relative to the filter-bar guidance.
- Then redesign non-event layouts using the design direction as the baseline rather than copying Events literally.
- Upgrade global search accessibility before broader public polish so one primary navigation surface stops dragging product quality down.

### Expected payoff

- The public product will feel more intentional and less scaffolded.
- The app will align better with stated design direction.
- Accessibility and responsiveness quality will move closer to launch-grade expectations.
- Admin flows will become less dense and more purpose-built.

### What not to touch yet

- Do not add large new features while major layout direction is still being reset.
- Do not over-abstract new UI patterns too early.
- Do not turn every coil into the same visual shell again.

## Phase 4: Future enhancements

### Objective

After correctness, operations, and core UX are stable, activate the dormant capability already implied by the schema and platform, and selectively deepen the product where it will actually matter.

### Ordered workstreams

1. Decide which dormant features are real roadmap items versus deliberate non-goals
2. Expand mature cross-cutting systems only after they have clear owners
3. Optimize bundle size and route performance after the UI structure stabilizes
4. Add deeper user-facing product features where they fit the roadmap

### Concrete target areas

- dormant or partial features:
  - bookmarks
  - org follows
  - notifications
  - content lists
  - job interests
- storage alignment:
  - MinIO/S3-compatible upload model
- performance work:
  - large client chunks
  - heavy route decomposition
  - search bundle behavior
  - source-admin page weight
- future coil depth:
  - jobs engagement features
  - red pages trust/verification workflows
  - toolbox content modes and curation
  - events improvements that do not conflict with design direction

### Dependencies and sequencing

- Do not activate dormant features until the team explicitly decides they are in scope.
- Do not migrate storage or add personalization while basic admin and moderation foundations are still being repaired.
- Performance optimization should follow structural cleanup, otherwise the team will optimize the wrong shapes.

### Expected payoff

- The codebase can start turning latent capability into intentional product value.
- Feature expansion will happen on top of stable truth, stable operations, and stronger UX foundations.
- Platform work like storage alignment and performance tuning will deliver more durable benefit once the product shape settles.

### What not to touch yet

- Do not enable every dormant schema feature just because it already exists.
- Do not treat future enhancements as a reason to postpone Phase 1 or Phase 2.
- Do not use this phase as cover for random churn.

## Recommended sequencing summary

1. Fix source-ops correctness and type health.
2. Repair product truth in docs/specs.
3. Make search/index behavior coherent and trustworthy.
4. Build dedicated non-event admin and moderation foundations.
5. Decompose large operational/admin files where needed.
6. Realign UX around the intended product direction, especially replacing left-rail drift.
7. Only then deepen feature scope and dormant platform ambitions.

## Things to avoid touching too early

- Broad visual redesign before operational foundations are fixed
- More generalized coil abstractions before UX direction is settled
- Expansion of source-ops capability before the current pipeline is type-safe
- New user-facing personalization/social features before basic content operations are mature
- Storage migration before the team decides the deployment and file-ownership model

## Expected end state

If the phases are executed in order, Knowledge Basket should end up as:

- a truthful codebase whose docs match reality
- an operationally credible multi-coil product rather than an Events product with adjacent beta surfaces
- a product whose search, source ops, and moderation systems are trustworthy
- a UI system guided by intentional product direction instead of repeated scaffold reuse
- a repo that is easier to evolve without random churn
