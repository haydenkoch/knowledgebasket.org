<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import NavigationIcon from '@lucide/svelte/icons/navigation';

	/**
	 * Mapbox-backed locator for coil detail pages (events, jobs, red-pages).
	 *
	 * Renders an interactive Mapbox GL map centered on `lat`/`lng` with a
	 * branded pin. When no `token` is supplied (Mapbox not configured yet),
	 * falls back to a branded coordinates card with a "Get directions" link
	 * so the component is safe to use everywhere regardless of env state.
	 *
	 * Mapbox GL is dynamically imported so the ~250KB bundle + CSS only load
	 * on pages that actually render a map, and only in the browser.
	 */
	let {
		lat,
		lng,
		label,
		address,
		token,
		accent = '#8b1a1e',
		style = 'mapbox://styles/mapbox/dark-v11',
		height = 280
	}: {
		lat: number;
		lng: number;
		label?: string;
		address?: string;
		token?: string | null;
		/** Color used for the marker dot and ring. */
		accent?: string;
		/** Mapbox style URL. */
		style?: string;
		/** Map height in px. */
		height?: number;
	} = $props();

	let container: HTMLDivElement | undefined = $state();
	let mapInstance: { remove: () => void } | null = null;
	let loadError = $state(false);

	const directionsUrl = $derived(
		`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}`
	);

	onMount(async () => {
		if (!token || !container) return;
		try {
			const mapboxModule = await import('mapbox-gl');
			// Mapbox CSS must be loaded exactly once per document.
			await import('mapbox-gl/dist/mapbox-gl.css');
			const mapboxgl = mapboxModule.default;
			mapboxgl.accessToken = token;

			const map = new mapboxgl.Map({
				container,
				style,
				center: [lng, lat],
				zoom: 13,
				attributionControl: true,
				cooperativeGestures: true
			});

			map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

			// Build the marker DOM via safe element APIs (no innerHTML).
			const markerEl = document.createElement('div');
			markerEl.className = 'coil-map-marker';
			markerEl.style.setProperty('--coil-marker-accent', accent);
			const ring = document.createElement('span');
			ring.className = 'coil-map-marker-ring';
			const dot = document.createElement('span');
			dot.className = 'coil-map-marker-dot';
			markerEl.appendChild(ring);
			markerEl.appendChild(dot);

			new mapboxgl.Marker({ element: markerEl, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(map);

			mapInstance = map;
		} catch (err) {
			console.error('[LocationMap] failed to load mapbox-gl', err);
			loadError = true;
		}
	});

	onDestroy(() => {
		mapInstance?.remove();
	});
</script>

{#if token && !loadError}
	<div class="coil-map" style="--coil-map-height: {height}px; --coil-map-accent: {accent}">
		<div class="coil-map-canvas" bind:this={container}></div>
		<div class="coil-map-footer">
			{#if label || address}
				<div class="coil-map-footer-text">
					{#if label}<p class="coil-map-label"><MapPinIcon class="size-[13px]" /> {label}</p>{/if}
					{#if address}<p class="coil-map-address">{address}</p>{/if}
				</div>
			{/if}
			<a
				class="coil-map-directions"
				href={directionsUrl}
				target="_blank"
				rel="noopener"
				aria-label="Open directions in Google Maps"
			>
				<NavigationIcon class="size-[13px]" /> Directions
			</a>
		</div>
	</div>
{:else}
	<!-- Fallback: branded coordinates card when Mapbox token isn't configured. -->
	<div
		class="coil-map coil-map--fallback"
		style="--coil-map-height: {Math.max(
			140,
			Math.round(height * 0.55)
		)}px; --coil-map-accent: {accent}"
	>
		<div class="coil-map-fallback-topo" aria-hidden="true">
			<svg viewBox="0 0 400 160" xmlns="http://www.w3.org/2000/svg">
				<defs>
					<pattern id="coil-topo" width="40" height="40" patternUnits="userSpaceOnUse">
						<circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" stroke-width="0.5" />
						<circle cx="20" cy="20" r="12" fill="none" stroke="currentColor" stroke-width="0.5" />
						<circle cx="20" cy="20" r="6" fill="none" stroke="currentColor" stroke-width="0.5" />
					</pattern>
				</defs>
				<rect width="400" height="160" fill="url(#coil-topo)" />
			</svg>
		</div>
		<div class="coil-map-fallback-body">
			<div class="coil-map-fallback-pin">
				<MapPinIcon class="size-5" />
			</div>
			<div class="coil-map-fallback-text">
				{#if label}<p class="coil-map-label">{label}</p>{/if}
				{#if address}<p class="coil-map-address">{address}</p>{/if}
				<p class="coil-map-coords">{lat.toFixed(4)}°, {lng.toFixed(4)}°</p>
			</div>
		</div>
		<a class="coil-map-directions" href={directionsUrl} target="_blank" rel="noopener">
			<NavigationIcon class="size-[13px]" /> Directions
		</a>
	</div>
{/if}

<style>
	.coil-map {
		position: relative;
		border-radius: 14px;
		overflow: hidden;
		border: 1px solid var(--border);
		background: var(--card);
	}
	.coil-map-canvas {
		width: 100%;
		height: var(--coil-map-height, 280px);
	}
	.coil-map-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.75rem 0.875rem;
		border-top: 1px solid var(--border);
		background: var(--card);
		font-size: 0.8125rem;
	}
	.coil-map-footer-text {
		min-width: 0;
		flex: 1 1 auto;
	}
	.coil-map-label {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		margin: 0;
		font-weight: 600;
		color: var(--foreground);
		font-size: 0.8125rem;
	}
	.coil-map-address {
		margin: 0.125rem 0 0 0;
		color: var(--muted-foreground);
		font-size: 0.75rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.coil-map-coords {
		margin: 0.25rem 0 0 0;
		font-family: var(--font-sans);
		font-size: 0.6875rem;
		letter-spacing: 0.04em;
		color: var(--muted-foreground);
		text-transform: uppercase;
	}

	.coil-map-directions {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.4rem 0.75rem;
		border-radius: 999px;
		background: var(--coil-map-accent, var(--teal));
		color: white;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		text-decoration: none;
		white-space: nowrap;
		transition:
			opacity 0.15s,
			transform 0.15s;
	}
	.coil-map-directions:hover {
		opacity: 0.9;
		text-decoration: none;
		transform: translateY(-1px);
	}

	/* ── Fallback card ────────────────────────────────── */
	.coil-map--fallback {
		padding: 1rem 1rem 0.875rem;
		background: linear-gradient(
			135deg,
			color-mix(in srgb, var(--coil-map-accent, var(--teal)) 18%, var(--card)) 0%,
			var(--card) 100%
		);
		min-height: var(--coil-map-height, 160px);
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 0.75rem;
	}
	.coil-map-fallback-topo {
		position: absolute;
		inset: 0;
		pointer-events: none;
		color: var(--coil-map-accent, var(--teal));
		opacity: 0.18;
	}
	.coil-map-fallback-topo svg {
		width: 100%;
		height: 100%;
	}
	.coil-map-fallback-body {
		position: relative;
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
	}
	.coil-map-fallback-pin {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: var(--coil-map-accent, var(--teal));
		color: white;
		flex-shrink: 0;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
	}
	.coil-map-fallback-text {
		min-width: 0;
	}
	.coil-map--fallback .coil-map-directions {
		position: relative;
		align-self: flex-start;
	}

	/* ── Marker injected into the map DOM via :global ──── */
	:global(.coil-map-marker) {
		position: relative;
		width: 22px;
		height: 22px;
		transform: translate(-50%, -100%);
	}
	:global(.coil-map-marker-dot) {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--coil-marker-accent, #8b1a1e);
		transform: translate(-50%, -50%);
		box-shadow:
			0 0 0 3px rgba(255, 255, 255, 0.95),
			0 3px 10px rgba(0, 0, 0, 0.4);
	}
	:global(.coil-map-marker-ring) {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: var(--coil-marker-accent, #8b1a1e);
		opacity: 0.28;
		transform: translate(-50%, -50%);
		animation: coil-marker-pulse 2.2s ease-out infinite;
	}
	@keyframes coil-marker-pulse {
		0% {
			transform: translate(-50%, -50%) scale(0.8);
			opacity: 0.4;
		}
		70% {
			transform: translate(-50%, -50%) scale(1.9);
			opacity: 0;
		}
		100% {
			transform: translate(-50%, -50%) scale(0.8);
			opacity: 0;
		}
	}
</style>
