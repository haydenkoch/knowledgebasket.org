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

## Current State

- Public surfaces exist for all five coils.
- Public organization and venue pages exist.
- Admin tools are strongest for Events: review/edit flows, event lists, iCal import, duplicate merge, branding, and search settings.
- Event submission is live and writes pending records.
- Non-event submit pages currently exist as UI but still return `503` from their server actions.
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

Set `DATABASE_URL` in `site/.env`. See `.env.example` for the rest of the optional configuration.

## Database And Search

Useful scripts:

```sh
pnpm db:push
pnpm db:generate
pnpm db:migrate
pnpm db:studio
pnpm db:seed
pnpm auth:schema
```

Notes:

- `pnpm db:seed` currently seeds events from CSV.
- Search indexing uses Meilisearch when configured.
- `POST /api/reindex` is protected in production. Use an admin/moderator session or send `x-reindex-secret` matching `REINDEX_SECRET`.
- The admin UI also exposes search reindexing at `/admin/settings/search`.

## Quality Status

As of the current takeover baseline:

- `pnpm check` should pass.
- `pnpm build` should pass, though bundle-size and deployment follow-up work remains.
- `pnpm lint` still reflects broad formatting drift in the repo and should be handled intentionally rather than piecemeal.
- There is no established automated test suite yet.

## Key Docs

- `docs/TAKEOVER_AUDIT.md`
- `docs/ADR-001-source-of-truth.md`
- `docs/ADR-002-curated-beta-coils.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/PERFORMANCE.md`
- `docs/ops-content-workflows.md`

## Short-Term Direction

The current implementation direction is:

1. Stabilize the existing product.
2. Preserve the current events filter-bar interaction model.
3. Keep shadcn-svelte as the primary UI foundation.
4. Standardize public/admin patterns instead of rewriting from scratch.
5. Bring Funding and Jobs to operational parity before pushing the other non-event coils further.
