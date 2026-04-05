# Home Page Redesign Plan

## Context

The current home page is a thin shell: a hero banner, a search bar, and 5 hardcoded coil cards with emoji icons. No actual content from the database appears on the page. The user wants a home page that feels like a living aggregate — surfacing highlights from every coil — with proper Lucide icons replacing emojis, and a search suggestions dropdown on focus.

## Overview

Transform the home page from a static nav page into an editorial-style content hub with:
1. Hero with aggregate stats
2. Enhanced search with suggestions dropdown (browse links + popular terms on focus)
3. Five content sections, each showing 3–4 real items from its coil
4. Compact coil navigation strip at the bottom (Lucide icons, no emojis)

---

## 1. Server Data Layer

### New limited-fetch functions

Add one function to each server module. These mirror existing patterns but add a `limit` param.

**`src/lib/server/events.ts`** — `getUpcomingEvents(limit: number)`
- `WHERE status = 'published' AND startDate >= now()`
- `ORDER BY startDate ASC, LIMIT limit`
- Pattern: copy from `getUpcomingEventsByOrganizationId` but remove the org filter

**`src/lib/server/funding.ts`** — `getUpcomingFunding(limit: number)`
- `WHERE status = 'published' AND (deadline >= now() OR deadline IS NULL)`
- `ORDER BY deadline ASC NULLS LAST, LIMIT limit`

**`src/lib/server/jobs.ts`** — `getRecentJobs(limit: number)`
- `WHERE status = 'published'`
- `ORDER BY publishedAt DESC, LIMIT limit`

**`src/lib/server/toolbox.ts`** — `getRecentResources(limit: number)`
- `WHERE status = 'published'`
- `ORDER BY publishedAt DESC, LIMIT limit`

**`src/lib/server/red-pages.ts`** — `getRecentBusinesses(limit: number)`
- `WHERE status = 'published'`
- `ORDER BY createdAt DESC, LIMIT limit`
- (Recent additions are more interesting than alphabetical for a home page spotlight)

### Aggregate counts

Add to `+page.server.ts` inline — 5 parallel `SELECT count(*)::int` queries, one per table, where `status = 'published'`. No separate module needed.

### `+page.server.ts` load function

```ts
const [events, funding, jobs, resources, businesses, counts] = await Promise.all([
  getUpcomingEvents(4),
  getUpcomingFunding(3),
  getRecentJobs(4),
  getRecentResources(3),
  getRecentBusinesses(4),
  getCoilCounts() // inline helper
]);
return { origin, events, funding, jobs, resources, businesses, counts };
```

---

## 2. Search Enhancement — `KbSearch.svelte`

### Two-state dropdown

**State A — On focus (query empty or < 2 chars):**
Show a suggestions panel with two sections:
1. **Browse by coil** — 5 rows, each with a Lucide icon + coil label + arrow, linking to `/events`, `/funding`, etc.
2. **Popular searches** — 4–6 hardcoded terms (e.g. "grant deadlines", "cultural events", "tribal employment", "Native-owned businesses"). Clicking fills the input and triggers search.

All static — no API call needed.

**State B — Active search (query >= 2 chars):**
Keep existing debounced fetch behavior. Add Lucide coil icons next to the coil badge in results. Add a "View all results" link at the bottom → `/search?q=...`.

### Implementation details
- Add `showSuggestions` state, true when input is focused and query is short
- Reuse the same absolute-positioned dropdown container
- Render either suggestions or results based on state
- Close on blur (existing 150ms pattern)

### Lucide icon mapping (shared)
```ts
const coilIcons = {
  events: CalendarDays,
  funding: HandCoins,
  redpages: Store,
  jobs: Briefcase,
  toolbox: Wrench
};
```

---

## 3. Page Sections — `+page.svelte`

### Section order

1. **Hero** — existing `KbHero`, add stats snippet showing counts
2. **Search** — existing section, now with enhanced `KbSearch`
3. **Upcoming Events** — 4x `EventCard` in responsive grid
4. **Funding Deadlines** — 3x `FundingCard` in responsive grid
5. **Latest Jobs** — 4x `JobListItem` in stacked list
6. **Red Pages Spotlight** — 4x `RedPagesListItem` in 2-col grid
7. **From the Toolbox** — 3x inline toolbox items (extracted from toolbox page pattern)
8. **Coil Navigation Strip** — compact horizontal row replacing current emoji cards

### Section wrapper pattern

