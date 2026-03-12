<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import mapboxgl from 'mapbox-gl';
	import 'mapbox-gl/dist/mapbox-gl.css';

	/** Mapbox token (e.g. from server load as MAPBOX_ACCESS_TOKEN). */
	interface Props {
		token?: string | null;
	}
	const { token }: Props = $props();

	let container: HTMLDivElement;
	let map: mapboxgl.Map | null = null;

	const accessToken = $derived(token ?? '');

	// California state center and bounds for a focused, beautiful view
	const CALIFORNIA_CENTER: [number, number] = [-119.42, 37.25];
	const CALIFORNIA_ZOOM = 5.2;

	onMount(() => {
		if (!container || !accessToken) return;
		mapboxgl.accessToken = accessToken;
		map = new mapboxgl.Map({
			container,
			style: 'mapbox://styles/mapbox/outdoors-v12',
			center: CALIFORNIA_CENTER,
			zoom: CALIFORNIA_ZOOM,
			attributionControl: false
		});
		map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
	});

	onDestroy(() => {
		if (map) {
			map.remove();
			map = null;
		}
	});
</script>

<div class="kb-california-map" bind:this={container}>
	{#if !accessToken}
		<div class="kb-california-map__placeholder">
			<span>California</span>
			<small>Set MAPBOX_ACCESS_TOKEN in .env for the map</small>
		</div>
	{/if}
</div>

<style>
	.kb-california-map {
		width: 100%;
		height: 100%;
		min-height: 200px;
		position: relative;
	}
	.kb-california-map :global(.mapboxgl-canvas) {
		border-radius: inherit;
	}
	.kb-california-map :global(.mapboxgl-ctrl-group) {
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
		border-radius: 6px;
	}
	.kb-california-map__placeholder {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		background: linear-gradient(145deg, #e8eef2 0%, #dbe7ee 100%);
		color: var(--color-lakebed-600, #4a5568);
		font-size: 0.9375rem;
	}
	.kb-california-map__placeholder small {
		font-size: 0.75rem;
		opacity: 0.85;
	}
</style>
