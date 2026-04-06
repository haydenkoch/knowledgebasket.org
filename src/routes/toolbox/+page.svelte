<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { untrack } from 'svelte';
	import {
		FileText,
		BookOpen,
		ClipboardList,
		Pin,
		Paperclip,
		Package,
		ChevronDown,
		Check,
		X
	} from '@lucide/svelte';
	import KbHero from '$lib/components/organisms/KbHero.svelte';
	import CoilTheme from '$lib/components/organisms/CoilTheme.svelte';
	import MobilePeekPanel from '$lib/components/organisms/MobilePeekPanel.svelte';
	import KbSidebar from '$lib/components/organisms/KbSidebar.svelte';
	import KbSubmitBanner from '$lib/components/organisms/KbSubmitBanner.svelte';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import type { ToolboxItem } from '$lib/data/kb';
	import { TOOLBOX_SUBSECTIONS } from '$lib/data/formSchema';
	import type { SearchResponse } from '$lib/server/search-contracts';
	import { stripHtml } from '$lib/utils/format';

	const EMPTY_SEARCH: SearchResponse = {
		query: '',
		request: {
			q: '',
			surface: 'browse',
			scope: 'toolbox',
			page: 1,
			limit: 18,
			sort: 'recent',
			filters: {}
		},
		readiness: {
			state: 'offline',
			detail: 'not-configured',
			configured: false,
			available: false,
			settingsVersion: '',
			indexedScopes: [],
			missingScopes: [],
			mismatchedScopes: [],
			issues: []
		},
		resultSource: 'database',
		latencyMs: 0,
		pagination: {
			page: 1,
			limit: 18,
			total: 0,
			totalPages: 0
		},
		facets: [],
		groups: [],
		results: [],
		suggestions: [],
		experience: {
			degraded: true,
			canUseFastResults: false,
			canUseAdvancedFilters: false,
			canUseFacets: false
		}
	};

	const EMPTY_ROUTE_DATA = {
		origin: '',
		resourceCount: 0,
		mediaTypeCount: 0,
		dataUnavailable: false,
		search: EMPTY_SEARCH
	};

	let { data } = $props();
	const routeData = $derived(data ?? EMPTY_ROUTE_DATA);
	const canonicalUrl = $derived(`${routeData.origin}/toolbox`);
	const search = $derived(routeData.search ?? EMPTY_SEARCH);

	function initialSearchQuery() {
		return routeData.search?.request.q ?? '';
	}

	let searchQuery = $state(initialSearchQuery());
	let syncingFromData = false;
	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	let lastCommittedQuery = initialSearchQuery();
	const routeSearchKey = $derived($page.url.search);

	const MOBILE_FILTER_PEEK_HEIGHT = 70;
	let mobileFiltersExpanded = $state(false);
	const publicSidebar = useSidebar();

	// Collapse filter panel when the main nav sidebar opens on mobile
	$effect(() => {
		if (publicSidebar.openMobile) mobileFiltersExpanded = false;
	});

	function collapseMobileFilters() {
		mobileFiltersExpanded = false;
	}

	$effect(() => {
		const currentRouteSearch = routeSearchKey;
		untrack(() => {
			if (typeof currentRouteSearch !== 'string') return;
			syncingFromData = true;
			searchQuery = search.request.q ?? '';
			lastCommittedQuery = searchQuery;
			queueMicrotask(() => {
				syncingFromData = false;
			});
		});
	});

	function updateUrl(
		mutator: (params: URLSearchParams) => void,
		opts: { replaceState?: boolean } = { replaceState: true }
	) {
		const url = new URL($page.url);
		mutator(url.searchParams);
		goto(url, { keepFocus: true, noScroll: true, replaceState: opts.replaceState ?? true });
	}

	$effect(() => {
		const q = searchQuery;
		if (syncingFromData) return;
		if (q === lastCommittedQuery) return;
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			lastCommittedQuery = q;
			updateUrl((params) => {
				if (q.trim()) params.set('q', q.trim());
				else params.delete('q');
				params.delete('page');
			});
		}, 220);
		return () => clearTimeout(searchTimer);
	});

	function activeValues(key: string): string[] {
		return (
			search.facets
				.find((facet) => facet.key === key)
				?.buckets.filter((bucket) => bucket.active)
				.map((bucket) => bucket.value) ?? []
		);
	}

	function facetOptions(key: string) {
		return search.facets.find((facet) => facet.key === key)?.buckets ?? [];
	}

	function toggleFacet(key: string, value: string) {
		updateUrl((params) => {
			const current = new Set(params.getAll(key));
			if (current.has(value)) current.delete(value);
			else current.add(value);
			params.delete(key);
			for (const entry of current) params.append(key, entry);
			params.delete('page');
		});
	}

	function setSection(section: string) {
		updateUrl((params) => {
			if (section) params.set('subsection', section);
			else params.delete('subsection');
			params.delete('page');
		});
	}

	function clearFilters() {
		updateUrl((params) => {
			params.delete('q');
			params.delete('mediaType');
			params.delete('category');
			params.delete('subsection');
			params.delete('page');
		});
	}

	const activeFilterCount = $derived(
		(search.request.q.trim() ? 1 : 0) +
			search.facets.reduce(
				(sum, facet) => sum + facet.buckets.filter((bucket) => bucket.active).length,
				0
			) +
			(search.request.filters.subsection?.length ?? 0)
	);

	let mediaTypeOpen = $state(false);
	let categoryOpen = $state(false);

	const mediaTypeLabel = $derived(
		activeValues('mediaType').length === 0
			? 'Any type'
			: activeValues('mediaType').length === 1
				? activeValues('mediaType')[0]
				: `${activeValues('mediaType').length} selected`
	);
	const categoryLabel = $derived(
		activeValues('category').length === 0
			? 'Any category'
			: activeValues('category').length === 1
				? activeValues('category')[0]
				: `${activeValues('category').length} selected`
	);

	const mediaTypeIcons: Record<string, typeof FileText> = {
		Toolkit: Package,
		Report: FileText,
		'Policy Document': ClipboardList,
		Guide: BookOpen,
		'Case Study': Pin,
		Other: Paperclip
	};

	function iconFor(item: ToolboxItem) {
		return mediaTypeIcons[item.mediaType ?? ''] ?? Paperclip;
	}

	type PaginationToken =
		| { key: string; type: 'page'; value: number }
		| { key: string; type: 'ellipsis' };

	function buildPageHref(nextPage: number) {
		const url = new URL($page.url);
		if (nextPage > 1) url.searchParams.set('page', String(nextPage));
		else url.searchParams.delete('page');
		return `${url.pathname}${url.search}`;
	}

	const paginationTokens = $derived.by(() => {
		const totalPages = search.pagination.totalPages;
		const currentPage = search.pagination.page;
		if (totalPages <= 1) return [] satisfies PaginationToken[];

		const pages = new Set(
			[1, currentPage - 1, currentPage, currentPage + 1, totalPages].filter(
				(value) => value >= 1 && value <= totalPages
			)
		);

		const sortedPages = [...pages].sort((a, b) => a - b);
		const tokens: PaginationToken[] = [];
		let previousPage = 0;

		for (const pageNumber of sortedPages) {
			if (previousPage && pageNumber - previousPage > 1) {
				tokens.push({
					key: `ellipsis-${previousPage}-${pageNumber}`,
					type: 'ellipsis'
				});
			}

			tokens.push({
				key: `page-${pageNumber}`,
				type: 'page',
				value: pageNumber
			});
			previousPage = pageNumber;
		}

		return tokens;
	});
