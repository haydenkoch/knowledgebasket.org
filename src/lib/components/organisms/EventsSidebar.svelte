<script lang="ts">
	import { CalendarDays, List, LayoutGrid, ChevronDown, Check, X } from '@lucide/svelte';
	import { Tabs, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import KbSidebar from '$lib/components/organisms/KbSidebar.svelte';
	import { eventTypeTags } from '$lib/data/formSchema';

	type EventFilters = {
		searchQuery: string;
		regionSelect: string[];
		typeSelect: string[];
		costFilter: string[];
		regionValuesVisible: string[];
		regionCountsInRange: Record<string, number>;
		costValuesVisible: string[];
		costCountsInRange: Record<string, number>;
		dateBuckets: {
			buckets: { label: string; start: number; end: number; count: number }[];
			maxCount: number;
		};
		numBuckets: number;
		sliderMinIx: number;
		sliderMaxIx: number;
		rangeStart: number;
		rangeEnd: number;
		typeTagsVisible: string[];
		handleSliderChange: (vals: number[]) => void;
		handleSliderCommit: (vals: number[]) => void;
		clearFilters: () => void;
		[key: string]: unknown;
	};

	interface Props {
		filters: EventFilters;
		eventView: string;
		formatCostLabel: () => string;
		regionTriggerLabel: string;
		onTypeRemove: (label: string) => void;
		onClear: () => void;
	}

	let { filters, eventView = $bindable('list'), onTypeRemove, onClear }: Props = $props();

	// ── Slider local state ────────────────────────────────────────────────────
	let localMin = $state(0);
	let localMax = $state(23);
	$effect(() => {
		localMin = filters.sliderMinIx;
	});
	$effect(() => {
		localMax = filters.sliderMaxIx;
	});

	function onMinInput(e: Event) {
		const v = Math.min(Number((e.target as HTMLInputElement).value), localMax - 1);
		localMin = v;
		filters.handleSliderChange([v, localMax]);
	}
	function onMaxInput(e: Event) {
		const v = Math.max(Number((e.target as HTMLInputElement).value), localMin + 1);
		localMax = v;
		filters.handleSliderChange([localMin, v]);
	}
	function onMinCommit() {
		filters.handleSliderCommit([localMin, localMax]);
	}
	function onMaxCommit() {
		filters.handleSliderCommit([localMin, localMax]);
	}

	// ── Date display ─────────────────────────────────────────────────────────
	function fmtDate(ts: number): string {
		const d = new Date(ts);
		return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
	}
	const fromLabel = $derived(fmtDate(filters.rangeStart));
	const toLabel = $derived(fmtDate(filters.rangeEnd));

	// ── Popover state ─────────────────────────────────────────────────────────
	let costOpen = $state(false);
	let regionOpen = $state(false);
	let typeOpen = $state(false);

	// ── Labels ────────────────────────────────────────────────────────────────
	const costLabel = $derived(
		filters.costFilter.length === 0
			? 'Any cost'
			: filters.costFilter.length === 1
				? filters.costFilter[0]
				: `${filters.costFilter.length} selected`
	);
	const regionLabel = $derived(
		filters.regionSelect.length === 0
			? 'Any geography'
			: filters.regionSelect.length === 1
				? filters.regionSelect[0]
				: `${filters.regionSelect.length} selected`
	);

	// ── Helpers ───────────────────────────────────────────────────────────────
	function toggleCost(v: string) {
		if (filters.costFilter.includes(v))
			filters.costFilter = filters.costFilter.filter((x) => x !== v);
		else filters.costFilter = [...filters.costFilter, v];
	}
	function toggleRegion(v: string) {
		if (filters.regionSelect.includes(v))
			filters.regionSelect = filters.regionSelect.filter((x) => x !== v);
		else filters.regionSelect = [...filters.regionSelect, v];
	}
	function toggleType(tag: string) {
		if (filters.typeSelect.includes(tag))
			filters.typeSelect = filters.typeSelect.filter((x) => x !== tag);
		else filters.typeSelect = [...filters.typeSelect, tag];
	}

	const hasActiveFilters = $derived(
		filters.regionSelect.length > 0 ||
			filters.typeSelect.length > 0 ||
			filters.costFilter.length > 0
	);

	const minPct = $derived(filters.numBuckets > 1 ? (localMin / (filters.numBuckets - 1)) * 100 : 0);
	const maxPct = $derived(
		filters.numBuckets > 1 ? (localMax / (filters.numBuckets - 1)) * 100 : 100
	);
</script>

<KbSidebar
	searchPlaceholder="Search events…"
	bind:searchQuery={filters.searchQuery}
	{hasActiveFilters}
	{onClear}
>
	{#snippet toolbar()}
		<Tabs bind:value={eventView} class="w-full">
			<TabsList class="w-full">
				<TabsTrigger value="list">
					<List class="h-4 w-4" />
					List
				</TabsTrigger>
				<TabsTrigger value="cards">
					<LayoutGrid class="h-4 w-4" />
					Cards
				</TabsTrigger>
				<TabsTrigger value="calendar">
					<CalendarDays class="h-4 w-4" />
					Calendar
				</TabsTrigger>
			</TabsList>
		</Tabs>
	{/snippet}

	<!-- Date range -->
	<div class="kb-section">
		<div class="kb-section__title">Date Range</div>

		<!-- Histogram -->
		<div class="kb-histogram" aria-hidden="true">
			{#each filters.dateBuckets.buckets as bucket, i}
				{@const pct =
					filters.dateBuckets.maxCount > 0
						? (bucket.count / filters.dateBuckets.maxCount) * 100
						: 0}
				{@const inRange = i >= localMin && i <= localMax}
				<div
					class="kb-histogram__bar {inRange ? 'kb-histogram__bar--active' : ''}"
					style="height: {Math.max(pct, 4)}%"
					title="{bucket.label}: {bucket.count}"
				></div>
			{/each}
		</div>

		<!-- Dual-handle range slider -->
		<div class="kb-range-track">
			<div class="kb-range-fill" style="left: {minPct}%; right: {100 - maxPct}%"></div>
			<input
				type="range"
				class="kb-range-input kb-range-input--min"
				min={0}
				max={filters.numBuckets - 1}
				value={localMin}
				oninput={onMinInput}
				onchange={onMinCommit}
				aria-label="Date range start"
			/>
			<input
				type="range"
				class="kb-range-input kb-range-input--max"
				min={0}
				max={filters.numBuckets - 1}
				value={localMax}
				oninput={onMaxInput}
				onchange={onMaxCommit}
				aria-label="Date range end"
			/>
		</div>

		<!-- FROM / TO -->
		<div class="kb-range-labels">
			<div class="kb-range-labels__col">
				<span class="kb-range-labels__label">From</span>
				<input
					type="text"
					readonly
					class="kb-range-labels__input"
					value={fromLabel}
					aria-label="Date range from"
				/>
			</div>
			<div class="kb-range-labels__col">
				<span class="kb-range-labels__label">To</span>
				<input
					type="text"
					readonly
					class="kb-range-labels__input"
					value={toLabel}
					aria-label="Date range to"
				/>
			</div>
		</div>
	</div>

	<!-- Filter: Cost + Geography -->
	<div class="kb-section">
		<div class="kb-section__title">Filter</div>
		<div class="kb-section__stack">
			<!-- Cost -->
			<Popover.Root bind:open={costOpen}>
				<Popover.Trigger class="kb-refine-select">
					<span>{costLabel}</span>
					<ChevronDown class="h-4 w-4 shrink-0 opacity-50" />
				</Popover.Trigger>
				<Popover.Content class="kb-filter-popover-content p-0" align="start" sideOffset={4}>
					<Command.Root>
						<Command.List>
							<Command.Empty>No options.</Command.Empty>
							{#each filters.costValuesVisible as cost}
								{@const sel = filters.costFilter.includes(cost)}
								{@const cnt = filters.costCountsInRange[cost] ?? 0}
								<Command.Item
									value={cost}
									onSelect={() => toggleCost(cost)}
									class="kb-filter-item {sel ? 'kb-filter-item--checked' : ''}"
								>
									<Check class="h-4 w-4 {sel ? 'opacity-100' : 'opacity-0'}" />
									<span class="kb-filter-item__label">{cost}</span>
									{#if cnt > 0}
										<span class="kb-filter-item__badge">{cnt}</span>
									{/if}
								</Command.Item>
							{/each}
						</Command.List>
					</Command.Root>
				</Popover.Content>
			</Popover.Root>

			<!-- Geography -->
			<Popover.Root bind:open={regionOpen}>
				<Popover.Trigger class="kb-refine-select">
					<span>{regionLabel}</span>
					<ChevronDown class="h-4 w-4 shrink-0 opacity-50" />
				</Popover.Trigger>
				<Popover.Content class="kb-filter-popover-content p-0" align="start" sideOffset={4}>
					<Command.Root>
						<Command.List>
							<Command.Empty>No regions.</Command.Empty>
							{#each filters.regionValuesVisible as region}
								{@const sel = filters.regionSelect.includes(region)}
								{@const cnt = filters.regionCountsInRange[region] ?? 0}
								<Command.Item
									value={region}
									onSelect={() => toggleRegion(region)}
									class="kb-filter-item {sel ? 'kb-filter-item--checked' : ''}"
								>
									<Check class="h-4 w-4 {sel ? 'opacity-100' : 'opacity-0'}" />
									<span class="kb-filter-item__label">{region}</span>
									{#if cnt > 0}
										<span class="kb-filter-item__badge">{cnt}</span>
									{/if}
								</Command.Item>
							{/each}
						</Command.List>
					</Command.Root>
				</Popover.Content>
			</Popover.Root>
		</div>
	</div>

	<!-- Type: chip selector -->
	<div class="kb-section">
		<div class="kb-section__title">Type</div>
		<Popover.Root bind:open={typeOpen}>
			<Popover.Trigger class="kb-refine-type-trigger-wrap" aria-label="Add event types">
				<div class="kb-form-type-trigger" class:empty={filters.typeSelect.length === 0}>
					{#if filters.typeSelect.length > 0}
						<span class="kb-form-type-chips">
							{#each filters.typeSelect as tag (tag)}
								<span class="kb-form-type-chip">
									{tag}
									<button
										type="button"
										class="kb-form-type-chip-remove"
										aria-label="Remove {tag}"
										onclick={(e) => {
											e.preventDefault();
											e.stopPropagation();
											onTypeRemove(tag);
										}}
									>
										<X class="size-3" />
									</button>
								</span>
							{/each}
						</span>
					{/if}
					<span class="kb-form-type-placeholder">
						{filters.typeSelect.length ? 'Add another…' : 'Search to add types…'}
					</span>
				</div>
			</Popover.Trigger>
			<Popover.Content class="kb-filter-popover-content p-0" align="start" sideOffset={4}>
				<Command.Root>
					<Command.Input placeholder="Search types…" />
					<Command.List>
						<Command.Empty>No type found.</Command.Empty>
						<Command.Group>
							{#each eventTypeTags as tag (tag)}
								{@const sel = filters.typeSelect.includes(tag)}
								<Command.Item
									value={tag}
									onSelect={() => toggleType(tag)}
									class="kb-filter-item {sel ? 'kb-filter-item--checked' : ''}"
								>
									<Check class="h-4 w-4 {sel ? 'opacity-100' : 'opacity-0'}" />
									<span class="kb-filter-item__label">{tag}</span>
								</Command.Item>
							{/each}
						</Command.Group>
					</Command.List>
				</Command.Root>
			</Popover.Content>
		</Popover.Root>
	</div>
</KbSidebar>

<style>
	/* ── Section spacing (shared across all events filter sections) ───── */
	.kb-section {
		margin-bottom: 20px;
		padding-bottom: 16px;
		border-bottom: 1px solid color-mix(in srgb, var(--rule, #e5e5e5) 60%, transparent);
	}
	.kb-section:last-child {
		border-bottom: none;
		margin-bottom: 0;
		padding-bottom: 0;
	}
	.kb-section__title {
		font-family: var(--font-sans);
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--muted-foreground);
		margin-bottom: 12px;
	}
	.kb-section__stack {
		display: flex;
		flex-direction: column;
		gap: 6px;
		width: 100%;
		min-width: 0;
	}

	/* ── Histogram ────────────────────────────────────────────────────── */
	.kb-histogram {
		display: flex;
		align-items: flex-end;
		gap: 3px;
		height: 48px;
		margin-bottom: 8px;
	}
	.kb-histogram__bar {
		flex: 1;
		min-width: 3px;
		border-radius: 9999px;
		background: var(--color-granite-300, #c7c7c9);
		opacity: 0.7;
		transition:
			background 0.15s ease,
			opacity 0.15s ease;
	}
	.kb-histogram__bar--active {
		background: var(--primary);
		opacity: 1;
	}

	/* ── Dual-handle range slider ────────────────────────────────────── */
	.kb-range-track {
		position: relative;
		height: 4px;
		background: var(--color-granite-200, #d8d8da);
		border-radius: 9999px;
		margin: 8px 0 6px;
	}
	.kb-range-fill {
		position: absolute;
		top: 0;
		bottom: 0;
		background: var(--primary);
		border-radius: 9999px;
		pointer-events: none;
	}
	.kb-range-input {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		width: 100%;
		height: 4px;
		background: transparent;
		appearance: none;
		-webkit-appearance: none;
		pointer-events: none;
		outline: none;
		margin: 0;
	}
	.kb-range-input::-webkit-slider-thumb {
		appearance: none;
		-webkit-appearance: none;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: var(--primary);
		border: 2px solid var(--background);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
		pointer-events: all;
		cursor: pointer;
		position: relative;
		z-index: 1;
	}
	.kb-range-input::-moz-range-thumb {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: var(--primary);
		border: 2px solid var(--background);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
		pointer-events: all;
		cursor: pointer;
	}
	.kb-range-input--max {
		z-index: 2;
	}
	.kb-range-input--min {
		z-index: 3;
	}
	.kb-range-input--min::-webkit-slider-thumb {
		z-index: 3;
	}
	.kb-range-input:focus-visible::-webkit-slider-thumb {
		box-shadow:
			0 0 0 3px var(--ring),
			0 1px 4px rgba(0, 0, 0, 0.25);
	}
	.kb-range-input:focus-visible::-moz-range-thumb {
		box-shadow:
			0 0 0 3px var(--ring),
			0 1px 4px rgba(0, 0, 0, 0.25);
	}

	/* ── Range labels (FROM / TO) ────────────────────────────────────── */
	.kb-range-labels {
		display: flex;
		gap: 8px;
		margin-top: 4px;
	}
	.kb-range-labels__col {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.kb-range-labels__label {
		font-family: var(--font-sans);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted-foreground);
	}
	.kb-range-labels__input {
		font-family: var(--font-sans);
		font-size: 12px;
		border-radius: var(--radius, 6px);
		border: 1px solid var(--border);
		padding: 4px 6px;
		background: var(--card);
		color: var(--foreground);
		width: 100%;
		box-sizing: border-box;
	}

	/* ── Combobox trigger ────────────────────────────────────────────── */
	:global(.kb-refine-select) {
		display: flex !important;
		align-items: center !important;
		justify-content: space-between !important;
		gap: 0.5rem;
		width: 100% !important;
		min-width: 0;
		min-height: 2.25rem;
		height: 2.25rem;
		padding-left: 0.75rem;
		padding-right: 0.75rem;
		color: var(--foreground) !important;
		background: var(--card) !important;
		border: 1px solid var(--border) !important;
		border-radius: var(--radius);
		font-family: var(--font-sans);
		font-size: 13px;
		cursor: pointer;
		box-sizing: border-box;
	}
	:global(.kb-refine-select > :first-child) {
		flex: 1 1 auto;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		text-align: left;
	}
	:global(.kb-refine-select > svg:last-child) {
		flex-shrink: 0;
		margin-left: auto;
		max-width: 24px;
	}

	/* ── Type chip trigger ───────────────────────────────────────────── */
	:global(.kb-refine-type-trigger-wrap) {
		width: 100%;
		min-width: 0;
		display: block;
		background: transparent;
		border: none;
		padding: 0;
		cursor: pointer;
		text-align: left;
	}
	.kb-form-type-trigger {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px;
		min-height: 2.25rem;
		padding: 4px 10px;
		border: 1px solid var(--input);
		border-radius: var(--radius, 6px);
		background: var(--card);
		cursor: pointer;
		width: 100%;
		box-sizing: border-box;
	}
	.kb-form-type-trigger:hover {
		border-color: var(--primary);
	}
	.kb-form-type-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}
	.kb-form-type-chip {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		background: var(--color-lakebed-950, #172647);
		color: #fff;
		font-size: 11px;
		font-weight: 500;
		padding: 2px 6px;
		border-radius: 9999px;
		white-space: nowrap;
	}
	.kb-form-type-chip-remove {
		display: inline-flex;
		align-items: center;
		background: transparent;
		border: none;
		color: inherit;
		cursor: pointer;
		padding: 0;
		opacity: 0.8;
		line-height: 1;
	}
	.kb-form-type-chip-remove:hover {
		opacity: 1;
	}
	.kb-form-type-placeholder {
		font-size: 13px;
		color: var(--muted-foreground);
	}

	/* ── Popover dropdown ────────────────────────────────────────────── */
	:global(.kb-filter-popover-content) {
		width: var(--radix-popover-trigger-width, 232px);
		min-width: 200px;
		max-width: var(--radix-popover-trigger-width, 280px);
		box-sizing: border-box;
	}
	:global(.kb-filter-popover-content [data-slot='command-list']) {
		scrollbar-width: none;
	}
	:global(.kb-filter-popover-content [data-slot='command-list']::-webkit-scrollbar) {
		display: none;
	}

	/* ── Filter item (inside popover) ────────────────────────────────── */
	:global(.kb-filter-item) {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
	}
	:global(.kb-filter-item__label) {
		flex: 1 1 auto;
		min-width: 0;
		overflow: visible;
		white-space: normal;
		word-break: break-word;
	}
	:global(.kb-filter-item__badge) {
		flex-shrink: 0;
		margin-left: auto;
		display: inline-flex;
		align-items: center;
		border-radius: 9999px;
		padding: 1px 6px;
		font-size: 10px;
		font-weight: 600;
		background: var(--color-lakebed-950) !important;
		color: #ffffff !important;
		border: none !important;
	}
	:global(.kb-filter-popover-content .kb-filter-item[aria-selected='true']) {
		background: var(--color-lakebed-950);
		color: #ffffff;
	}
	:global(.kb-filter-popover-content .kb-filter-item[aria-selected='true'] .kb-filter-item__badge) {
		background: #ffffff !important;
		color: var(--color-lakebed-950) !important;
	}
</style>
