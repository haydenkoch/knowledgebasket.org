# Homepage Editor Redesign

## Context

The admin homepage editor is currently spread across 4 separate pages (`/admin/settings/homepage/`, `/sections`, `/featured`, `/preview`). Each page manages its own `$state` independently, so navigating between them loses in-progress edits. Reordering uses clunky ArrowUp/ArrowDown buttons. The workflow feels fragmented for what is conceptually a single editing task.

**Goal**: Consolidate into a single-page editor with tabs, drag-and-drop reordering, and a more condensed/interactive layout.

## Architecture

### Single page with 3 tabs + persistent header actions

```
+--------------------------------------------------------------+
| AdminPageHeader: "Homepage"       [Publish] [Reset] [Preview]|
+--------------------------------------------------------------+
| [Sections]  [Featured]  [Preview]                            |
+--------------------------------------------------------------+
|  <Active tab content — sections/featured/preview>            |
+--------------------------------------------------------------+
```

- **Publish/Reset buttons live in the header** (always visible regardless of tab)
- **Tabs use URL search params** (`?tab=sections|featured|preview`) for persistence across form submissions, matching the pattern in `/admin/+page.svelte`
- All 4 form actions (`saveSections`, `saveFeatured`, `publishDraft`, `resetDraft`) consolidate into one `+page.server.ts`

### Drag-and-drop via svelte-dnd-action

Already in `package.json` (v0.9.69). Uses `use:dndzone` action + `animate:flip`.

- **Drag handle**: `GripVertical` icon with `data-drag-handle` attribute, using `dragHandleSelector` option
- **During drag**: Expanded sections auto-collapse; dragged item gets subtle shadow + scale
- **Both sections and featured items** get DnD reordering

## New Components

Create `src/lib/components/organisms/admin/homepage/`:

### 1. `HomepageSectionRow.svelte`

Compact draggable row that expands inline via shadcn Collapsible.

**Collapsed state** (~48px row):

```
[grip] [source-icon] [heading]  [layout-badge] [eye-toggle] [chevron]
```

**Expanded state**: Collapsible opens below with the same form fields as current sections editor, reorganized into a tighter grid. Section preview + advanced controls nest inside.

**Props**: `section`, `expanded`, `sectionPreview`, `loadingPreview`, callbacks for update/remove/toggle/refresh/exclude

### 2. `HomepageFeaturedRow.svelte`

Compact draggable row for a featured item.

```
[grip] [#position] [title]  [coil-badge]  [x remove]
```

Position 1 gets a gold "Lead" badge. **Props**: `item`, `index`, `isLead`, `onremove`

### 3. `HomepageFeaturedSearch.svelte`

Extracted search input + autocomplete dropdown. Encapsulates all debounced search logic. **Props**: `onadd`, `existingIds`

### Source icon map (inline constant)

```
events → Calendar, funding → Coins, jobs → Briefcase,
redpages → BookOpen, toolbox → Wrench, featured → Sparkles, richtext → FileText
```

## Tab Contents

### Sections tab (default)

- "Add section" row at top: compact button group (not a full card)
- DnD zone with `HomepageSectionRow` for each section
- Save button at bottom

### Featured tab

- `HomepageFeaturedSearch` at top with `n/8` counter
- DnD zone with `HomepageFeaturedRow` for each item
- Empty state with Sparkles icon when no items
- Save button at bottom

### Preview tab

- Small stat row: draft sections / live sections / draft featured / pending changes
- Iframe preview (`/?preview=draft`)
- "Open in new tab" link

## Server-Side Changes

### Consolidated `+page.server.ts`

Merge load functions from all 4 current server files:

```ts
load: async ({ url }) => {
  const tab = url.searchParams.get('tab') ?? 'sections';
  const [draftConfig, liveConfig, publishMeta] = await Promise.all([...]);
  const resolved = await resolveFeaturedItems(draftConfig.featured);
  // Lazy-load section previews only for sections tab
  let sectionPreviews = {};
  if (tab === 'sections') {
    sectionPreviews = /* fetch previews for non-featured sections */;
  }
  return { tab, draftConfig, liveConfig, publishMeta, hasChanges, resolvedFeatured, sectionPreviews };
}
```

**Actions** (copy from current sub-route files, no logic changes):

- `saveSections` — from `sections/+page.server.ts` (includes `normalizeSectionPayload`)
- `saveFeatured` — from `featured/+page.server.ts`
- `publishDraft` — from `preview/+page.server.ts`
- `resetDraft` — from `preview/+page.server.ts`

### Files to delete after consolidation

- `src/routes/admin/settings/homepage/sections/+page.svelte`
- `src/routes/admin/settings/homepage/sections/+page.server.ts`
- `src/routes/admin/settings/homepage/featured/+page.svelte`
- `src/routes/admin/settings/homepage/featured/+page.server.ts`
- `src/routes/admin/settings/homepage/preview/+page.svelte`
- `src/routes/admin/settings/homepage/preview/+page.server.ts`

### Internal links to update

Grep for `/admin/settings/homepage/sections`, `/featured`, `/preview` across the codebase and update to `?tab=` params.

## Visual Design

- **Row hover**: `bg-[var(--color-alpine-snow-100)]/40`
- **Hidden sections**: `opacity-60` on the row, muted heading
- **Drag active**: `shadow-lg ring-2 ring-[var(--color-lakebed-300)]/30 scale-[1.01]`
- **Source badges**: Small colored pills — featured=gold, richtext=stone, coils=lakebed tones
- **Layout badge**: Subtle pill showing preset name
- **Expand/collapse**: shadcn Collapsible with smooth height transition
- **Unsaved indicator**: Subtle dot on the save button when state differs from loaded data

## Implementation Sequence

1. **Create 3 new components** in `organisms/admin/homepage/`
2. **Merge server files** into consolidated `+page.server.ts`
3. **Rewrite `+page.svelte`** with tabbed layout, DnD, new components
4. **Delete old sub-route files** (6 files)
5. **Update internal links** referencing old sub-routes
6. **Polish**: drag styles, transitions, keyboard accessibility

## Verification

1. Add/remove/reorder sections via drag-and-drop, save, reload — order persists
2. Toggle section visibility without expanding
3. Edit section fields (heading, limit, sort, layout, keyword, futureOnly, excluded IDs)
4. Refresh section preview inline
5. Search and add featured items, reorder via DnD, save
6. Preview tab shows draft iframe correctly
7. Publish draft → live homepage updates; Reset draft → reverts to live
8. Tab state persists across form submissions and page reloads
9. All old sub-route URLs return 404 (confirming cleanup)
