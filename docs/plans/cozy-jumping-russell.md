# Plan: Full Codebase Audit and Remediation Writeup

## Context

Knowledge Basket has grown past its early-stage docs. Events is production-depth. The other four coils have real public surfaces and server layers, not stubs. Source ops is ~7000 LOC of real pipeline. But the repo is carrying material drift between docs, design direction, and implementation -- and source-ops code is currently type-broken. This audit captures the true state and produces a phased remediation plan.

## What this plan produces

Two markdown files, overwriting prior versions:

1. `docs/reviews/codebase-audit.md` -- comprehensive findings document
2. `docs/plans/codebase-remediation-plan.md` -- 4-phase remediation plan

**No code changes. No refactors. No dependency additions.**

## Evidence collected

### Verification results

- `pnpm check`: **3 errors** -- import-candidates.ts:978/980 (ImageCandidate metadata type, missing required columns in insert), detail-enrichment.ts:268 (provenance source enum mismatch: 'attachment'/'inline'/'meta' not in target union)
- `pnpm lint`: **20 files** with Prettier formatting drift
- `pnpm test`: **39 tests passing** across 5 files (source-ops, smoke, search-api, actions, admin-inbox)
- `pnpm build`: **passes**, auth.js chunk 1.5MB, circular deps from node_modules only (drizzle-orm, @internationalized/date)

### Architecture snapshot

- 56 route directories, 95 route files
- 5 coils: Events (full end-to-end), Funding/RedPages/Jobs/Toolbox (public browse+detail+submit, server CRUD+moderation, schema -- but no dedicated admin routes)
- Source ops: 7 adapters, scheduler, dedupe, AI enrichment, candidate review queue
- Search: Meilisearch per-coil indexes defined, DB fallback only for events
- Auth: Better Auth, email/password, roles: contributor/moderator/admin
- Schema-only features: bookmarks, orgFollows, notifications, notificationPreferences, contentLists, contentListItems, jobInterests
- Forms: plain SvelteKit enhance() everywhere, no SuperForms/FormSnap despite stack claim
- Layout: KbTwoColumnLayout + KbSidebar left-rail across all coils; Events has custom sidebar+calendar
- Admin: Events has 10 sub-routes. Other coils moderation-only via /admin/inbox/

### Key findings inventory

1. Root spec.md (1366 lines) materially stale -- claims stubs where real implementation exists
2. docs/ structure present but no systematic "current state" doc
3. Source-ops type-broken (3 pnpm check errors in most operationally sensitive code)
4. CI quality gates red (check + lint both failing)
5. Search mode detection based on config presence not availability; asymmetric fallback
6. Venue not in search index; reindex surfaces inconsistent (events-only /api/reindex vs admin multi-coil)
7. Events left-rail sidebar drift vs stated horizontal filter-bar design direction
8. Left-rail scaffold spread to all 4 non-event coils via KbTwoColumnLayout
9. Non-event coils lack admin CRUD routes despite full server layer support
10. Schema ahead of product surface (bookmarks, follows, notifications, content lists, job interests)
11. No SuperForms/FormSnap anywhere despite CLAUDE.md stack declaration
12. AI enrichment defaults to nonexistent model ('gpt-5-mini')
13. Form input validation gaps in admin source actions (NaN coercion, no registry validation)
14. Auth.js chunk 1.5MB (better-auth tree-shaking or code-split issue)
15. Source-ops concentrated in large files (pipeline.ts 1368, import-candidates.ts 1594, detail-enrichment.ts 935)
16. EventsFilterBarReference.svelte exists unused in components/reference/
17. Narrow test suite (39 tests, no integration tests for pipeline or search ops)
18. Public search endpoint has no rate limiting, silent error suppression

## Deliverable 1: codebase-audit.md

### Structure

