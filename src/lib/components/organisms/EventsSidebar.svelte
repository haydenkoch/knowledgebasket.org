<script lang="ts">
	import { CalendarDays, List, LayoutGrid, ChevronDown, Check, X } from '@lucide/svelte';
	import { Tabs, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
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
		dateBuckets: { buckets: { label: string; start: number; end: number; count: number }[]; maxCount: number };
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
	$effect(() => { localMin = filters.sliderMinIx; });
	$effect(() => { localMax = filters.sliderMaxIx; });

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
	function onMinCommit() { filters.handleSliderCommit([localMin, localMax]); }
	function onMaxCommit() { filters.handleSliderCommit([localMin, localMax]); }

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
		filters.costFilter.length === 0 ? 'Any cost' :
		filters.costFilter.length === 1 ? filters.costFilter[0] :
		`${filters.costFilter.length} selected`
	);
	const regionLabel = $derived(
		filters.regionSelect.length === 0 ? 'Any geography' :
		filters.regionSelect.length === 1 ? filters.regionSelect[0] :
		`${filters.regionSelect.length} selected`
	);

	// ── Helpers ───────────────────────────────────────────────────────────────
	function toggleCost(v: string) {
		if (filters.costFilter.includes(v)) filters.costFilter = filters.costFilter.filter((x) => x !== v);
		else filters.costFilter = [...filters.costFilter, v];
	}
	function toggleRegion(v: string) {
		if (filters.regionSelect.includes(v)) filters.regionSelect = filters.regionSelect.filter((x) => x !== v);
		else filters.regionSelect = [...filters.regionSelect, v];
	}
	function toggleType(tag: string) {
		if (filters.typeSelect.includes(tag)) filters.typeSelect = filters.typeSelect.filter((x) => x !== tag);
		else filters.typeSelect = [...filters.typeSelect, tag];
	}

	const hasActiveFilters = $derived(
		filters.regionSelect.length > 0 || filters.typeSelect.length > 0 || filters.costFilter.length > 0
	);

	// Track progress % for dual-range slider highlight
	const minPct = $derived(filters.numBuckets > 1 ? (localMin / (filters.numBuckets - 1)) * 100 : 0);
	const maxPct = $derived(filters.numBuckets > 1 ? (localMax / (filters.numBuckets - 1)) * 100 : 100);
</script>

