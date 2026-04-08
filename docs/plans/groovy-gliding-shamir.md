# Prominent Mapbox Views on `/o` and `/v`

## Context

The `/o` (organizations) and `/v` (venues) list pages today are card grids with search + pagination. Both underlying tables already carry `lat`/`lng` on every row, but that data is invisible on the list views — users have no spatial way to discover orgs or venues, which is a natural fit for both domains (Tribes/agencies by region, venues by address).

Goal: add a prominent interactive Mapbox map at the top of each list page, above all results, showing every geolocated record that matches the current search. Clicking a pin opens a polished preview popup (logo/name/type/short description/link to detail page). The map should feel like a first-class discovery surface, not a token widget.

## Design direction

- **Hero-sized, full-bleed interactive map** inside the page container, ~440–520px tall, sitting directly under `KbHero` and above the search/results row.
- Rounded, bordered frame matching the card system (`border-[var(--border)]`, `rounded-[18px]`, `shadow-[var(--sh)]`) — consistent with existing org/venue cards.
- **Clustered pins** (Mapbox GL `cluster: true` GeoJSON source) so 100+ points render cleanly. Cluster circles styled with the KB teal accent, individual pins reusing the existing `.coil-map-marker` pulsing teardrop aesthetic.
- **Custom popup** on pin click: logo (orgs) / type badge (venues), name, city/state, 2-line description clamp, and a "View details →" link to the slug page. Popup uses the card surface tokens for continuity.
- Search input stays; typing filters both the map pins and the list below in lockstep (both read from the same `q`).
- Map style: `mapbox://styles/mapbox/light-v11` for orgs (cleaner national overview) and the same for venues — contrasts with the darker `standard` style used on detail pages, so list map reads as "overview" vs detail's "place card."

## Why a new component, not `LocationMap.svelte`

`LocationMap` is purpose-built as a small single-place card for detail pages: cooperative gestures, scroll zoom disabled, no popups, no clustering, and a trailing directions/meta block. Bending it into a list/discovery map would compromise both use cases. A dedicated list-map organism is cleaner and reuses the same mapbox-gl loader pattern.

## Implementation

### 1. New organism: `src/lib/components/organisms/ListLocationMap.svelte`

Props:

```ts
type PreviewKind = 'organization' | 'venue';
type MapPreview = {
	id: string;
	slug: string;
	name: string;
	lat: number;
	lng: number;
	logoUrl?: string | null;
	badge?: string | null; // orgType or venueType
	verified?: boolean;
	location?: string | null; // "City, ST"
	description?: string | null; // already stripped/trimmed server-side
};
type Props = {
	token: string | null;
	kind: PreviewKind;
	points: MapPreview[];
	height?: number; // default 480
};
```

Behavior:

