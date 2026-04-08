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
nvm use
pnpm install
cp .env.local.example .env
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

Use `.env.local.example` as the local development template and copy it to `site/.env`.
Use `.env.example` as the production or staging checklist for your hosting environment variables.
Use `.env.staging.example` for a staging deploy baseline and `.env.ci.example` for CI/app-test boot.

## Secrets Management

The repo now treats environment management as one versioned contract:

- Keep the templates in git:
  - `.env.local.example`
  - `.env.staging.example`
  - `.env.example`
  - `.env.ci.example`
- Keep real values in your provider secret store, never in git.
- Prefer `*_FILE` for mounted secrets when your platform supports it.
  - Example: `BETTER_AUTH_SECRET_FILE=/run/secrets/better_auth_secret`
- Set `KB_ENVIRONMENT` explicitly in staging, production, and CI.
  - `development`
  - `ci`
  - `staging`
  - `production`
- Validate before deploy or before running CI:

```sh
pnpm secrets:check
pnpm secrets:check:staging
pnpm secrets:check:production
pnpm secrets:check:ci
```

Recommended environment split:

- Local development:
  - Use local Postgres/MinIO/Meilisearch values from `.env.local.example`
  - Keep OAuth, Sentry, and SMTP optional unless you are actively testing them
- Staging:
  - Use the same variable names as production
  - Point them at staging-only DB, bucket, search host, SMTP sender, and OAuth callback origin
  - Generate separate `BETTER_AUTH_SECRET`, `REINDEX_SECRET`, and `SOURCE_OPS_SECRET`
- Production:
  - Same contract as staging, with production URLs and production-only secrets
- CI:
  - Only the boot-critical app values are required by default
  - Add search/object-storage vars only if the CI job actually exercises those services

The easiest way to keep environments in sync is to treat template changes like schema changes:

1. Update the example files in git whenever the app contract changes.
2. Run `pnpm secrets:check:<env>` locally or in CI.
3. Copy only the changed keys into Railway/GitHub Actions/your secret store.
4. Keep staging and production on the same key set, differing only by values.

Public placeholder/branding assets are now expected to already exist in MinIO, with
`PUBLIC_ASSET_BASE_URL` pointing at a public bucket root or CDN origin. `pnpm images:sync`
is a one-time migration tool for a checkout that still has the legacy `static/images` files;
steady-state environments should restore the bucket from snapshots or replication instead.

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

- `pnpm db:push` is for local development only. Do not use it in staging or production deploys.
- `pnpm db:seed` now runs the launch-data seed: events, non-event coils, and source registry seeds when the shared source seed file is available.
- `pnpm db:seed:events` runs the legacy events CSV seed only.
- `pnpm db:seed:coils` seeds Funding, Red Pages, Jobs, and Toolbox sample content.
- `pnpm db:seed:sources` seeds the source registry from shared `seed-sources.json` data when that file is present in the linked data repo.
- The committed migration chain is the required path for persistent environments, but fresh ephemeral databases in CI still bootstrap with `pnpm db:push --force` until the repo has a full historical baseline migration for all content tables.
- CI seeds only the curated in-repo coil fixtures with `pnpm db:seed:coils`; the broader `pnpm db:seed` launcher is for local launch-data restores and optional shared source seeds.
- Search indexing uses Meilisearch when configured.
- Health status for DB, search, object storage, and source ops is exposed at `GET /api/health`.
- After applying DB migrations, restart the dev server so cached schema-health warnings clear.
- Recent additive migrations include source-ops snapshot support and aliases on organizations/venues.
- `POST /api/reindex` is protected in production. Use an admin/moderator session or send `x-reindex-secret` matching `REINDEX_SECRET`.
- The admin UI also exposes search reindexing at `/admin/settings/search`.
- `sitemap.xml`, `robots.txt`, and `manifest.webmanifest` are generated as part of the app surface.
- `pnpm start` now runs `pnpm db:migrate` before booting the Node server so deploys apply committed migrations as part of startup on single-instance environments.

## Production Environment Contract

Launch environments should set, at minimum:

