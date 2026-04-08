<script lang="ts">
	import { ChevronDown, Check, X, Sparkles, AlarmClock, Ban } from '@lucide/svelte';
	import type { EventItem } from '$lib/data/kb';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import KbSidebar from '$lib/components/organisms/KbSidebar.svelte';
	import EventsViewSelector from '$lib/components/molecules/EventsViewSelector.svelte';
	import { eventTypeGroups } from '$lib/data/formSchema';
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import { getEventCostFilterLabel } from '$lib/utils/event-pricing';
	import { EVENTS_SORT_OPTIONS, type EventsSortKey } from '$lib/hooks/use-events-filters-v2.svelte';

	type EventFiltersV2 = {
		searchQuery: string;
		regionSelect: string[];
		typeSelect: string[];
		costFilter: string[];
		formatSelect: string[];
		audienceSelect: string[];
		sortBy: EventsSortKey;
		featuredOnly: boolean;
		hideSoldOut: boolean;
		registrationOpen: boolean;
		closingThisWeek: boolean;
		regionValuesVisible: string[];
		regionCountsInRange: Record<string, number>;
		audienceValuesVisible: string[];
		audienceCountsInRange: Record<string, number>;
		costValuesVisible: string[];
		costCountsInRange: Record<string, number>;
		formatCountsInRange: Record<string, number>;
		dateBuckets: {
			buckets: { label: string; start: number; end: number; count: number }[];
			maxCount: number;
		};
		numBuckets: number;
		sliderMinIx: number;
		sliderMaxIx: number;
		rangeStart: number;
		rangeEnd: number;
		todayStart: number;
		defaultRangeEnd: number;
		typeTagsVisible: string[];
		handleSliderChange: (vals: number[]) => void;
		handleSliderCommit: (vals: number[]) => void;
		setRangeFromIndices: (minIx: number, maxIx: number) => void;
		clearFilters: () => void;
		[key: string]: unknown;
	};

	interface Props {
		filters: EventFiltersV2;
		eventView: 'cards' | 'list' | 'calendar';
		mobileMode?: boolean;
		formatCostLabel: () => string;
		regionTriggerLabel: string;
		activeFilterCount?: number;
		isExpanded?: boolean;
		mobileSuggestions?: EventItem[];
		onTypeRemove: (label: string) => void;
		onClear: () => void;
	}

	let {
		filters,
		eventView = $bindable('list'),
		mobileMode,
		formatCostLabel,
		activeFilterCount = 0,
		isExpanded = false,
		mobileSuggestions = [],
		onTypeRemove,
		onClear
	}: Props = $props();
	const isMobile = new IsMobile();
	const mobileUi = $derived(mobileMode ?? isMobile.current);

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

	// ── Date presets ─────────────────────────────────────────────────────────
	type PresetId = 'today' | 'weekend' | 'next7' | 'thisMonth' | 'next3mo' | 'all';
	const DATE_PRESETS: { id: PresetId; label: string }[] = [
		{ id: 'today', label: 'Today' },
		{ id: 'weekend', label: 'This weekend' },
		{ id: 'next7', label: 'Next 7 days' },
		{ id: 'thisMonth', label: 'This month' },
		{ id: 'next3mo', label: 'Next 3 months' },
		{ id: 'all', label: 'All' }
	];

	function presetRange(id: PresetId): { start: number; end: number } {
		const now = new Date();
		const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
		const endOfToday = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
			23,
			59,
			59,
			999
		).getTime();
		switch (id) {
			case 'today':
				return { start: startOfToday, end: endOfToday };
			case 'weekend': {
				const dow = now.getDay();
				const daysUntilSat = (6 - dow + 7) % 7;
				const sat = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSat);
				const sun = new Date(sat.getFullYear(), sat.getMonth(), sat.getDate() + 1, 23, 59, 59, 999);
				return { start: sat.getTime(), end: sun.getTime() };
			}
			case 'next7':
				return {
					start: startOfToday,
					end: new Date(
						now.getFullYear(),
						now.getMonth(),
						now.getDate() + 7,
						23,
						59,
						59,
						999
					).getTime()
				};
			case 'thisMonth':
				return {
					start: startOfToday,
					end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime()
				};
			case 'next3mo':
				return {
					start: startOfToday,
					end: new Date(now.getFullYear(), now.getMonth() + 3, 0, 23, 59, 59, 999).getTime()
				};
			case 'all':
			default:
				return { start: filters.todayStart, end: filters.defaultRangeEnd };
		}
	}

	const activePreset = $derived.by<PresetId | null>(() => {
		const start = filters.rangeStart;
		const end = filters.rangeEnd;
		for (const p of DATE_PRESETS) {
			const r = presetRange(p.id);
			if (r.start === start && r.end === end) return p.id;
		}
		return null;
	});

	function applyPreset(id: PresetId) {
		const r = presetRange(id);
		filters.rangeStart = r.start;
		filters.rangeEnd = r.end;
	}

	// ── Popover state ─────────────────────────────────────────────────────────
	let costOpen = $state(false);
	let regionOpen = $state(false);
	let audienceOpen = $state(false);
	let typeOpen = $state(false);

	// ── Labels ────────────────────────────────────────────────────────────────
	const costLabel = $derived(
		typeof formatCostLabel === 'function' ? formatCostLabel() : 'Any cost'
	);
	const regionLabel = $derived(
		filters.regionSelect.length === 0
			? 'Any geography'
			: filters.regionSelect.length === 1
				? filters.regionSelect[0]
				: `${filters.regionSelect.length} selected`
	);
	const audienceLabel = $derived(
		filters.audienceSelect.length === 0
			? 'Any audience'
			: filters.audienceSelect.length === 1
				? filters.audienceSelect[0]
				: `${filters.audienceSelect.length} selected`
	);

	// ── Format toggle ─────────────────────────────────────────────────────────
	const FORMAT_OPTIONS: { id: string; label: string }[] = [
		{ id: 'in_person', label: 'In person' },
		{ id: 'online', label: 'Online' },
		{ id: 'hybrid', label: 'Hybrid' }
	];
	function toggleFormat(id: string) {
		if (filters.formatSelect.includes(id))
			filters.formatSelect = filters.formatSelect.filter((x) => x !== id);
		else filters.formatSelect = [...filters.formatSelect, id];
	}

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
	function toggleAudience(v: string) {
		if (filters.audienceSelect.includes(v))
			filters.audienceSelect = filters.audienceSelect.filter((x) => x !== v);
		else filters.audienceSelect = [...filters.audienceSelect, v];
	}
	function toggleType(tag: string) {
		if (filters.typeSelect.includes(tag))
			filters.typeSelect = filters.typeSelect.filter((x) => x !== tag);
		else filters.typeSelect = [...filters.typeSelect, tag];
	}

	const dateRangeIsCustom = $derived(
		filters.rangeStart !== filters.todayStart || filters.rangeEnd !== filters.defaultRangeEnd
	);

	const hasActiveFilters = $derived(
		filters.regionSelect.length > 0 ||
			filters.typeSelect.length > 0 ||
			filters.costFilter.length > 0 ||
			filters.formatSelect.length > 0 ||
			filters.audienceSelect.length > 0 ||
			filters.featuredOnly ||
			filters.hideSoldOut ||
			filters.registrationOpen ||
			filters.closingThisWeek ||
			dateRangeIsCustom
	);

	// ── Active filter chip list (for the bar above sections) ─────────────────
	type ActiveChip = { key: string; label: string; remove: () => void };
	const activeChips = $derived.by<ActiveChip[]>(() => {
		const out: ActiveChip[] = [];
		if (dateRangeIsCustom) {
			const presetLabel = activePreset
				? (DATE_PRESETS.find((p) => p.id === activePreset)?.label ?? 'Custom dates')
				: `${fmtDate(filters.rangeStart)} – ${fmtDate(filters.rangeEnd)}`;
			out.push({
				key: 'date',
				label: presetLabel,
				remove: () => {
					filters.rangeStart = filters.todayStart;
					filters.rangeEnd = filters.defaultRangeEnd;
				}
			});
		}
		for (const f of filters.formatSelect) {
			const opt = FORMAT_OPTIONS.find((o) => o.id === f);
			out.push({
				key: `format:${f}`,
				label: opt?.label ?? f,
				remove: () => toggleFormat(f)
			});
		}
		for (const c of filters.costFilter) {
			out.push({
				key: `cost:${c}`,
				label: getEventCostFilterLabel(c),
				remove: () => toggleCost(c)
			});
		}
		for (const r of filters.regionSelect) {
			out.push({ key: `region:${r}`, label: r, remove: () => toggleRegion(r) });
		}
		for (const a of filters.audienceSelect) {
			out.push({ key: `audience:${a}`, label: a, remove: () => toggleAudience(a) });
		}
		for (const t of filters.typeSelect) {
			out.push({ key: `type:${t}`, label: t, remove: () => onTypeRemove(t) });
		}
		if (filters.featuredOnly) {
			out.push({
				key: 'featured',
				label: 'Featured only',
				remove: () => (filters.featuredOnly = false)
			});
		}
		if (filters.hideSoldOut) {
			out.push({
				key: 'soldout',
				label: 'Hide sold out',
				remove: () => (filters.hideSoldOut = false)
			});
		}
		if (filters.registrationOpen) {
			out.push({
				key: 'regopen',
				label: 'Registration open',
				remove: () => (filters.registrationOpen = false)
			});
		}
		if (filters.closingThisWeek) {
			out.push({
				key: 'closing',
				label: 'Closing this week',
				remove: () => (filters.closingThisWeek = false)
			});
		}
		return out;
	});

	const minPct = $derived(filters.numBuckets > 1 ? (localMin / (filters.numBuckets - 1)) * 100 : 0);
	const maxPct = $derived(
		filters.numBuckets > 1 ? (localMax / (filters.numBuckets - 1)) * 100 : 100
	);

	// ── Sort selector ────────────────────────────────────────────────────────
	const sortLabel = $derived(
		EVENTS_SORT_OPTIONS.find((o) => o.id === filters.sortBy)?.label ?? 'Sort'
	);