<div>

	<!-- Search -->
	<div class="mb-[22px]">
		<div class="relative mb-7">
			<span class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] text-sm flex items-center justify-center" aria-hidden="true">
				<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
			</span>
			<input
				type="search"
				placeholder="Search events…"
				class="h-9 w-full rounded-md border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				style="padding-left: 38px;"
				bind:value={filters.searchQuery}
				aria-label="Search events"
			/>
		</div>
	</div>

	<!-- View switcher -->
	<div class="mb-[22px]">
		<Tabs bind:value={eventView} class="w-full">
			<TabsList class="w-full">
				<TabsTrigger value="list">
					<List class="w-[18px] h-[18px]" />
					List
				</TabsTrigger>
				<TabsTrigger value="cards">
					<LayoutGrid class="w-[18px] h-[18px]" />
					Cards
				</TabsTrigger>
				<TabsTrigger value="calendar">
					<CalendarDays class="w-[18px] h-[18px]" />
					Calendar
				</TabsTrigger>
			</TabsList>
		</Tabs>
	</div>

	<!-- Date range -->
	<div class="mb-[18px]">
		<div class="font-sans text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--muted-foreground)] mt-1 mb-[22px] pb-4 border-b border-[var(--rule)]">Date Range</div>

		<!-- Histogram -->
		<div class="flex items-end gap-[3px] h-[56px] mb-3" aria-hidden="true">
			{#each filters.dateBuckets.buckets as bucket, i}
				{@const pct = filters.dateBuckets.maxCount > 0 ? (bucket.count / filters.dateBuckets.maxCount) * 100 : 0}
				{@const inRange = i >= localMin && i <= localMax}
				<div
					class="flex-1 min-w-[4px] rounded-full opacity-[0.85] {inRange ? 'bg-[var(--primary)] opacity-100' : 'bg-[var(--color-granite-500)]'}"
					style="height: {Math.max(pct, 4)}%"
					title="{bucket.label}: {bucket.count}"
				></div>
			{/each}
		</div>

		<!-- Dual-handle range slider -->
		<div class="mt-1">
			<div class="kb-range-track">
				<div
					class="kb-range-fill"
					style="left: {minPct}%; right: {100 - maxPct}%"
				></div>
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
		</div>

		<!-- FROM / TO -->
		<div class="flex justify-between text-xs text-[var(--muted-foreground)] mt-1 gap-2">
			<div class="flex flex-col gap-0.5 flex-1">
				<span class="font-sans text-[11px] uppercase tracking-[0.06em] text-[var(--muted-foreground)]">From</span>
				<input type="text" readonly class="font-sans text-xs rounded-[var(--radius)] border border-[var(--border)] px-1.5 py-1 bg-[var(--card)] text-[var(--foreground)]" value={fromLabel} aria-label="Date range from" />
			</div>
			<div class="flex flex-col gap-0.5 flex-1">
				<span class="font-sans text-[11px] uppercase tracking-[0.06em] text-[var(--muted-foreground)]">To</span>
				<input type="text" readonly class="font-sans text-xs rounded-[var(--radius)] border border-[var(--border)] px-1.5 py-1 bg-[var(--card)] text-[var(--foreground)]" value={toLabel} aria-label="Date range to" />
			</div>
		</div>
	</div>

	<!-- Filter: Cost + Geography -->
	<div class="mb-[22px]">
		<div class="font-sans text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--muted-foreground)] mb-2 pb-1.5 border-b border-[var(--rule)]">Filter</div>
		<div class="mt-1.5 flex flex-col gap-1.5 w-full">
			<!-- Cost -->
			<div class="flex flex-col gap-1.5 w-full min-w-0">
				<Popover.Root bind:open={costOpen}>
					<Popover.Trigger class="kb-refine-select rounded-md border border-input text-sm font-normal">
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
										class="kb-filter-item flex items-center gap-2 w-full {sel ? 'kb-filter-item--checked' : ''}"
									>
										<Check class="h-4 w-4 {sel ? 'opacity-100' : 'opacity-0'}" />
										<span class="kb-filter-item__label flex-auto min-w-0 overflow-hidden text-ellipsis">{cost}</span>
										{#if cnt > 0}
											<span class="kb-filter-item__badge flex-none ml-auto inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-[var(--color-lakebed-950)] text-white">{cnt}</span>
										{/if}
									</Command.Item>
								{/each}
							</Command.List>
						</Command.Root>
					</Popover.Content>
				</Popover.Root>
			</div>
			<!-- Geography -->
			<div class="flex flex-col gap-1.5 w-full min-w-0">
				<Popover.Root bind:open={regionOpen}>
					<Popover.Trigger class="kb-refine-select rounded-md border border-input text-sm font-normal">
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
										class="kb-filter-item flex items-center gap-2 w-full {sel ? 'kb-filter-item--checked' : ''}"
									>
										<Check class="h-4 w-4 {sel ? 'opacity-100' : 'opacity-0'}" />
										<span class="kb-filter-item__label flex-auto min-w-0 overflow-hidden text-ellipsis">{region}</span>
										{#if cnt > 0}
											<span class="kb-filter-item__badge flex-none ml-auto inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-[var(--color-lakebed-950)] text-white">{cnt}</span>
										{/if}
									</Command.Item>
								{/each}
							</Command.List>
						</Command.Root>
					</Popover.Content>
				</Popover.Root>
			</div>
		</div>
	</div>

	<!-- Type: chip selector -->
	<div class="mb-[22px]">
		<div class="font-sans text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--muted-foreground)] mb-2 pb-1.5 border-b border-[var(--rule)]">Type</div>
		<div class="mt-1.5 flex flex-col gap-1.5 w-full">
			<div class="flex flex-col gap-1.5 w-full min-w-0">
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
												onclick={(e) => { e.preventDefault(); e.stopPropagation(); onTypeRemove(tag); }}
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
										{@const cnt = (filters.typeTagsVisible as string[]).includes(tag) ? 1 : 0}
										<Command.Item
											value={tag}
											onSelect={() => toggleType(tag)}
											class="kb-filter-item flex items-center gap-2 w-full {sel ? 'kb-filter-item--checked' : ''}"
										>
											<Check class="h-4 w-4 {sel ? 'opacity-100' : 'opacity-0'}" />
											<span class="kb-filter-item__label flex-auto min-w-0 overflow-hidden text-ellipsis">{tag}</span>
										</Command.Item>
									{/each}
								</Command.Group>
							</Command.List>
						</Command.Root>
					</Popover.Content>
				</Popover.Root>
			</div>
		</div>
	</div>

	<!-- Clear -->
	{#if hasActiveFilters}
		<button type="button" class="self-start font-sans text-[11px] font-semibold uppercase tracking-[0.08em] border-none bg-none text-[var(--teal)] cursor-pointer min-h-[44px] min-w-[44px] px-0 pr-4 py-3 inline-flex items-center" onclick={onClear}>Clear all</button>
	{/if}

</div>

<style>
/* ── Dual-handle range slider ──────────────────────────────────────────────── */
.kb-range-track {
	position: relative;
	height: 4px;
	background: var(--color-granite-200, #d8d8da);
	border-radius: 9999px;
	margin: 8px 0 4px;
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
	box-shadow: 0 1px 4px rgba(0,0,0,0.25);
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
	box-shadow: 0 1px 4px rgba(0,0,0,0.25);
	pointer-events: all;
	cursor: pointer;
}

.kb-range-input--max {
	z-index: 2;
}

.kb-range-input--min {
	z-index: 3;
}

/* When min = max, give max thumb priority */
.kb-range-input--min::-webkit-slider-thumb {
	z-index: 3;
}

/* Type chip trigger: full-width, wraps chips */
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

/* Type chip input-like container */
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

/* Chips row */
.kb-form-type-chips {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
}

/* Individual chip */
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
.kb-form-type-chip-remove:hover { opacity: 1; }

/* Placeholder text */
.kb-form-type-placeholder {
	font-size: 13px;
	color: var(--muted-foreground);
}

/* Combobox trigger – match search input height, layout */
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
	border-color: var(--border) !important;
	border-radius: var(--radius);
	border-width: 1px;
	border-style: solid;
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

/* Filter dropdown popover width */
:global(.kb-filter-popover-content) {
	width: var(--radix-popover-trigger-width, 232px);
	min-width: 232px;
	max-width: var(--radix-popover-trigger-width, 232px);
	box-sizing: border-box;
}
:global(.kb-filter-popover-content [data-slot="command-list"]) {
	scrollbar-width: none;
}
:global(.kb-filter-popover-content [data-slot="command-list"]::-webkit-scrollbar) {
	display: none;
}
:global(.kb-filter-popover-content .kb-filter-item[aria-selected="true"]) {
	background: var(--color-lakebed-950);
	color: #ffffff;
}
:global(.kb-filter-item__badge) {
	background: var(--color-lakebed-950) !important;
	color: #ffffff !important;
	border: none !important;
}
:global(.kb-filter-popover-content .kb-filter-item[aria-selected="true"] .kb-filter-item__badge) {
	background: #ffffff !important;
	color: var(--color-lakebed-950) !important;
}
:global(.kb-filter-popover-content .kb-filter-item .kb-filter-item__label) {
	overflow: visible;
	text-overflow: unset;
	white-space: normal;
	word-break: break-word;
}
</style>
