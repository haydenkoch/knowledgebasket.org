# Events Sidebar — Filtering Improvement Ideas

## Context

The events sidebar (`src/lib/components/organisms/EventsSidebar.svelte`) currently exposes 5 filters: free-text search, date range (24-month histogram + dual slider), cost (6 buckets), region (4 values), and type (15 tags). The state hook (`src/lib/hooks/use-events-filters.svelte.ts`) does all filtering client-side with AND logic.

**Approach: build a v2 alongside the existing one.** The original `EventsSidebar.svelte` and `use-events-filters.svelte.ts` are NOT touched. Instead, copy them to `EventsSidebarV2.svelte` and `use-events-filters-v2.svelte.ts` and add every Tier 1 + Tier 2 improvement to the v2 versions. The events page will be updated to import the v2 sidebar/hook so the new filters go live, but the v1 files remain in the tree as a fallback / reference until v2 is validated.

The data model (`EventItem` in `src/lib/data/kb.ts`) carries **far more filterable signal** than the UI surfaces today — `eventFormat`, `audience`, `accessibilityNotes`, `soldOut`, `registrationDeadline`, `featured`, `organizationName`, `priceMin/Max`, `lat/lng`, `capacity`, `ageRestriction`, `pricingTiers`. The existing UI is well-built; this plan proposes additive improvements that stay inside the established shadcn-svelte vocabulary (Popover + Command + Badge + Toggle + Switch) and the existing `.kb-section` / `.kb-refine-select` style tokens.

This is a **design proposal**, not yet an execution plan. Each idea is ranked by impact and labeled as **Refine** (improve existing) or **Add** (new filter).

---

## Tier 1 — High Impact, Low Effort

### 1. Date Range: Quick Preset Chips (Refine)
**Problem.** The histogram + dual slider is beautiful but slow for the most common intent: "what's happening this weekend?" Users currently have to drag two thumbs to a one-month window.

**Proposal.** Above the histogram, add a single-row chip strip of presets that snap the slider:
- `Today` · `This weekend` · `Next 7 days` · `This month` · `Next 3 months` · `All`

**Components.** Reuse `Badge` (`src/lib/components/ui/badge`) styled as togglable chips, OR a horizontal `ToggleGroup` if it exists in `ui/`. Single-select; selecting clears to "All" toggles back to the full 24-month range. Keep the histogram + slider below for power-user fine-tuning.

**State.** No new fields in `useEventsFilters`. Each preset just calls `handleSliderCommit([minIx, maxIx])` with computed indices, or sets `rangeStart/rangeEnd` directly.

**Why first.** Dramatically improves the most common task without removing anything.

---

### 2. Event Format Toggle (Add)
**Problem.** `eventFormat: 'in_person' | 'online' | 'hybrid'` exists on every event but is invisible to users. Post-pandemic this is one of the most-asked questions.

**Proposal.** A compact 3-button segmented control directly under the Date Range section:

```
[ In person ] [ Online ] [ Hybrid ]
```

Multi-select (so a user can pick "In person + Hybrid"). Empty = all. This is conceptually different enough from "geography" to warrant its own row, and small enough not to need a popover.

**Components.** `ButtonGroup` from `src/lib/components/ui/button-group` with `variant="outline"` and `data-state="on"` styling. ~40px tall, full sidebar width.

**State.** Add `formatSelect: string[]` to `useEventsFilters.svelte.ts`, with a `formatFiltered` step in the filter chain after `dateFiltered`. Add to `clearFilters()`.

**Note.** Currently the Region filter conflates "Virtual" (a format) with geographic regions. Consider migrating "Virtual" out of region into this new format axis — but check `src/lib/server/events.ts` and any seed/import scripts to confirm `region: 'Virtual'` isn't being written from data sources before changing semantics. Backward-compatible path: leave Region as-is and let format work in parallel.

---

### 3. Active-Filters Bar Above Sections (Refine)
**Problem.** When a user has selections across cost + region + type + date, there's no single place to see "what am I currently filtering by?" The Type chips show inside their popover trigger, but cost and region only show count summaries ("3 selected").

**Proposal.** Just under the search input (above Date Range section), render a single horizontal wrap of removable chips for *every* active filter — date preset name, cost buckets, regions, types, format. Same `kb-form-type-chip` style already defined (lines 594–605 of `EventsSidebar.svelte`), one click X to remove. Add a small "Clear all" link inline if any chip exists.