- Dynamic `import('mapbox-gl')` + CSS, same pattern as `LocationMap.svelte:250-254`.
- On mount: initialize map, add a clustered GeoJSON source from `points`, add three layers (cluster circles, cluster counts, unclustered points).
- Fit bounds to all points on initial load; if ≤1 point, center + zoom 4.
- Scroll zoom + drag enabled (this IS the interactive discovery surface; no cooperative gestures).
- `click` on cluster → `getClusterExpansionZoom` + `easeTo`.
- `click` on unclustered point → open a `mapboxgl.Popup` with a rendered `<aside>` element built from a `#snippet` template (pass card HTML via a dedicated popup DOM node we construct imperatively from the point's data). Link target: `/o/${slug}` or `/v/${slug}`.
- `mouseenter`/`mouseleave` → change cursor + subtle hover scale on the rendered marker layer.
- Clean up map, source, popup in `onDestroy`.
- Graceful fallback: if `token` is null or `points.length === 0`, render a skeleton/empty state (reuse the placeholder grid pattern from `LocationMap.svelte:464-476`).

Popup HTML structure (built imperatively to avoid Svelte lifecycle inside Mapbox popups):

```html
<article class="kb-map-popup">
	<header>
		<img src="{logoUrl}" />
		<!-- or type badge chip -->
		<div>
			<span class="badge">{badge}</span>
			<h3>{name}</h3>
			<p class="loc">{location}</p>
		</div>
	</header>
	<p class="desc">{description}</p>
	<a href="/o/{slug}">View details →</a>
</article>
```

Styled via a scoped `<style>` block in the component using `:global(.kb-map-popup ...)` so Mapbox's popup DOM picks up the styles. Follow the existing link styling rules (no underline, hover underline).

### 2. Server data additions

Add a dedicated geolocated-points query to each data layer. Keeping it separate from `getOrganizations`/`getVenues` keeps pagination intact and lets the map query every matching row, not just the current page.

- `src/lib/server/organizations.ts`: add
  ```ts
  export async function getOrganizationMapPoints(opts?: {
  	search?: string;
  }): Promise<MapPointRow[]>;
  ```
  Selects `id, slug, name, logoUrl, orgType, verified, city, state, description, lat, lng` where `lat IS NOT NULL AND lng IS NOT NULL`, applying the same `buildSearchWhere` helper already used by `getOrganizations` (`src/lib/server/organizations.ts:197`). No pagination. Cap at e.g. 500 rows as a safety net.
- `src/lib/server/venues.ts`: add the analogous `getVenueMapPoints({ search })` with venue fields (`venueType`, `city`, `state`, description). Reuse whatever search predicate `getVenues` uses at `src/lib/server/venues.ts:144`.
- Both return lean rows — pre-strip HTML from description using `stripHtml` from `$lib/utils/format` and truncate to ~160 chars to keep the payload small.

### 3. Server load updates

- `src/routes/o/+page.server.ts`: call `getOrganizationMapPoints({ search })` in parallel with `getOrganizations`, and read the Mapbox token:
  ```ts
  import { env } from '$env/dynamic/private';
  const mapboxToken = env.MAPBOX_ACCESS_TOKEN ?? env.MAPBOX_TOKEN ?? null;
  const [{ orgs, total }, mapPoints] = await Promise.all([...]);
  return { ..., mapboxToken, mapPoints };
  ```
- `src/routes/v/+page.server.ts`: same pattern with `getVenueMapPoints`.

### 4. Page integration

- `src/routes/o/+page.svelte`: import `ListLocationMap`, render it after `<KbHero>` and before the search/results container:
  ```svelte
  {#if data.mapboxToken && data.mapPoints.length}
  	<div class="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
  		<ListLocationMap token={data.mapboxToken} kind="organization" points={data.mapPoints} />
  	</div>
  {/if}
  ```
  No change to the existing results grid or pagination.
- `src/routes/v/+page.svelte`: same, with `kind="venue"`.

### 5. CSP

Already covered — `src/hooks.server.ts` authorizes `api.mapbox.com` and `events.mapbox.com` (confirmed in exploration). No changes needed.

## Critical files to modify / create

| File                                                  | Change                                           |
| ----------------------------------------------------- | ------------------------------------------------ |
| `src/lib/components/organisms/ListLocationMap.svelte` | **new** — hero map component                     |
| `src/lib/server/organizations.ts`                     | add `getOrganizationMapPoints`                   |
| `src/lib/server/venues.ts`                            | add `getVenueMapPoints`                          |
| `src/routes/o/+page.server.ts`                        | load points + token                              |
| `src/routes/o/+page.svelte`                           | render `<ListLocationMap kind="organization" />` |
| `src/routes/v/+page.server.ts`                        | load points + token                              |
| `src/routes/v/+page.svelte`                           | render `<ListLocationMap kind="venue" />`        |

## Reuse

- `stripHtml` from `$lib/utils/format` for description trimming in the new server helpers.
- `buildSearchWhere` helper already used inside `organizations.ts` / analogous in `venues.ts`.
- Marker CSS motif from `LocationMap.svelte:665-727` (pulse teardrop) — copy the keyframes/class conventions for a visual match, scoped to the new component.
- CSS tokens: `--border`, `--card`, `--muted-foreground`, `--teal`, `--sh`, `--rule`.
- `mapbox-gl@^3.19.1` already installed.

## Verification

1. `pnpm dev`, visit `/o` — confirm:
   - Map renders above results with all geolocated orgs as pins.
   - Clusters form when zoomed out; clicking a cluster zooms in.
   - Clicking a pin opens a popup with logo, name, badge, city/state, description, and a working "View details →" link.
   - Typing in the search input filters both map pins and the list below.
   - Map hides gracefully when `MAPBOX_ACCESS_TOKEN` is missing or zero points match the current search.
2. Repeat on `/v`, confirming venue badges / popups and venue detail links.
3. Resize to mobile width — map should remain usable (gestures + taps), popup content wraps cleanly.
4. `pnpm check` and `pnpm lint` pass.
5. Network tab: confirm `api.mapbox.com` requests are not CSP-blocked.
