<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import NavigationIcon from '@lucide/svelte/icons/navigation';
	import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';
	import { Button } from '$lib/components/ui/button/index.js';

	type MapPoint = {
		id?: string;
		lat: number;
		lng: number;
		label?: string;
		address?: string;
		accent?: string;
	};

	const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

	function isFiniteNumber(value: number | null | undefined): value is number {
		return typeof value === 'number' && Number.isFinite(value);
	}

	let {
		lat = null,
		lng = null,
		label,
		address,
		searchText,
		token,
		accent = 'var(--teal)',
		style = 'mapbox://styles/mapbox/standard',
		height = 220,
		zoom = 6,
		pitch = 24,
		bearing = -10,
		eyebrow = 'Location',
		directionsLabel = 'Directions',
		secondaryActionHref,
		secondaryActionLabel,
		markers = []
	}: {
		lat?: number | null;
		lng?: number | null;
		label?: string;
		address?: string;
		searchText?: string;
		token?: string | null;
		accent?: string;
		style?: string;
		height?: number;
		zoom?: number;
		pitch?: number;
		bearing?: number;
		eyebrow?: string;
		directionsLabel?: string;
		secondaryActionHref?: string;
		secondaryActionLabel?: string;
		markers?: MapPoint[];
	} = $props();

	let container: HTMLDivElement | undefined = $state();
	let mapboxgl: typeof import('mapbox-gl').default | null = null;
	let mapInstance: import('mapbox-gl').Map | null = null;
	let markerInstances = $state<import('mapbox-gl').Marker[]>([]);
	let loadError = $state(false);
	let mounted = false;
	let geocodeFailed = $state(false);
	let resolvedCoords = $state<{ lat: number; lng: number } | null>(null);
	let resolvingLocation = $state(false);
	let requestVersion = 0;

	function normalizedSearchText(): string {
		return searchText?.trim() || address?.trim() || label?.trim() || '';
	}

	function currentPoints(): MapPoint[] {
		const explicit = markers.filter((point) => isFiniteNumber(point.lat) && isFiniteNumber(point.lng));
		if (explicit.length > 0) return explicit;

		const activeLat = isFiniteNumber(lat) ? lat : resolvedCoords?.lat;
		const activeLng = isFiniteNumber(lng) ? lng : resolvedCoords?.lng;
		if (!isFiniteNumber(activeLat) || !isFiniteNumber(activeLng)) return [];

		return [
			{
				id: 'primary',
				lat: activeLat,
				lng: activeLng,
				label,
				address,
				accent
			}
		];
	}

	const points = $derived(currentPoints());
	const primaryPoint = $derived(points[0] ?? null);
	const hasMap = $derived(Boolean(token && primaryPoint));
	const isLoading = $derived(Boolean(token && resolvingLocation && !primaryPoint && !loadError));
	const resolvedLabel = $derived(primaryPoint?.label?.trim() || label?.trim() || 'Location');
	const resolvedAddress = $derived(primaryPoint?.address?.trim() || address?.trim() || null);
	const isApproximate = $derived(
		Boolean(primaryPoint) && (!isFiniteNumber(lat) || !isFiniteNumber(lng))
	);
	const provenanceLabel = $derived.by(() => {
		if (points.length > 1) return `${points.length} places in view`;
		if (geocodeFailed) return 'Map preview unavailable';
		return null;
	});
	const secondaryActionExternal = $derived(Boolean(secondaryActionHref?.match(/^https?:\/\//i)));
	const directionsUrl = $derived.by(() => {
		if (primaryPoint) {
			return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${primaryPoint.lat},${primaryPoint.lng}`)}`;
		}
		const query = normalizedSearchText();
		if (!query) return '';
		return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
	});

	async function geocodeQuery(query: string): Promise<{ lat: number; lng: number } | null> {
		if (geocodeCache.has(query)) {
			return geocodeCache.get(query) ?? null;
		}
		if (!token) return null;

		const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${encodeURIComponent(token)}&limit=1&autocomplete=false&types=address,poi,place,locality,neighborhood,postcode`;
		const response = await fetch(endpoint);
		if (!response.ok) throw new Error(`Geocoding failed with ${response.status}`);

		const data = (await response.json()) as {
			features?: Array<{ center?: [number, number] }>;
		};
		const center = data.features?.[0]?.center;
		const result =
			Array.isArray(center) && center.length === 2 && Number.isFinite(center[0]) && Number.isFinite(center[1])
				? { lng: center[0], lat: center[1] }
				: null;
		geocodeCache.set(query, result);
		return result;
	}

	async function ensureResolvedCoordinates() {
		if (isFiniteNumber(lat) && isFiniteNumber(lng)) {
			resolvingLocation = false;
			geocodeFailed = false;
			resolvedCoords = null;
			return;
		}

		const query = normalizedSearchText();
		if (!token || !query) {
			resolvingLocation = false;
			return;
		}

		const currentVersion = ++requestVersion;
		resolvingLocation = true;
		geocodeFailed = false;

		try {
			const coords = await geocodeQuery(query);
			if (currentVersion !== requestVersion) return;
			resolvedCoords = coords;
			geocodeFailed = !coords;
		} catch (error) {
			if (currentVersion !== requestVersion) return;
			console.error('[LocationMap] failed to geocode location', error);
			resolvedCoords = null;
			geocodeFailed = true;
		} finally {
			if (currentVersion === requestVersion) resolvingLocation = false;
		}
	}

	function clearMarkers() {
		for (const marker of markerInstances) marker.remove();
		markerInstances = [];
	}

	function buildMarker(point: MapPoint, index: number) {
		if (!mapboxgl || !mapInstance) return null;

		const markerEl = document.createElement('div');
		markerEl.className = 'coil-map-marker';
		markerEl.style.setProperty('--coil-marker-accent', point.accent ?? accent);
		if (index > 0) markerEl.classList.add('is-secondary');

		const pulse = document.createElement('span');
		pulse.className = 'coil-map-marker-pulse';
		const pin = document.createElement('span');
		pin.className = 'coil-map-marker-pin';
		const core = document.createElement('span');
		core.className = 'coil-map-marker-core';
		pin.appendChild(core);
		markerEl.append(pulse, pin);

		return new mapboxgl.Marker({ element: markerEl, anchor: 'bottom' })
			.setLngLat([point.lng, point.lat])
			.addTo(mapInstance);
	}

	function positionMap() {
		if (!mapInstance || !mapboxgl) return;
		const activePoints = currentPoints();
		if (activePoints.length === 0) return;

		if (activePoints.length === 1) {
			const point = activePoints[0];
			mapInstance.jumpTo({
				center: [point.lng, point.lat],
				zoom,
				pitch,
				bearing
			});
			return;
		}

		const bounds = new mapboxgl.LngLatBounds();
		for (const point of activePoints) bounds.extend([point.lng, point.lat]);
		mapInstance.fitBounds(bounds, {
			padding: { top: 48, right: 32, bottom: 48, left: 32 },
			maxZoom: zoom,
			duration: 0
		});
		mapInstance.easeTo({ pitch, bearing, duration: 0 });
	}

	function paintMap() {
		if (!mapInstance || !mapboxgl) return;
		positionMap();
		clearMarkers();
		const nextMarkers = currentPoints()
			.map((point, index) => buildMarker(point, index))
			.filter((marker): marker is import('mapbox-gl').Marker => marker != null);
		markerInstances = nextMarkers;
		mapInstance.resize();
	}

	async function ensureMap() {
		if (!mounted || !container || !token || !primaryPoint) return;

		try {
			if (!mapboxgl) {
				const mapboxModule = await import('mapbox-gl');
				await import('mapbox-gl/dist/mapbox-gl.css');
				mapboxgl = mapboxModule.default;
				mapboxgl.accessToken = token;
			}

			if (!mapInstance) {
				mapInstance = new mapboxgl.Map({
					container,
					style,
					center: [primaryPoint.lng, primaryPoint.lat],
					zoom,
					pitch,
					bearing,
					attributionControl: false,
					cooperativeGestures: true,
					antialias: true
				});

				mapInstance.scrollZoom.disable();
				mapInstance.dragRotate.disable();
				mapInstance.touchZoomRotate.disableRotation();
				mapInstance.keyboard.disable();
				mapInstance.addControl(
					new mapboxgl.NavigationControl({ showCompass: false, visualizePitch: false }),
					'top-right'
				);
				mapInstance.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
				mapInstance.on('load', paintMap);
				mapInstance.on('style.load', paintMap);
				return;
			}

			paintMap();
		} catch (err) {
			console.error('[LocationMap] failed to load mapbox-gl', err);
			loadError = true;
		}
	}

	onMount(() => {
		mounted = true;
		void ensureResolvedCoordinates().then(() => ensureMap());
	});

	$effect(() => {
		void token;
		void style;
		void accent;
		void lat;
		void lng;
		void label;
		void address;
		void searchText;
		void markers;
		void zoom;
		void pitch;
		void bearing;
		void container;
		if (!mounted) return;
		void ensureResolvedCoordinates().then(() => ensureMap());
	});

	onDestroy(() => {
		clearMarkers();
		mapInstance?.remove();
		mapInstance = null;
		mounted = false;
	});
</script>

<div class="coil-map" style="--coil-map-height: {height}px; --coil-map-accent: {accent}">
	<div class="coil-map-canvas-wrap">
		{#if hasMap && !loadError}
			<div class="coil-map-canvas" bind:this={container}></div>
		{:else if isLoading}
			<div class="coil-map-canvas coil-map-canvas--placeholder coil-map-canvas--loading">
				<div class="coil-map-grid" aria-hidden="true"></div>
				<div class="coil-map-placeholder-pin">
					<LoaderCircle class="size-4 animate-spin" />
					<span>Pinpointing location</span>
				</div>
			</div>
		{:else}
			<div class="coil-map-canvas coil-map-canvas--placeholder">
				<div class="coil-map-grid" aria-hidden="true"></div>
				<div class="coil-map-placeholder-pin">
					<MapPinIcon class="size-4" />
					{#if geocodeFailed}
						<span>Map preview unavailable</span>
					{:else if isFiniteNumber(lat) && isFiniteNumber(lng)}
						<span>{lat.toFixed(4)}°, {lng.toFixed(4)}°</span>
					{:else}
						<span>Location preview</span>
					{/if}
				</div>
			</div>
		{/if}
		<div class="coil-map-fade" aria-hidden="true"></div>
	</div>

	<div class="coil-map-meta">
		<div class="coil-map-meta-head">
			{#if eyebrow}
				<p class="coil-map-eyebrow">
					<span class="coil-map-eyebrow-dot" aria-hidden="true"></span>
					{eyebrow}
				</p>
			{/if}
			{#if secondaryActionHref}
				<a
					class="coil-map-title coil-map-title--link"
					href={secondaryActionHref}
					target={secondaryActionExternal ? '_blank' : undefined}
					rel={secondaryActionExternal ? 'noopener' : undefined}
				>
					{resolvedLabel}
				</a>
			{:else}
				<p class="coil-map-title">{resolvedLabel}</p>
			{/if}
			{#if resolvedAddress}
				{#if directionsUrl}
					<a
						class="coil-map-address coil-map-address--link"
						href={directionsUrl}
						target="_blank"
						rel="noopener"
						aria-label="Open directions in Google Maps"
					>
						<MapPinIcon class="size-[13px] shrink-0 mt-[2px]" />
						<span>{resolvedAddress}</span>
					</a>
				{:else}
					<p class="coil-map-address">
						<MapPinIcon class="size-[13px] shrink-0 mt-[2px]" />
						<span>{resolvedAddress}</span>
					</p>
				{/if}
			{/if}
		</div>

		{#if provenanceLabel}
			<p class="coil-map-provenance">{provenanceLabel}</p>
		{/if}

		<div class="coil-map-actions">
			{#if secondaryActionHref && secondaryActionLabel}
				<Button
					href={secondaryActionHref}
					variant="outline"
					size="sm"
					class="coil-map-btn coil-map-btn--secondary"
					target={secondaryActionExternal ? '_blank' : undefined}
					rel={secondaryActionExternal ? 'noopener' : undefined}
				>
					{secondaryActionLabel}
					<ArrowUpRightIcon class="size-[13px]" />
				</Button>
			{/if}
			{#if directionsUrl}
				<Button
					href={directionsUrl}
					variant="default"
					size="sm"
					class="coil-map-btn coil-map-btn--primary"
					target="_blank"
					rel="noopener"
					aria-label="Open directions in Google Maps"
				>
					<NavigationIcon class="size-[13px]" />
					{directionsLabel}
				</Button>
			{/if}
		</div>
	</div>
</div>

<style>
	.coil-map {
		position: relative;
		border-radius: 8px;
		overflow: hidden;
		border: 1px solid var(--border);
		background: var(--card);
		isolation: isolate;
	}

	.coil-map-canvas-wrap {
		position: relative;
		width: 100%;
		height: var(--coil-map-height, 220px);
		overflow: hidden;
		background: color-mix(in srgb, var(--coil-map-accent, var(--teal)) 6%, var(--card));
	}

	.coil-map-canvas {
		width: 100%;
		height: 100%;
	}

	.coil-map-canvas--placeholder {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		background:
			linear-gradient(
				145deg,
				color-mix(in srgb, var(--coil-map-accent, var(--teal)) 14%, var(--card)) 0%,
				color-mix(in srgb, var(--coil-map-accent, var(--teal)) 5%, var(--card)) 60%,
				var(--card) 100%
			);
	}

	.coil-map-grid {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(90deg, color-mix(in srgb, var(--foreground) 7%, transparent) 1px, transparent 1px),
			linear-gradient(color-mix(in srgb, var(--foreground) 7%, transparent) 1px, transparent 1px);
		background-size: 22px 22px;
		mask-image: radial-gradient(ellipse at center, black 40%, transparent 90%);
	}

	.coil-map-placeholder-pin {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.45rem 0.75rem;
		border-radius: 6px;
		background: var(--card);
		border: 1px solid var(--border);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--muted-foreground);
		letter-spacing: 0.01em;
	}

	.coil-map-fade {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 32px;
		background: linear-gradient(to bottom, transparent, color-mix(in srgb, var(--card) 65%, transparent));
		pointer-events: none;
		z-index: 1;
	}

	.coil-map-meta {
		padding: 0.85rem 0.95rem 0.95rem;
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
		border-top: 1px solid var(--border);
		background: var(--card);
	}

	.coil-map-meta-head {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		min-width: 0;
	}

	.coil-map-eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		margin: 0;
		font-size: 0.66rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--muted-foreground);
	}

	.coil-map-eyebrow-dot {
		display: inline-block;
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: var(--coil-map-accent, var(--teal));
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--coil-map-accent, var(--teal)) 18%, transparent);
	}

	.coil-map-title {
		display: block;
		margin: 0;
		font-size: 0.98rem;
		font-weight: 700;
		line-height: 1.25;
		color: var(--foreground);
		letter-spacing: -0.005em;
		word-break: break-word;
	}

	a.coil-map-title--link {
		text-decoration: none;
		transition: color 0.15s ease;
	}

	a.coil-map-title--link:hover {
		color: var(--coil-map-accent, var(--teal));
		text-decoration: underline;
		text-decoration-thickness: 1px;
		text-underline-offset: 3px;
	}

	.coil-map-address {
		display: flex;
		align-items: flex-start;
		gap: 0.4rem;
		margin: 0.1rem 0 0 0;
		font-size: 0.8rem;
		line-height: 1.4;
		color: var(--muted-foreground);
	}

	a.coil-map-address--link {
		text-decoration: none;
		transition: color 0.15s ease;
	}

	a.coil-map-address--link:hover {
		color: var(--foreground);
		text-decoration: underline;
		text-decoration-thickness: 1px;
		text-underline-offset: 3px;
	}

	.coil-map-provenance {
		margin: 0;
		padding-top: 0.55rem;
		border-top: 1px dashed var(--border);
		font-size: 0.7rem;
		font-weight: 500;
		letter-spacing: 0.02em;
		color: var(--muted-foreground);
		text-transform: uppercase;
		opacity: 0.85;
	}

	.coil-map-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	:global(.coil-map-btn) {
		flex: 1;
		min-width: 0;
		border-radius: 6px !important;
	}

	:global(.coil-map-btn--primary) {
		background: var(--coil-map-accent, var(--teal)) !important;
		color: white !important;
	}

	:global(.coil-map-btn--primary:hover) {
		background: color-mix(in srgb, var(--coil-map-accent, var(--teal)) 88%, black) !important;
	}

	/* Mapbox control overrides — square, low-key */
	:global(.coil-map .mapboxgl-ctrl-top-right) {
		top: 10px;
		right: 10px;
		z-index: 3;
	}

	:global(.coil-map .mapboxgl-ctrl-group) {
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--card);
		box-shadow: 0 6px 16px rgba(10, 18, 28, 0.08);
	}

	:global(.coil-map .mapboxgl-ctrl-group button) {
		width: 28px;
		height: 28px;
		background-color: transparent;
	}

	:global(.coil-map .mapboxgl-ctrl-group button + button) {
		border-top: 1px solid var(--border);
	}

	:global(.coil-map .mapboxgl-ctrl-group button .mapboxgl-ctrl-icon) {
		filter: none;
		opacity: 0.7;
	}

	:global(.coil-map .mapboxgl-ctrl-attrib) {
		margin: 0 8px 8px 0;
		padding: 0.1rem 0.4rem;
		border-radius: 4px;
		background: color-mix(in srgb, var(--card) 88%, transparent);
		font-size: 10px;
	}

	:global(.coil-map .mapboxgl-ctrl-attrib summary) {
		padding: 0.1rem 0.2rem;
	}

	:global(.coil-map-marker) {
		position: relative;
		width: 24px;
		height: 34px;
		transform: translate(-50%, -100%);
	}

	:global(.coil-map-marker.is-secondary) {
		transform: translate(-50%, -100%) scale(0.9);
	}

	:global(.coil-map-marker-pulse) {
		position: absolute;
		left: 50%;
		top: 58%;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: var(--coil-marker-accent, var(--teal));
		opacity: 0.18;
		transform: translate(-50%, -50%);
		animation: coil-marker-pulse 2.4s ease-out infinite;
	}

	:global(.coil-map-marker-pin) {
		position: absolute;
		left: 50%;
		bottom: 0;
		width: 20px;
		height: 20px;
		border-radius: 50% 50% 50% 0;
		background: var(--coil-marker-accent, var(--teal));
		transform: translate(-50%, 0) rotate(-45deg);
		box-shadow:
			0 0 0 3px var(--card),
			0 6px 14px rgba(10, 18, 28, 0.25);
	}

	:global(.coil-map-marker-core) {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--card);
		transform: translate(-50%, -50%);
	}

	@keyframes coil-marker-pulse {
		0% {
			transform: translate(-50%, -50%) scale(0.72);
			opacity: 0.32;
		}
		70% {
			transform: translate(-50%, -50%) scale(2.1);
			opacity: 0;
		}
		100% {
			transform: translate(-50%, -50%) scale(0.72);
			opacity: 0;
		}
	}

	@media (max-width: 480px) {
		.coil-map-actions {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