**Components.** Reuse the existing `.kb-form-type-chip` CSS class. Drive from a single `$derived` array in the sidebar.

**Why.** Visible state, single source of truth, no new components, almost no new CSS.

---

### 4. Sort Order Selector (Add)
**Problem.** The list is hard-coded sorted by start date ascending in `useEventsFilters` (the final `.sort` call). No way to see soonest-deadline-first, featured-first, or alphabetical.

**Proposal.** A compact `Select` (the existing shadcn `Select`, not a popover) at the bottom of the sidebar or in the toolbar. Options:
- `Soonest first` (default)
- `Latest first`
- `Featured first`
- `Registration deadline (closing soon)`
- `Alphabetical`

**State.** Add `sortBy: SortKey` to the hook; replace the current hard-coded sort with a switch on `sortBy`.

**Why.** "Closing soon" specifically activates the unused `registrationDeadline` field for huge practical value.

---

## Tier 2 — Medium Impact

### 5. Audience Filter (Add)
**Field.** `event.audience` — observed values include "General Public", "Indigenous Only", "By Profession". For a Native-community-focused KB this is an important navigational axis.

**Proposal.** New popover row inside the existing "Filter" section, identical pattern to Cost/Geography (`kb-refine-select` trigger + Command popover with checkboxes and counts). Multi-select.

**State.** `audienceSelect: string[]`, parallel to `regionSelect`. Add `audienceCountsInRange` and `audienceValuesVisible` derivations mirroring the existing region-counts logic.

---

### 6. Registration Status Quick-Filter (Add)
**Fields.** `soldOut: boolean`, `waitlistUrl?: string`, `registrationDeadline?: string`, `capacity?: number`.

**Proposal.** A small `Switch`-style row of toggles in the Filter section:
- `Hide sold out` (default off)
- `Registration still open`
- `Closing this week`

**Components.** shadcn `Switch` component, stacked with labels. Compact, no popover needed.

**State.** Three booleans in the hook with corresponding filter steps. `Closing this week` checks `registrationDeadline` against `Date.now() + 7d`.

---

### 7. Featured-Only Toggle (Add)
**Field.** `event.featured: boolean`.

**Proposal.** A single `Switch` at the top of the Filter section: `Featured only`. One line, minimal real estate, useful for browsing curated content.

**State.** `featuredOnly: boolean` in the hook.

---

### 8. Type Filter — Grouped Display (Refine)
**Problem.** The type popover today is a flat alphabetical list of 15 tags. The hook already has the concept of `eventTypeGroups` (referenced in `typeGroupsForFilter`) — groups like "Performance" containing related sub-tags. Users see flat tags, but matching uses groups.

**Proposal.** Inside the Type popover's `Command.Root`, render `Command.Group` blocks per group with a heading, instead of one flat group. The shadcn `Command` component supports group headings natively (already used elsewhere). Same multi-select behavior, just visually organized.

**Why.** Discoverability — "Festival" and "Powwow" feel related; grouping shows that. Zero new state, purely a render change.

---

## Tier 3 — Higher Effort, Specialized

### 9. Distance / Radius Filter (Add)
**Fields.** `event.lat`, `event.lng`. Use cases: "events within 50 mi of me."

**Proposal.** A collapsible "Near me" section with:
- `Use my location` button (browser geolocation)
- A radius `Slider` (10 / 25 / 50 / 100 / 250 mi)
- Falls back gracefully when geolocation denied

**Components.** Existing dual-handle slider pattern can be adapted to a single-handle. shadcn doesn't ship a single `Slider` here, so reuse the `kb-range-track` styling with one input.

**Caveat.** Requires every event to have geocoded `lat/lng` — verify coverage in `src/lib/server/events.ts` before committing. If <80% of events are geocoded, defer this.

---

### 10. Price Range Slider (Refine, optional replacement)
**Problem.** Cost buckets ($25-$99 etc.) lose precision; a $30 ticket and a $90 ticket land in the same bucket.

**Proposal.** Either:
- **(a)** Add a $-range slider inside the Cost popover (uses `priceMin`/`priceMax`), keeping bucket checkboxes for the "Free / Sliding scale / Cost varies" non-numeric cases; or
- **(b)** Skip — bucket UX is genuinely faster for browsing.

**Recommendation.** Skip unless users complain. Buckets are the right call for casual browsing.

---

### 11. Organization Filter (Add)
**Fields.** `organizationName`, `organizationId`, `organizationSlug`.