Each content section follows this structure (inline, no separate component — it's just a heading + link + grid):

```svelte
<section class="border-b border-[var(--rule)] bg-white px-4 py-10 sm:px-6 lg:px-10">
  <div class="mx-auto max-w-[1080px]">
    <div class="mb-6 flex items-center justify-between">
      <h2 class="flex items-center gap-2 font-serif text-xl font-semibold text-[var(--dark)]">
        <CalendarDays class="h-5 w-5 text-[var(--teal)]" />
        Upcoming Events
      </h2>
      <a href="/events" class="font-sans text-sm font-semibold text-[var(--teal)]">
        View all <ChevronRight class="inline h-4 w-4" />
      </a>
    </div>
    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {#each events as event, i}
        <EventCard {event} index={i} />
      {/each}
    </div>
  </div>
</section>
```

Each section conditionally renders only if it has items (`{#if data.events.length}`).

### Alternating backgrounds
- Sections alternate between `bg-white` and `bg-[var(--color-alpine-100,var(--bone))]` for visual rhythm.

### Coil accent colors per section
| Section | Icon color | Link color |
|---------|-----------|------------|
| Events | `--teal` | `--teal` |
| Funding | `--gold` | `--gold` |
| Jobs | `--forest` | `--forest` |
| Red Pages | `--red` | `--red` |
| Toolbox | `--slate` | `--slate` |

### Hero stats snippet
```svelte
{#snippet stats()}
  <div class="flex flex-wrap gap-6 font-sans text-sm text-white/90">
    <span><strong class="text-lg text-white">{counts.events}</strong> Events</span>
    <span><strong class="text-lg text-white">{counts.funding}</strong> Funding</span>
    <span><strong class="text-lg text-white">{counts.jobs}</strong> Jobs</span>
    <span><strong class="text-lg text-white">{counts.redpages}</strong> Businesses</span>
    <span><strong class="text-lg text-white">{counts.toolbox}</strong> Resources</span>
  </div>
{/snippet}
```

### Toolbox items (no existing card component)
Render inline using the same pattern from `src/routes/toolbox/+page.svelte:216-260` — icon + title + category badge + truncated description in a horizontal list item. Use the same `mediaTypeIcons` mapping.

### Coil navigation strip (bottom)
Replaces the current 5 big emoji cards. Compact horizontal cards:
- Lucide icon in a small colored circle
- Coil label (serif, semibold)
- One-line description
- Grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`
- Hover: subtle lift + shadow

---

## 4. Component Reuse

| Component | Source | Used for |
|-----------|--------|----------|
| `EventCard` | `molecules/EventCard.svelte` | Events section |
| `FundingCard` | `molecules/FundingCard.svelte` | Funding section |
| `JobListItem` | `molecules/JobListItem.svelte` | Jobs section |
| `RedPagesListItem` | `molecules/RedPagesListItem.svelte` | Red Pages section |
| `KbHero` | `organisms/KbHero.svelte` | Hero (unchanged) |
| `KbSearch` | `organisms/KbSearch.svelte` | Search (modified) |

**No new component files needed.** The toolbox items and coil nav strip are simple enough to render inline in `+page.svelte`. This avoids creating single-use molecules.

---

## 5. Lucide Icon Mapping

| Coil | Icon | Import path |
|------|------|-------------|
| Events | `CalendarDays` | `@lucide/svelte/icons/calendar-days` |
| Funding | `HandCoins` | `@lucide/svelte/icons/hand-coins` |
| Red Pages | `Store` | `@lucide/svelte/icons/store` |
| Jobs | `Briefcase` | `@lucide/svelte/icons/briefcase` |
| Toolbox | `Wrench` | `@lucide/svelte/icons/wrench` |

Also remove the emoji fallback in `EventCard.svelte:43` (the calendar emoji in the no-image state) — replace with a Lucide `CalendarDays` icon.

---

## 6. Files to Modify

| File | Change |
|------|--------|
| `src/lib/server/events.ts` | Add `getUpcomingEvents(limit)` |
| `src/lib/server/funding.ts` | Add `getUpcomingFunding(limit)` |
| `src/lib/server/jobs.ts` | Add `getRecentJobs(limit)` |
| `src/lib/server/toolbox.ts` | Add `getRecentResources(limit)` |
| `src/lib/server/red-pages.ts` | Add `getRecentBusinesses(limit)` |
| `src/routes/+page.server.ts` | Load all coil data + counts |
| `src/routes/+page.svelte` | Full rewrite — hero stats, 5 content sections, coil nav strip |
| `src/lib/components/organisms/KbSearch.svelte` | Add suggestions dropdown on focus |
| `src/lib/components/molecules/EventCard.svelte` | Replace emoji fallback with Lucide icon |

---

## 7. Verification

1. `pnpm dev` — home page loads without errors
2. Each content section shows real data from the database
3. Empty sections (0 published items) don't render
4. Hero stats show correct counts
5. Search: focusing the input shows browse links + popular terms
6. Search: typing 2+ chars shows real search results as before
7. All "View all" links navigate to the correct coil page
8. Responsive: check mobile (1-col), tablet (2-col), desktop (4-col) grids
9. No emojis anywhere on the home page
