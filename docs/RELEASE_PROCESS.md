# Release Process

This document is the day-to-day operating guide for safe delivery after the unsafe-push cutoff at `77162ec`.

## Branch model

- `main`
  - production only
  - no direct pushes
  - receives release PRs from `staging` and emergency hotfix PRs
- `staging`
  - protected integration branch
  - deploy source for Railway staging
  - target for normal feature work
- `feature/*`
  - branch from `staging`
  - merge back into `staging` through a PR
- `hotfix/*`
  - branch from `main`
  - merge into `main` first, then back-merge into `staging`

## Pull request standards

- PR titles must follow Conventional Commit style.
- Recommended types:
  - `feat`
  - `fix`
  - `chore`
  - `docs`
  - `refactor`
  - `test`
  - `perf`
  - `build`
  - `ci`
  - `release`
  - `security`
- Every protected-branch PR should include:
  - linked Linear issue
  - migration impact (`yes` or `no`)
  - risk level
  - rollback plan
  - test evidence

## Release flow

1. Merge normal work into `staging`.
2. Let Railway deploy staging automatically.
3. Verify the staging checklist.
4. Open a PR from `staging` to `main`.
5. Use a title like `release: promote staging to production (2026.04.08.1)`.
6. Merge only after all required checks pass.
7. Verify production health after deploy.
8. Create a GitHub Release using the same CalVer.

## Staging checklist

- `checks` is green.
- `GET /api/health` is healthy.
- Auth flow is smoke-tested.
- Search is smoke-tested.
- Uploads and asset serving are smoke-tested.
- Admin/source-ops flows are smoke-tested.
- Migration state is verified.
- Rollback note is present in the PR.

## Hotfix flow

1. Branch from `main` as `hotfix/*`.
2. Open a PR into `main`.
3. Merge after checks pass.
4. Back-merge the hotfix into `staging` immediately.

## Data and telemetry rules

- Local uses seed/synthetic data.
- Staging uses sanitized production-derived snapshots or fixtures.
- Production is canonical.
- Staging must never share a writable database, search index, or uploads bucket with production.
- Staging telemetry must be isolated from production:
  - separate Sentry environment or project
  - separate PostHog project or source
  - environment-specific release naming
