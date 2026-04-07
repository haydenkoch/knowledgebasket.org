<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { untrack } from 'svelte';
	import KbHero from '$lib/components/organisms/KbHero.svelte';
	import KbPublicBrowseShell from '$lib/components/organisms/KbPublicBrowseShell.svelte';
	import FundingSidebar from '$lib/components/organisms/FundingSidebar.svelte';
	import KbSubmitBanner from '$lib/components/organisms/KbSubmitBanner.svelte';
	import FundingCard from '$lib/components/molecules/FundingCard.svelte';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { FundingItem } from '$lib/data/kb';
	import { buildOgImagePath } from '$lib/seo/metadata';

	type PaginationToken =
		| { key: string; type: 'page'; value: number }
		| { key: string; type: 'ellipsis' };

	const DEFAULT_ACTIVE_STATUSES = ['open', 'rolling'];
	const MOBILE_FILTER_PEEK_HEIGHT = 70;

	let { data } = $props();
	const origin = $derived((data.seoOrigin ?? data.origin ?? '') as string);
	const search = $derived(data.search);
	const futureOnly = $derived(Boolean(data.futureOnly));
	const hasExplicitStatus = $derived(Boolean(data.hasExplicitStatus));

	function initialSearchQuery() {
		return search.request.q ?? '';
	}

	let searchQuery = $state(initialSearchQuery());
	let syncingFromData = false;
	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	let lastCommittedQuery = initialSearchQuery();
	let mobileFiltersExpanded = $state(false);
	const routeSearchKey = $derived($page.url.search);

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
			// In implicit "Active now" mode, treat status as empty so the first click
			// becomes an explicit single-value selection instead of deselecting one of
			// the auto-marked buckets.
			const implicitActive = key === 'status' && futureOnly && !hasExplicitStatus;
			const current = new Set(implicitActive ? [] : activeValues(key));
			if (current.has(value)) current.delete(value);
			else current.add(value);

			params.delete(key);
			if (key === 'status') {
				if (current.size === 0) params.set('future', '0');
				else params.delete('future');
			}
			for (const entry of current) params.append(key, entry);
			params.delete('page');
		});
	}

	function clearFilters() {
		updateUrl((params) => {
			params.delete('q');
			params.delete('type');
			params.delete('status');
			params.delete('future');
			params.delete('page');
		});
	}

	const implicitStatusCount = $derived(
		futureOnly && !hasExplicitStatus
			? activeValues('status').filter((value) =>
					DEFAULT_ACTIVE_STATUSES.includes(value.toLowerCase())
				).length
			: 0
	);

	const activeFilterCount = $derived(
		(search.request.q.trim() ? 1 : 0) +
			search.facets.reduce(
				(sum, facet) => sum + facet.buckets.filter((bucket) => bucket.active).length,
				0
			) -
			implicitStatusCount
	);

	const availabilityMode = $derived(
		futureOnly && !hasExplicitStatus
			? 'active'
			: !futureOnly && activeValues('status').length === 0
				? 'all'
				: 'custom'
	);

	function buildPageHref(nextPage: number) {
		const url = new URL($page.url);
		if (nextPage > 1) url.searchParams.set('page', String(nextPage));
		else url.searchParams.delete('page');
		return `${url.pathname}${url.search}`;
	}

	function buildAvailabilityHref(mode: 'active' | 'all') {
		const url = new URL($page.url);
		url.searchParams.delete('page');
		url.searchParams.delete('status');
		if (mode === 'all') url.searchParams.set('future', '0');
		else url.searchParams.delete('future');
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

<SeoHead
	{origin}
	pathname="/funding"
	title="Funding | Knowledge Basket"
	description="Browse grants, contracts, fellowships, and funding opportunities for Tribes, Native-led nonprofits, and Indigenous individuals."
	robotsMode={data.seoIndexable === false ? 'noindex-follow' : 'index'}
	ogImage={buildOgImagePath({
		title: 'Funding',
		eyebrow: 'Knowledge Basket',
		theme: 'funding',
		meta: 'Grants, contracts, fellowships, and funding opportunities'
	})}
	ogImageAlt="Knowledge Basket funding social preview"
	breadcrumbItems={[
		{ name: 'Knowledge Basket', pathname: '/' },
		{ name: 'Funding', pathname: '/funding' }
	]}
/>

{#snippet weave()}
	<defs>
		<pattern id="wv-funding" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
			<circle cx="12" cy="12" r="2" fill="white" />
			<circle cx="0" cy="0" r="2" fill="white" />
			<circle cx="24" cy="24" r="2" fill="white" />
			<line x1="0" y1="0" x2="24" y2="24" stroke="white" stroke-width="0.5" />
			<line x1="24" y1="0" x2="0" y2="24" stroke="white" stroke-width="0.5" />
		</pattern>
	</defs>
	<rect width="200" height="400" fill="url(#wv-funding)" />
{/snippet}
{#snippet stats()}
	<div class="font-sans text-white">
		<strong class="block text-[28px] leading-none font-bold">{data.fundingCount}</strong>
		<span class="text-xs opacity-70">Total</span>
	</div>
	<div class="font-sans text-white">
		<strong class="block text-[28px] leading-none font-bold">{data.openCount}</strong>
		<span class="text-xs opacity-70">Open</span>
	</div>
{/snippet}
{#snippet sidebarContent(mobileMode: boolean)}
	<FundingSidebar
		bind:searchQuery
		{activeFilterCount}
		resultsLabel={`${search.pagination.total} opportunities`}
		{mobileMode}
		typeBuckets={facetOptions('type')}
		statusBuckets={facetOptions('status')}
		activeType={activeValues('type')}
		activeStatus={activeValues('status')}
		{availabilityMode}
		onToggle={toggleFacet}
		onClear={clearFilters}
		{buildAvailabilityHref}
	/>
{/snippet}

<div>
	<KbHero
		coil="funding"
		eyebrow="Knowledge Basket · Funding"
		title="Funding"
		description="Grants, contracts, and funding opportunities for Tribes, Native-led nonprofits, and Indigenous individuals."
		{weave}
		{stats}
	/>

	<div
		class="flex flex-wrap items-center gap-4 border-b border-[var(--rule)] bg-[var(--card)] px-4 py-2 font-sans text-[13px] sm:px-6 lg:px-10"
	>
		<div class="flex items-center gap-1.5 text-[13px] text-[var(--foreground)]">
			<span class="inline-block h-2 w-2 rounded-full bg-[var(--green,#22c55e)]"></span>
			{data.openCount} Open
		</div>
		<div class="flex items-center gap-1.5 text-[13px] text-[var(--foreground)]">
			<span class="inline-block h-2 w-2 rounded-full bg-[var(--gold)]"></span>
			{data.rollingCount} Rolling
		</div>
		<div class="ml-auto text-[11px] text-[var(--muted-foreground)]">
			{search.resultSource === 'meilisearch' ? 'Indexed search' : 'Compatibility mode'}
		</div>
	</div>

	<KbPublicBrowseShell
		coil="funding"
		bind:mobileFiltersExpanded
		peekHeight={MOBILE_FILTER_PEEK_HEIGHT}
		sidebar={sidebarContent}
	>
		{#if data.dataUnavailable}
			<Alert class="mb-6 border-amber-300 bg-amber-50 text-amber-950">
				<AlertTitle>Live funding data is unavailable</AlertTitle>
				<AlertDescription>
					Some live funding data is temporarily unavailable, so you may be seeing limited results
					right now. Please try again in a little while.
				</AlertDescription>
			</Alert>
		{/if}

		{#if search.readiness.state !== 'ready'}
			<Alert class="mb-6 border-amber-300 bg-amber-50 text-amber-950">
				<AlertTitle>Search is running in compatibility mode</AlertTitle>
				<AlertDescription>
					Funding results are using the database fallback while indexed search catches up.
				</AlertDescription>
			</Alert>
		{/if}

		<div
			class="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--rule)] pb-4"
		>
			<div class="font-sans text-sm text-[var(--muted-foreground)]">
				Showing <strong class="text-[var(--dark)]">{search.pagination.total}</strong> opportunities
			</div>
			{#if activeFilterCount > 0}
				<div
					class="rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-3 py-1 font-sans text-[11px] font-bold tracking-[0.08em] text-[var(--primary)] uppercase"
				>
					{activeFilterCount} active refinements
				</div>
			{/if}
		</div>

		{#if search.pagination.total === 0}
			<div class="flex flex-col items-center justify-center py-16 text-center">
				<p class="mb-1 font-serif text-lg font-semibold text-[var(--dark)]">
					No funding opportunities found
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
			<div class="grid grid-cols-[repeat(auto-fill,minmax(310px,1fr))] gap-5">
				{#each search.results as result, i (result.id)}
					{@const item = result.fields as FundingItem}
					<FundingCard {item} index={i} />
				{/each}
			</div>
		{/if}

		{#if search.pagination.totalPages > 1}
			<nav class="flex flex-wrap items-center justify-center gap-1 pt-6" aria-label="Pagination">
				<Button
					variant="ghost"
					href={search.pagination.page > 1 ? buildPageHref(search.pagination.page - 1) : undefined}
					disabled={search.pagination.page <= 1}
					aria-label="Go to previous page"
				>
					Previous
				</Button>
				{#each paginationTokens as token (token.key)}
					{#if token.type === 'ellipsis'}
						<span class="px-2 text-sm text-[var(--muted-foreground)]" aria-hidden="true">…</span>
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
	</KbPublicBrowseShell>

	<KbSubmitBanner
		coil="funding"
		heading="Know a funding opportunity we should include?"
		description="Share grants, contracts, or fellowships that support Indigenous communities and Native-led organizations."
		href="/funding/submit"
		label="Submit funding"
	/>
</div>
