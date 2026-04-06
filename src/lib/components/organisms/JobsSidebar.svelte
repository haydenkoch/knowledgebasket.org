<script lang="ts">
	import { ChevronDown, Check } from '@lucide/svelte';
	import KbSidebar from '$lib/components/organisms/KbSidebar.svelte';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Command from '$lib/components/ui/command/index.js';

	interface FacetBucket {
		value: string;
		label: string;
		count: number;
		active?: boolean;
	}

	interface Props {
		searchQuery: string;
		activeFilterCount: number;
		resultsLabel: string;
		mobileMode?: boolean;
		typeBuckets: FacetBucket[];
		sectorBuckets: FacetBucket[];
		levelBuckets: FacetBucket[];
		workArrangementBuckets: FacetBucket[];
		activeType: string[];
		activeSector: string[];
		activeLevel: string[];
		activeWorkArrangement: string[];
		onToggle: (key: string, value: string) => void;
		onClear: () => void;
	}

	let {
		searchQuery = $bindable(''),
		activeFilterCount,
		resultsLabel,
		mobileMode = false,
		typeBuckets,
		sectorBuckets,
		levelBuckets,
		workArrangementBuckets,
		activeType,
		activeSector,
		activeLevel,
		activeWorkArrangement,
		onToggle,
		onClear
	}: Props = $props();

	let typeOpen = $state(false);
	let sectorOpen = $state(false);

	const typeLabel = $derived(
		activeType.length === 0
			? 'Any type'
			: activeType.length === 1
				? activeType[0]
				: `${activeType.length} selected`
	);
	const sectorLabel = $derived(
		activeSector.length === 0
			? 'Any sector'
			: activeSector.length === 1
				? activeSector[0]
				: `${activeSector.length} selected`
	);
</script>

<KbSidebar
	searchPlaceholder="Search jobs…"
	bind:searchQuery
	hasActiveFilters={activeFilterCount > 0}
	{activeFilterCount}
	{resultsLabel}
	{onClear}
	showEyebrow={!mobileMode}
	showSummary={!mobileMode}