</script>

<svelte:head>
	<title>Toolbox | Knowledge Basket</title>
	<meta
		name="description"
		content="Browse toolkits, policy documents, reports, and practical resources for Indigenous economic futures."
	/>
	<link rel="canonical" href={canonicalUrl} />
</svelte:head>

{#snippet weave()}
	<defs>
		<pattern id="wv-toolbox" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
			<rect x="0" y="0" width="10" height="4" fill="white" />
			<rect x="10" y="10" width="10" height="4" fill="white" />
			<rect x="0" y="6" width="4" height="8" fill="white" opacity=".5" />
		</pattern>
	</defs>
	<rect width="200" height="400" fill="url(#wv-toolbox)" />
{/snippet}
{#snippet stats()}
	<div class="font-sans text-white">
		<strong class="block text-[28px] leading-none font-bold">{routeData.resourceCount}</strong>
		<span class="text-xs opacity-70">Resources</span>
	</div>
	<div class="font-sans text-white">
		<strong class="block text-[28px] leading-none font-bold">{routeData.mediaTypeCount}</strong>
		<span class="text-xs opacity-70">Media types</span>
	</div>
{/snippet}
{#snippet sidebarContent(mobileMode: boolean)}
	<KbSidebar
		searchPlaceholder="Search toolbox…"
		bind:searchQuery
		hasActiveFilters={activeFilterCount > 0}
		{activeFilterCount}
		resultsLabel={`${search.pagination.total} resources`}
		onClear={clearFilters}
		showEyebrow={!mobileMode}
		showSummary={!mobileMode}
	>
		<!-- Media Type -->
		<div class="kb-section">
			<div class="kb-section__title">Media Type</div>
			<Popover.Root bind:open={mediaTypeOpen}>
				<Popover.Trigger class="kb-refine-select">
					<span>{mediaTypeLabel}</span>
					<ChevronDown class="h-4 w-4 shrink-0 opacity-50" />
				</Popover.Trigger>
				<Popover.Content class="kb-filter-popover-content p-0" align="start" sideOffset={4}>
					<Command.Root>
						<Command.Input placeholder="Search types…" />
						<Command.List>
							<Command.Empty>No types.</Command.Empty>
							{#each facetOptions('mediaType') as bucket}
								{@const sel = activeValues('mediaType').includes(bucket.value)}
								<Command.Item
									value={bucket.value}
									onSelect={() => toggleFacet('mediaType', bucket.value)}
									class="kb-filter-item {sel ? 'kb-filter-item--checked' : ''}"
								>
									<Check class="h-4 w-4 {sel ? 'opacity-100' : 'opacity-0'}" />
									<span class="kb-filter-item__label">{bucket.value}</span>
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

		<!-- Category -->
		<div class="kb-section">
			<div class="kb-section__title">Category</div>
			<Popover.Root bind:open={categoryOpen}>
				<Popover.Trigger class="kb-refine-select">
					<span>{categoryLabel}</span>
					<ChevronDown class="h-4 w-4 shrink-0 opacity-50" />
				</Popover.Trigger>
				<Popover.Content class="kb-filter-popover-content p-0" align="start" sideOffset={4}>
					<Command.Root>
						<Command.Input placeholder="Search categories…" />
						<Command.List>
							<Command.Empty>No categories.</Command.Empty>
							{#each facetOptions('category') as bucket}
								{@const sel = activeValues('category').includes(bucket.value)}
								<Command.Item
									value={bucket.value}
									onSelect={() => toggleFacet('category', bucket.value)}
									class="kb-filter-item {sel ? 'kb-filter-item--checked' : ''}"
								>
									<Check class="h-4 w-4 {sel ? 'opacity-100' : 'opacity-0'}" />
									<span class="kb-filter-item__label">{bucket.value}</span>
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
{/snippet}

<div>
	<KbHero
		coil="toolbox"
		eyebrow="Knowledge Basket · Coil 5"
		title="Toolbox"
		description="Toolkits, policy documents, and a digital library for building Indigenous economic futures."
		{weave}
		{stats}
	/>

	<CoilTheme coil="toolbox">
		<div
			class="coil-layout flex w-full flex-col flex-nowrap md:flex-row"
			style="min-height: calc(100dvh - 144px - var(--kb-submit-banner-offset, 76px))"
			role="presentation"
		>
			<div
				class="coil-layout__left order-1 hidden w-full flex-none overflow-hidden overflow-y-auto border-b border-[var(--rule)] bg-[var(--color-alpine-50,#fafaf8)] p-3 md:block md:w-[272px] md:border-r md:border-b-0 md:px-3 md:py-5"
			>
				{@render sidebarContent(false)}
			</div>
			<main
				class="coil-layout__main order-2 min-w-0 flex-1 p-4 md:p-6 md:pl-7"
				style="padding-bottom: calc(7rem + var(--kb-consent-banner-offset, 0px));"
			>
				{#if routeData.dataUnavailable}
					<Alert class="mb-6 border-amber-300 bg-amber-50 text-amber-950">
						<AlertTitle>Live toolbox data is unavailable</AlertTitle>
						<AlertDescription>
							Some live toolbox data is temporarily unavailable, so you may be seeing limited
							results right now. Please try again in a little while.
						</AlertDescription>
					</Alert>
				{/if}

				{#if search.readiness.state !== 'ready'}
					<Alert class="mb-6 border-amber-300 bg-amber-50 text-amber-950">
						<AlertTitle>Search is running in compatibility mode</AlertTitle>
						<AlertDescription>
							Toolbox results are using the database fallback while indexed search catches up.
						</AlertDescription>
					</Alert>
				{/if}

				<div class="mb-5 space-y-4 border-b border-[var(--rule)] pb-4">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<div class="font-sans text-sm text-[var(--muted-foreground)]">
							Showing <strong class="text-[var(--dark)]">{search.pagination.total}</strong> resources
						</div>
						{#if activeFilterCount > 0}
							<div
								class="rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-3 py-1 font-sans text-[11px] font-bold tracking-[0.08em] text-[var(--primary)] uppercase"
							>
								{activeFilterCount} active refinements
							</div>
						{/if}
					</div>

					<div class="flex flex-wrap gap-2">
						{#each TOOLBOX_SUBSECTIONS as section}
							<button
								type="button"
								class="rounded-full border px-3 py-1.5 text-sm no-underline transition-colors hover:no-underline"
								class:border-primary={(search.request.filters.subsection?.[0] ?? '') === section.id}
								class:bg-primary={(search.request.filters.subsection?.[0] ?? '') === section.id}
								class:text-primary-foreground={(search.request.filters.subsection?.[0] ?? '') ===
									section.id}
								class:border-border={(search.request.filters.subsection?.[0] ?? '') !== section.id}
								class:text-muted-foreground={(search.request.filters.subsection?.[0] ?? '') !==
									section.id}
								onclick={() => setSection(section.id)}
							>
								{section.label}
							</button>
						{/each}
					</div>
				</div>

				{#if search.pagination.total === 0}
					<div class="flex flex-col items-center justify-center py-16 text-center">
						<p class="mb-1 font-serif text-lg font-semibold text-[var(--dark)]">
							No toolbox resources found
						</p>
						<p class="mb-4 text-sm text-[var(--muted-foreground)]">
							Try adjusting your filters or search terms.
						</p>
						<button
							type="button"
							class="cursor-pointer rounded border-none bg-[var(--teal)] px-4 py-2 font-sans text-sm font-semibold text-white"
							onclick={clearFilters}>Clear all filters</button
						>
					</div>
				{:else}
					<div class="grid gap-4 md:grid-cols-2">
						{#each search.results as result (result.id)}
							{@const item = result.fields as ToolboxItem}
							{@const Icon = iconFor(item)}
							<a
								href={`/toolbox/${item.slug ?? item.id}`}
								class="group rounded-2xl border border-[var(--rule)] bg-white p-5 text-inherit no-underline shadow-[var(--sh)] transition-[box-shadow,border-color,transform] duration-150 hover:-translate-y-[2px] hover:border-[var(--primary)]/30 hover:shadow-[var(--shh)]"
							>
								<div class="mb-3 flex items-center gap-3">
									<div
										class="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--muted)] text-[var(--primary)]"
									>
										<Icon class="h-5 w-5" />
									</div>
									<div>
										<p
											class="font-sans text-xs font-semibold tracking-[0.08em] text-[var(--muted-foreground)] uppercase"
										>
											{item.mediaType ?? 'Resource'}
										</p>
										{#if item.category}
											<p class="text-sm text-[var(--muted-foreground)]">{item.category}</p>
										{/if}
									</div>
								</div>
								<h3 class="font-serif text-lg font-semibold text-[var(--dark)]">{item.title}</h3>
								{#if item.description || item.body}
									<p class="mt-2 line-clamp-3 text-sm leading-6 text-[var(--mid)]">
										{stripHtml(item.description ?? item.body ?? '')}
									</p>
								{/if}
								<div class="mt-4 flex flex-wrap gap-2 text-xs text-[var(--muted-foreground)]">
									{#if item.sourceName}<span>{item.sourceName}</span>{/if}
									{#if item.author}<span>{item.author}</span>{/if}
								</div>
							</a>
						{/each}
					</div>
				{/if}

				{#if search.pagination.totalPages > 1}
					<nav
						class="flex flex-wrap items-center justify-center gap-1 pt-6"
						aria-label="Pagination"
					>
						<Button
							variant="ghost"
							href={search.pagination.page > 1
								? buildPageHref(search.pagination.page - 1)
								: undefined}
							disabled={search.pagination.page <= 1}
							aria-label="Go to previous page"
						>
							Previous
						</Button>
						{#each paginationTokens as token (token.key)}
							{#if token.type === 'ellipsis'}
								<span class="px-2 text-sm text-[var(--muted-foreground)]" aria-hidden="true">
									…
								</span>
							{:else}
								<Button
									variant={token.value === search.pagination.page ? 'outline' : 'ghost'}
									size="icon-sm"
									href={buildPageHref(token.value)}
									aria-label={`Go to page ${token.value}`}
									aria-current={token.value === search.pagination.page ? 'page' : undefined}
								>
									{token.value}
								</Button>
							{/if}
						{/each}
						<Button
							variant="ghost"
							href={search.pagination.page < search.pagination.totalPages
								? buildPageHref(search.pagination.page + 1)
								: undefined}
							disabled={search.pagination.page >= search.pagination.totalPages}
							aria-label="Go to next page"
						>
							Next
						</Button>
					</nav>
				{/if}
			</main>
		</div>

		{#if mobileFiltersExpanded && !publicSidebar.openMobile}
			<button
				type="button"
				class="toolbox-mobile-filter-overlay md:hidden"
				onclick={collapseMobileFilters}
				aria-label="Collapse filters"
			></button>
		{/if}
		<MobilePeekPanel
			bind:expanded={mobileFiltersExpanded}
			peekHeight={MOBILE_FILTER_PEEK_HEIGHT}
			class="toolbox-mobile-filter-panel md:hidden {publicSidebar.openMobile
				? 'peek-behind-nav'
				: ''}"
		>
			<div class="toolbox-mobile-filter-drawer__body">
				{@render sidebarContent(true)}
			</div>
		</MobilePeekPanel>
	</CoilTheme>

	<KbSubmitBanner
		coil="toolbox"
		heading="Have a resource we should include?"
		description="Share toolkits, reports, and practical guides that belong in the toolbox."
		href="/toolbox/submit"
		label="Submit a resource"
	/>
</div>

<style>
	/* ── Mobile peek panel ──────────────────────────────────────────── */
	:global(.toolbox-mobile-filter-overlay) {
		position: fixed;
		inset: 0;
		z-index: 40;
		border: none;
		background: rgba(15, 23, 42, 0.18);
	}

	.toolbox-mobile-filter-drawer__body {
		overflow-y: auto;
		padding: 0.25rem 1.25rem 0.5rem;
	}

	:global(.peek-behind-nav.mobile-peek-panel) {
		z-index: 39;
	}

	/* ── Filter sections ────────────────────────────────────────────── */
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

	/* ── Combobox trigger ───────────────────────────────────────────── */
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

	/* ── Popover dropdown ───────────────────────────────────────────── */
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

	/* ── Filter item (inside popover) ───────────────────────────────── */
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
