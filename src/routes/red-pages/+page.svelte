<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { untrack } from 'svelte';
	import KbHero from '$lib/components/organisms/KbHero.svelte';
	import KbPublicBrowseShell from '$lib/components/organisms/KbPublicBrowseShell.svelte';
	import RedPagesSidebar from '$lib/components/organisms/RedPagesSidebar.svelte';
	import RedPagesListItem from '$lib/components/molecules/RedPagesListItem.svelte';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { RedPagesItem } from '$lib/data/kb';
	import { buildOgImagePath } from '$lib/seo/metadata';

	type PaginationToken =
		| { key: string; type: 'page'; value: number }
		| { key: string; type: 'ellipsis' };

	const MOBILE_FILTER_PEEK_HEIGHT = 70;

	let { data } = $props();
	const origin = $derived((data.seoOrigin ?? data.origin ?? '') as string);
	const search = $derived(data.search);

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
			const current = new Set(activeValues(key));
			if (current.has(value)) current.delete(value);
			else current.add(value);
			params.delete(key);
			for (const entry of current) params.append(key, entry);
			params.delete('page');
		});
	}

	function clearFilters() {
		updateUrl((params) => {
			params.delete('q');
			params.delete('serviceType');
			params.delete('region');
			params.delete('page');
		});
	}

	const activeFilterCount = $derived(
		(search.request.q.trim() ? 1 : 0) +
			search.facets.reduce(
				(sum, facet) => sum + facet.buckets.filter((bucket) => bucket.active).length,
				0
			)
	);

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

<SeoHead
	{origin}
	pathname="/red-pages"
	title="Red Pages | Knowledge Basket"
	description="Browse Native-owned businesses, artists, and service providers in the Red Pages directory."
	robotsMode={data.seoIndexable === false ? 'noindex-follow' : 'index'}
	ogImage={buildOgImagePath({
		title: 'Red Pages',
		eyebrow: 'Knowledge Basket',
		theme: 'redpages',
		meta: 'Native-owned businesses, artists, and service providers'
	})}
	ogImageAlt="Knowledge Basket Red Pages social preview"
	breadcrumbItems={[
		{ name: 'Knowledge Basket', pathname: '/' },
		{ name: 'Red Pages', pathname: '/red-pages' }
	]}
/>

{#snippet weave()}
	<defs>
		<pattern id="wv-redpages" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
			<polygon points="8,0 16,8 8,16 0,8" fill="none" stroke="white" stroke-width="0.8" />
			<polygon points="8,4 12,8 8,12 4,8" fill="white" opacity="0.3" />
		</pattern>
	</defs>
	<rect width="200" height="400" fill="url(#wv-redpages)" />
{/snippet}
{#snippet stats()}
	<div class="font-sans text-white">
		<strong class="block text-[28px] leading-none font-bold">{data.listingCount}</strong>
		<span class="text-xs opacity-70">Listings</span>
	</div>
	<div class="font-sans text-white">
		<strong class="block text-[28px] leading-none font-bold">{data.serviceTypeCount}</strong>
		<span class="text-xs opacity-70">Service Types</span>
	</div>
{/snippet}
{#snippet sidebarContent(mobileMode: boolean)}
	<RedPagesSidebar
		bind:searchQuery
		{activeFilterCount}
		resultsLabel={`${search.pagination.total} listings`}
		{mobileMode}
		serviceTypeBuckets={facetOptions('serviceType')}
		regionBuckets={facetOptions('region')}
		activeServiceType={activeValues('serviceType')}
		activeRegion={activeValues('region')}
		onToggle={toggleFacet}
		onClear={clearFilters}
	/>
{/snippet}

<div>
	<KbHero
		coil="redpages"
		eyebrow="Knowledge Basket · Red Pages"
		title="Red Pages"
		description="Native-owned vendors, artists, and service providers you can hire, collaborate with, and support."
		{weave}
		{stats}
	/>

	<KbPublicBrowseShell
		coil="redpages"
		bind:mobileFiltersExpanded
		peekHeight={MOBILE_FILTER_PEEK_HEIGHT}
		sidebar={sidebarContent}
	>
		{#if data.dataUnavailable}
			<Alert class="mb-6 border-amber-300 bg-amber-50 text-amber-950">
				<AlertTitle>Live Red Pages data is unavailable</AlertTitle>
				<AlertDescription>
					Some live directory data is temporarily unavailable, so you may be seeing limited results
					right now. Please try again in a little while.
				</AlertDescription>
			</Alert>
		{/if}

		<div
			class="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--rule)] pb-4"
		>
			<div class="font-sans text-sm text-[var(--muted-foreground)]">
				Showing <strong class="text-[var(--dark)]">{search.pagination.total}</strong> listings
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
					No directory listings found
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
			<div class="flex flex-col gap-3">
				{#each search.results as result, i (result.id)}
					{@const vendor = result.fields as RedPagesItem}
					<RedPagesListItem {vendor} index={i} />
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
</div>
