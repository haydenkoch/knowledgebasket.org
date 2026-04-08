<script lang="ts">
	import { onDestroy } from 'svelte';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import NavigationIcon from '@lucide/svelte/icons/navigation';
	import SearchIcon from '@lucide/svelte/icons/search';
	import XIcon from '@lucide/svelte/icons/x';
	import { Slider } from '$lib/components/ui/slider/index.js';

	export type GeoValue = {
		lat: number;
		lng: number;
		radiusMiles: number;
		place: string;
	} | null;

	type Suggestion = {
		id: string;
		placeName: string;
		lat: number;
		lng: number;
	};

	let {
		value,
		token,
		onChange
	}: {
		value: GeoValue;
		token: string | null;
		onChange: (next: GeoValue) => void;
	} = $props();

	// Snap-to increments: the slider moves through these values (never
	// anything in between). Keeps the URL tidy and nudges users toward
	// meaningful radii instead of "27 miles".
	const RADIUS_STEPS = [1, 5, 10, 25, 50, 100, 150, 250, 500] as const;
	const RADIUS_DEFAULT = 50;

	function nearestStepIndex(miles: number): number {
		let best = 0;
		let bestDist = Infinity;
		for (let i = 0; i < RADIUS_STEPS.length; i++) {
			const d = Math.abs(RADIUS_STEPS[i] - miles);
			if (d < bestDist) {
				bestDist = d;
				best = i;
			}
		}
		return best;
	}

	let query = $state('');
	let suggestions = $state<Suggestion[]>([]);
	let showSuggestions = $state(false);
	let loadingSuggestions = $state(false);
	let geolocating = $state(false);
	let geoError = $state<string | null>(null);
	let activeIndex = $state(-1);
	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	let inputEl: HTMLInputElement | undefined = $state();

	// Sync the visible place label from prop on load/navigation.
	let lastSyncedPlace = '';
	$effect(() => {
		const p = value?.place ?? '';
		if (p !== lastSyncedPlace) {
			lastSyncedPlace = p;
			query = p;
		}
	});

	const committedRadius = $derived(value?.radiusMiles ?? RADIUS_DEFAULT);
	const hasCenter = $derived(value != null);

	// The slider internally works on the *index* into RADIUS_STEPS, not the
	// raw mile count. That makes it snap cleanly to the preset values and
	// gives every stop equal visual weight. `draftIndex` tracks the live
	// position; we commit the mapped mile value to the parent on release.
	let draftIndex = $state(nearestStepIndex(RADIUS_DEFAULT));
	let dragging = $state(false);
	let lastSyncedMiles = -1;
	$effect(() => {
		if (dragging) return;
		const next = committedRadius;
		if (next !== lastSyncedMiles) {
			lastSyncedMiles = next;
			draftIndex = nearestStepIndex(next);
		}
	});

	const draftMiles = $derived(RADIUS_STEPS[draftIndex] ?? RADIUS_DEFAULT);

	async function fetchSuggestions(text: string) {
		if (!token || text.trim().length < 2) {
			suggestions = [];
			return;
		}
		loadingSuggestions = true;
		try {
			const url = new URL(
				`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text.trim())}.json`
			);
			url.searchParams.set('access_token', token);
			url.searchParams.set('autocomplete', 'true');
			url.searchParams.set('limit', '5');
			url.searchParams.set('types', 'place,locality,region,postcode,address,neighborhood');
			const res = await fetch(url);
			if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
			const json = (await res.json()) as {
				features?: Array<{
					id: string;
					place_name: string;
					center: [number, number];
				}>;
			};
			suggestions = (json.features ?? []).map((f) => ({
				id: f.id,
				placeName: f.place_name,
				lng: f.center[0],
				lat: f.center[1]
			}));
		} catch (err) {
			console.error('[LocationRadiusControl] geocoding error', err);
			suggestions = [];
		} finally {
			loadingSuggestions = false;
		}
	}

	function onInput(e: Event) {
		const text = (e.target as HTMLInputElement).value;
		query = text;
		showSuggestions = true;
		activeIndex = -1;
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			void fetchSuggestions(text);
		}, 240);
	}

	function pickSuggestion(s: Suggestion) {
		showSuggestions = false;
		suggestions = [];
		query = s.placeName;
		lastSyncedPlace = s.placeName;
		onChange({
			lat: s.lat,
			lng: s.lng,
			radiusMiles: value?.radiusMiles ?? RADIUS_DEFAULT,
			place: s.placeName
		});
	}

	function onKeydown(e: KeyboardEvent) {
		if (!showSuggestions || suggestions.length === 0) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			activeIndex = (activeIndex + 1) % suggestions.length;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			activeIndex = activeIndex <= 0 ? suggestions.length - 1 : activeIndex - 1;
		} else if (e.key === 'Enter') {
			if (activeIndex >= 0) {
				e.preventDefault();
				pickSuggestion(suggestions[activeIndex]);
			}
		} else if (e.key === 'Escape') {
			showSuggestions = false;
		}
	}

	function onBlur() {
		// Delay so clicking a suggestion still lands.
		setTimeout(() => {
			showSuggestions = false;
		}, 140);
	}

	function onFocus() {
		if (suggestions.length > 0) showSuggestions = true;
	}

	function clearLocation() {
		query = '';
		lastSyncedPlace = '';
		suggestions = [];
		showSuggestions = false;
		geoError = null;
		onChange(null);
	}

	function onSliderChange(nextIndex: number) {
		dragging = true;
		const bounded = Math.max(0, Math.min(RADIUS_STEPS.length - 1, Math.round(nextIndex)));
		draftIndex = bounded;
	}

	function onSliderCommit(nextIndex: number) {
		dragging = false;
		if (!value) return;
		const bounded = Math.max(0, Math.min(RADIUS_STEPS.length - 1, Math.round(nextIndex)));
		const miles = RADIUS_STEPS[bounded];
		if (miles === committedRadius) return;
		lastSyncedMiles = miles;
		draftIndex = bounded;
		onChange({ ...value, radiusMiles: miles });
	}

	async function useMyLocation() {
		if (!('geolocation' in navigator)) {
			geoError = 'Geolocation not supported in this browser.';
			return;
		}
		geoError = null;
		geolocating = true;
		try {
			const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
				navigator.geolocation.getCurrentPosition(resolve, reject, {
					enableHighAccuracy: false,
					timeout: 10000,
					maximumAge: 60000
				});
			});
			const { latitude, longitude } = pos.coords;
			let placeName = 'My location';
			if (token) {
				try {
					const url = new URL(
						`https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json`
					);
					url.searchParams.set('access_token', token);
					url.searchParams.set('limit', '1');
					url.searchParams.set('types', 'place,locality,neighborhood');
					const res = await fetch(url);
					if (res.ok) {
						const json = (await res.json()) as {
							features?: Array<{ place_name: string }>;
						};
						if (json.features?.[0]?.place_name) placeName = json.features[0].place_name;
					}
				} catch {
					// swallow reverse-geocode failure — we still have coords
				}
			}
			query = placeName;
			lastSyncedPlace = placeName;
			onChange({
				lat: latitude,
				lng: longitude,
				radiusMiles: value?.radiusMiles ?? RADIUS_DEFAULT,
				place: placeName
			});
		} catch (err) {
			const message =
				err instanceof GeolocationPositionError ? err.message : 'Unable to get location';
			geoError = message;
		} finally {
			geolocating = false;
		}
	}

	onDestroy(() => {
		clearTimeout(searchTimer);
	});
