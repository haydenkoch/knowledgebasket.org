<script lang="ts">
	import { Search } from '@lucide/svelte';
	import Input from '$lib/components/ui/input/input.svelte';
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
	}

	let {
		searchPlaceholder = 'Search…',
		searchQuery = $bindable(''),
		hasActiveFilters = false,
		onClear,
		toolbar,
		children
	}: Props = $props();
</script>

<div class="kb-sidebar">
	<!-- Search -->
	<div class="kb-sidebar__search">
		<span class="kb-sidebar__search-icon" aria-hidden="true">
			<Search class="h-4 w-4" />
		</span>
		<Input type="search" placeholder={searchPlaceholder} class="pl-9" bind:value={searchQuery} />
	</div>

	<!-- Optional toolbar (view switcher, etc.) -->
	{#if toolbar}
		<div class="kb-sidebar__toolbar">
			{@render toolbar()}
		</div>
	{/if}

	<!-- Filter sections -->
	{#if children}
		<div class="kb-sidebar__filters">
			{@render children()}
		</div>
	{/if}

	<!-- Clear all -->
	{#if hasActiveFilters && onClear}
		<button type="button" class="kb-sidebar__clear" onclick={onClear}>Clear all filters</button>
	{/if}
</div>

<style>
	.kb-sidebar {
		display: flex;
		flex-direction: column;
		gap: 0;
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
	}

	/* ── Search ──────────────────────────────────────────────────────── */
	.kb-sidebar__search {
		position: relative;
		margin-bottom: 20px;
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

	/* ── Toolbar (view switcher, etc.) ───────────────────────────────── */
	.kb-sidebar__toolbar {
		margin-bottom: 20px;
	}

	/* ── Filters ─────────────────────────────────────────────────────── */
	.kb-sidebar__filters {
		display: flex;
		flex-direction: column;
		gap: 0;
		min-width: 0;
	}

	/* ── Clear button ────────────────────────────────────────────────── */
	.kb-sidebar__clear {
		align-self: flex-start;
		margin-top: 8px;
		padding: 6px 0;
		border: none;
		background: transparent;
		font-family: var(--font-sans);
		font-size: 12px;
		font-weight: 600;
		color: var(--color-lakebed-700, var(--teal));
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 2px;
		transition: color 0.15s ease;
	}
	.kb-sidebar__clear:hover {
		color: var(--color-lakebed-950, var(--teal-dk));
	}
	.kb-sidebar__clear:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
		border-radius: 2px;
	}
</style>
