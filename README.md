# Knowledge Basket

Knowledge Basket is a SvelteKit product that brings together five public "coils":

- Events
- Funding
- Red Pages
- Jobs
- Toolbox

This is an in-progress product, not a greenfield starter. The codebase already includes meaningful public and admin implementation work, but only Events is currently close to full end-to-end operations. Funding, Red Pages, Jobs, and Toolbox should be treated as curated beta surfaces until shared submission, moderation, and admin tooling is completed.

## Source Of Truth

The code is canonical.

- Product behavior: `src/routes/**`
- Shared UI and interaction patterns: `src/lib/components/**`
- Server/data behavior: `src/lib/server/**`
- Theme tokens: `src/lib/theme/theme.css`

Docs in `docs/` are there to explain the current implementation and intended direction, but if a doc conflicts with route or server code, trust the code first and update the doc.

Use [docs/README.md](/Users/hayden/Desktop/kb/site/docs/README.md) as the map of where product, review, and planning docs currently live.

## Current State

- Public surfaces exist for all five coils.
- Public organization and venue pages exist.
- Admin now has stronger operational tooling for Events, Sources, Organizations, Venues, and Search.
- Source review, source health, candidate publishing, source-to-live merge history, and search reindexing now exist under `/admin/sources` and `/admin/settings/search`.
- Organization and venue admin now support aliases, duplicate suggestions, and merge workflows.
- Public `/events` now reads reviewed database content instead of merging a hardcoded runtime iCal feed.
- Public submissions are live for Events, Funding, Red Pages, Jobs, and Toolbox. Each submit flow writes a pending record for moderation.
- Global search is available, but multi-coil results depend on Meilisearch indexing. Without Meilisearch, fallback search is events-only.

## Local Development

From the `site/` directory:

```sh
pnpm install
pnpm dev
```

Open the app at [http://localhost:5173](http://localhost:5173).

## Local Services

From the repo root, start supporting services:

```sh
docker compose up -d
```

Common local dependencies:

- Postgres
- Meilisearch
- MinIO
- Redis

If you only need search locally, you can start just Meilisearch:

```sh
cd ..
docker compose up -d meilisearch
curl http://localhost:7700/health
```

Set `DATABASE_URL` in `site/.env`. See `.env.example` for the rest of the optional configuration.

## Database And Search

Useful scripts:

```sh
pnpm db:push
pnpm db:generate
pnpm db:migrate
pnpm db:studio
pnpm db:seed
pnpm db:seed:events
pnpm db:seed:coils
pnpm db:seed:sources
pnpm auth:schema
```

Notes:

- `pnpm db:seed` now runs the launch-data seed: events, non-event coils, and source registry seeds when the shared source seed file is available.
- `pnpm db:seed:events` runs the legacy events CSV seed only.
- `pnpm db:seed:coils` seeds Funding, Red Pages, Jobs, and Toolbox sample content.
- `pnpm db:seed:sources` seeds the source registry from shared `seed-sources.json` data when that file is present in the linked data repo.
- Search indexing uses Meilisearch when configured.
- Health status for DB, search, object storage, and source ops is exposed at `GET /api/health`.
- After applying DB migrations, restart the dev server so cached schema-health warnings clear.
- Recent additive migrations include source-ops snapshot support and aliases on organizations/venues.
- `POST /api/reindex` is protected in production. Use an admin/moderator session or send `x-reindex-secret` matching `REINDEX_SECRET`.
- The admin UI also exposes search reindexing at `/admin/settings/search`.
- `sitemap.xml`, `robots.txt`, and `manifest.webmanifest` are generated as part of the app surface.

## Quality Status

As of the current takeover baseline:

- `pnpm check` should pass.
- `pnpm lint` should pass.
- `pnpm test` runs the smoke and handler tests.
- `pnpm build` should pass and now targets the Node adapter.

## Key Docs

- `docs/README.md`
- `docs/TAKEOVER_AUDIT.md`
- `docs/ADR-001-source-of-truth.md`
- `docs/ADR-002-curated-beta-coils.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/PERFORMANCE.md`
- `docs/ops-content-workflows.md`
- `docs/SOURCE_OPS_HANDOFF.md`

## Short-Term Direction

The current implementation direction is:

1. Stabilize the existing product.
2. Preserve the public left-rail browse/filter layout and improve its ergonomics, responsiveness, and product polish.
3. Keep shadcn-svelte as the primary UI foundation, but preserve the current public header look and feel rather than redesigning it while swapping primitives underneath.
4. Standardize public/admin patterns instead of rewriting from scratch.
5. Build out non-event moderation and admin tooling to match the now-live public submission flows.

### Public shell notes

- Desktop main navigation should keep the current KB header styling and information density.
- Under the hood, desktop primary nav can use shadcn-svelte `navigation-menu` patterns, but it should not read like a visual redesign.
- Mobile main navigation should use a sidebar-style overlay, not a filter drawer or generic sheet pattern.
- Public browse filters should stay in the left rail on desktop.
- On mobile, browse search should stay exposed in-page while deeper result filters open from a bottom drawer.