- Core runtime: `DATABASE_URL`, `BETTER_AUTH_SECRET`, and a public origin (`ORIGIN`, or `RAILWAY_PUBLIC_DOMAIN` while bootstrapping on Railway)
- Email/auth: `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, plus `SMTP_SECURE` or `SMTP_REQUIRE_TLS`
- Search: `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY`
- Object storage: `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`
- Public assets: `PUBLIC_ASSET_BASE_URL`
- Privileged ops: `REINDEX_SECRET`, `SOURCE_OPS_SECRET`

Recommended observability settings:

- `SENTRY_DSN` and/or `PUBLIC_SENTRY_DSN`
- `SENTRY_ENVIRONMENT`, `PUBLIC_SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`, `PUBLIC_SENTRY_RELEASE`
- `PUBLIC_POSTHOG_KEY` and optional `PUBLIC_POSTHOG_HOST`
- `LOG_LEVEL`
- `ERROR_WEBHOOK_URL`

In production, startup now validates this contract and fails fast on missing or clearly invalid required settings.
Staging uses the same contract and should set `KB_ENVIRONMENT=staging`.

## Railway Deployment

The app is already configured for Railway's Node deployment path:

- SvelteKit uses `@sveltejs/adapter-node`
- `railway.toml` sets the build command, runs `pnpm db:migrate` as a pre-deploy step, starts the app with `pnpm start:app`, and health-checks `GET /api/health`
- `pnpm start` is still available for non-Railway single-instance environments that want migrations on boot

Recommended Railway setup:

1. Create separate Railway `staging` and `production` environments for this `site/` service.
2. Add isolated services per environment for Postgres, Meilisearch, and any optional Redis/object-storage bindings. Do not share writable staging and production services.
3. Generate a Railway public domain for each environment.
4. Set `ORIGIN` to the correct environment URL. If you are using only the generated Railway domain, the app can fall back to `RAILWAY_PUBLIC_DOMAIN`, but explicit `ORIGIN` is still the safer default.
5. Add the rest of the required variables from the contract above, including environment-specific Sentry/PostHog keys and release metadata.
6. Keep staging protected/internal and use sanitized snapshot data there rather than a writable production copy.
7. Verify `GET /api/health`, auth flows, and `/sitemap.xml` before promoting `staging` to `main`.

Operational notes:

- Railway injects `PORT`; the Node adapter will bind to it automatically.
- Railway pre-deploys should run committed migrations only. Keep `pnpm db:push` for local iteration and use `pnpm db:deploy` / `pnpm db:migrate` for deploy environments.
- The generated `RAILWAY_PUBLIC_DOMAIN` is good enough for a first deploy, but switch `ORIGIN` to your custom domain before finalizing Google OAuth or canonical URLs.
- If you later split this repo into multiple Railway services, move the start command into each service's dashboard settings so the shared `railway.toml` does not force the same process everywhere.

## Safe Delivery Flow

Knowledge Basket now treats `main` as production-only and `staging` as the protected integration branch.

- Normal work flows through `feature/* -> staging -> main`.
- `main` and `staging` should both be protected from direct pushes.
- Release PRs from `staging` into `main` should use a Conventional Commit title such as `release: promote staging to production (2026.04.08.1)`.
- Emergency fixes branch from `main` as `hotfix/*`, merge into `main`, and then back-merge into `staging`.
- Staging should stay internal, use sanitized production-derived data, and send telemetry to staging-specific Sentry/PostHog destinations.

Use [docs/RELEASE_PROCESS.md](/Users/hayden/.claude-squad/worktrees/hayden/kb-safety-rollout/docs/RELEASE_PROCESS.md) and [docs/PRODUCTION_RUNBOOK.md](/Users/hayden/.claude-squad/worktrees/hayden/kb-safety-rollout/docs/PRODUCTION_RUNBOOK.md) as the operational source of truth for releases.

## Quality Status

As of the current takeover baseline:

- `pnpm check` should pass.
- `pnpm lint` should pass for the tracked app, config, script, and test files enforced by this repo.
- `pnpm test` runs the smoke and handler tests.
- `pnpm test:search:indexed` validates the Meilisearch-backed contract.
- `pnpm test:search:degraded` validates compatibility-mode search when Meilisearch is unavailable.
- `pnpm test:e2e` runs browser coverage plus axe checks for representative public, auth, account, and admin flows.
- `pnpm build` should pass and now targets the Node adapter.

## Key Docs

- `docs/README.md`
- `docs/TAKEOVER_AUDIT.md`
- `docs/ADR-001-source-of-truth.md`
- `docs/ADR-002-curated-beta-coils.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/PERFORMANCE.md`
- `docs/ANALYTICS_AND_MARKETING.md`
- `docs/RELEASE_PROCESS.md`
- `docs/PRODUCTION_RUNBOOK.md`
- `docs/ops-content-workflows.md`
- `docs/SOURCE_OPS_HANDOFF.md`

## Toolchain

Use the pinned local toolchain when contributing:

- Node `24.14.0` via `.nvmrc`
- pnpm `10.32.1` via `packageManager`

`pnpm install --frozen-lockfile`, `pnpm check`, `pnpm lint`, and `pnpm build` are the baseline local gates before opening a PR.

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