</script>

<div class="kb-radius">
	<div class="kb-radius__row">
		<div class="kb-radius__input-wrap">
			<SearchIcon class="kb-radius__input-icon" />
			<input
				bind:this={inputEl}
				type="search"
				class="kb-radius__input"
				placeholder="Filter by city, address, or region…"
				value={query}
				oninput={onInput}
				onkeydown={onKeydown}
				onblur={onBlur}
				onfocus={onFocus}
				autocomplete="off"
				spellcheck="false"
				aria-label="Filter venues by location"
			/>
			{#if query}
				<button
					type="button"
					class="kb-radius__clear"
					onclick={clearLocation}
					aria-label="Clear location filter"
				>
					<XIcon class="size-3.5" />
				</button>
			{/if}

			{#if showSuggestions && (suggestions.length > 0 || loadingSuggestions)}
				<div class="kb-radius__suggestions" role="listbox">
					{#if loadingSuggestions && suggestions.length === 0}
						<div class="kb-radius__suggestion kb-radius__suggestion--loading">
							<LoaderCircle class="size-3.5 animate-spin" />
							<span>Searching…</span>
						</div>
					{/if}
					{#each suggestions as s, i (s.id)}
						<button
							type="button"
							class="kb-radius__suggestion"
							class:is-active={i === activeIndex}
							onmousedown={(e) => {
								e.preventDefault();
								pickSuggestion(s);
							}}
							role="option"
							aria-selected={i === activeIndex}
						>
							<MapPinIcon class="kb-radius__suggestion-icon size-3.5" />
							<span class="kb-radius__suggestion-label">{s.placeName}</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<button
			type="button"
			class="kb-radius__geo-btn"
			onclick={useMyLocation}
			disabled={geolocating}
			title="Use my location"
		>
			{#if geolocating}
				<LoaderCircle class="size-3.5 animate-spin" />
			{:else}
				<NavigationIcon class="size-3.5" />
			{/if}
			<span>Use my location</span>
		</button>
	</div>

	{#if hasCenter}
		<div class="kb-radius__slider-block" aria-label="Radius">
			<div class="kb-radius__slider-row">
				<span class="kb-radius__slider-label">Radius</span>
				<span class="kb-radius__slider-readout" class:is-dragging={dragging}>
					<strong>{draftMiles}</strong>
					<span>{draftMiles === 1 ? 'mile' : 'miles'}</span>
				</span>
			</div>

			<div class="kb-radius__slider-wrap">
				<Slider
					type="single"
					value={draftIndex}
					min={0}
					max={RADIUS_STEPS.length - 1}
					step={1}
					onValueChange={(v: number | number[]) =>
						onSliderChange(typeof v === 'number' ? v : (v?.[0] ?? 0))}
					onValueCommit={(v: number | number[]) =>
						onSliderCommit(typeof v === 'number' ? v : (v?.[0] ?? 0))}
					aria-label="Radius in miles"
					class="kb-radius__slider"
				/>
				<div class="kb-radius__slider-ticks" aria-hidden="true">
					{#each RADIUS_STEPS as step, i (step)}
						<button
							type="button"
							class="kb-radius__slider-tick"
							class:is-active={i === draftIndex}
							onclick={() => {
								if (!value) return;
								lastSyncedMiles = step;
								draftIndex = i;
								onChange({ ...value, radiusMiles: step });
							}}
							aria-label={`${step} ${step === 1 ? 'mile' : 'miles'}`}
						>
							<span class="kb-radius__slider-tick-label">{step}</span>
						</button>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	{#if geoError}
		<p class="kb-radius__error">{geoError}</p>
	{/if}
</div>

<style>
	.kb-radius {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		width: 100%;
	}

	.kb-radius__row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: stretch;
	}

	.kb-radius__input-wrap {
		position: relative;
		flex: 1 1 260px;
		min-width: 0;
	}

	:global(.kb-radius__input-icon) {
		position: absolute;
		top: 50%;
		left: 0.75rem;
		transform: translateY(-50%);
		width: 0.95rem;
		height: 0.95rem;
		color: var(--muted-foreground);
		pointer-events: none;
	}

	.kb-radius__input {
		width: 100%;
		height: 38px;
		padding: 0 2.2rem 0 2.25rem;
		border: 1px solid var(--border);
		border-radius: 10px;
		background: var(--card);
		color: var(--foreground);
		font-size: 0.85rem;
		font-family: inherit;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	.kb-radius__input:focus {
		outline: none;
		border-color: color-mix(in srgb, var(--teal) 60%, var(--border));
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--teal) 18%, transparent);
	}

	.kb-radius__input::-webkit-search-decoration,
	.kb-radius__input::-webkit-search-cancel-button {
		display: none;
	}

	.kb-radius__clear {
		position: absolute;
		top: 50%;
		right: 0.5rem;
		transform: translateY(-50%);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		border-radius: 999px;
		background: var(--muted);
		color: var(--muted-foreground);
		border: none;
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.kb-radius__clear:hover {
		background: color-mix(in srgb, var(--teal) 18%, var(--muted));
		color: var(--teal);
	}

	.kb-radius__suggestions {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		right: 0;
		z-index: 40;
		max-height: 260px;
		overflow-y: auto;
		padding: 0.3rem;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 12px;
		box-shadow: 0 18px 40px rgba(10, 18, 28, 0.18);
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.kb-radius__suggestion {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.5rem 0.6rem;
		border: none;
		background: transparent;
		color: var(--foreground);
		font-size: 0.8rem;
		text-align: left;
		border-radius: 8px;
		cursor: pointer;
		transition: background 0.12s ease;
		width: 100%;
	}

	.kb-radius__suggestion:hover,
	.kb-radius__suggestion.is-active {
		background: color-mix(in srgb, var(--teal) 10%, var(--muted));
	}

	:global(.kb-radius__suggestion-icon) {
		color: var(--teal);
		flex: 0 0 auto;
	}

	.kb-radius__suggestion-label {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.kb-radius__suggestion--loading {
		color: var(--muted-foreground);
		font-style: italic;
	}

	.kb-radius__geo-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0 0.85rem;
		height: 38px;
		border-radius: 10px;
		border: 1px solid var(--border);
		background: var(--card);
		color: var(--foreground);
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.01em;
		cursor: pointer;
		transition:
			background 0.15s ease,
			border-color 0.15s ease,
			color 0.15s ease;
		white-space: nowrap;
	}

	.kb-radius__geo-btn:hover:not(:disabled) {
		border-color: color-mix(in srgb, var(--teal) 60%, var(--border));
		color: var(--teal);
	}

	.kb-radius__geo-btn:disabled {
		opacity: 0.6;
		cursor: default;
	}

	.kb-radius__error {
		margin: 0;
		font-size: 0.72rem;
		color: color-mix(in srgb, #c03a3a 80%, var(--foreground));
	}

	.kb-radius__slider-block {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		padding-top: 0.1rem;
	}

	.kb-radius__slider-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.kb-radius__slider-label {
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted-foreground);
	}

	.kb-radius__slider-readout {
		display: inline-flex;
		align-items: baseline;
		gap: 0.3rem;
		font-variant-numeric: tabular-nums;
		transition:
			color 0.15s ease,
			transform 0.15s ease;
	}

	.kb-radius__slider-readout strong {
		font-family: var(--font-serif, ui-serif, Georgia, serif);
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--foreground);
		letter-spacing: -0.005em;
	}

	.kb-radius__slider-readout span {
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--muted-foreground);
		letter-spacing: 0.02em;
	}

	.kb-radius__slider-readout.is-dragging {
		color: var(--teal);
		transform: translateY(-1px);
	}

	.kb-radius__slider-readout.is-dragging strong {
		color: var(--teal);
	}

	.kb-radius__slider-wrap {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding: 0.5rem 0.25rem 0.1rem;
	}

	/* Make the shadcn slider track clearly visible against the card bg. */
	:global(.kb-radius__slider [data-slot='slider-track']) {
		background: color-mix(in srgb, var(--teal) 10%, var(--border)) !important;
		height: 4px !important;
	}

	:global(.kb-radius__slider [data-slot='slider-range']) {
		background: var(--teal) !important;
	}

	:global(.kb-radius__slider [data-slot='slider-thumb']) {
		background: var(--card) !important;
		border-color: var(--teal) !important;
		box-shadow: 0 2px 6px color-mix(in srgb, var(--teal) 35%, transparent) !important;
	}

	.kb-radius__slider-ticks {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: 0 2px;
		margin-top: 0.1rem;
	}

	.kb-radius__slider-tick {
		appearance: none;
		border: none;
		background: transparent;
		cursor: pointer;
		padding: 0.15rem 0.25rem;
		border-radius: 4px;
		transition: color 0.15s ease;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.kb-radius__slider-tick-label {
		font-size: 0.62rem;
		font-weight: 600;
		color: var(--muted-foreground);
		letter-spacing: 0.02em;
		font-variant-numeric: tabular-nums;
	}

	.kb-radius__slider-tick:hover .kb-radius__slider-tick-label {
		color: var(--foreground);
	}

	.kb-radius__slider-tick.is-active .kb-radius__slider-tick-label {
		color: var(--teal);
		font-weight: 700;
	}
</style>