| Section                       | Content source                                                                                        |
| ----------------------------- | ----------------------------------------------------------------------------------------------------- |
| Executive summary             | Verification results, overall assessment, strengths/risks table, readiness snapshot                   |
| Repository / architecture map | Root inventory, route map, schema map, server modules, component inventory, large-file flags          |
| Findings by category          | All 18+ findings in canonical format (see below)                                                      |
| Spec alignment review         | spec.md vs implementation: matches, partial, missing, different, overbuilt                            |
| UI/UX audit                   | Layout drift, filter patterns, accessibility gaps, empty states, mobile containment                   |
| Technical quality audit       | Performance (1.5MB chunk), security (validation gaps, admin shortcuts), testing (coverage), DX (lint) |
| Coil-by-coil assessment       | Per-coil: public/detail/submit, schema, server, admin, search, source-ops maturity vs Events baseline |
| Cleanup candidates            | Confirmed stale (EventsFilterBarReference), dormant schema features (not dead, label as unsurfaced)   |
| Final recommendation          | Phase 1 is correctness; no features until check/lint green and docs reflect reality                   |

### Finding format

```markdown
### Finding N: <title>

- **Status**: Confirmed | Inferred | Needs manual runtime/browser validation
- **Severity**: critical | high | medium | low
- **Category**: correctness | architecture | ux | security | dx | docs
- **Description**: 1-3 sentences
- **Why it matters**: product/operational impact
- **Evidence**: file paths, line numbers, command output
- **Recommended fix**: 1-2 sentences
- **Effort**: quick win | medium project | deep refactor
```

### Target length

600-700 lines. Tight prose, tables for comparisons, concrete file paths in every finding.

## Deliverable 2: codebase-remediation-plan.md

### Phase structure

Each phase has: Objective, Ordered workstreams, Concrete target areas (with file paths), Dependencies and sequencing, Expected payoff, What not to touch yet.

| Phase                                | Theme                               | Key items                                                                                                                                                                                   |
| ------------------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase 1: Critical correctness**    | Make the repo trustworthy to change | Fix 3 type errors in source-ops. Fix AI enrichment model default. Run lint --write on 20 files. Rewrite/retire stale spec.md. Stabilize search fallback. Gate: green check+lint+build+test. |
| **Phase 2: Operational foundations** | Close the admin and structural gaps | Add admin route scaffolds for non-event coils. Decompose large source-ops files. Add form validation to admin actions. Wire search reindex parity.                                          |
| **Phase 3: UX and product polish**   | Align UI with design direction      | Resolve left-rail vs filter-bar direction. Adopt SuperForms or drop from stack claim. Address auth.js chunk. Remove stale reference components. Improve search accessibility.               |
| **Phase 4: Future enhancements**     | Scale safely                        | Expand test coverage (integration tests). Per-coil role granularity. Full search parity. Surface dormant schema features (bookmarks, follows, notifications).                               |

### Target length

200-250 lines. Remediation plan references finding numbers from audit.

## Writing sequence

1. Write codebase-audit.md top-to-bottom, one pass
2. Write codebase-remediation-plan.md referencing audit finding numbers
3. Verify internal cross-references

## Verification

After writing both files:

- Read both files to confirm structure matches spec
- Confirm no code was modified (git status should show only docs/ changes)
- Confirm finding count matches inventory
- Confirm remediation plan phases reference correct finding numbers

## Critical files to read during writing

- `/Users/hayden/Desktop/kb/spec.md` (headers/structure for spec alignment section)
- `/Users/hayden/Desktop/kb/site/src/lib/server/import-candidates.ts:970-990` (exact type error context)
- `/Users/hayden/Desktop/kb/site/src/lib/server/ingestion/detail-enrichment.ts:260-275` (exact type error context)
- `/Users/hayden/Desktop/kb/site/src/lib/server/ingestion/ai-enrichment.ts:30-40` (model default)
- `/Users/hayden/Desktop/kb/site/src/lib/server/meilisearch.ts:70-80` (timeout, index config)
