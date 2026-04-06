# Production Runbook

This runbook is the current operational baseline for launching and maintaining Knowledge Basket.

## Environment baseline

- Required core services:
  - Postgres
  - SvelteKit app
- Pre-launch services:
  - Meilisearch
  - MinIO or another S3-compatible object store
- Optional but recommended:
  - `ERROR_WEBHOOK_URL` for forwarding structured server errors
  - `LOG_LEVEL` to tune structured stdout logging (`debug`, `info`, `warn`, `error`)

## Railway baseline

- `railway.toml` is the deployment source of truth for the web service:
  - build: `pnpm build`
  - pre-deploy: `pnpm db:migrate`
  - start: `pnpm start:app`
  - healthcheck: `GET /api/health`
- Generate a Railway public domain before first launch.
- Set `ORIGIN` explicitly once the final public URL is known.
- If `ORIGIN` is temporarily omitted, the app can fall back to `RAILWAY_PUBLIC_DOMAIN`, but treat that as a bootstrap convenience rather than the steady-state production setting.

## Health checks

- App/system health:
  - `GET /api/health`
  - Returns DB availability, search readiness, object-storage health, and source-ops queue counts
- Search status:
  - `/admin/settings/search`
  - `POST /api/reindex`
- Source ingestion status:
  - `/admin/sources/health`
  - `POST /api/source-ops/run-due`

## Seed and bootstrapping

- Full launch seed:
  - `pnpm db:seed`
- Events-only seed:
  - `pnpm db:seed:events`
- Non-event launch coils:
  - `pnpm db:seed:coils`
- Source registry seed:
  - `pnpm db:seed:sources`

After seeding published content:

1. Run `POST /api/reindex` or use `/admin/settings/search`.
2. Verify `GET /api/health` reports search as `ready` when Meilisearch is enabled.
3. Spot-check `/search`, `/events`, `/funding`, `/red-pages`, `/jobs`, and `/toolbox`.

## Migration parity

- Apply the latest Drizzle migrations before launch and after every deployment that adds schema changes.
- Verify `GET /api/health` reports schema checks as healthy for:
  - source ops
  - privacy request storage
  - account lifecycle tables
- If schema health is degraded:
  - do not treat the deploy as launch-ready
  - restore parity before enabling launch-critical workflows such as privacy request handling or account deletion

## Scheduler / cron requirements

- Source ingestion automation requires a recurring call to:
  - `POST /api/source-ops/run-due`
- Protect the endpoint with either:
  - a privileged authenticated session, or
  - `x-source-ops-secret` matching `SOURCE_OPS_SECRET`
- Recommended cadence:
  - every 15 minutes for production
  - every 60 minutes for low-volume staging environments

## Starter source activation

- Do not enable the full discovered source inventory at launch.
- Start with a small vetted set and expand only after operators can keep review volume healthy.
- Minimum activation bar for a source:
  - staged preview returns sane normalized records
  - duplicate rate is low enough that review stays manageable
  - fetches succeed without repeated auth, parse, or quota failures
  - at least one manual import has been reviewed end to end
  - the source has a clear owner who can quarantine or retry it when quality drops

Recommended launch habit:

1. Seed the starter sources.
2. Manually test each source in `/admin/sources/[id]`.
3. Enable only the sources that meet the activation bar.
4. Confirm `/admin/sources/health` stays readable after the first scheduled runs.

## Alert ownership

- Assign an owner for:
  - `GET /api/health` failures
  - `POST /api/reindex` failures or stuck index rebuilds
  - `POST /api/source-ops/run-due` failures and repeated degraded/broken sources
  - SMTP delivery failures and auth-email regressions
  - unhandled server exceptions reported through Sentry and/or `ERROR_WEBHOOK_URL`
- Keep one dashboard or saved query per area so on-call review is not dependent on admin UI memory alone.
- Before GA, verify each alert path reaches a human inbox or paging destination.

## Backups and recovery

- Postgres:
  - run regular logical dumps with `pg_dump`
  - test restore into staging before launch
- Object storage:
  - back up the MinIO bucket with bucket replication or scheduled sync
  - uploaded asset URLs are served through `/uploads/*`, so object keys are the recovery source of truth
- Search:
  - Meilisearch is rebuildable from the canonical Postgres data
  - recovery step is `POST /api/reindex` after DB restore

## Restore drill

Run one full restore drill in staging before launch and record the exact timestamps/results.

1. Restore the latest Postgres backup into staging.
2. Restore the object-storage bucket or sync a recent snapshot.
3. Boot the app with the staging production env contract.
4. Run `POST /api/reindex`.
5. Verify `GET /api/health` is healthy.
6. Spot-check `/search`, `/events`, `/account`, and a representative uploaded asset.
7. Trigger `POST /api/source-ops/run-due` once and confirm the scheduler path still works after restore.

## Incident checks

- Search looks empty:
  - check `GET /api/health`
  - inspect `/admin/settings/search`
  - run a scoped or full reindex
- New imported content is not appearing:
  - check `/admin/sources/health`
  - inspect recent batches and fetch logs
  - rerun the affected source or `POST /api/source-ops/run-due`
- Uploads 404:
  - confirm `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, and `MINIO_BUCKET`
  - check object-storage status in `GET /api/health`
- Privileged operations fail:
  - verify moderator/admin session state
  - verify `REINDEX_SECRET` / `SOURCE_OPS_SECRET` for automation callers

## Logging

- Server logs are emitted as structured JSON to stdout/stderr.
- Unhandled server errors are captured in `hooks.server.ts`.
- Search compatibility-mode fallbacks, rate limiting, reindex runs, and source-op runs are logged explicitly.