>
	<!-- Job Type: Popover dropdown -->
	<div class="kb-section">
		<div class="kb-section__title">Job Type</div>
		<Popover.Root bind:open={typeOpen}>
			<Popover.Trigger class="kb-refine-select">
				<span>{typeLabel}</span>
				<ChevronDown class="h-4 w-4 shrink-0 opacity-50" />
			</Popover.Trigger>
			<Popover.Content class="kb-filter-popover-content p-0" align="start" sideOffset={4}>
				<Command.Root>
					<Command.Input placeholder="Search types…" />
					<Command.List>
						<Command.Empty>No types.</Command.Empty>
						{#each typeBuckets as bucket}
							{@const sel = activeType.includes(bucket.value)}
							<Command.Item
								value={bucket.value}
								onSelect={() => onToggle('type', bucket.value)}
								class="kb-filter-item {sel ? 'kb-filter-item--checked' : ''}"
							>
								<Check class="h-4 w-4 {sel ? 'opacity-100' : 'opacity-0'}" />
								<span class="kb-filter-item__label">{bucket.label}</span>
								{#if bucket.count > 0}
									<span class="kb-filter-item__badge">{bucket.count}</span>
								{/if}
							</Command.Item>
						{/each}
					</Command.List>
				</Command.Root>
			</Popover.Content>
		</Popover.Root>
	</div>

	<!-- Sector: Popover dropdown -->
	<div class="kb-section">
		<div class="kb-section__title">Sector</div>
		<Popover.Root bind:open={sectorOpen}>
			<Popover.Trigger class="kb-refine-select">
				<span>{sectorLabel}</span>
				<ChevronDown class="h-4 w-4 shrink-0 opacity-50" />
			</Popover.Trigger>
			<Popover.Content class="kb-filter-popover-content p-0" align="start" sideOffset={4}>
				<Command.Root>
					<Command.Input placeholder="Search sectors…" />
					<Command.List>
						<Command.Empty>No sectors.</Command.Empty>
						{#each sectorBuckets as bucket}
							{@const sel = activeSector.includes(bucket.value)}
							<Command.Item
								value={bucket.value}
								onSelect={() => onToggle('sector', bucket.value)}
								class="kb-filter-item {sel ? 'kb-filter-item--checked' : ''}"
							>
								<Check class="h-4 w-4 {sel ? 'opacity-100' : 'opacity-0'}" />
								<span class="kb-filter-item__label">{bucket.label}</span>
								{#if bucket.count > 0}
									<span class="kb-filter-item__badge">{bucket.count}</span>
								{/if}
							</Command.Item>
						{/each}
					</Command.List>
				</Command.Root>
			</Popover.Content>
		</Popover.Root>
	</div>

	<!-- Level: Inline pills -->
	{#if levelBuckets.length > 0}
		<div class="kb-section">
			<div class="kb-section__title">Level</div>
			<div class="kb-pill-group">
				{#each levelBuckets as bucket}
					{@const sel = activeLevel.includes(bucket.value)}
					<button
						type="button"
						class="kb-pill {sel ? 'kb-pill--active' : ''}"
						aria-pressed={sel}
						onclick={() => onToggle('level', bucket.value)}
					>
						<span class="kb-pill__label">{bucket.label}</span>
						{#if bucket.count > 0}
							<span class="kb-pill__count {sel ? 'kb-pill__count--active' : ''}">{bucket.count}</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Work Arrangement: Inline pills -->
	{#if workArrangementBuckets.length > 0}
		<div class="kb-section">
			<div class="kb-section__title">Work Arrangement</div>
			<div class="kb-pill-group">
				{#each workArrangementBuckets as bucket}
					{@const sel = activeWorkArrangement.includes(bucket.value)}
					<button
						type="button"
						class="kb-pill {sel ? 'kb-pill--active' : ''}"
						aria-pressed={sel}
						onclick={() => onToggle('workArrangement', bucket.value)}
					>
						<span class="kb-pill__label">{bucket.label}</span>
						{#if bucket.count > 0}
							<span class="kb-pill__count {sel ? 'kb-pill__count--active' : ''}">{bucket.count}</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</KbSidebar>

<style>
	/* ── Section spacing ─────────────────────────────────────────────── */
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

	/* ── Pill group (compact chip selectors for few-option facets) ──── */
	.kb-pill-group {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.kb-pill {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 5px 12px;
		border-radius: 9999px;
		border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
		background: color-mix(in srgb, var(--muted) 32%, transparent);
		font-family: var(--font-sans);
		font-size: 12.5px;
		font-weight: 500;
		color: var(--foreground);
		cursor: pointer;
		transition:
			background 0.14s ease,
			border-color 0.14s ease,
			color 0.14s ease,
			box-shadow 0.14s ease;
	}
	.kb-pill:hover {
		background: color-mix(in srgb, var(--accent) 72%, white);
		border-color: color-mix(in srgb, var(--border) 100%, transparent);
	}
	.kb-pill:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 1px;
	}
	.kb-pill--active {
		background: color-mix(in srgb, var(--primary) 14%, white);
		border-color: color-mix(in srgb, var(--primary) 35%, transparent);
		font-weight: 600;
		color: var(--foreground);
		box-shadow: 0 0 0 1px color-mix(in srgb, var(--primary) 10%, transparent);
	}
	.kb-pill__label {
		white-space: nowrap;
	}
	.kb-pill__count {
		font-size: 10px;
		font-weight: 700;
		line-height: 1;
		color: var(--muted-foreground);
		background: color-mix(in srgb, var(--muted) 85%, white);
		border-radius: 9999px;
		padding: 2px 6px;
		min-width: 1.2rem;
		text-align: center;
	}
	.kb-pill__count--active {
		background: var(--primary);
		color: var(--primary-foreground);
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

	/* ── Popover dropdown ────────────────────────────────────────────── */
	:global(.kb-filter-popover-content) {
		width: var(--bits-popover-anchor-width) !important;
		min-width: var(--bits-popover-anchor-width) !important;
		max-width: var(--bits-popover-anchor-width) !important;
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