**Proposal.** Searchable multi-select combobox (Command + Popover) in a new "Organizers" section, listing unique organization names with event counts. Useful for users who follow specific orgs.

**Caveat.** With many events the list could be long — use Command's built-in fuzzy search input. Only worth adding if there are >10 distinct orgs in published events.

---

## Things to Explicitly NOT Add

- **Age restriction filter.** `ageRestriction` is free-text, not enumerated. Without normalization on the data side (server/import), a UI filter would be noisy.
- **Timezone filter.** Useful only for online events; subsumed by the format filter.
- **Accessibility filter as a popover.** `accessibilityNotes` is free-text. Better surfaced as a "Has accessibility notes" badge on cards than as a filter.
- **All-day toggle.** Almost no user demand; clutter.

---

## Build Order (single v2 build)

Since this is one v2 component (not a series of PRs to v1), the build order is the order in which features get layered into the v2 files in a single pass:

1. **Copy** `EventsSidebar.svelte` → `EventsSidebarV2.svelte` and `use-events-filters.svelte.ts` → `use-events-filters-v2.svelte.ts`. Rename the exported hook to `useEventsFiltersV2`. Verify v2 renders identically to v1 when wired into the page.
2. **Hook state additions** — add all new fields to `useEventsFiltersV2` at once: `formatSelect`, `audienceSelect`, `sortBy`, `featuredOnly`, `hideSoldOut`, `registrationOpen`, `closingThisWeek`. Add filter chain steps (after `dateFiltered`, before sort). Add derived counts. Replace the hard-coded sort with a `sortBy` switch. Update `clearFilters()`.
3. **Sidebar v2 layout** — add the new sections in this order top-to-bottom:
   - Active filters bar (#3) just under search
   - Date Range section: add preset chip strip (#1) above the existing histogram
   - Event Format toggle row (#2)
   - Filter section: add Audience popover (#5) under Cost/Region; add Registration switches (#6) and Featured switch (#7)
   - Type section: switch flat list to grouped Command groups (#8)
   - Sort selector (#4) at the bottom of the sidebar
4. **Wire into page** — update `src/routes/events/+page.svelte` imports to v2 and pass through any new derived props.
5. **(Defer)** Distance (#9) and Organization (#11) filters until data coverage verified.

---

## Critical Files

**New files (v2 — copied from v1, then extended):**

| File | Source | What it adds |
|---|---|---|
| `src/lib/components/organisms/EventsSidebarV2.svelte` | copy of `EventsSidebar.svelte` | Active filters bar, date preset chips, format toggle, audience popover, registration switches, featured toggle, sort selector, grouped type display |
| `src/lib/hooks/use-events-filters-v2.svelte.ts` | copy of `use-events-filters.svelte.ts` | New state fields: `formatSelect`, `audienceSelect`, `sortBy`, `featuredOnly`, `hideSoldOut`, `registrationOpen`, `closingThisWeek`. New filter steps in the chain. New derived counts (`audienceCountsInRange`, `audienceValuesVisible`). Updated `clearFilters()`. Replaces hard-coded sort with switch on `sortBy`. |

**Files modified to consume v2:**

| File | Change |
|---|---|
| `src/routes/events/+page.svelte` | Swap import from `EventsSidebar` → `EventsSidebarV2` and `useEventsFilters` → `useEventsFiltersV2`. Pass new props/derived values through. |

**Untouched (v1 preserved as fallback):**

- `src/lib/components/organisms/EventsSidebar.svelte` — no edits
- `src/lib/hooks/use-events-filters.svelte.ts` — no edits

**Consumed (no edits):**

- `src/lib/data/kb.ts` — all needed fields already exist on `EventItem`
- `src/lib/components/ui/button-group/`, `ui/switch/`, `ui/select/`, `ui/badge/`, `ui/popover/`, `ui/command/` — used as-is

## Verification

For each filter added, manual verification end-to-end:

1. `pnpm dev` and visit `/events`
2. Apply the filter, confirm the visible event count (`filteredTotal`) updates correctly
3. Combine with another filter — confirm AND semantics
4. Open the active filters bar (#3), remove via X, confirm the underlying state clears
5. Click "Clear" — confirm the new filter resets to default
6. Mobile: open the peek panel drawer and verify the new controls work in `mobileMode`
7. Confirm count badges (`*CountsInRange`) match the actual filtered results
