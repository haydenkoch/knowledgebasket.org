# Knowledge Basket (site)

SvelteKit app for the Knowledge Basket — events, and (stubbed) funding, red pages, jobs, toolbox.

## Backend (Docker)

From the **repo root** (parent of `site/`), start Postgres, MinIO, Meilisearch, and Redis:

```sh
docker compose up -d
```

Then in `site/.env` set `DATABASE_URL` to point at the Docker Postgres, e.g.:

```
DATABASE_URL="postgres://kb:kbdev@localhost:5432/kb"
```

See `site/.env.example` for all optional env vars (MinIO, Meilisearch, Redis, Mapbox, etc.).

## Developing

From the `site/` directory:

```sh
pnpm install
pnpm dev
```

Open the app (e.g. http://localhost:5173).

## Database

- **Push schema:** `pnpm run db:push` (after `docker compose up` and `DATABASE_URL` set).
- **Seed events from CSV:** `pnpm run db:seed` (run from `site/`; script reads CSV from `../data/` or `data/`).
- **Reindex search:** After seeding, POST to `http://localhost:5173/api/reindex` to sync events into Meilisearch (or start the app and call it once).
- **Auth schema:** If you use better-auth, run `pnpm run auth:schema` then `pnpm run db:push` so auth tables exist.

Events list = DB events + iCal feed (News from Native California), merged in memory. Search uses Meilisearch (events only).

## Stubbed sections

Funding, Red Pages, Job Board, and Toolbox are stubbed (empty data). Only Events are backed by Postgres and Meilisearch for now.

## Building

```sh
pnpm run build
pnpm run preview
```
