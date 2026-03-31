<script lang="ts">
	type FilterView = 'list' | 'cards' | 'calendar';
	type DropdownKey = 'cost' | 'region' | 'type' | null;

	export type ReferenceEvent = {
		id: string;
		title: string;
		description?: string;
		location?: string;
		region?: string;
		type?: string;
		types?: string[];
		cost?: string;
		startDate?: string;
		endDate?: string;
		hostOrg?: string;
	};

	type FilterSnapshot = {
		searchQuery: string;
		regionSelect: string[];
		typeSelect: string[];
		costFilter: string[];
		rangeStart: number;
		rangeEnd: number;
	};

	type ChangePayload = {
		view: FilterView;
		filters: FilterSnapshot;
		filteredEvents: ReferenceEvent[];
	};

	interface Props {
		events?: ReferenceEvent[];
		view?: FilterView;
		typeTags?: string[];
		onChange?: (payload: ChangePayload) => void;
	}

	const DEFAULT_TYPE_TAGS = [
		'Art Exhibit',
		'Performance',
		'Community Meeting',
		'Forum',
		'Conference',
		'Summit',
		'Symposium',
		'Festival',
		'Celebration',
		'Film Screening',
		'Powwow',
		'Big Time',
		'Trade Show',
		'Marketplace',
		'Other'
	];

	let {
		events = [],
		view = $bindable<FilterView>('list'),
		typeTags = DEFAULT_TYPE_TAGS,
		onChange
	}: Props = $props();

	let searchQuery = $state('');
	let regionSelect = $state<string[]>([]);
	let typeSelect = $state<string[]>([]);
	let costFilter = $state<string[]>([]);
	let activeDropdown = $state<DropdownKey>(null);
	let dropdownRoot = $state<HTMLDivElement | null>(null);

	function getDefaultRange() {
		const now = new Date();
		return {
			start: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
			end: new Date(now.getFullYear(), now.getMonth() + 13, 0, 23, 59, 59, 999).getTime()
		};
	}

	let rangeStart = $state(getDefaultRange().start);
	let rangeEnd = $state(getDefaultRange().end);
	let sliderIndices = $state<[number, number] | null>(null);

	const normalizedEvents = $derived(
		(events ?? []).map((event) => ({
			...event,
			__searchText: [
				event.title,
				event.description,
				event.location,
				event.region,
				event.type,
				...(event.types ?? []),
				event.hostOrg
			]
				.filter(Boolean)
				.join(' ')
				.toLowerCase(),
			__typeValues: normalizeTypes(event)
		}))
	);

	function normalizeTypes(event: ReferenceEvent) {
		const values = [...(event.types ?? []), ...(event.type ? [event.type] : [])]
			.map((value) => value.trim())
			.filter(Boolean);
		return [...new Set(values)];
	}

	function parseDate(value?: string) {
		if (!value) return null;
		const parsed = new Date(value);
		const time = parsed.getTime();
		return Number.isNaN(time) ? null : time;
	}

	function toReferenceEvent(event: (typeof normalizedEvents)[number]) {
		return {
			id: event.id,
			title: event.title,
			description: event.description,
			location: event.location,
			region: event.region,
			type: event.type,
			types: event.types,
			cost: event.cost,
			startDate: event.startDate,
			endDate: event.endDate,
			hostOrg: event.hostOrg
		} satisfies ReferenceEvent;
	}

	const dateBuckets = $derived.by(() => {
		const now = new Date();
		const buckets: { label: string; start: number; end: number; count: number }[] = [];

		for (let offset = -12; offset < 12; offset += 1) {
			const year = now.getFullYear();
			const month = now.getMonth() + offset;
			const start = new Date(year, month, 1).getTime();
			const end = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
			const count = normalizedEvents.filter((event) => {
				const eventStart = parseDate(event.startDate);
				const eventEnd = parseDate(event.endDate) ?? eventStart;
				if (eventStart == null || eventEnd == null) return false;
				return eventStart <= end && eventEnd >= start;
			}).length;

			buckets.push({
				label: new Date(year, month).toLocaleDateString('en-US', {
					month: 'short',
					year: '2-digit'
				}),
				start,
				end,
				count
			});
		}

		return {
			buckets,
			maxCount: Math.max(1, ...buckets.map((bucket) => bucket.count))
		};
	});

	const numBuckets = $derived(dateBuckets.buckets.length);

	const defaultMinIndex = $derived.by(() => {
		for (let index = 0; index < dateBuckets.buckets.length; index += 1) {
			if (rangeStart <= dateBuckets.buckets[index].end) return index;
		}
		return 0;
	});

	const defaultMaxIndex = $derived.by(() => {
		for (let index = dateBuckets.buckets.length - 1; index >= 0; index -= 1) {
			if (rangeEnd >= dateBuckets.buckets[index].start) return index;
		}
		return Math.max(0, dateBuckets.buckets.length - 1);
	});

	const sliderMin = $derived(sliderIndices?.[0] ?? defaultMinIndex);
	const sliderMax = $derived(sliderIndices?.[1] ?? defaultMaxIndex);
	const minPct = $derived(numBuckets > 1 ? (sliderMin / (numBuckets - 1)) * 100 : 0);
	const maxPct = $derived(numBuckets > 1 ? (sliderMax / (numBuckets - 1)) * 100 : 100);

	const eventsInDateRange = $derived(
		normalizedEvents.filter((event) => {
			const eventStart = parseDate(event.startDate);
			return eventStart != null && eventStart >= rangeStart && eventStart <= rangeEnd;
		})
	);

	const allCosts = $derived(
		[...new Set(normalizedEvents.map((event) => event.cost?.trim() ?? '').filter(Boolean))].sort()
	);
	const allRegions = $derived(
		[...new Set(normalizedEvents.map((event) => event.region?.trim() ?? '').filter(Boolean))].sort()
	);

	function countBy<T extends string>(items: T[]) {
		return items.reduce<Record<string, number>>((acc, value) => {
			acc[value] = (acc[value] ?? 0) + 1;
			return acc;
		}, {});
	}

	const costCountsInRange = $derived(
		countBy(eventsInDateRange.map((event) => event.cost?.trim() ?? '').filter(Boolean))
	);
	const regionCountsInRange = $derived(
		countBy(eventsInDateRange.map((event) => event.region?.trim() ?? '').filter(Boolean))
	);

	const costValuesVisible = $derived(
		allCosts.filter((value) => (costCountsInRange[value] ?? 0) > 0 || costFilter.includes(value))
	);
	const regionValuesVisible = $derived(
		allRegions.filter(
			(value) => (regionCountsInRange[value] ?? 0) > 0 || regionSelect.includes(value)
		)
	);
	const typeValuesVisible = $derived(
		typeTags.filter((tag) => {
			const count = eventsInDateRange.filter((event) => event.__typeValues.includes(tag)).length;
			return count > 0 || typeSelect.includes(tag);
		})
	);

	const filteredEvents = $derived(
		normalizedEvents
			.filter((event) => {
				const matchesSearch =
					!searchQuery.trim() || event.__searchText.includes(searchQuery.trim().toLowerCase());
				const matchesCost =
					costFilter.length === 0 || costFilter.includes(event.cost?.trim() ?? '');
				const matchesRegion =
					regionSelect.length === 0 || regionSelect.includes(event.region?.trim() ?? '');
				const matchesType =
					typeSelect.length === 0 || typeSelect.some((tag) => event.__typeValues.includes(tag));
				const eventStart = parseDate(event.startDate);
				const matchesDate =
					eventStart != null && eventStart >= rangeStart && eventStart <= rangeEnd;
				return matchesSearch && matchesCost && matchesRegion && matchesType && matchesDate;
			})
			.sort(
				(a, b) =>
					(parseDate(a.startDate) ?? Number.MAX_SAFE_INTEGER) -
					(parseDate(b.startDate) ?? Number.MAX_SAFE_INTEGER)
			)
			.map(toReferenceEvent)
	);

	const hasActiveFilters = $derived(
		Boolean(searchQuery.trim()) ||
			regionSelect.length > 0 ||
			typeSelect.length > 0 ||
			costFilter.length > 0
	);

	const costLabel = $derived(
		costFilter.length === 0
			? 'Any cost'
			: costFilter.length === 1
				? costFilter[0]
				: `${costFilter.length} selected`
	);
	const regionLabel = $derived(
		regionSelect.length === 0
			? 'Any geography'
			: regionSelect.length === 1
				? regionSelect[0]
				: `${regionSelect.length} selected`
	);

	const rangeStartLabel = $derived(formatDate(rangeStart));
	const rangeEndLabel = $derived(formatDate(rangeEnd));

	function formatDate(value: number) {
		const date = new Date(value);
		return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
	}

	function toggleValue(values: string[], nextValue: string) {
		return values.includes(nextValue)
			? values.filter((value) => value !== nextValue)
			: [...values, nextValue];
	}

	function toggleCost(value: string) {
		costFilter = toggleValue(costFilter, value);
	}

	function toggleRegion(value: string) {
		regionSelect = toggleValue(regionSelect, value);
	}

	function toggleType(value: string) {
		typeSelect = toggleValue(typeSelect, value);
	}

	function clearFilters() {
		searchQuery = '';
		regionSelect = [];
		typeSelect = [];
		costFilter = [];
		rangeStart = getDefaultRange().start;
		rangeEnd = getDefaultRange().end;
		sliderIndices = null;
	}

	function setRangeFromIndices(minIndex: number, maxIndex: number) {
		const min = Math.max(0, Math.min(minIndex, dateBuckets.buckets.length - 1));
		const max = Math.max(min, Math.min(maxIndex, dateBuckets.buckets.length - 1));
		rangeStart = dateBuckets.buckets[min]?.start ?? rangeStart;
		rangeEnd = dateBuckets.buckets[max]?.end ?? rangeEnd;
	}

	function handleMinInput(event: Event) {
		const value = Math.min(Number((event.currentTarget as HTMLInputElement).value), sliderMax - 1);
		sliderIndices = [value, sliderMax];
	}

	function handleMaxInput(event: Event) {
		const value = Math.max(Number((event.currentTarget as HTMLInputElement).value), sliderMin + 1);
		sliderIndices = [sliderMin, value];
	}

	function commitSlider() {
		const [min, max] = sliderIndices ?? [defaultMinIndex, defaultMaxIndex];
		setRangeFromIndices(min, max);
		sliderIndices = null;
	}

	function toggleDropdown(next: Exclude<DropdownKey, null>) {
		activeDropdown = activeDropdown === next ? null : next;
	}

	function handleTypeTriggerKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		toggleDropdown('type');
	}

	function handleWindowClick(event: MouseEvent) {
		if (!dropdownRoot?.contains(event.target as Node)) activeDropdown = null;
	}

	$effect(() => {
		onChange?.({
			view,
			filters: { searchQuery, regionSelect, typeSelect, costFilter, rangeStart, rangeEnd },
			filteredEvents
		});
	});

	$effect(() => {
		if (typeof window === 'undefined') return;
		window.addEventListener('click', handleWindowClick);
		return () => window.removeEventListener('click', handleWindowClick);
	});
