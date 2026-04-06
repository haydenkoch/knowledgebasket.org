<script lang="ts">
	import { ChevronDown, Check } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import KbSidebar from '$lib/components/organisms/KbSidebar.svelte';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import { Tabs, TabsList, TabsTrigger } from '$lib/components/ui/tabs/index.js';

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
		statusBuckets: FacetBucket[];
		activeType: string[];
		activeStatus: string[];
		availabilityMode: 'active' | 'all' | 'custom';
		onToggle: (key: string, value: string) => void;
		onClear: () => void;
		buildAvailabilityHref: (mode: 'active' | 'all') => string;
	}

	let {
		searchQuery = $bindable(''),
		activeFilterCount,
		resultsLabel,
		mobileMode = false,
		typeBuckets,
		statusBuckets,
		activeType,
		activeStatus,
		availabilityMode,
		onToggle,
		onClear,
		buildAvailabilityHref
	}: Props = $props();

	let typeOpen = $state(false);

	const typeLabel = $derived(
		activeType.length === 0
			? 'Any type'
			: activeType.length === 1
				? activeType[0]
				: `${activeType.length} selected`
	);

	const STATUS_COLORS: Record<string, string> = {
		open: 'var(--green, #22c55e)',
		rolling: 'var(--gold, #eab308)',
		closed: 'var(--muted-foreground, #9ca3af)',
		upcoming: 'var(--primary, #3b82f6)'
	};

	function statusColor(value: string): string {
		return STATUS_COLORS[value.toLowerCase()] ?? 'var(--muted-foreground)';
	}

	// In implicit "Active now" mode the server auto-marks open+rolling as active,
	// but we don't want to render them as "selected" — the availability tabs
	// represent that state. Showing them selected confuses the toggle interaction.
	const displayActiveStatus = $derived(availabilityMode === 'active' ? [] : activeStatus);

	function handleAvailabilityChange(value: string) {
		if (value !== 'active' && value !== 'all') return;
		if (value === availabilityMode) return;
		goto(buildAvailabilityHref(value), {
			keepFocus: true,
			noScroll: true,
			replaceState: true
		});
	}
</script>

<KbSidebar
	searchPlaceholder="Search funding…"
	bind:searchQuery
	hasActiveFilters={activeFilterCount > 0}
	{activeFilterCount}
	{resultsLabel}
	{onClear}
	showEyebrow={!mobileMode}
	showSummary={!mobileMode}
>
	{#snippet toolbar()}
		<Tabs value={availabilityMode} onValueChange={handleAvailabilityChange} class="w-full">
			<TabsList class="w-full">
				<TabsTrigger value="active">
					<span class="h-1.5 w-1.5 shrink-0 rounded-full" style="background: var(--green, #22c55e)"
					></span>
					Active now
				</TabsTrigger>
				<TabsTrigger value="all">All</TabsTrigger>
			</TabsList>
		</Tabs>
	{/snippet}

	<!-- Funding Type: Popover dropdown -->
	<div class="kb-section">
		<div class="kb-section__title">Funding Type</div>
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

	<!-- Status: inline pills matching the site-wide kb-pill pattern -->
	{#if statusBuckets.length > 0}
		<div class="kb-section">
			<div class="kb-section__title">Status</div>
			<div class="kb-pill-group">
				{#each statusBuckets as bucket}
					{@const sel = displayActiveStatus.includes(bucket.value)}
					<button
						type="button"
						class="kb-pill {sel ? 'kb-pill--active' : ''}"
						aria-pressed={sel}
						onclick={() => onToggle('status', bucket.value)}
					>
						<span class="kb-pill__dot" style="background: {statusColor(bucket.value)}"></span>
						<span class="kb-pill__label">{bucket.label}</span>
						{#if bucket.count > 0}
							<span class="kb-pill__count {sel ? 'kb-pill__count--active' : ''}"
								>{bucket.count}</span
							>
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

	/* ── Pill group (matches JobsSidebar for site consistency) ──────── */
	.kb-pill-group {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.kb-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
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
	.kb-pill__dot {
		width: 7px;
		height: 7px;
		border-radius: 9999px;
		flex-shrink: 0;
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