</script>

<KbSidebar
	searchPlaceholder="Search events…"
	bind:searchQuery={filters.searchQuery}
	{hasActiveFilters}
	{onClear}
	showEyebrow={!mobileUi}
	showToolbar={!mobileUi}
	showSummary={!mobileUi}
>
	{#snippet searchSuggestions()}
		{#if mobileUi && !isExpanded && mobileSuggestions.length > 0}
			<div class="events-sidebar__suggestions" data-peek-ignore-drag>
				<div class="events-sidebar__suggestions-label">Suggested events</div>
				<ul class="events-sidebar__suggestions-list">
					{#each mobileSuggestions as event (event.slug ?? event.id)}
						<li>
							<a href={`/events/${event.slug ?? event.id}`} class="events-sidebar__suggestion-link">
								<span class="events-sidebar__suggestion-title">{event.title}</span>
								{#if event.location}
									<span class="events-sidebar__suggestion-meta">{event.location}</span>
								{/if}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	{/snippet}

	{#snippet toolbar()}
		<EventsViewSelector bind:eventView />
	{/snippet}

	<!-- Active filter chips -->
	{#if activeChips.length > 0}
		<div class="kb-section kb-active-chips-section">
			<div class="kb-active-chips-row">
				<div class="kb-active-chips">
					{#each activeChips as chip (chip.key)}
						<span class="kb-form-type-chip">
							{chip.label}
							<button
								type="button"
								class="kb-form-type-chip-remove"
								aria-label="Remove {chip.label}"
								onclick={chip.remove}
							>
								<X class="size-3" />
							</button>
						</span>
					{/each}
				</div>
				<button type="button" class="kb-active-chips-clear" onclick={onClear}>Clear all</button>
			</div>
		</div>
	{/if}

	<!-- Date range -->
	<div class="kb-section">
		<div class="kb-section__title">Date Range</div>

		<!-- Quick presets -->
		<div class="kb-date-presets" role="group" aria-label="Date range presets">
			{#each DATE_PRESETS as preset (preset.id)}
				<button
					type="button"
					class="kb-date-preset"
					class:kb-date-preset--active={activePreset === preset.id}
					aria-pressed={activePreset === preset.id}
					onclick={() => applyPreset(preset.id)}
				>
					<span>{preset.label}</span>
				</button>
			{/each}
		</div>

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

	<!-- Format -->
	<div class="kb-section">
		<div class="kb-section__title">Format</div>
		<div class="kb-format-group" role="group" aria-label="Event format">
			{#each FORMAT_OPTIONS as opt (opt.id)}
				{@const sel = filters.formatSelect.includes(opt.id)}
				<Button
					type="button"
					variant={sel ? 'default' : 'outline'}
					size="sm"
					aria-pressed={sel}
					class="kb-format-button"
					onclick={() => toggleFormat(opt.id)}
				>
					{opt.label}
				</Button>
			{/each}
		</div>
	</div>

	<!-- Filter: Cost + Geography + Audience -->
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
									<Check class="h-4 w-4 text-current {sel ? 'opacity-100' : 'opacity-0'}" />
									<span class="kb-filter-item__label">{getEventCostFilterLabel(cost)}</span>
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
									<Check class="h-4 w-4 text-current {sel ? 'opacity-100' : 'opacity-0'}" />
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

			<!-- Audience -->
			{#if filters.audienceValuesVisible.length > 0}
				<Popover.Root bind:open={audienceOpen}>
					<Popover.Trigger class="kb-refine-select">
						<span>{audienceLabel}</span>
						<ChevronDown class="h-4 w-4 shrink-0 opacity-50" />
					</Popover.Trigger>
					<Popover.Content class="kb-filter-popover-content p-0" align="start" sideOffset={4}>
						<Command.Root>
							<Command.List>
								<Command.Empty>No audiences.</Command.Empty>
								{#each filters.audienceValuesVisible as audience}
									{@const sel = filters.audienceSelect.includes(audience)}
									{@const cnt = filters.audienceCountsInRange[audience] ?? 0}
									<Command.Item
										value={audience}
										onSelect={() => toggleAudience(audience)}
										class="kb-filter-item {sel ? 'kb-filter-item--checked' : ''}"
									>
										<Check class="h-4 w-4 text-current {sel ? 'opacity-100' : 'opacity-0'}" />
										<span class="kb-filter-item__label">{audience}</span>
										{#if cnt > 0}
											<span class="kb-filter-item__badge">{cnt}</span>
										{/if}
									</Command.Item>
								{/each}
							</Command.List>
						</Command.Root>
					</Popover.Content>
				</Popover.Root>
			{/if}
		</div>

		<!-- Quick toggles -->
		<div class="kb-toggle-stack">
			<label class="kb-toggle-row">
				<span class="kb-toggle-row__label">
					<Sparkles class="size-3.5 opacity-70" />
					Featured only
				</span>
				<Switch bind:checked={filters.featuredOnly} size="sm" />
			</label>
			<label class="kb-toggle-row">
				<span class="kb-toggle-row__label">
					<Ban class="size-3.5 opacity-70" />
					Hide sold out
				</span>
				<Switch bind:checked={filters.hideSoldOut} size="sm" />
			</label>
			<label class="kb-toggle-row">
				<span class="kb-toggle-row__label">
					<Check class="size-3.5 opacity-70" />
					Registration open
				</span>
				<Switch bind:checked={filters.registrationOpen} size="sm" />
			</label>
			<label class="kb-toggle-row">
				<span class="kb-toggle-row__label">
					<AlarmClock class="size-3.5 opacity-70" />
					Closing this week
				</span>
				<Switch bind:checked={filters.closingThisWeek} size="sm" />
			</label>
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
						{#each eventTypeGroups as group (group.id)}
							<Command.Group heading={group.label}>
								{#each group.tags as tag (tag)}
									{@const sel = filters.typeSelect.includes(tag)}
									<Command.Item
										value={tag}
										onSelect={() => toggleType(tag)}
										class="kb-filter-item {sel ? 'kb-filter-item--checked' : ''}"
									>
										<Check class="h-4 w-4 text-current {sel ? 'opacity-100' : 'opacity-0'}" />
										<span class="kb-filter-item__label">{tag}</span>
									</Command.Item>
								{/each}
							</Command.Group>
						{/each}
					</Command.List>
				</Command.Root>
			</Popover.Content>
		</Popover.Root>
	</div>

	<!-- Sort -->
	<div class="kb-section">
		<div class="kb-section__title">Sort</div>
		<Select.Root
			type="single"
			value={filters.sortBy}
			onValueChange={(v: string) => (filters.sortBy = v as EventsSortKey)}
		>
			<Select.Trigger class="kb-refine-select w-full">
				{sortLabel}
			</Select.Trigger>
			<Select.Content>
				{#each EVENTS_SORT_OPTIONS as opt (opt.id)}
					<Select.Item value={opt.id} label={opt.label}>{opt.label}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
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

	/* ── Active filter chips bar ──────────────────────────────────────── */
	.kb-active-chips-section {
		margin-bottom: 16px;
		padding-bottom: 12px;
	}
	.kb-active-chips-row {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.kb-active-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}
	.kb-active-chips-clear {
		align-self: flex-start;
		background: transparent;
		border: none;
		padding: 0;
		font-family: var(--font-sans);
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted-foreground);
		cursor: pointer;
	}
	.kb-active-chips-clear:hover {
		color: var(--foreground);
		text-decoration: underline;
	}

	/* ── Date preset bar ──────────────────────────────────────────────── */
	.kb-date-presets {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0;
		margin-bottom: 14px;
		border: 1px solid var(--border);
		border-radius: var(--radius, 6px);
		overflow: hidden;
		background: var(--card);
		box-shadow: 0 1px 0 rgba(15, 23, 42, 0.03);
	}
	.kb-date-preset {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-sans);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.01em;
		padding: 7px 6px;
		border: none;
		border-right: 1px solid var(--border);
		border-bottom: 1px solid var(--border);
		background: transparent;
		color: var(--muted-foreground);
		cursor: pointer;
		white-space: nowrap;
		min-width: 0;
		transition:
			background 0.15s ease,
			color 0.15s ease;
	}
	.kb-date-preset > span {
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.kb-date-preset:nth-child(3n) {
		border-right: none;
	}
	.kb-date-preset:nth-last-child(-n + 3) {
		border-bottom: none;
	}
	.kb-date-preset:hover {
		background: color-mix(in srgb, var(--accent) 70%, transparent);
		color: var(--foreground);
	}
	.kb-date-preset--active {
		background: var(--color-lakebed-950, #172647);
		color: #fff;
	}
	.kb-date-preset--active:hover {
		background: var(--color-lakebed-950, #172647);
		color: #fff;
	}

	/* ── Format toggle group ──────────────────────────────────────────── */
	.kb-format-group {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	:global(.kb-format-button) {
		flex: 1 1 0;
		min-width: 0;
	}
	:global(.kb-format-button .kb-format-button__badge) {
		height: 16px;
		padding: 0 5px;
		font-size: 9px;
		line-height: 1;
	}

	/* ── Toggle row stack ─────────────────────────────────────────────── */
	.kb-toggle-stack {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-top: 10px;
	}
	.kb-toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 4px 2px;
		font-family: var(--font-sans);
		font-size: 12px;
		color: var(--foreground);
		cursor: pointer;
	}
	.kb-toggle-row__label {
		display: inline-flex;
		align-items: center;
		gap: 6px;
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
		width: var(--bits-popover-anchor-width, 232px);
		min-width: var(--bits-popover-anchor-width, 200px);
		max-width: var(--bits-popover-anchor-width, 280px);
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

	.events-sidebar__suggestions {
		overflow: hidden;
		border: 1px solid color-mix(in srgb, var(--border) 88%, transparent);
		border-radius: 1rem;
		background: color-mix(in srgb, var(--background) 97%, white);
		box-shadow: 0 12px 30px rgba(15, 23, 42, 0.14);
	}

	.events-sidebar__suggestions-label {
		padding: 0.7rem 0.85rem 0.45rem;
		font-family: var(--font-sans);
		font-size: 0.67rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--muted-foreground);
	}

	.events-sidebar__suggestions-list {
		list-style: none;
		margin: 0;
		padding: 0 0 0.35rem;
	}

	.events-sidebar__suggestion-link {
		display: flex;
		flex-direction: column;
		gap: 0.12rem;
		padding: 0.62rem 0.85rem;
		text-decoration: none;
		color: var(--foreground);
	}

	.events-sidebar__suggestion-link:hover {
		background: color-mix(in srgb, var(--accent) 72%, white);
		text-decoration: none;
	}

	.events-sidebar__suggestion-title {
		font-family: var(--font-sans);
		font-size: 0.87rem;
		font-weight: 600;
		line-height: 1.3;
	}

	.events-sidebar__suggestion-meta {
		font-family: var(--font-sans);
		font-size: 0.76rem;
		color: var(--muted-foreground);
		line-height: 1.3;
	}
</style>