</script>

<div class="filter-bar" bind:this={dropdownRoot}>
	<div class="filter-bar__section">
		<label class="sr-only" for="events-reference-search">Search events</label>
		<div class="filter-bar__search">
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<circle cx="11" cy="11" r="7"></circle>
				<path d="M20 20 16.65 16.65"></path>
			</svg>
			<input
				id="events-reference-search"
				type="search"
				placeholder="Search events..."
				bind:value={searchQuery}
			/>
		</div>
	</div>

	<div class="filter-bar__section">
		<div class="section-label">View</div>
		<div class="view-switcher" role="tablist" aria-label="Event view">
			{#each ['list', 'cards', 'calendar'] as option (option)}
				<button
					type="button"
					class:view-switcher__button--active={view === option}
					class="view-switcher__button"
					role="tab"
					aria-selected={view === option}
					onclick={() => (view = option as FilterView)}
				>
					{option}
				</button>
			{/each}
		</div>
	</div>

	<div class="filter-bar__section">
		<div class="section-label">Date Range</div>
		<div class="histogram" aria-hidden="true">
			{#each dateBuckets.buckets as bucket, index (`${bucket.label}-${index}`)}
				<div
					class:histogram__bar--active={index >= sliderMin && index <= sliderMax}
					class="histogram__bar"
					style={`height:${Math.max(6, (bucket.count / dateBuckets.maxCount) * 100)}%`}
					title={`${bucket.label}: ${bucket.count}`}
				></div>
			{/each}
		</div>
		<div class="range-slider">
			<div class="range-slider__track"></div>
			<div class="range-slider__fill" style={`left:${minPct}%;right:${100 - maxPct}%`}></div>
			<input
				type="range"
				min={0}
				max={Math.max(0, numBuckets - 1)}
				value={sliderMin}
				oninput={handleMinInput}
				onchange={commitSlider}
				aria-label="Date range start"
			/>
			<input
				type="range"
				min={0}
				max={Math.max(0, numBuckets - 1)}
				value={sliderMax}
				oninput={handleMaxInput}
				onchange={commitSlider}
				aria-label="Date range end"
			/>
		</div>
		<div class="range-values">
			<div>
				<span>From</span>
				<strong>{rangeStartLabel}</strong>
			</div>
			<div>
				<span>To</span>
				<strong>{rangeEndLabel}</strong>
			</div>
		</div>
	</div>

	<div class="filter-bar__section">
		<div class="section-label">Filter</div>
		<div class="dropdown-grid">
			<div class="dropdown">
				<button
					type="button"
					class="dropdown__trigger"
					onclick={() => toggleDropdown('cost')}
					aria-expanded={activeDropdown === 'cost'}
				>
					<span>{costLabel}</span>
					<span class="dropdown__chevron">+</span>
				</button>
				{#if activeDropdown === 'cost'}
					<div class="dropdown__panel">
						{#if costValuesVisible.length === 0}
							<p class="dropdown__empty">No cost filters in this range.</p>
						{:else}
							{#each costValuesVisible as value (value)}
								<button
									type="button"
									class:dropdown__option--selected={costFilter.includes(value)}
									class="dropdown__option"
									onclick={() => toggleCost(value)}
								>
									<span>{value}</span>
									{#if costCountsInRange[value]}
										<small>{costCountsInRange[value]}</small>
									{/if}
								</button>
							{/each}
						{/if}
					</div>
				{/if}
			</div>

			<div class="dropdown">
				<button
					type="button"
					class="dropdown__trigger"
					onclick={() => toggleDropdown('region')}
					aria-expanded={activeDropdown === 'region'}
				>
					<span>{regionLabel}</span>
					<span class="dropdown__chevron">+</span>
				</button>
				{#if activeDropdown === 'region'}
					<div class="dropdown__panel">
						{#if regionValuesVisible.length === 0}
							<p class="dropdown__empty">No regions in this range.</p>
						{:else}
							{#each regionValuesVisible as value (value)}
								<button
									type="button"
									class:dropdown__option--selected={regionSelect.includes(value)}
									class="dropdown__option"
									onclick={() => toggleRegion(value)}
								>
									<span>{value}</span>
									{#if regionCountsInRange[value]}
										<small>{regionCountsInRange[value]}</small>
									{/if}
								</button>
							{/each}
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>

	<div class="filter-bar__section">
		<div class="section-label">Type</div>
		<div class="dropdown">
			<div
				class="type-trigger"
				role="button"
				tabindex="0"
				aria-expanded={activeDropdown === 'type'}
				onclick={() => toggleDropdown('type')}
				onkeydown={handleTypeTriggerKeydown}
			>
				<div class="type-trigger__chips">
					{#each typeSelect as value (value)}
						<span class="type-chip">
							{value}
							<button
								type="button"
								aria-label={`Remove ${value}`}
								onclick={(event) => {
									event.stopPropagation();
									typeSelect = typeSelect.filter((entry) => entry !== value);
								}}
							>
								×
							</button>
						</span>
					{/each}
					{#if typeSelect.length === 0}
						<span class="type-trigger__placeholder">Search to add types...</span>
					{:else}
						<span class="type-trigger__placeholder">Add another...</span>
					{/if}
				</div>
			</div>
			{#if activeDropdown === 'type'}
				<div class="dropdown__panel dropdown__panel--type">
					{#if typeValuesVisible.length === 0}
						<p class="dropdown__empty">No event types in this range.</p>
					{:else}
						{#each typeValuesVisible as value (value)}
							<button
								type="button"
								class:dropdown__option--selected={typeSelect.includes(value)}
								class="dropdown__option"
								onclick={() => toggleType(value)}
							>
								<span>{value}</span>
							</button>
						{/each}
					{/if}
				</div>
			{/if}
		</div>
	</div>

	{#if hasActiveFilters}
		<div class="filter-bar__footer">
			<button type="button" class="clear-button" onclick={clearFilters}>Clear all</button>
		</div>
	{/if}
</div>

<style>
	:global(:root) {
		--events-filter-bg: #f6f2e8;
		--events-filter-surface: #fffdf8;
		--events-filter-border: #d7d0c4;
		--events-filter-rule: #e7dfd0;
		--events-filter-text: #172647;
		--events-filter-muted: #6b7280;
		--events-filter-accent: #1f6b64;
		--events-filter-accent-strong: #153e43;
		--events-filter-shadow: 0 18px 40px rgba(23, 38, 71, 0.12);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.filter-bar {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		padding: 1.25rem;
		border: 1px solid var(--events-filter-border);
		border-radius: 1rem;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.96)),
			var(--events-filter-bg);
		color: var(--events-filter-text);
		box-shadow: var(--events-filter-shadow);
	}

	.filter-bar__section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.section-label {
		padding-bottom: 0.55rem;
		border-bottom: 1px solid var(--events-filter-rule);
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--events-filter-muted);
	}

	.filter-bar__search {
		position: relative;
	}

	.filter-bar__search svg {
		position: absolute;
		top: 50%;
		left: 0.9rem;
		width: 1rem;
		height: 1rem;
		transform: translateY(-50%);
		fill: none;
		stroke: var(--events-filter-muted);
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 2;
	}

	.filter-bar__search input,
	.dropdown__trigger,
	.type-trigger {
		width: 100%;
		min-height: 2.75rem;
		border: 1px solid var(--events-filter-border);
		border-radius: 0.8rem;
		background: var(--events-filter-surface);
		color: var(--events-filter-text);
	}

	.filter-bar__search input {
		padding: 0.8rem 0.95rem 0.8rem 2.55rem;
		font: inherit;
	}

	.view-switcher {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.45rem;
	}

	.view-switcher__button {
		min-height: 2.75rem;
		border: 1px solid var(--events-filter-border);
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.65);
		color: var(--events-filter-muted);
		font: inherit;
		font-size: 0.92rem;
		font-weight: 700;
		text-transform: capitalize;
	}

	.view-switcher__button--active {
		border-color: transparent;
		background: var(--events-filter-accent-strong);
		color: white;
	}

	.histogram {
		display: flex;
		align-items: end;
		gap: 0.18rem;
		height: 3.5rem;
	}

	.histogram__bar {
		flex: 1;
		min-width: 0.28rem;
		border-radius: 999px;
		background: #b9b3ab;
		opacity: 0.72;
	}

	.histogram__bar--active {
		background: var(--events-filter-accent);
		opacity: 1;
	}

	.range-slider {
		position: relative;
		height: 1.2rem;
	}

	.range-slider__track,
	.range-slider__fill {
		position: absolute;
		top: 50%;
		height: 0.3rem;
		border-radius: 999px;
		transform: translateY(-50%);
	}

	.range-slider__track {
		right: 0;
		left: 0;
		background: #d5d0c8;
	}

	.range-slider__fill {
		background: var(--events-filter-accent);
	}

	.range-slider input {
		position: absolute;
		inset: 0;
		width: 100%;
		margin: 0;
		background: transparent;
		appearance: none;
		pointer-events: none;
	}

	.range-slider input::-webkit-slider-thumb {
		width: 1rem;
		height: 1rem;
		border: 2px solid white;
		border-radius: 999px;
		background: var(--events-filter-accent-strong);
		box-shadow: 0 2px 10px rgba(23, 38, 71, 0.18);
		appearance: none;
		pointer-events: auto;
	}

	.range-slider input::-moz-range-thumb {
		width: 1rem;
		height: 1rem;
		border: 2px solid white;
		border-radius: 999px;
		background: var(--events-filter-accent-strong);
		box-shadow: 0 2px 10px rgba(23, 38, 71, 0.18);
		pointer-events: auto;
	}

	.range-values {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.range-values div {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.65rem 0.7rem;
		border: 1px solid var(--events-filter-border);
		border-radius: 0.8rem;
		background: rgba(255, 255, 255, 0.66);
	}

	.range-values span {
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--events-filter-muted);
	}

	.range-values strong {
		font-size: 0.88rem;
	}

	.dropdown-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.dropdown {
		position: relative;
	}

	.dropdown__trigger,
	.type-trigger {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.8rem 0.95rem;
		font: inherit;
		text-align: left;
	}

	.dropdown__chevron {
		font-size: 1rem;
		color: var(--events-filter-muted);
	}

	.dropdown__panel {
		position: absolute;
		z-index: 20;
		top: calc(100% + 0.45rem);
		right: 0;
		left: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		max-height: 16rem;
		padding: 0.5rem;
		overflow: auto;
		border: 1px solid var(--events-filter-border);
		border-radius: 0.9rem;
		background: var(--events-filter-surface);
		box-shadow: var(--events-filter-shadow);
	}

	.dropdown__panel--type {
		position: static;
		margin-top: 0.45rem;
	}

	.dropdown__option {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		width: 100%;
		padding: 0.72rem 0.8rem;
		border: 0;
		border-radius: 0.7rem;
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: left;
	}

	.dropdown__option--selected {
		background: var(--events-filter-accent-strong);
		color: white;
	}

	.dropdown__option small {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.5rem;
		padding: 0.15rem 0.4rem;
		border-radius: 999px;
		background: rgba(23, 38, 71, 0.1);
		font-size: 0.7rem;
		font-weight: 800;
	}

	.dropdown__option--selected small {
		background: rgba(255, 255, 255, 0.2);
	}

	.dropdown__empty {
		margin: 0;
		padding: 0.55rem;
		color: var(--events-filter-muted);
		font-size: 0.9rem;
	}

	.type-trigger {
		align-items: flex-start;
	}

	.type-trigger__chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		width: 100%;
	}

	.type-trigger__placeholder {
		color: var(--events-filter-muted);
		font-size: 0.92rem;
	}

	.type-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.26rem 0.55rem;
		border-radius: 999px;
		background: var(--events-filter-accent-strong);
		color: white;
		font-size: 0.78rem;
		font-weight: 700;
	}

	.type-chip button {
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		line-height: 1;
	}

	.filter-bar__footer {
		padding-top: 0.15rem;
	}

	.clear-button {
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--events-filter-accent);
		font: inherit;
		font-size: 0.75rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	@media (max-width: 640px) {
		.dropdown-grid,
		.range-values {
			grid-template-columns: 1fr;
		}
	}
</style>
