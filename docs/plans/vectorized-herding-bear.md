# Plan: Redesign `/o/[slug]` and `/v/[slug]` detail pages

## Context

The organization (`/o/[slug]`) and venue (`/v/[slug]`) detail pages are functional but visually and structurally out of step with the rest of the site's polished detail pages (events, jobs, funding, red-pages). Specifically:

- **No maps.** Both schemas store `lat`/`lng`, but neither page renders a map. The venue page only links out to Google Maps. Every other detail page in the app already uses `LocationMap.svelte` (Mapbox GL) in a sidebar.
- **`/v/[slug]/+page.server.ts` doesn't expose `mapboxToken`** — it's the only detail loader that omits it.
- **Cluttered `/o` header.** The right column crams the follow/claim form together with a 6-cell stats grid inside the hero card. Stats + primary action + claim textarea compete for attention.
- **Flat stacked sections.** Related content (events, funding, jobs, red pages, toolbox, venues) stacks vertically with no grouping or navigation — on orgs with lots of content this becomes a very long scroll with no way to jump.
- **`/v` has no hero treatment** even though venues carry `imageUrl` in the schema.
- **Layout mismatch.** Other detail pages use a two-column `main + aside` layout; `/o` and `/v` use a single-column header followed by stacked sections. Unifying the layout makes the site feel cohesive.

Goal: restructure both pages into a `main + sticky sidebar` layout that mirrors the events/jobs/red-pages pattern, integrate `LocationMap` properly (including multi-marker map on `/o` for all linked venues), and group related content with tabs so the pages scan quickly.

## Critical files

**To modify**
- `src/routes/o/[slug]/+page.svelte` — restructure layout, add sidebar, tabs, map
- `src/routes/o/[slug]/+page.server.ts` — add `mapboxToken` to return
- `src/routes/v/[slug]/+page.svelte` — restructure layout, add sidebar, hero image, map
- `src/routes/v/[slug]/+page.server.ts` — add `mapboxToken` to return

**To reuse (do not modify)**
- `src/lib/components/molecules/LocationMap.svelte` — already supports `markers` array for multi-point display, geocoding fallback, accent colors
- `src/lib/components/ui/tabs/` — shadcn-svelte Tabs for grouping related content
- `src/lib/components/ui/breadcrumb/`, `button/`, `textarea/`
- `src/lib/components/molecules/EventCard.svelte`, `FundingCard.svelte`, `JobListItem.svelte`, `RedPagesListItem.svelte`
- `src/routes/events/[slug]/+page.svelte` — reference for the two-column detail layout and `LocationMap` sidebar usage (lines ~596–610)

## Changes

### 1. Server loaders — expose `mapboxToken`

Both `+page.server.ts` files gain the same line other detail loaders already use:

```ts
import { env } from '$env/dynamic/private';
// ...
return {
  // existing fields...
  mapboxToken: env.MAPBOX_ACCESS_TOKEN ?? env.MAPBOX_TOKEN ?? null
};
```

No query changes. No new data fetches.

### 2. `/o/[slug]/+page.svelte` — restructure

**New layout** (matches events/jobs/red-pages):

```
Breadcrumb
┌──────────────────────────── Hero card ─────────────────────────┐
│ Logo · badges (verified / orgType / region)                    │
│ H1 name                                                         │
│ Description (max-w-3xl)                                         │
│ Contact pills (website / email / phone / location)             │
│ Compact stats strip (horizontal, 6 items, not cramped grid)    │
└────────────────────────────────────────────────────────────────┘

┌──── Main (2fr) ────────────────┐  ┌── Sidebar (1fr, sticky) ──┐
│ "Upcoming events" — stacked    │  │ LocationMap              │
│ EventCard grid (prominent,     │  │  markers = [org pin +    │
│  not hidden behind a tab)      │  │             venue pins]  │
│                                │  │                          │
│ Tabs: Funding · Jobs ·         │  │ Organization access card │
│       Red Pages · Toolbox ·    │  │  (follow / claim / manage│
│       Venues                   │  │   — moved out of hero)   │
│ (empty collections hide        │  │                          │
│  their trigger; count badges)  │  │ Quick facts card         │
│                                │  │  (tribal affiliation,    │
│                                │  │   social links, etc.)    │
└────────────────────────────────┘  └──────────────────────────┘

Back to Knowledge Basket
```

