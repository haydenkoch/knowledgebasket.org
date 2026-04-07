# Plan: Coil Standardization & Strong Image Support

## Context

All five coils (events, funding, red-pages, jobs, toolbox) share common architecture but have accumulated meaningful inconsistencies across schema, data layer, admin forms, detail pages, and search indexing. The most glaring gap is image support: events and red-pages have a full gallery array (`imageUrls`), while funding/jobs/toolbox only have a single `imageUrl` field and no gallery UI. Toolbox's admin form has no image support at all despite having `imageUrl` in the schema.

This plan standardizes the coils to a consistent baseline and brings image support up to the level events already has.

---

## Phase 1 — Schema + Migration

**Goal:** Add `imageUrls` (JSONB array) to the three coils that lack it.

Files to edit:

- `src/lib/server/db/schema/funding.ts` — add `imageUrls: jsonb('image_urls').$type<string[]>().default([])`
- `src/lib/server/db/schema/jobs.ts` — same
- `src/lib/server/db/schema/toolbox.ts` — same

Then generate and run migration:

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

---

## Phase 2 — Data Layer Updates

**Goal:** Surface `imageUrls` in item types, `rowToItem` converters, and Meilisearch search docs. Fix the `recentBusinesses` sort inconsistency.

### 2a. TypeScript types (`src/lib/data/kb.ts`)

- Add `imageUrls?: string[]` to `FundingItem`, `JobItem`, `ToolboxItem`

### 2b. Server modules

**`src/lib/server/funding.ts`**

- `rowToItem`: map `row.imageUrls ?? []` → `imageUrls`
- `itemToSearchDoc`: no change needed (search doc doesn't need raw image URLs)

**`src/lib/server/jobs.ts`**

- Same as funding

**`src/lib/server/toolbox.ts`**

- Same as funding

**`src/lib/server/red-pages.ts`**

- Fix `getRecentBusinesses` — sort by `publishedAt` not `createdAt` (inconsistent with all other coils)

### 2c. Meilisearch search docs — minor improvements

- `funding`: add `amountMin`, `amountMax` to search doc so amount-based filtering is possible
- `jobs`: add `applicationDeadline` to search doc for deadline-aware filtering

---

## Phase 3 — Admin Form Image Sections

**Goal:** Every coil's admin edit form gets a consistent image section: primary image upload (`imageUrl`) + gallery image array (`imageUrls`).

### Pattern to follow (from events admin form)

- `KbFileDropzone` component for primary image upload → sets `imageUrl`
- Textarea (newline-separated URLs) for `imageUrls` array
- Both wire into the form action which calls `uploadImage(file, scope)`

### Files to edit

**`src/routes/admin/toolbox/[id]/+page.server.ts`**

- Add `uploadImage` import and call in form action for `toolbox` scope
- Add `imageUrl` and `imageUrls` to form schema

**`src/routes/admin/toolbox/[id]/+page.svelte`** (or ToolboxForm component)

- Add image section with `KbFileDropzone` + imageUrls textarea

**`src/routes/admin/funding/[id]/+page.server.ts`** (and form)

- Upgrade from text input to `KbFileDropzone` + `uploadImage()` call (scope: `funding`)
- Add `imageUrls` field

**`src/routes/admin/red-pages/[id]/+page.server.ts`** (and form)

- Upgrade from text input to `KbFileDropzone` + `uploadImage()` call (scope: `red-pages`)
- Add `imageUrls` textarea (schema already has it, just needs to be wired up)

Jobs already has `KbFileDropzone` — only needs `imageUrls` field added to form.

---

## Phase 4 — Detail Page Image Display

**Goal:** Consistent hero image treatment and gallery filmstrip across all coils.

### Hero image standardization

| Coil      | Current                                      | Target                                                                  |
| --------- | -------------------------------------------- | ----------------------------------------------------------------------- |
| Events    | Full bleed image + gallery filmstrip ✓       | No change                                                               |
| Jobs      | Gradient placeholder if no image             | Use imageUrl as hero background; gallery filmstrip if imageUrls present |
| Funding   | SVG grid pattern (ignores imageUrl entirely) | Use imageUrl as hero background when set; keep SVG fallback             |
| Red-Pages | imageUrl hero (no fallback indicator) ✓      | Add gallery filmstrip using imageUrls                                   |
| Toolbox   | No image display at all                      | Use imageUrl as hero overlay when set; keep file icon fallback          |

### Gallery filmstrip component

Events already has a gallery filmstrip organism. Extract/reuse it for:

- `src/routes/jobs/[slug]/+page.svelte` — show below hero if `item.imageUrls?.length`
- `src/routes/funding/[slug]/+page.svelte` — same
- `src/routes/red-pages/[slug]/+page.svelte` — same
- `src/routes/toolbox/[slug]/+page.svelte` — same

Locate the filmstrip component in events detail page first — determine if it's already extracted to `$lib/components/` or inline. If inline, extract to `$lib/components/molecules/ImageGalleryFilmstrip.svelte`.

---

## Phase 5 — JSON-LD Additions

**Goal:** Add structured data to coils that lack it.

- **`src/routes/funding/[slug]/+page.svelte`** — Add `Grant` or `MonetaryGrant` JSON-LD (schema.org)
- **`src/routes/toolbox/[slug]/+page.svelte`** — Add `Article` or `CreativeWork` JSON-LD

Pattern: follow what events/jobs detail pages already do with a `<svelte:head>` JSON-LD block.

---

## Verification

1. **Schema migration**: `pnpm drizzle-kit generate` produces a clean migration file; `pnpm drizzle-kit migrate` applies without error
2. **Data layer**: Inspect a funding/job/toolbox row and confirm `imageUrls` comes through in the item type
3. **Admin forms**: Navigate to `/admin/toolbox/[id]`, `/admin/funding/[id]`, `/admin/red-pages/[id]` — confirm image upload dropzone appears and saves correctly
4. **Detail pages**: Load each coil detail page with a test item that has `imageUrls` populated — confirm gallery filmstrip renders
5. **Hero images**: Confirm funding detail page uses `imageUrl` when set, falls back to SVG pattern when not
6. **Sort fix**: Confirm `/red-pages` "recent" ordering matches other coils (by `publishedAt`)
7. **JSON-LD**: View source on funding/toolbox detail pages and confirm structured data blocks are present

---

## Out of Scope (for now)

- Adding `imageUrls` to Meilisearch search docs (not useful for search)
- User-facing gallery lightbox (nice to have, not critical)
- Duplicate detection for non-event coils
- Curated lists / iCal feeds for non-event coils
- Interest/engagement tracking for non-job coils
