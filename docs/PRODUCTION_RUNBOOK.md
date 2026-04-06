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

## Scheduler / cron requirements

- Source ingestion automation requires a recurring call to:
  - `POST /api/source-ops/run-due`
- Protect the endpoint with either:
  - a privileged authenticated session, or
  - `x-source-ops-secret` matching `SOURCE_OPS_SECRET`
- Recommended cadence:
  - every 15 minutes for production
  - every 60 minutes for low-volume staging environments

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
