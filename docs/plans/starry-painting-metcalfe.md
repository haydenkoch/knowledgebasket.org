# Plan: Full Site & System Audit (Updated)

## Context

An existing audit (`docs/reviews/full-site-and-system-audit.md`) and remediation plan (`docs/plans/production-readiness-remediation-plan.md`) were produced on 2026-04-05. Status updates in those documents confirm that significant remediation has already been completed:

- Shared server-side admin authorization now protects admin page loads and mutations
- Rate limiting is in place for auth, submission, search, and privileged endpoints
- Search readiness now distinguishes offline/partial/ready with truthful DB fallback
- Uploads now target S3-compatible object storage
- Health endpoint, structured logging, production runbook, and seed flows exist
- Organization and venue pages now surface cross-coil content

The user wants a **fresh, comprehensive audit** that reflects the current state, goes deeper than the previous one, and produces two output files.

## What I Will Produce

### Output 1: `docs/reviews/full-site-and-system-audit.md` (overwrite)

A complete updated audit covering all 12 audit dimensions. Key differences from the previous version:

**Preserved from previous audit:**

- Overall structure and finding numbering scheme
- Findings that remain open/valid

**Updated:**

- Executive summary reflecting remediation progress
- Status of each previously-identified finding (closed, partially closed, still open)
- Quality gate status (need to re-run lint/test/build to get current state)

**New/deeper coverage not in previous audit:**

1. **Data model quality** — Missing indexes, missing CHECK constraints on status fields, field denormalization (type/types, tribalAffiliation/tribalAffiliations), orphan risks from `onDelete: 'set null'`, missing audit columns
2. **Ingestion pipeline internals** — No transaction boundaries in pipeline, no timeout on AI enrichment API calls, advisory lock without TTL in scheduler, race condition in index initialization, sequential scheduler execution blocking
3. **Accessibility specifics** — Homepage featured image missing alt text, logo alt text inconsistency, auth layout missing semantic landmarks, color contrast concerns on header secondary links, heading hierarchy gaps
4. **Testing detail** — Zero unit tests in src/, zero component tests, zero E2E framework, specific untested critical flows (auth, admin CRUD, file uploads, privacy/export)
5. **Search internals** — Meilisearch index configuration details, ranking rules, facet/filter coverage per coil, geo-search status
6. **Security depth** — HTML content not sanitized (XSS via `{@html}`), process.env direct access in ingestion, no Zod/schema validation
7. **Performance specifics** — Large auth.js server chunk (~1.54 MB), O(n) title similarity in dedupe, no circuit breaker patterns
8. **Documentation drift specifics** — CLAUDE.md overstates auth hardening, PRODUCTION_RUNBOOK.md conflates search health with index coverage, PERFORMANCE.md omits build-size risks

### Output 2: `docs/plans/production-readiness-remediation-plan.md` (overwrite)

Updated remediation roadmap reflecting:

- What's been completed since the original plan
- Reprioritized remaining work
- New findings integrated into workstreams
- Clearer phase gates and exit criteria

## Approach

1. **Run quality gates** to get current lint/test/build status
2. **Write the audit document** — structured by the 12 audit dimensions, with severity ratings, file paths, and evidence
3. **Write the remediation plan** — prioritized roadmap with phases, dependencies, and exit criteria

## Key Files to Reference

**Schema:** `src/lib/server/db/schema/*.ts` (especially events.ts, sources.ts, content.ts, organizations.ts)
**Auth/Security:** `src/lib/server/access-control.ts`, `src/hooks.server.ts`, `src/lib/server/auth.ts`, `src/lib/server/rate-limit.ts`
**Search:** `src/lib/server/meilisearch.ts`, `src/lib/server/search-service.ts`, `src/lib/server/search-ops.ts`
**Ingestion:** `src/lib/server/ingestion/pipeline.ts`, `ai-enrichment.ts`, `detail-enrichment.ts`, `dedupe.ts`, `scheduler.ts`
**Frontend:** `src/routes/+page.svelte`, `src/routes/+layout.svelte`, all coil list/detail pages, `KbHeader.svelte`, `KbSearch.svelte`
**Tests:** `tests/*.test.ts`, `vite.config.ts`
**Docs:** `docs/PRODUCTION_RUNBOOK.md`, `docs/DESIGN_SYSTEM.md`, `docs/PERFORMANCE.md`

## Verification

After writing both documents:

- Confirm both files are valid markdown
- Confirm severity ratings are consistent
- Confirm remediation plan references audit findings correctly
- Confirm no findings are duplicated or contradictory
