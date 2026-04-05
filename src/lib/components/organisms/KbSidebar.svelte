<script lang="ts">
	import { Search, Sparkles } from '@lucide/svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { Snippet } from 'svelte';

	interface Props {
		/** Placeholder text for the search input */
		searchPlaceholder?: string;
		/** Bound search query value */
		searchQuery?: string;
		/** Called when search value changes */
		onSearchChange?: (value: string) => void;
		/** Whether any filters are active (shows clear button) */
		hasActiveFilters?: boolean;
		/** Called when "Clear all" is clicked */
		onClear?: () => void;
		/** Optional slot rendered between search and filter sections (e.g. view switcher) */
		toolbar?: Snippet;
		/** Filter sections — the main content area for facets, sliders, etc. */
		children?: Snippet;
		/** Current result summary shown under search */
		resultsLabel?: string;
		/** Number of active refinements, including search when present */
		activeFilterCount?: number;
	}

	let {
		searchPlaceholder = 'Search…',
		searchQuery = $bindable(''),
		hasActiveFilters = false,
		onClear,
		toolbar,
		children,
		resultsLabel = '',
		activeFilterCount = 0
	}: Props = $props();
</script>

<div class="kb-sidebar">
	<div class="kb-sidebar__panel">
		<div class="kb-sidebar__header">
			<div class="kb-sidebar__eyebrow">
				<Sparkles class="h-3.5 w-3.5" />
				Refine results
			</div>
			<div class="kb-sidebar__search">
				<div data-kb-sidebar-search>
					<span class="kb-sidebar__search-icon" aria-hidden="true">
						<Search class="h-4 w-4" />
					</span>
					<Input
						type="search"
						placeholder={searchPlaceholder}
						class="pl-9"
						bind:value={searchQuery}
					/>
				</div>
			</div>
			{#if resultsLabel || hasActiveFilters}
				<div class="kb-sidebar__summary">
					<div class="kb-sidebar__summary-text">
						{#if resultsLabel}
							<span class="kb-sidebar__results">{resultsLabel}</span>
						{/if}
						{#if activeFilterCount > 0}
							<span class="kb-sidebar__badge">{activeFilterCount} active</span>
						{/if}
					</div>
					{#if hasActiveFilters && onClear}
						<Button
							type="button"
							variant="ghost"
							size="sm"
							class="kb-sidebar__clear"
							onclick={onClear}
						>
							Clear all
						</Button>
					{/if}
				</div>
			{/if}
		</div>

		{#if toolbar}
			<div class="kb-sidebar__toolbar">
				{@render toolbar()}
			</div>
		{/if}

		{#if children}
			<div class="kb-sidebar__filters">
				{@render children()}
			</div>
		{/if}
	</div>
</div>

<style>
	.kb-sidebar {
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
	}
	.kb-sidebar__panel {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
		min-width: 0;
		padding: 0;
		border: none;
		border-radius: 0;
		background: transparent;
		box-shadow: none;
	}
	.kb-sidebar__header {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}
	.kb-sidebar__eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-family: var(--font-sans);
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--muted-foreground) 88%, var(--foreground));
	}

	.kb-sidebar__search {
		position: relative;
	}
	.kb-sidebar__search-icon {
		position: absolute;
		top: 50%;
		left: 12px;
		transform: translateY(-50%);
		display: flex;
		align-items: center;
		color: var(--muted-foreground);
		pointer-events: none;
		z-index: 1;
	}
	.kb-sidebar__summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
		padding-bottom: 0.25rem;
		border-bottom: 1px solid color-mix(in srgb, var(--rule, #e5e5e5) 60%, transparent);
	}
	.kb-sidebar__summary-text {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		min-width: 0;
	}
	.kb-sidebar__results {
		font-family: var(--font-sans);
		font-size: 0.83rem;
		font-weight: 600;
		color: var(--foreground);
	}
	.kb-sidebar__badge {
		display: inline-flex;
		align-items: center;
		padding: 0.22rem 0.55rem;
		border-radius: 9999px;
		background: color-mix(in srgb, var(--primary) 15%, transparent);
		color: var(--primary);
		font-family: var(--font-sans);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.03em;
	}

	.kb-sidebar__toolbar {
		padding-bottom: 1rem;
		border-bottom: 1px solid color-mix(in srgb, var(--rule, #e5e5e5) 60%, transparent);
	}

	.kb-sidebar__filters {
		display: flex;
		flex-direction: column;
		gap: 0;
		min-width: 0;
	}

	:global(.kb-sidebar__clear) {
		height: 2rem;
		padding-inline: 0.55rem;
		font-size: 0.76rem;
		font-weight: 700;
		color: var(--color-lakebed-950, var(--foreground));
	}
</style>
