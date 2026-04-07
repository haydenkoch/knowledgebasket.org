<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { untrack } from 'svelte';
	import KbHero from '$lib/components/organisms/KbHero.svelte';
	import KbPublicBrowseShell from '$lib/components/organisms/KbPublicBrowseShell.svelte';
	import JobsSidebar from '$lib/components/organisms/JobsSidebar.svelte';
	import KbSubmitBanner from '$lib/components/organisms/KbSubmitBanner.svelte';
	import JobListItem from '$lib/components/molecules/JobListItem.svelte';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { JobItem } from '$lib/data/kb';
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
			params.delete('type');
			params.delete('sector');
			params.delete('level');
			params.delete('workArrangement');
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
	pathname="/jobs"
	title="Job Board | Knowledge Basket"
	description="Browse job openings, fellowships, and career opportunities with Tribes and Indigenous-serving organizations."
	robotsMode={data.seoIndexable === false ? 'noindex-follow' : 'index'}
	ogImage={buildOgImagePath({
		title: 'Job Board',
		eyebrow: 'Knowledge Basket',
		theme: 'jobs',
		meta: 'Career opportunities with Tribes and Indigenous-serving organizations'
	})}
	ogImageAlt="Knowledge Basket jobs social preview"
	breadcrumbItems={[
		{ name: 'Knowledge Basket', pathname: '/' },
		{ name: 'Jobs', pathname: '/jobs' }
	]}
/>

{#snippet weave()}
	<defs>
		<pattern id="wv-jobs" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
			<rect x="0" y="0" width="10" height="4" fill="white" />
			<rect x="10" y="10" width="10" height="4" fill="white" />
			<rect x="0" y="6" width="4" height="8" fill="white" opacity=".5" />
		</pattern>
	</defs>
	<rect width="200" height="400" fill="url(#wv-jobs)" />
{/snippet}
{#snippet stats()}
	<div class="font-sans text-white">
		<strong class="block text-[28px] leading-none font-bold">{data.jobCount}</strong>
		<span class="text-xs opacity-70">Open positions</span>
	</div>
{/snippet}
{#snippet sidebarContent(mobileMode: boolean)}
	<JobsSidebar
		bind:searchQuery
		{activeFilterCount}
		resultsLabel={`${search.pagination.total} jobs`}
		{mobileMode}
		typeBuckets={facetOptions('type')}
		sectorBuckets={facetOptions('sector')}
		levelBuckets={facetOptions('level')}
		workArrangementBuckets={facetOptions('workArrangement')}
		activeType={activeValues('type')}
		activeSector={activeValues('sector')}
		activeLevel={activeValues('level')}
		activeWorkArrangement={activeValues('workArrangement')}
		onToggle={toggleFacet}
		onClear={clearFilters}
	/>
{/snippet}

<div>
	<KbHero
		coil="jobs"
		eyebrow="Knowledge Basket · Jobs"
		title="Job Board"
		description="Career opportunities with Tribes, agencies, and organizations prioritizing Indigenous hiring."
		{weave}
		{stats}
	/>

	<KbPublicBrowseShell
		coil="jobs"
		bind:mobileFiltersExpanded
		peekHeight={MOBILE_FILTER_PEEK_HEIGHT}
		sidebar={sidebarContent}
	>
		{#if data.dataUnavailable}
			<Alert class="mb-6 border-amber-300 bg-amber-50 text-amber-950">
				<AlertTitle>Live job data is unavailable</AlertTitle>
				<AlertDescription>
					Some live job data is temporarily unavailable, so you may be seeing limited results right
					now. Please try again in a little while.
				</AlertDescription>
			</Alert>
		{/if}

		{#if search.readiness.state !== 'ready'}
			<Alert class="mb-6 border-amber-300 bg-amber-50 text-amber-950">
				<AlertTitle>Search is running in compatibility mode</AlertTitle>
				<AlertDescription>
					Job results are using the database fallback while indexed search catches up.
				</AlertDescription>
			</Alert>
		{/if}

		<div
			class="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--rule)] pb-4"
		>
			<div class="font-sans text-sm text-[var(--muted-foreground)]">
				Showing <strong class="text-[var(--dark)]">{search.pagination.total}</strong> jobs
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
				<p class="mb-1 font-serif text-lg font-semibold text-[var(--dark)]">No jobs found</p>
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
					{@const job = result.fields as JobItem}
					<JobListItem {job} index={i} />
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
		coil="jobs"
		heading="Know about an opportunity that belongs here?"
		description="Share jobs, fellowships, and contracts that support Indigenous communities and Native hiring."
		href="/jobs/submit"
		label="Submit a job"
	/>
</div>
