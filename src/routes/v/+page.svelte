<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { untrack } from 'svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import KbHero from '$lib/components/organisms/KbHero.svelte';
	import ListLocationMap, {
		type MapBounds
	} from '$lib/components/organisms/ListLocationMap.svelte';
	import type { GeoValue } from '$lib/components/molecules/LocationRadiusControl.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { buildOgImagePath } from '$lib/seo/metadata';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';

	type PaginationToken =
		| { key: string; type: 'page'; value: number }
		| { key: string; type: 'ellipsis' };

	const CLIENT_PAGE_SIZE = 24;

	// Shape the grid renders — a narrow structural view that works for
	// both server-side VenueRow and client-side MapPoint shapes.
	type VenueCard = {
		id: string;
		slug: string;
		name: string;
		description: string | null;
		venueType: string | null;
		locationLabel: string | null;
	};

	let { data } = $props();
	const origin = $derived((data.seoOrigin ?? '') as string);
	const pagination = $derived(data.pagination);
	const mapPoints = $derived(data.mapPoints ?? []);
	const mapboxToken = $derived((data.mapboxToken ?? null) as string | null);
	const ipGeo = $derived(data.ipGeo ?? null);

	// Current visible map bounds, emitted by ListLocationMap on moveend.
	// When set (and the map is active), this drives a client-side filter
	// over the full geolocated map-point set — so panning/zooming updates
	// the venue grid below without triggering a navigation.
	let mapBounds = $state<MapBounds | null>(null);
	let clientPage = $state(1);

	const viewportVenues = $derived.by(() => {
		const b = mapBounds;
		if (!b || mapPoints.length === 0) return null;
		return mapPoints.filter((p) => {
			// Bounds straddling the antimeridian flip west > east.
			const inLng =
				b.west <= b.east
					? p.lng >= b.west && p.lng <= b.east
					: p.lng >= b.west || p.lng <= b.east;
			return inLng && p.lat >= b.south && p.lat <= b.north;
		});
	});

	// What actually feeds the card grid. When the map is driving, we page
	// client-side through the viewport slice. Otherwise fall back to the
	// server-paginated venues so first paint has real content.
	const mapDriven = $derived(viewportVenues != null);
	const clientTotalPages = $derived(
		viewportVenues ? Math.max(1, Math.ceil(viewportVenues.length / CLIENT_PAGE_SIZE)) : 1
	);

	$effect(() => {
		void viewportVenues;
		untrack(() => {
			if (clientPage > clientTotalPages) clientPage = 1;
		});
	});

	const visibleVenues = $derived.by<VenueCard[]>(() => {
		if (viewportVenues) {
			const start = (clientPage - 1) * CLIENT_PAGE_SIZE;
			return viewportVenues.slice(start, start + CLIENT_PAGE_SIZE).map((p) => ({
				id: p.id,
				slug: p.slug,
				name: p.name,
				description: p.description,
				venueType: p.badge, // server packs venueType into `badge`
				locationLabel: p.location
			}));
		}
		return data.venues.map((v) => ({
			id: v.id,
			slug: v.slug,
			name: v.name,
			description: v.description ?? null,
			venueType: v.venueType ?? null,
			locationLabel:
				[v.city, v.state].filter(Boolean).join(', ') || v.address || null
		}));
	});

	function handleBoundsChange(next: MapBounds) {
		// Reset pagination whenever the viewport narrows/widens to avoid
		// landing on an empty page after a big pan.
		if (
			!mapBounds ||
			mapBounds.west !== next.west ||
			mapBounds.east !== next.east ||
			mapBounds.north !== next.north ||
			mapBounds.south !== next.south
		) {
			clientPage = 1;
		}
		mapBounds = next;
	}
	const geoValue = $derived<GeoValue>(
		data.geo
			? {
					lat: data.geo.lat,
					lng: data.geo.lng,
					radiusMiles: data.geo.radiusMiles,
					place: data.place ?? ''
				}
			: null
	);
	const initialCenter = $derived(
		ipGeo ? { lat: ipGeo.lat, lng: ipGeo.lng, place: ipGeo.place } : null
	);

	const BROWSER_GEO_KEY = 'kb:venues:browserGeo:v1';
	let attemptedBrowserGeo = false;

	$effect(() => {
		if (typeof window === 'undefined') return;
		// Only auto-prompt once per session per browser, and only when the
		// user hasn't already chosen a location filter from the URL.
		if (attemptedBrowserGeo) return;
		if (data.geo) return;
		if (!('geolocation' in navigator)) return;

		attemptedBrowserGeo = true;
		const previousState = (() => {
			try {
				return window.localStorage.getItem(BROWSER_GEO_KEY);
			} catch {
				return null;
			}
		})();
		if (previousState === 'denied') return;

		navigator.geolocation.getCurrentPosition(
			async (pos) => {
				try {
					window.localStorage.setItem(BROWSER_GEO_KEY, 'granted');
				} catch {
					/* storage may be disabled */
				}
				const { latitude, longitude } = pos.coords;
				let placeLabel = 'My location';
				if (mapboxToken) {
					try {
						const url = new URL(
							`https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json`
						);
						url.searchParams.set('access_token', mapboxToken);
						url.searchParams.set('limit', '1');
						url.searchParams.set('types', 'place,locality,neighborhood');
						const res = await fetch(url);
						if (res.ok) {
							const json = (await res.json()) as {
								features?: Array<{ place_name: string }>;
							};
							if (json.features?.[0]?.place_name) placeLabel = json.features[0].place_name;
						}
					} catch {
						/* keep default label */
					}
				}
				applyGeo({
					lat: latitude,
					lng: longitude,
					radiusMiles: 50,
					place: placeLabel
				});
			},
			() => {
				try {
					window.localStorage.setItem(BROWSER_GEO_KEY, 'denied');
				} catch {
					/* noop */
				}
			},
			{ enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
		);
	});

	function applyGeo(next: GeoValue) {
		const url = new URL($page.url);
		if (next) {
			url.searchParams.set('lat', next.lat.toFixed(6));
			url.searchParams.set('lng', next.lng.toFixed(6));
			url.searchParams.set('radius', String(next.radiusMiles));
			if (next.place) url.searchParams.set('place', next.place);
			else url.searchParams.delete('place');
		} else {
			url.searchParams.delete('lat');
			url.searchParams.delete('lng');
			url.searchParams.delete('radius');
			url.searchParams.delete('place');
		}
		url.searchParams.delete('page');
		goto(url, { keepFocus: true, noScroll: true, replaceState: true });
	}

	function buildPageHref(next: number) {
		const url = new URL($page.url);
		if (next > 1) url.searchParams.set('page', String(next));
		else url.searchParams.delete('page');
		return `${url.pathname}${url.search}`;
	}

	function goToClientPage(next: number) {
		clientPage = Math.max(1, Math.min(clientTotalPages, next));
		if (typeof window !== 'undefined') {
			window.scrollTo({
				top: (document.querySelector('main')?.offsetTop ?? 0) + 400,
				behavior: 'smooth'
			});
		}
	}

	const currentPageNum = $derived(mapDriven ? clientPage : pagination.page);
	const currentTotalPages = $derived(mapDriven ? clientTotalPages : pagination.totalPages);

	const paginationTokens = $derived.by<PaginationToken[]>(() => {
		const totalPages = currentTotalPages;
		const currentPage = currentPageNum;
		if (totalPages <= 1) return [];
		const pages = new Set(
			[1, currentPage - 1, currentPage, currentPage + 1, totalPages].filter(
				(v) => v >= 1 && v <= totalPages
			)
		);
		const sorted = [...pages].sort((a, b) => a - b);
		const tokens: PaginationToken[] = [];
		let prev = 0;
		for (const p of sorted) {
			if (prev && p - prev > 1) {
				tokens.push({ key: `e-${prev}-${p}`, type: 'ellipsis' });
			}
			tokens.push({ key: `p-${p}`, type: 'page', value: p });
			prev = p;
		}
		return tokens;
	});
</script>

<SeoHead
	{origin}
	pathname="/v"
	title="Venues | Knowledge Basket"
	description="Browse venues hosting events and programs across the Knowledge Basket network."
	ogImage={buildOgImagePath({
		title: 'Venues',
		eyebrow: 'Knowledge Basket',
		theme: 'events',
		meta: 'Places where Knowledge Basket events happen'
	})}
	ogImageAlt="Knowledge Basket venues social preview"
	breadcrumbItems={[
		{ name: 'Knowledge Basket', pathname: '/' },
		{ name: 'Venues', pathname: '/v' }
	]}
/>

{#snippet stats()}
	<div class="font-sans text-white">
		<strong class="block text-[28px] leading-none font-bold">{pagination.total}</strong>
		<span class="text-xs opacity-70">Venues listed</span>
	</div>
{/snippet}

<div>
	<KbHero
		coil="home"
		eyebrow="Knowledge Basket · Venues"
		title="Venues"
		description="Places hosting Knowledge Basket events, gatherings, and programs."
		{stats}
	/>

	{#if mapboxToken}
		<div class="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
			<ListLocationMap
				token={mapboxToken}
				kind="venue"
				points={mapPoints}
				geo={geoValue}
				{initialCenter}
				totalGeolocated={pagination.total}
				onGeoChange={applyGeo}
				onBoundsChange={handleBoundsChange}
			/>
		</div>
	{/if}

	<div class="mx-auto max-w-6xl px-4 py-6 sm:px-6">
		{#if visibleVenues.length === 0}
			<div class="flex flex-col items-center justify-center py-16 text-center">
				<p class="mb-1 font-serif text-lg font-semibold text-[var(--foreground)]">
					No venues found
				</p>
				<p class="text-sm text-[var(--muted-foreground)]">
					{mapDriven
						? 'Pan or zoom the map to reveal more venues.'
						: 'Try adjusting your search or check back soon.'}
				</p>
			</div>
		{:else}
			<ul class="grid list-none gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
				{#each visibleVenues as venue (venue.id)}
					<li>
						<a
							href={`/v/${venue.slug}`}
							class="flex h-full flex-col rounded-[18px] border border-[var(--border)] bg-[var(--card)] p-5 text-inherit no-underline shadow-[var(--sh)] transition-transform hover:-translate-y-0.5 hover:[&_*]:no-underline"
						>
							{#if venue.venueType}
								<span
									class="mb-2 inline-block self-start rounded-full bg-[var(--muted)] px-2.5 py-1 text-[11px] font-bold tracking-[0.08em] text-[var(--muted-foreground)] uppercase"
								>
									{venue.venueType}
								</span>
							{/if}
							<h2 class="font-serif text-xl font-semibold text-[var(--foreground)]">
								{venue.name}
							</h2>
							{#if venue.description}
								<p class="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted-foreground)]">
									{venue.description}
								</p>
							{/if}
							{#if venue.locationLabel}
								<div
									class="mt-3 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]"
								>
									<MapPinIcon class="size-3.5 shrink-0" />
									<span class="truncate">{venue.locationLabel}</span>
								</div>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		{/if}

		{#if currentTotalPages > 1}
			<nav class="flex flex-wrap items-center justify-center gap-1 pt-6" aria-label="Pagination">
				<Button
					variant="ghost"
					href={!mapDriven && currentPageNum > 1
						? buildPageHref(currentPageNum - 1)
						: undefined}
					disabled={currentPageNum <= 1}
					onclick={mapDriven ? () => goToClientPage(currentPageNum - 1) : undefined}
				>
					Previous
				</Button>
				{#each paginationTokens as token (token.key)}
					{#if token.type === 'ellipsis'}
						<span class="px-2 text-sm text-[var(--muted-foreground)]">…</span>
					{:else}
						<Button
							variant={token.value === currentPageNum ? 'outline' : 'ghost'}
							size="icon-sm"
							href={!mapDriven ? buildPageHref(token.value) : undefined}
							onclick={mapDriven ? () => goToClientPage(token.value) : undefined}
							aria-current={token.value === currentPageNum ? 'page' : undefined}
						>
							{token.value}
						</Button>
					{/if}
				{/each}
				<Button
					variant="ghost"
					href={!mapDriven && currentPageNum < currentTotalPages
						? buildPageHref(currentPageNum + 1)
						: undefined}
					disabled={currentPageNum >= currentTotalPages}
					onclick={mapDriven ? () => goToClientPage(currentPageNum + 1) : undefined}
				>
					Next
				</Button>
			</nav>
		{/if}
	</div>
</div>
