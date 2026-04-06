<script lang="ts">
	import { ChevronDown, Check, X } from '@lucide/svelte';
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
		serviceTypeBuckets: FacetBucket[];
		regionBuckets: FacetBucket[];
		activeServiceType: string[];
		activeRegion: string[];
		onToggle: (key: string, value: string) => void;
		onClear: () => void;
	}

	let {
		searchQuery = $bindable(''),
		activeFilterCount,
		resultsLabel,
		mobileMode = false,
		serviceTypeBuckets,
		regionBuckets,
		activeServiceType,
		activeRegion,
		onToggle,
		onClear
	}: Props = $props();

	let serviceTypeOpen = $state(false);
	let regionOpen = $state(false);

	const serviceTypeLabel = $derived(
		activeServiceType.length === 0
			? 'Any service'
			: activeServiceType.length === 1
				? activeServiceType[0]
				: `${activeServiceType.length} selected`
	);
	const regionLabel = $derived(
		activeRegion.length === 0
			? 'Any region'
			: activeRegion.length === 1
				? activeRegion[0]
				: `${activeRegion.length} selected`
	);
</script>

<KbSidebar
	searchPlaceholder="Search Red Pages…"
	bind:searchQuery
	hasActiveFilters={activeFilterCount > 0}
	{activeFilterCount}
	{resultsLabel}
	{onClear}
	showEyebrow={!mobileMode}
	showSummary={!mobileMode}
>
	<!-- Service Type: searchable Popover dropdown with chip summary -->
	<div class="kb-section">
		<div class="kb-section__title">Service Type</div>

		{#if activeServiceType.length > 0}
			<div class="kb-chip-summary">
				{#each activeServiceType as tag (tag)}
					<span class="kb-chip">
						<span class="kb-chip__label">{tag}</span>
						<button
							type="button"
							class="kb-chip__remove"
							aria-label="Remove {tag}"
							onclick={() => onToggle('serviceType', tag)}
						>
							<X class="size-3" />
						</button>
					</span>
				{/each}
			</div>
		{/if}

		<Popover.Root bind:open={serviceTypeOpen}>
			<Popover.Trigger class="kb-refine-select">
				<span>{activeServiceType.length > 0 ? 'Add more…' : serviceTypeLabel}</span>
				<ChevronDown class="h-4 w-4 shrink-0 opacity-50" />
			</Popover.Trigger>
			<Popover.Content class="kb-filter-popover-content p-0" align="start" sideOffset={4}>
				<Command.Root>
					<Command.Input placeholder="Search services…" />
					<Command.List>
						<Command.Empty>No services found.</Command.Empty>
						{#each serviceTypeBuckets as bucket}
							{@const sel = activeServiceType.includes(bucket.value)}
							<Command.Item
								value={bucket.value}
								onSelect={() => onToggle('serviceType', bucket.value)}
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

	<!-- Region: Popover dropdown -->
	<div class="kb-section">
		<div class="kb-section__title">Region</div>

		{#if activeRegion.length > 0}
			<div class="kb-chip-summary">
				{#each activeRegion as tag (tag)}
					<span class="kb-chip">
						<span class="kb-chip__label">{tag}</span>
						<button
							type="button"
							class="kb-chip__remove"
							aria-label="Remove {tag}"
							onclick={() => onToggle('region', tag)}
						>
							<X class="size-3" />
						</button>
					</span>
				{/each}
			</div>
		{/if}

		<Popover.Root bind:open={regionOpen}>
			<Popover.Trigger class="kb-refine-select">
				<span>{activeRegion.length > 0 ? 'Add more…' : regionLabel}</span>
				<ChevronDown class="h-4 w-4 shrink-0 opacity-50" />
			</Popover.Trigger>
			<Popover.Content class="kb-filter-popover-content p-0" align="start" sideOffset={4}>
				<Command.Root>
					<Command.Input placeholder="Search regions…" />
					<Command.List>
						<Command.Empty>No regions found.</Command.Empty>
						{#each regionBuckets as bucket}
							{@const sel = activeRegion.includes(bucket.value)}
							<Command.Item
								value={bucket.value}
								onSelect={() => onToggle('region', bucket.value)}
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

	/* ── Chip summary (selected items shown above dropdown) ──────────── */
	.kb-chip-summary {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
		margin-bottom: 8px;
	}
	.kb-chip {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		background: var(--color-lakebed-950, #172647);
		color: #fff;
		font-family: var(--font-sans);
		font-size: 11px;
		font-weight: 500;
		padding: 2.5px 4px 2.5px 8px;
		border-radius: 9999px;
		white-space: nowrap;
		max-width: 100%;
	}
	.kb-chip__label {
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.kb-chip__remove {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		background: transparent;
		border: none;
		border-radius: 9999px;
		color: inherit;
		cursor: pointer;
		padding: 0;
		opacity: 0.7;
		transition: opacity 0.12s ease;
	}
	.kb-chip__remove:hover {
		opacity: 1;
		background: rgba(255, 255, 255, 0.15);
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
