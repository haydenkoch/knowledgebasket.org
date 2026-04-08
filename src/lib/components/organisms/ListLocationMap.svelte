<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import XIcon from '@lucide/svelte/icons/x';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import BadgeCheckIcon from '@lucide/svelte/icons/badge-check';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import LocationRadiusControl, {
		type GeoValue
	} from '$lib/components/molecules/LocationRadiusControl.svelte';
	import { Button } from '$lib/components/ui/button/index.js';

	export type MapBounds = {
		west: number;
		south: number;
		east: number;
		north: number;
	};

	export type PreviewKind = 'organization' | 'venue';

	export type MapPreview = {
		id: string;
		slug: string;
		name: string;
		lat: number;
		lng: number;
		logoUrl?: string | null;
		badge?: string | null;
		verified?: boolean;
		location?: string | null;
		description?: string | null;
	};

	let {
		token,
		kind,
		points,
		height = 520,
		geo = null,
		totalGeolocated,
		onGeoChange,
		onBoundsChange,
		initialCenter = null
	}: {
		token: string | null;
		kind: PreviewKind;
		points: MapPreview[];
		height?: number;
		geo?: GeoValue;
		totalGeolocated?: number;
		onGeoChange?: (next: GeoValue) => void;
		/**
		 * Fires on debounced `moveend` with the current visible map bounds.
		 * Consumers use this to drive a viewport-filtered result list below
		 * the map. Not fired for programmatic moves during initial load.
		 */
		onBoundsChange?: (bounds: MapBounds) => void;
		/**
		 * Coarse starting center (e.g. IP geolocation) used only when no
		 * radius filter is active. Not drawn — just affects the initial view.
		 */
		initialCenter?: { lat: number; lng: number; place?: string | null } | null;
	} = $props();

	const sourceId = 'kb-list-points';
	const clusterLayerId = 'kb-clusters';
	const clusterCountLayerId = 'kb-cluster-count';
	const pointLayerId = 'kb-unclustered';
	const pointHaloLayerId = 'kb-unclustered-halo';
	const selectedHaloLayerId = 'kb-unclustered-selected-halo';
	const selectedRingLayerId = 'kb-unclustered-selected-ring';
	const radiusSourceId = 'kb-radius';
	const radiusFillLayerId = 'kb-radius-fill';
	const radiusLineLayerId = 'kb-radius-line';

	let container: HTMLDivElement | undefined = $state();
	let mapboxgl: typeof import('mapbox-gl').default | null = null;
	let mapInstance: import('mapbox-gl').Map | null = null;
	let loadError = $state(false);
	let mounted = false;
	let isReady = $state(false);

	type UpcomingEvent = {
		id: string;
		slug: string | null;
		title: string;
		startDate: string | null;
		endDate: string | null;
	};

	// Cache keyed by venue id so switching between venues in a cluster
	// list doesn't re-fetch the same events repeatedly.
	const upcomingCache = new Map<string, UpcomingEvent[]>();
	let upcomingEvents = $state<UpcomingEvent[]>([]);
	let upcomingLoading = $state(false);
	let upcomingError = $state(false);
	let upcomingRequestId = 0;

	// HTML markers for the draggable radius center + always-on home pin.
	let centerMarker: import('mapbox-gl').Marker | null = null;
	let homeMarker: import('mapbox-gl').Marker | null = null;
	const DEFAULT_RADIUS_MI = 50;

	// The side panel has two modes:
	//  - single: one venue (user clicked a pin)
	//  - cluster: the list of venues inside a clicked cluster
	type PanelMode =
		| { type: 'none' }
		| { type: 'single'; id: string }
		| { type: 'cluster'; ids: string[] };

	let panelMode = $state<PanelMode>({ type: 'none' });

	const selectedId = $derived(panelMode.type === 'single' ? panelMode.id : null);
	const selected = $derived.by(() => {
		const m = panelMode;
		if (m.type !== 'single') return null;
		return points.find((p) => p.id === m.id) ?? null;
	});
	const clusterList = $derived.by(() => {
		const m = panelMode;
		if (m.type !== 'cluster') return [];
		const byId = new Map(points.map((p) => [p.id, p]));
		return m.ids.map((id) => byId.get(id)).filter((p): p is MapPreview => p != null);
	});

	function closePanel() {
		panelMode = { type: 'none' };
	}

	async function loadUpcomingFor(venue: MapPreview) {
		// Organisations use a different route; only venues ship an upcoming feed.
		if (kind !== 'venue') {
			upcomingEvents = [];
			upcomingLoading = false;
			upcomingError = false;
			return;
		}

		const cached = upcomingCache.get(venue.id);
		if (cached) {
			upcomingEvents = cached;
			upcomingLoading = false;
			upcomingError = false;
			return;
		}

		const requestId = ++upcomingRequestId;
		upcomingLoading = true;
		upcomingError = false;
		upcomingEvents = [];

		try {
			const res = await fetch(`/v/${encodeURIComponent(venue.slug)}/upcoming.json`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const json = (await res.json()) as { events: UpcomingEvent[] };
			if (requestId !== upcomingRequestId) return; // raced — newer selection
			const events = Array.isArray(json.events) ? json.events : [];
			upcomingCache.set(venue.id, events);
			upcomingEvents = events;
		} catch (err) {
			if (requestId !== upcomingRequestId) return;
			console.error('[ListLocationMap] failed to load upcoming events', err);
			upcomingError = true;
		} finally {
			if (requestId === upcomingRequestId) upcomingLoading = false;
		}
	}

	function formatEventDate(start: string | null, end: string | null): string {
		if (!start) return '';
		try {
			const startDate = new Date(start);
			const opts: Intl.DateTimeFormatOptions = {
				month: 'short',
				day: 'numeric',
				year: startDate.getFullYear() === new Date().getFullYear() ? undefined : 'numeric'
			};
			const startText = startDate.toLocaleDateString(undefined, opts);
			if (!end || end === start) return startText;
			const endDate = new Date(end);
			// Same day — show just the one date.
			if (startDate.toDateString() === endDate.toDateString()) return startText;
			const endText = endDate.toLocaleDateString(undefined, opts);
			return `${startText} – ${endText}`;
		} catch {
			return '';
		}
	}

	let boundsDebounce: ReturnType<typeof setTimeout> | undefined;

	const detailPrefix = $derived(kind === 'organization' ? '/o/' : '/v/');
	const eyebrow = $derived(kind === 'organization' ? 'Map of organizations' : 'Map of venues');
	const itemNoun = $derived(kind === 'organization' ? 'organizations' : 'venues');
	const emptyLabel = $derived(
		kind === 'organization'
			? geo
				? 'No geolocated organizations within this radius.'
				: 'No geolocated organizations match your search yet.'
			: geo
				? 'No geolocated venues within this radius.'
				: 'No geolocated venues match your search yet.'
	);

	/**
	 * Build a geodesic circle polygon (approximation) around a center point,
	 * in GeoJSON format. Uses destination-point math on a spherical earth.
	 */
	function circlePolygon(
		lat: number,
		lng: number,
		radiusMiles: number,
		steps = 72
	): GeoJSON.Feature<GeoJSON.Polygon> {
		const earthRadiusMi = 3958.7613;
		const angular = radiusMiles / earthRadiusMi;
		const latRad = (lat * Math.PI) / 180;
		const lngRad = (lng * Math.PI) / 180;
		const coords: Array<[number, number]> = [];
		for (let i = 0; i <= steps; i++) {
			const bearing = (i / steps) * 2 * Math.PI;
			const sinLat =
				Math.sin(latRad) * Math.cos(angular) +
				Math.cos(latRad) * Math.sin(angular) * Math.cos(bearing);
			const nextLat = Math.asin(sinLat);
			const nextLng =
				lngRad +
				Math.atan2(
					Math.sin(bearing) * Math.sin(angular) * Math.cos(latRad),
					Math.cos(angular) - Math.sin(latRad) * sinLat
				);
			coords.push([(nextLng * 180) / Math.PI, (nextLat * 180) / Math.PI]);
		}
		return {
			type: 'Feature',
			geometry: { type: 'Polygon', coordinates: [coords] },
			properties: {}
		};
	}

	function toGeoJSON(list: MapPreview[]): GeoJSON.FeatureCollection {
		return {
			type: 'FeatureCollection',
			features: list.map((p) => ({
				type: 'Feature',
				geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
				properties: {
					id: p.id,
					slug: p.slug,
					name: p.name,
					logoUrl: p.logoUrl ?? '',
					badge: p.badge ?? '',
					verified: p.verified ? 1 : 0,
					location: p.location ?? '',
					description: p.description ?? ''
				}
			}))
		};
	}

	function initialsOf(name: string): string {
		const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
		return parts.map((w) => w[0]?.toUpperCase() ?? '').join('') || '•';
	}

	// Match the LocationMap on event detail pages.
	const MAP_PITCH = 24;
	const MAP_BEARING = -10;

	function fitToPoints() {
		if (!mapInstance || !mapboxgl) return;

		// If a geo filter is active, frame the circle rather than the points —
		// this keeps the radius overlay fully visible even when sparse.
		if (geo) {
			const ring = circlePolygon(geo.lat, geo.lng, geo.radiusMiles, 24).geometry
				.coordinates[0] as Array<[number, number]>;
			const bounds = new mapboxgl.LngLatBounds();
			for (const c of ring) bounds.extend(c);
			mapInstance.fitBounds(bounds, {
				padding: { top: 60, right: 60, bottom: 60, left: 60 },
				maxZoom: 12,
				duration: 520,
				pitch: MAP_PITCH,
				bearing: MAP_BEARING
			});
			return;
		}

		if (points.length === 0) {
			// Still center on the initial (IP) anchor if we have one, so the
			// user sees a map of their region even before any results load.
			if (initialCenter) {
				mapInstance.jumpTo({
					center: [initialCenter.lng, initialCenter.lat],
					zoom: 8,
					pitch: MAP_PITCH,
					bearing: MAP_BEARING
				});
			}
			return;
		}
		if (points.length === 1) {
			mapInstance.jumpTo({
				center: [points[0].lng, points[0].lat],
				zoom: 9,
				pitch: MAP_PITCH,
				bearing: MAP_BEARING
			});
			return;
		}
		const bounds = new mapboxgl.LngLatBounds();
		for (const p of points) bounds.extend([p.lng, p.lat]);
		mapInstance.fitBounds(bounds, {
			padding: { top: 60, right: 60, bottom: 60, left: 60 },
			maxZoom: 10,
			duration: 0,
			pitch: MAP_PITCH,
			bearing: MAP_BEARING
		});
	}

	function reportBounds() {
		if (!mapInstance) return;
		const b = mapInstance.getBounds();
		if (!b) return;
		onBoundsChange?.({
			west: b.getWest(),
			south: b.getSouth(),
			east: b.getEast(),
			north: b.getNorth()
		});
	}

	function attachInteractions(map: import('mapbox-gl').Map) {
		if (!mapboxgl) return;

		map.on('click', clusterLayerId, (e) => {
			const feature = e.features?.[0];
			if (!feature) return;
			const clusterId = feature.properties?.cluster_id;
			const pointCount = Number(feature.properties?.point_count ?? 0);
			const source = map.getSource(sourceId) as import('mapbox-gl').GeoJSONSource | undefined;
			if (!source || clusterId == null) return;

			// Pull every venue inside the cluster so we can list them in
			// the side panel. Cap at 500 — plenty for any realistic cluster.
			source.getClusterLeaves(clusterId, Math.max(pointCount, 1), 0, (err, leaves) => {
				if (err || !leaves) return;
				const ids = leaves
					.map((leaf) => {
						const props = (leaf as GeoJSON.Feature).properties ?? {};
						return typeof props.id === 'string' ? props.id : null;
					})
					.filter((id): id is string => id != null);

				if (ids.length === 0) return;
				panelMode = { type: 'cluster', ids };

				const geom = feature.geometry as GeoJSON.Point;
				map.easeTo({
					center: [geom.coordinates[0], geom.coordinates[1]],
					duration: 520,
					offset: [-140, 0]
				});
			});
		});

		map.on('click', pointLayerId, (e) => {
			const feature = e.features?.[0];
			if (!feature) return;
			const id = feature.properties?.id;
			if (typeof id === 'string') {
				panelMode = { type: 'single', id };
				const geom = feature.geometry as GeoJSON.Point;
				map.easeTo({
					center: [geom.coordinates[0], geom.coordinates[1]],
					duration: 480,
					offset: [-140, 0] // nudge off-center to make room for the side panel
				});
			}
		});

		// Click on the map background (not on a pin / cluster) dismisses the panel.
		map.on('click', (e) => {
			const hits = map.queryRenderedFeatures(e.point, {
				layers: [pointLayerId, clusterLayerId]
			});
			if (hits.length === 0) closePanel();
		});

		// Debounced viewport reporting. Mapbox fires `moveend` once at the
		// end of any pan/zoom — we coalesce rapid-fire ones just in case.
		map.on('moveend', () => {
			clearTimeout(boundsDebounce);
			boundsDebounce = setTimeout(reportBounds, 120);
		});

		const setPointer = () => (map.getCanvas().style.cursor = 'pointer');
		const clearPointer = () => (map.getCanvas().style.cursor = '');
		map.on('mouseenter', clusterLayerId, setPointer);
		map.on('mouseleave', clusterLayerId, clearPointer);
		map.on('mouseenter', pointLayerId, setPointer);
		map.on('mouseleave', pointLayerId, clearPointer);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && panelMode.type !== 'none') {
			closePanel();
		}
	}

	function addLayers(map: import('mapbox-gl').Map) {
		// Radius overlay sources — added before points so pins draw on top.
		const radiusData: GeoJSON.FeatureCollection = geo
			? { type: 'FeatureCollection', features: [circlePolygon(geo.lat, geo.lng, geo.radiusMiles)] }
			: { type: 'FeatureCollection', features: [] };
		map.addSource(radiusSourceId, { type: 'geojson', data: radiusData });
		map.addLayer({
			id: radiusFillLayerId,
			type: 'fill',
			source: radiusSourceId,
			paint: {
				'fill-color': '#18978f',
				'fill-opacity': 0.09
			}
		});
		map.addLayer({
			id: radiusLineLayerId,
			type: 'line',
			source: radiusSourceId,
			paint: {
				'line-color': '#18978f',
				'line-width': 2,
				'line-dasharray': [2, 2],
				'line-opacity': 0.72
			}
		});

		// Note: the draggable radius center marker and the home marker are
		// HTML Mapbox markers, managed separately (see syncMarkers()).

		map.addSource(sourceId, {
			type: 'geojson',
			data: toGeoJSON(points),
			cluster: true,
			clusterRadius: 50,
			clusterMaxZoom: 12
		});

		map.addLayer({
			id: clusterLayerId,
			type: 'circle',
			source: sourceId,
			filter: ['has', 'point_count'],
			paint: {
				'circle-color': [
					'step',
					['get', 'point_count'],
					'rgba(24, 151, 143, 0.88)',
					10,
					'rgba(21, 133, 126, 0.92)',
					50,
					'rgba(16, 107, 101, 0.95)'
				],
				'circle-radius': ['step', ['get', 'point_count'], 20, 10, 26, 50, 34],
				'circle-stroke-width': 3,
				'circle-stroke-color': 'rgba(255, 255, 255, 0.92)'
			}
		});

		map.addLayer({
			id: clusterCountLayerId,
			type: 'symbol',
			source: sourceId,
			filter: ['has', 'point_count'],
			layout: {
				'text-field': ['get', 'point_count_abbreviated'],
				'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
				'text-size': 13
			},
			paint: {
				'text-color': '#ffffff'
			}
		});

		map.addLayer({
			id: pointHaloLayerId,
			type: 'circle',
			source: sourceId,
			filter: ['!', ['has', 'point_count']],
			paint: {
				'circle-radius': 14,
				'circle-color': 'rgba(24, 151, 143, 0.18)',
				'circle-stroke-width': 0
			}
		});

		map.addLayer({
			id: pointLayerId,
			type: 'circle',
			source: sourceId,
			filter: ['!', ['has', 'point_count']],
			paint: {
				'circle-radius': [
					'case',
					['==', ['get', 'id'], ['literal', selectedId ?? '__none__']],
					10,
					7
				],
				'circle-color': '#18978f',
				'circle-stroke-width': 2.5,
				'circle-stroke-color': '#ffffff'
			}
		});

		// Outer ring that only renders for the selected point. Drawn on top
		// so the selected pin reads instantly, even in dense clusters.
		map.addLayer({
			id: selectedHaloLayerId,
			type: 'circle',
			source: sourceId,
			filter: [
				'all',
				['!', ['has', 'point_count']],
				['==', ['get', 'id'], ['literal', selectedId ?? '__none__']]
			],
			paint: {
				'circle-radius': 22,
				'circle-color': '#18978f',
				'circle-opacity': 0.18
			}
		});
		map.addLayer({
			id: selectedRingLayerId,
			type: 'circle',
			source: sourceId,
			filter: [
				'all',
				['!', ['has', 'point_count']],
				['==', ['get', 'id'], ['literal', selectedId ?? '__none__']]
			],
			paint: {
				'circle-radius': 14,
				'circle-color': 'rgba(0,0,0,0)',
				'circle-stroke-width': 2.5,
				'circle-stroke-color': '#18978f'
			}
		});

		attachInteractions(map);
	}

	async function ensureMap() {
		if (!mounted || !container || !token) return;
		// Always render the map once we have a token. Even with zero points
		// and no anchor, a world/region view is better than a placeholder.
		try {
			if (!mapboxgl) {
				const mapboxModule = await import('mapbox-gl');
				await import('mapbox-gl/dist/mapbox-gl.css');
				mapboxgl = mapboxModule.default;
				mapboxgl.accessToken = token;
			}

			if (!mapInstance) {
				// Pick the best starting view: filter center → initial center → US.
				const start: { center: [number, number]; zoom: number } = geo
					? { center: [geo.lng, geo.lat], zoom: 9 }
					: initialCenter
						? { center: [initialCenter.lng, initialCenter.lat], zoom: 8 }
						: { center: [-98.5, 39.8], zoom: 3.2 };

				mapInstance = new mapboxgl.Map({
					container,
					// Match the event detail page map: Mapbox Standard style with a
					// subtle 3D pitch and bearing for the richer, layered look.
					style: 'mapbox://styles/mapbox/standard',
					center: start.center,
					zoom: start.zoom,
					pitch: 24,
					bearing: -10,
					attributionControl: false,
					antialias: true
				});

				mapInstance.addControl(
					new mapboxgl.NavigationControl({ showCompass: false, visualizePitch: false }),
					'top-right'
				);
				mapInstance.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');

				mapInstance.on('load', () => {
					if (!mapInstance) return;
					addLayers(mapInstance);
					syncMarkers();
					fitToPoints();
					isReady = true;
					// Emit the initial viewport once the map has settled on
					// its framing so the list below can filter from the start.
					mapInstance.once('idle', () => reportBounds());
				});
			}
		} catch (err) {
			console.error('[ListLocationMap] failed to load mapbox-gl', err);
			loadError = true;
		}
	}

	function updateSelectionFilters() {
		if (!mapInstance || !isReady) return;
		const match = selectedId ?? '__none__';
		try {
			mapInstance.setPaintProperty(pointLayerId, 'circle-radius', [
				'case',
				['==', ['get', 'id'], ['literal', match]],
				10,
				7
			]);
			mapInstance.setFilter(selectedHaloLayerId, [
				'all',
				['!', ['has', 'point_count']],
				['==', ['get', 'id'], ['literal', match]]
			]);
			mapInstance.setFilter(selectedRingLayerId, [
				'all',
				['!', ['has', 'point_count']],
				['==', ['get', 'id'], ['literal', match]]
			]);
		} catch {
			/* layers may not exist yet on first paint */
		}
	}

	function updateSource() {
		if (!mapInstance) return;
		const source = mapInstance.getSource(sourceId) as import('mapbox-gl').GeoJSONSource | undefined;
		if (source) source.setData(toGeoJSON(points));

		updateRadiusOverlay();
		syncMarkers();
		fitToPoints();
	}

	function updateRadiusOverlay(overrideCenter?: { lat: number; lng: number } | null) {
		if (!mapInstance) return;
		const radiusSource = mapInstance.getSource(radiusSourceId) as
			| import('mapbox-gl').GeoJSONSource
			| undefined;
		if (!radiusSource) return;
		const center = overrideCenter ?? (geo ? { lat: geo.lat, lng: geo.lng } : null);
		const radiusMiles = geo?.radiusMiles ?? DEFAULT_RADIUS_MI;
		radiusSource.setData(
			center
				? {
						type: 'FeatureCollection',
						features: [circlePolygon(center.lat, center.lng, radiusMiles)]
					}
				: { type: 'FeatureCollection', features: [] }
		);
	}

	// --- HTML marker management (home + draggable radius center) ----------

	// SVG namespace helper — we construct svg nodes manually instead of
	// innerHTML so the marker DOM stays XSS-safe by construction.
	const SVG_NS = 'http://www.w3.org/2000/svg';

	function svg(attrs: Record<string, string>, ...children: SVGElement[]): SVGElement {
		const el = document.createElementNS(SVG_NS, 'svg');
		for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
		for (const c of children) el.appendChild(c);
		return el;
	}

	function svgEl(tag: string, attrs: Record<string, string>): SVGElement {
		const el = document.createElementNS(SVG_NS, tag);
		for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
		return el;
	}

	function homeIcon(): SVGElement {
		return svg(
			{
				xmlns: SVG_NS,
				viewBox: '0 0 24 24',
				fill: 'none',
				stroke: 'currentColor',
				'stroke-width': '2.4',
				'stroke-linecap': 'round',
				'stroke-linejoin': 'round'
			},
			svgEl('path', { d: 'm3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }),
			svgEl('polyline', { points: '9 22 9 12 15 12 15 22' })
		);
	}

	function crosshairIcon(): SVGElement {
		return svg(
			{
				xmlns: SVG_NS,
				viewBox: '0 0 24 24',
				fill: 'none',
				stroke: 'currentColor',
				'stroke-width': '2',
				'stroke-linecap': 'round',
				'stroke-linejoin': 'round'
			},
			svgEl('circle', { cx: '12', cy: '12', r: '10' }),
			svgEl('line', { x1: '22', y1: '12', x2: '18', y2: '12' }),
			svgEl('line', { x1: '6', y1: '12', x2: '2', y2: '12' }),
			svgEl('line', { x1: '12', y1: '6', x2: '12', y2: '2' }),
			svgEl('line', { x1: '12', y1: '22', x2: '12', y2: '18' })
		);
	}

	function makeHomeElement(): HTMLElement {
		const el = document.createElement('div');
		el.className = 'kb-map-home-marker';
		el.setAttribute('aria-label', 'Your location');
		const ring = document.createElement('span');
		ring.className = 'kb-map-home-marker__ring';
		const pin = document.createElement('span');
		pin.className = 'kb-map-home-marker__pin';
		pin.appendChild(homeIcon());
		el.append(ring, pin);
		return el;
	}

	function makeCenterElement(): HTMLElement {
		const el = document.createElement('div');
		el.className = 'kb-map-center-marker';
		el.setAttribute('aria-label', 'Radius center — drag to move');
		el.title = 'Drag to move the radius center';
		const pulse = document.createElement('span');
		pulse.className = 'kb-map-center-marker__pulse';
		const dot = document.createElement('span');
		dot.className = 'kb-map-center-marker__dot';
		const cross = document.createElement('span');
		cross.className = 'kb-map-center-marker__crosshair';
		cross.appendChild(crosshairIcon());
		el.append(pulse, dot, cross);
		return el;
	}

	function syncMarkers() {
		if (!mapInstance || !mapboxgl) return;

		// --- Home marker: always renders at initialCenter when we have one.
		if (initialCenter) {
			if (!homeMarker) {
				homeMarker = new mapboxgl.Marker({ element: makeHomeElement(), anchor: 'bottom' })
					.setLngLat([initialCenter.lng, initialCenter.lat])
					.addTo(mapInstance);
			} else {
				homeMarker.setLngLat([initialCenter.lng, initialCenter.lat]);
			}
		} else if (homeMarker) {
			homeMarker.remove();
			homeMarker = null;
		}

		// --- Draggable radius center: sits on `geo` if active, otherwise
		// defaults to the home location so the user can immediately grab it.
		const centerLngLat: [number, number] | null = geo
			? [geo.lng, geo.lat]
			: initialCenter
				? [initialCenter.lng, initialCenter.lat]
				: null;

		if (!centerLngLat) {
			if (centerMarker) {
				centerMarker.remove();
				centerMarker = null;
			}
			return;
		}

		if (!centerMarker) {
			centerMarker = new mapboxgl.Marker({
				element: makeCenterElement(),
				anchor: 'center',
				draggable: true
			})
				.setLngLat(centerLngLat)
				.addTo(mapInstance);

			centerMarker.on('drag', () => {
				if (!centerMarker) return;
				const p = centerMarker.getLngLat();
				updateRadiusOverlay({ lat: p.lat, lng: p.lng });
			});

			centerMarker.on('dragend', () => {
				if (!centerMarker) return;
				const p = centerMarker.getLngLat();
				onGeoChange?.({
					lat: p.lat,
					lng: p.lng,
					radiusMiles: geo?.radiusMiles ?? DEFAULT_RADIUS_MI,
					place: geo?.place ?? 'Custom location'
				});
			});
		} else {
			centerMarker.setLngLat(centerLngLat);
		}
	}

	onMount(() => {
		mounted = true;
		void ensureMap();
	});

	$effect(() => {
		// Track both points and geo so either triggers a refresh.
		void points;
		void geo;
		if (!mounted) return;
		if (!mapInstance) {
			void ensureMap();
		} else if (isReady) {
			updateSource();
		}
	});

	// React to selection changes independently so pan/zoom work doesn't
	// trigger a full source refresh.
	$effect(() => {
		void selectedId;
		if (!mounted || !mapInstance || !isReady) return;
		updateSelectionFilters();
	});

	// When the single-venue panel opens (or switches venue), fetch the
	// upcoming-events feed for that venue.
	$effect(() => {
		const v = selected;
		if (!v) {
			upcomingEvents = [];
			upcomingLoading = false;
			upcomingError = false;
			upcomingRequestId++;
			return;
		}
		void loadUpcomingFor(v);
	});

	// If the selected venue (or the whole cluster) drops out of the points
	// collection — e.g. new search results — close the panel so it doesn't
	// go stale.
	$effect(() => {
		const m = panelMode;
		if (m.type === 'single') {
			if (!points.find((p) => p.id === m.id)) closePanel();
		} else if (m.type === 'cluster') {
			const ids = new Set(points.map((p) => p.id));
			if (!m.ids.some((id) => ids.has(id))) closePanel();
		}
	});

	onDestroy(() => {
		clearTimeout(boundsDebounce);
		centerMarker?.remove();
		centerMarker = null;
		homeMarker?.remove();
		homeMarker = null;
		mapInstance?.remove();
		mapInstance = null;
		mounted = false;
	});

	const showMap = $derived(Boolean(token) && !loadError);
	const countLabel = $derived.by(() => {
		if (geo && typeof totalGeolocated === 'number' && totalGeolocated > points.length) {
			return `${points.length} of ${totalGeolocated} ${itemNoun}`;
		}
		return `${points.length} ${points.length === 1 ? 'place' : 'places'} on the map`;
	});

	function handleGeoChange(next: GeoValue) {
		onGeoChange?.(next);
	}
</script>

<section class="kb-list-map" style="--kb-list-map-height: {height}px" aria-label={eyebrow}>
	<header class="kb-list-map__header">
		<div class="kb-list-map__header-top">
			<div>
				<p class="kb-list-map__eyebrow">
					<span class="kb-list-map__dot" aria-hidden="true"></span>
					{eyebrow}
				</p>
				<p class="kb-list-map__count">
					{countLabel}
					{#if geo}
						<span class="kb-list-map__count-suffix">
							within {geo.radiusMiles} mi
							{#if geo.place}of <em>{geo.place}</em>{/if}
						</span>
					{/if}
				</p>
			</div>
			<p class="kb-list-map__hint">Click a pin to preview · scroll to zoom</p>
		</div>
		{#if onGeoChange}
			<div class="kb-list-map__control">
				<LocationRadiusControl value={geo} {token} onChange={handleGeoChange} />
			</div>
		{/if}
	</header>

	<div class="kb-list-map__canvas-wrap">
		{#if showMap}
			<div class="kb-list-map__canvas" bind:this={container}></div>
			{#if !isReady}
				<div class="kb-list-map__loading" aria-hidden="true">
					<LoaderCircle class="size-4 animate-spin" />
					<span>Loading map</span>
				</div>
			{/if}
			{#if isReady && points.length === 0}
				<div class="kb-list-map__empty-chip">
					<MapPinIcon class="size-3.5" />
					<span>{emptyLabel}</span>
				</div>
			{/if}

			<!-- Venue detail side panel — overlays the right edge of the map. -->
			<aside
				class="kb-map-panel"
				class:is-open={panelMode.type !== 'none'}
				aria-hidden={panelMode.type === 'none'}
				aria-label={selected
					? `${selected.name} details`
					: panelMode.type === 'cluster'
						? `${clusterList.length} venues in this cluster`
						: undefined}
			>
				{#if selected}
					{@const selectedLabel = selected.location ?? null}
					{@const detailHref = `${detailPrefix}${selected.slug}`}
					<button
						type="button"
						class="kb-map-panel__close"
						onclick={closePanel}
						aria-label="Close venue details"
					>
						<XIcon class="size-4" />
					</button>

					<div class="kb-map-panel__inner">
						<header class="kb-map-panel__head">
							{#if selected.logoUrl}
								<div class="kb-map-panel__logo">
									<img src={selected.logoUrl} alt="" loading="lazy" />
								</div>
							{:else}
								<div class="kb-map-panel__logo kb-map-panel__logo--fallback">
									<span>{initialsOf(selected.name)}</span>
								</div>
							{/if}

							<div class="kb-map-panel__chips">
								{#if selected.verified}
									<span class="kb-map-panel__chip kb-map-panel__chip--verified">
										<BadgeCheckIcon class="size-3" />
										Verified
									</span>
								{/if}
								{#if selected.badge}
									<span class="kb-map-panel__chip">{selected.badge}</span>
								{/if}
							</div>
						</header>

						<h3 class="kb-map-panel__name">{selected.name}</h3>

						{#if selectedLabel}
							<p class="kb-map-panel__loc">
								<MapPinIcon class="size-[13px] shrink-0" />
								<span>{selectedLabel}</span>
							</p>
						{/if}

						{#if selected.description}
							<p class="kb-map-panel__desc">{selected.description}</p>
						{/if}

						{#if kind === 'venue'}
							<section class="kb-map-panel__events" aria-label="Upcoming events">
								<h4 class="kb-map-panel__events-title">
									<CalendarIcon class="size-[13px]" />
									<span>Upcoming events</span>
								</h4>
								{#if upcomingLoading}
									<p class="kb-map-panel__events-msg">Loading…</p>
								{:else if upcomingError}
									<p class="kb-map-panel__events-msg">Couldn't load events.</p>
								{:else if upcomingEvents.length === 0}
									<p class="kb-map-panel__events-msg">No upcoming events.</p>
								{:else}
									<ul class="kb-map-panel__events-list">
										{#each upcomingEvents as event (event.id)}
											{@const eventHref = event.slug ? `/events/${event.slug}` : null}
											{@const dateLabel = formatEventDate(event.startDate, event.endDate)}
											<li>
												{#if eventHref}
													<a class="kb-map-panel__event" href={eventHref}>
														<span class="kb-map-panel__event-date">{dateLabel}</span>
														<span class="kb-map-panel__event-title">{event.title}</span>
													</a>
												{:else}
													<div class="kb-map-panel__event">
														<span class="kb-map-panel__event-date">{dateLabel}</span>
														<span class="kb-map-panel__event-title">{event.title}</span>
													</div>
												{/if}
											</li>
										{/each}
									</ul>
								{/if}
							</section>
						{/if}

						<div class="kb-map-panel__actions">
							<Button href={detailHref} class="kb-map-panel__cta">
								View details
								<ArrowRightIcon class="size-[14px]" />
							</Button>
						</div>
					</div>
				{:else if panelMode.type === 'cluster'}
					<button
						type="button"
						class="kb-map-panel__close"
						onclick={closePanel}
						aria-label="Close cluster list"
					>
						<XIcon class="size-4" />
					</button>

					<div class="kb-map-panel__inner">
						<header class="kb-map-panel__cluster-head">
							<p class="kb-map-panel__cluster-eyebrow">Cluster</p>
							<h3 class="kb-map-panel__cluster-title">
								{clusterList.length}
								{clusterList.length === 1 ? itemNoun.slice(0, -1) : itemNoun}
							</h3>
							<p class="kb-map-panel__cluster-hint">Zoom in to separate them, or pick one below.</p>
						</header>

						<ul class="kb-map-panel__cluster-list">
							{#each clusterList as venue (venue.id)}
								<li>
									<button
										type="button"
										class="kb-map-panel__cluster-item"
										onclick={() => (panelMode = { type: 'single', id: venue.id })}
									>
										{#if venue.logoUrl}
											<span class="kb-map-panel__cluster-logo">
												<img src={venue.logoUrl} alt="" loading="lazy" />
											</span>
										{:else}
											<span class="kb-map-panel__cluster-logo kb-map-panel__cluster-logo--fallback">
												{initialsOf(venue.name)}
											</span>
										{/if}
										<span class="kb-map-panel__cluster-text">
											<span class="kb-map-panel__cluster-name">{venue.name}</span>
											{#if venue.location}
												<span class="kb-map-panel__cluster-loc">{venue.location}</span>
											{/if}
										</span>
										<ArrowRightIcon class="kb-map-panel__cluster-arrow size-[14px]" />
									</button>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</aside>
		{:else}
			<div class="kb-list-map__placeholder">
				<div class="kb-list-map__grid" aria-hidden="true"></div>
				<div class="kb-list-map__placeholder-chip">
					<MapPinIcon class="size-4" />
					{#if !token}
						<span>Map preview unavailable</span>
					{:else}
						<span>{emptyLabel}</span>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</section>

<svelte:window onkeydown={handleKeydown} />

<style>
	.kb-list-map {
		position: relative;
		border-radius: 18px;
		border: 1px solid var(--border);
		background: var(--card);
		box-shadow: var(--sh);
		overflow: hidden;
		isolation: isolate;
	}

	.kb-list-map__header {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0.95rem 1.15rem 0.9rem;
		border-bottom: 1px solid var(--border);
		background: var(--card);
	}

	.kb-list-map__header-top {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.kb-list-map__control {
		padding-top: 0.55rem;
		border-top: 1px dashed color-mix(in srgb, var(--teal) 25%, var(--border));
	}

	.kb-list-map__count-suffix {
		display: inline-block;
		margin-top: 0.15rem;
		font-family: var(--font-sans, ui-sans-serif, system-ui, sans-serif);
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--teal);
		letter-spacing: 0.01em;
	}

	.kb-list-map__count-suffix em {
		font-style: normal;
		color: var(--foreground);
	}

	.kb-list-map__empty-chip {
		position: absolute;
		top: 14px;
		left: 50%;
		transform: translateX(-50%);
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.5rem 0.85rem;
		border-radius: 999px;
		background: var(--card);
		border: 1px solid var(--border);
		font-size: 0.74rem;
		font-weight: 600;
		color: var(--muted-foreground);
		box-shadow: 0 10px 24px rgba(10, 18, 28, 0.14);
		z-index: 3;
	}

	.kb-list-map__eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		margin: 0;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted-foreground);
	}

	.kb-list-map__dot {
		display: inline-block;
		width: 7px;
		height: 7px;
		border-radius: 999px;
		background: var(--teal);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--teal) 18%, transparent);
	}

	.kb-list-map__count {
		margin: 0.2rem 0 0 0;
		font-family: var(--font-serif, ui-serif, Georgia, serif);
		font-size: 1.15rem;
		font-weight: 700;
		line-height: 1.2;
		color: var(--foreground);
		letter-spacing: -0.01em;
	}

	.kb-list-map__hint {
		margin: 0;
		font-size: 0.72rem;
		color: var(--muted-foreground);
		letter-spacing: 0.01em;
	}

	.kb-list-map__canvas-wrap {
		position: relative;
		width: 100%;
		height: var(--kb-list-map-height, 480px);
		background: var(--card);
	}

	.kb-list-map__canvas {
		position: absolute;
		inset: 0;
	}

	.kb-list-map__loading {
		position: absolute;
		bottom: 14px;
		left: 14px;
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.5rem 0.8rem;
		border-radius: 999px;
		background: var(--card);
		border: 1px solid var(--border);
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--muted-foreground);
		box-shadow: 0 6px 18px rgba(10, 18, 28, 0.12);
	}

	.kb-list-map__placeholder {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(
			145deg,
			color-mix(in srgb, var(--teal) 12%, var(--card)) 0%,
			color-mix(in srgb, var(--teal) 4%, var(--card)) 60%,
			var(--card) 100%
		);
	}

	.kb-list-map__grid {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(
				90deg,
				color-mix(in srgb, var(--foreground) 6%, transparent) 1px,
				transparent 1px
			),
			linear-gradient(color-mix(in srgb, var(--foreground) 6%, transparent) 1px, transparent 1px);
		background-size: 26px 26px;
		mask-image: radial-gradient(ellipse at center, black 35%, transparent 85%);
	}

	.kb-list-map__placeholder-chip {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.55rem 0.9rem;
		border-radius: 999px;
		background: var(--card);
		border: 1px solid var(--border);
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--muted-foreground);
		box-shadow: 0 8px 20px rgba(10, 18, 28, 0.08);
	}

	/* Mapbox control overrides */
	:global(.kb-list-map .mapboxgl-ctrl-top-right) {
		top: 14px;
		right: 14px;
	}

	:global(.kb-list-map .mapboxgl-ctrl-group) {
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--card);
		box-shadow: 0 6px 18px rgba(10, 18, 28, 0.1);
	}

	:global(.kb-list-map .mapboxgl-ctrl-group button) {
		width: 32px;
		height: 32px;
		background-color: transparent;
	}

	:global(.kb-list-map .mapboxgl-ctrl-group button + button) {
		border-top: 1px solid var(--border);
	}

	:global(.kb-list-map .mapboxgl-ctrl-attrib) {
		margin: 0 10px 10px 0;
		padding: 0.1rem 0.45rem;
		border-radius: 4px;
		background: color-mix(in srgb, var(--card) 88%, transparent);
		font-size: 10px;
	}

	/* Side detail panel — slides in from the right edge of the map. */
	.kb-map-panel {
		position: absolute;
		top: 14px;
		right: 14px;
		bottom: 14px;
		width: min(340px, calc(100% - 28px));
		z-index: 4;
		display: flex;
		flex-direction: column;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 16px;
		box-shadow:
			0 24px 60px rgba(10, 18, 28, 0.22),
			0 2px 8px rgba(10, 18, 28, 0.08);
		overflow: hidden;
		transform: translateX(calc(100% + 28px));
		opacity: 0;
		pointer-events: none;
		transition:
			transform 320ms cubic-bezier(0.22, 1, 0.36, 1),
			opacity 220ms ease-out;
	}

	.kb-map-panel.is-open {
		transform: translateX(0);
		opacity: 1;
		pointer-events: auto;
	}

	.kb-map-panel__inner {
		position: relative;
		padding: 1.05rem 1.1rem 1.15rem;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		min-height: 0;
		flex: 1;
		overflow-y: auto;
	}

	.kb-map-panel__close {
		position: absolute;
		top: 10px;
		right: 10px;
		z-index: 1;
		width: 28px;
		height: 28px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		border: 1px solid var(--border);
		background: color-mix(in srgb, var(--card) 92%, transparent);
		color: var(--muted-foreground);
		cursor: pointer;
		transition:
			background 0.15s ease,
			color 0.15s ease,
			transform 0.15s ease;
	}

	.kb-map-panel__close:hover {
		background: var(--card);
		color: var(--foreground);
		transform: rotate(90deg);
	}

	.kb-map-panel__head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
		margin-top: 0.25rem;
	}

	.kb-map-panel__logo {
		flex: 0 0 auto;
		width: 52px;
		height: 52px;
		border-radius: 12px;
		border: 1px solid var(--border);
		background: #ffffff;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.kb-map-panel__logo img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		padding: 5px;
	}

	.kb-map-panel__logo--fallback {
		background: color-mix(in srgb, var(--teal) 14%, var(--card));
		color: var(--teal);
		font-family: var(--font-serif, ui-serif, Georgia, serif);
		font-weight: 700;
		font-size: 1.05rem;
		letter-spacing: 0.02em;
	}

	.kb-map-panel__chips {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0.3rem;
		padding-right: 28px; /* leave room for the close button */
	}

	.kb-map-panel__chip {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		padding: 0.2rem 0.5rem;
		border-radius: 999px;
		background: var(--muted);
		color: var(--muted-foreground);
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.kb-map-panel__chip--verified {
		background: color-mix(in srgb, var(--teal) 14%, white);
		color: var(--teal);
	}

	.kb-map-panel__name {
		margin: 0.15rem 0 0 0;
		font-family: var(--font-serif, ui-serif, Georgia, serif);
		font-size: 1.35rem;
		font-weight: 700;
		line-height: 1.18;
		letter-spacing: -0.015em;
		color: var(--foreground);
		word-break: break-word;
	}

	.kb-map-panel__loc {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		margin: 0;
		font-size: 0.78rem;
		color: var(--muted-foreground);
	}

	:global(.kb-map-panel__loc svg) {
		color: var(--teal);
	}

	.kb-map-panel__desc {
		margin: 0.15rem 0 0;
		font-size: 0.82rem;
		line-height: 1.55;
		color: var(--muted-foreground);
		display: -webkit-box;
		-webkit-line-clamp: 6;
		line-clamp: 6;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.kb-map-panel__events {
		margin-top: 0.4rem;
		padding-top: 0.7rem;
		border-top: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.kb-map-panel__events-title {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		margin: 0;
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted-foreground);
	}

	:global(.kb-map-panel__events-title svg) {
		color: var(--teal);
	}

	.kb-map-panel__events-msg {
		margin: 0;
		font-size: 0.74rem;
		color: var(--muted-foreground);
	}

	.kb-map-panel__events-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.kb-map-panel__events-list > li {
		margin: 0;
	}

	.kb-map-panel__event {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		padding: 0.4rem 0.55rem;
		border-radius: 8px;
		text-decoration: none;
		color: var(--foreground);
		transition: background 0.15s ease;
	}

	a.kb-map-panel__event:hover {
		background: color-mix(in srgb, var(--teal) 8%, var(--muted));
		text-decoration: none;
	}

	.kb-map-panel__event-date {
		font-size: 0.66rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--teal);
	}

	.kb-map-panel__event-title {
		font-size: 0.8rem;
		line-height: 1.3;
		font-weight: 600;
		color: var(--foreground);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.kb-map-panel__actions {
		margin-top: auto;
		padding-top: 0.55rem;
	}

	:global(.kb-map-panel__cta) {
		width: 100%;
		gap: 0.4rem;
		background: var(--teal) !important;
		color: #ffffff !important;
		border-radius: 10px !important;
		font-weight: 700;
		letter-spacing: 0.01em;
	}

	:global(.kb-map-panel__cta:hover) {
		background: color-mix(in srgb, var(--teal) 88%, black) !important;
	}

	/* ----- Cluster list view ----- */
	.kb-map-panel__cluster-head {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding-right: 36px; /* clear the close button */
		margin-top: 0.25rem;
	}

	.kb-map-panel__cluster-eyebrow {
		margin: 0;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--teal);
	}

	.kb-map-panel__cluster-title {
		margin: 0;
		font-family: var(--font-serif, ui-serif, Georgia, serif);
		font-size: 1.35rem;
		font-weight: 700;
		line-height: 1.15;
		letter-spacing: -0.015em;
		color: var(--foreground);
	}

	.kb-map-panel__cluster-hint {
		margin: 0.1rem 0 0;
		font-size: 0.72rem;
		color: var(--muted-foreground);
	}

	.kb-map-panel__cluster-list {
		list-style: none;
		padding: 0;
		margin: 0.35rem -0.25rem 0;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		flex: 1;
		min-height: 0;
	}

	.kb-map-panel__cluster-list > li {
		margin: 0;
	}

	.kb-map-panel__cluster-item {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		width: 100%;
		padding: 0.55rem 0.6rem;
		background: transparent;
		border: 1px solid transparent;
		border-radius: 10px;
		cursor: pointer;
		text-align: left;
		transition:
			background 0.15s ease,
			border-color 0.15s ease,
			transform 0.15s ease;
		color: var(--foreground);
	}

	.kb-map-panel__cluster-item:hover {
		background: color-mix(in srgb, var(--teal) 8%, var(--muted));
		border-color: color-mix(in srgb, var(--teal) 22%, var(--border));
	}

	.kb-map-panel__cluster-logo {
		flex: 0 0 auto;
		width: 34px;
		height: 34px;
		border-radius: 8px;
		border: 1px solid var(--border);
		background: #ffffff;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-serif, ui-serif, Georgia, serif);
		font-weight: 700;
		font-size: 0.78rem;
		color: var(--teal);
	}

	.kb-map-panel__cluster-logo img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		padding: 3px;
	}

	.kb-map-panel__cluster-logo--fallback {
		background: color-mix(in srgb, var(--teal) 14%, var(--card));
	}

	.kb-map-panel__cluster-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1;
	}

	.kb-map-panel__cluster-name {
		font-weight: 600;
		font-size: 0.85rem;
		line-height: 1.25;
		color: var(--foreground);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.kb-map-panel__cluster-loc {
		font-size: 0.72rem;
		color: var(--muted-foreground);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	:global(.kb-map-panel__cluster-arrow) {
		color: var(--muted-foreground);
		flex: 0 0 auto;
		transition:
			transform 0.15s ease,
			color 0.15s ease;
	}

	.kb-map-panel__cluster-item:hover :global(.kb-map-panel__cluster-arrow) {
		color: var(--teal);
		transform: translateX(2px);
	}

	/* ----- Home marker (non-draggable, always visible) ----- */
	:global(.kb-map-home-marker) {
		position: relative;
		width: 30px;
		height: 38px;
		transform: translate(-50%, -100%);
		pointer-events: none;
	}

	:global(.kb-map-home-marker__ring) {
		position: absolute;
		left: 50%;
		bottom: -4px;
		width: 18px;
		height: 5px;
		transform: translateX(-50%);
		border-radius: 999px;
		background: rgba(10, 18, 28, 0.22);
		filter: blur(2px);
	}

	:global(.kb-map-home-marker__pin) {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 34px;
		color: #ffffff;
		background: var(--teal);
		border-radius: 12px 12px 12px 3px;
		transform: rotate(-2deg);
		box-shadow:
			0 0 0 3px #ffffff,
			0 6px 14px rgba(10, 18, 28, 0.24);
	}

	:global(.kb-map-home-marker__pin svg) {
		width: 16px;
		height: 16px;
	}

	/* ----- Draggable radius-center marker ----- */
	:global(.kb-map-center-marker) {
		position: relative;
		width: 40px;
		height: 40px;
		transform: translate(-50%, -50%);
		cursor: grab;
		touch-action: none;
	}

	:global(.kb-map-center-marker:active) {
		cursor: grabbing;
	}

	:global(.kb-map-center-marker__pulse) {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--teal);
		opacity: 0.18;
		transform: translate(-50%, -50%);
		animation: kb-center-pulse 2.4s ease-out infinite;
	}

	:global(.kb-map-center-marker__dot) {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 14px;
		height: 14px;
		border-radius: 999px;
		background: #ffffff;
		border: 3px solid var(--teal);
		transform: translate(-50%, -50%);
		box-shadow: 0 4px 12px rgba(10, 18, 28, 0.28);
	}

	:global(.kb-map-center-marker__crosshair) {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--teal);
		opacity: 0;
		transition: opacity 0.18s ease;
	}

	:global(.kb-map-center-marker:hover .kb-map-center-marker__crosshair) {
		opacity: 0.55;
	}

	:global(.kb-map-center-marker__crosshair svg) {
		width: 34px;
		height: 34px;
	}

	@keyframes kb-center-pulse {
		0% {
			transform: translate(-50%, -50%) scale(0.55);
			opacity: 0.32;
		}
		70% {
			transform: translate(-50%, -50%) scale(1.6);
			opacity: 0;
		}
		100% {
			transform: translate(-50%, -50%) scale(0.55);
			opacity: 0;
		}
	}

	@media (max-width: 640px) {
		.kb-list-map__canvas-wrap {
			height: min(var(--kb-list-map-height, 480px), 360px);
		}

		.kb-map-panel {
			top: auto;
			right: 8px;
			left: 8px;
			bottom: 8px;
			width: auto;
			max-height: 66%;
		}
	}
</style>