**Key moves**
- **Stats grid** → flattened to a single horizontal strip at the bottom of the hero card (6 pill-style cells with count + label). Frees the right side of the hero entirely.
- **Organization access block** (follow button / claim form / manage link / form error / role chip) → moves out of the hero into its own sidebar card labeled "Organization access". Same form actions (`?/toggleFollow`, `?/createClaim`, `?/cancelClaim`) — no server changes.
- **Events** → stay as a prominent stacked section at the top of the main column (they're the most time-sensitive collection and deserve visibility without a click).
- **Secondary related content** (Funding · Jobs · Red Pages · Toolbox · Venues) → wrapped in shadcn-svelte `Tabs` below the events section. Empty collections suppress their trigger. Default to the first non-empty tab.
- **Linked venues section** → becomes one of the tabs (already has its own grid). The venue list can also power…
- **Map markers**: build `markers: MapPoint[]` including (a) the organization's own lat/lng (primary, accent `var(--teal)`) and (b) each venue with lat/lng. `LocationMap` already fits bounds automatically for 2+ markers. If the org has no lat/lng itself, the map still shows venue markers.

**Accent color**: `var(--teal)` (consistent with events).

**`LocationMap` props for `/o`**
```svelte
<LocationMap
  lat={organization.lat}
  lng={organization.lng}
  label={organization.name}
  address={locationLine || undefined}
  searchText={locationLine || organization.name}
  token={data.mapboxToken}
  accent="var(--teal)"
  eyebrow="Organization"
  height={260}
  markers={[
    ...(organization.lat != null && organization.lng != null
      ? [{ lat: organization.lat, lng: organization.lng, label: organization.name, accent: 'var(--teal)' }]
      : []),
    ...collections.venues
      .filter((v) => v.lat != null && v.lng != null)
      .map((v) => ({ lat: v.lat!, lng: v.lng!, label: v.name, address: [v.address, v.city, v.state].filter(Boolean).join(', ') }))
  ]}
/>
```

The whole map block renders only if the markers array is non-empty OR `searchText` has content (so `LocationMap`'s geocoding fallback can resolve an address-only org).

### 3. `/v/[slug]/+page.svelte` — restructure

**New layout**

```
Breadcrumb
┌────────── Hero ────────────────────────────────────────────────┐
│ If venue.imageUrl: full-bleed rounded image banner (h-56)      │
│                    with gradient scrim, title overlaid         │
│ Else: compact card header                                      │
│                                                                 │
│ Badges (venueType / "Linked organization")                      │
│ H1 name                                                         │
│ Description                                                     │
│ Contact pills (address / website / Google Maps directions)     │
└────────────────────────────────────────────────────────────────┘

┌──── Main (2fr) ────────────────┐  ┌── Sidebar (1fr, sticky) ──┐
│ Section: "Upcoming events at   │  │ LocationMap              │
│   this venue"                  │  │  (venue lat/lng, accent  │
│   (EventCard grid or empty)    │  │   var(--teal))           │
│                                │  │                          │
│ If organization && linked      │  │ Managed-by org card      │
│ content:                       │  │  (existing — moved here) │
│  Tabs: Funding · Jobs ·        │  │                          │
│        Red Pages · Toolbox     │  │ Stats strip              │
│  ("More from {org}")           │  │  (Events here · Linked)  │
│                                │  │                          │
└────────────────────────────────┘  └──────────────────────────┘

Back
```

**Key moves**
- **Hero image**: if `venue.imageUrl` exists, render a full-bleed rounded banner at the top of the hero card with a soft dark gradient and title overlaid (mirrors the events hero treatment, simpler version). Fall back to the current text-only card header.
- **Managed-by organization card** → moves from the right column of the hero into the sidebar below the map.
- **Stats (Events here / Linked content)** → move to sidebar as a compact strip under the org card.
- **"More from {org}" sections** → grouped in shadcn Tabs (Funding / Jobs / Red Pages / Toolbox), collapsing the four stacked blocks. Empty collections suppress their trigger.
- **Remove duplicated Google Maps link** — keep only one "Directions" pill in the hero; the `LocationMap` already provides its own directions button via `secondaryActionHref`/built-in Google Maps link.

**`LocationMap` props for `/v`**
```svelte
<LocationMap
  lat={venue.lat}
  lng={venue.lng}
  label={venue.name}
  address={addressLine || undefined}
  searchText={addressLine || venue.name}
  token={data.mapboxToken}
  accent="var(--teal)"
  eyebrow="Venue location"
  height={260}
/>
```

### 4. Content tabs pattern (shared)

Both pages use the same pattern for related content:

```svelte
<script>
  const tabs = $derived(
    [
      { value: 'funding', label: 'Funding', count: collections.funding.length },
      { value: 'jobs', label: 'Jobs', count: collections.jobs.length },
      { value: 'redpages', label: 'Red Pages', count: collections.redpages.length },
      { value: 'toolbox', label: 'Toolbox', count: collections.toolbox.length },
      { value: 'venues', label: 'Venues', count: collections.venues?.length ?? 0 }
    ].filter((t) => t.count > 0)
  );
  let activeTab = $state(tabs[0]?.value ?? 'funding');
</script>

<Tabs.Root bind:value={activeTab}>
  <Tabs.List>
    {#each tabs as t}
      <Tabs.Trigger value={t.value}>{t.label} <span class="ml-1.5 text-xs opacity-60">{t.count}</span></Tabs.Trigger>
    {/each}
  </Tabs.List>
  <Tabs.Content value="funding">…existing FundingCard grid…</Tabs.Content>
  <!-- etc. -->
</Tabs.Root>
```

Tab count badges give users a quick sense of scale without scrolling.

### 5. Styling

- Keep all existing CSS variables (`--card`, `--border`, `--muted`, `--teal`, `--sh`).
- Keep the `font-serif` headings, rounded-2xl cards, and pill-style badges already used across the site.
- Sidebar cards: `rounded-3xl border bg-[var(--card)] shadow-[var(--sh)] p-5`, stacked with `space-y-5`, `sticky top-24` on `lg:` breakpoint.
- Responsive: sidebar collapses below main content on `< lg` (below 1024px). Map stays at `height={260}` on all breakpoints.
- No new CSS files. No new dependencies.

## Things explicitly NOT changing

- No schema changes. `lat`/`lng` already exist on both tables.
- No new data-layer functions. All existing loaders stay.
- Form actions (`toggleFollow`, `createClaim`, `cancelClaim`) untouched — just relocated in the DOM.
- `SeoHead`, breadcrumbs, JSON-LD, analytics tracking calls all preserved.
- `LocationMap.svelte` itself is not modified — we consume it as-is.

## Verification

1. **Dev server smoke test** — `pnpm dev`, visit:
   - An organization with venues + lat/lng (multi-marker map should render; tab count badges reflect collection sizes)
   - An organization with NO lat/lng but an address (geocoding fallback should resolve)
   - An organization with NO venues and NO location (map block should hide gracefully)
   - A venue with `imageUrl` (hero banner renders) and one without (text hero fallback)
   - A venue with a linked organization (org card + "More from" tabs appear) and one without (only events section)
2. **Auth states** — on `/o/[slug]`, verify all three access states render in the sidebar card: signed-out, signed-in-not-following, signed-in-manager. Verify follow toggle and claim form submit correctly after relocation.
3. **Mapbox token missing** — temporarily unset `MAPBOX_ACCESS_TOKEN` and confirm `LocationMap`'s graceful degradation (placeholder grid + coordinates, no crash).
4. **Empty tabs** — org/venue with only one populated collection shows a single tab trigger; no empty tab panels.
5. **Mobile** — at 375px: hero wraps cleanly, tabs scroll horizontally, sidebar stacks below main, map still renders at full width.
6. **Tests** — run `pnpm test` to ensure no existing tests broke. No new tests required (these are presentational changes; no data-layer or route-contract changes).
7. **Lint/typecheck** — `pnpm check` and `pnpm lint`.
8. **Change review** — before editing `+page.svelte` files, review the touched routes directly and keep the change scoped to the two route files since the layout changes are self-contained.
