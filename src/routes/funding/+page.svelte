<script lang="ts">
	import KbHero from '$lib/components/organisms/KbHero.svelte';
	import KbTwoColumnLayout from '$lib/components/organisms/KbTwoColumnLayout.svelte';
	import KbSidebar from '$lib/components/organisms/KbSidebar.svelte';
	import KbFilterSection from '$lib/components/organisms/KbFilterSection.svelte';
	import KbSubmitBanner from '$lib/components/organisms/KbSubmitBanner.svelte';
	import FundingCard from '$lib/components/molecules/FundingCard.svelte';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
	import {
		Pagination,
		PaginationContent,
		PaginationItem,
		PaginationLink,
		PaginationPrevious,
		PaginationNext,
		PaginationEllipsis
	} from '$lib/components/ui/pagination/index.js';
	import { useCoilFilters } from '$lib/hooks/use-coil-filters.svelte';
	import type { FundingItem } from '$lib/data/kb';

	let { data } = $props();
	const canonicalUrl = $derived(`${data.origin ?? ''}/funding`);

	const filters = useCoilFilters<FundingItem>({
		items: () => (data.funding ?? []) as FundingItem[],
		facets: {
			type: { field: 'fundingType' },
			status: { field: 'applicationStatus' }
		},
		searchFields: ['funderName', 'amountDescription']
	});

	const openCount = $derived(
		filters.items.filter((f) => f.applicationStatus === 'open' || f.applicationStatus === 'rolling')
			.length
	);
	const rollingCount = $derived(
		filters.items.filter((f) => f.applicationStatus === 'rolling').length
	);

	let pageBinding = $state(1);
	$effect(() => {
		pageBinding = filters.currentPage;
	});
	$effect(() => {
		if (pageBinding !== filters.currentPage) filters.pageBinding = pageBinding;
	});
</script>

<svelte:head>
	<title>Funding | Knowledge Basket</title>
	<meta
		name="description"
		content="Browse grants, contracts, fellowships, and funding opportunities for Tribes, Native-led nonprofits, and Indigenous individuals."
	/>
	<link rel="canonical" href={canonicalUrl} />
</svelte:head>

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
		<strong class="block text-[28px] leading-none font-bold">{filters.items.length}</strong>
		<span class="text-xs opacity-70">Total</span>
	</div>
	<div class="font-sans text-white">
		<strong class="block text-[28px] leading-none font-bold">{openCount}</strong>
		<span class="text-xs opacity-70">Open</span>
	</div>
{/snippet}
{#snippet sidebar()}
	<KbSidebar
		searchPlaceholder="Search funding…"
		bind:searchQuery={filters.searchQuery}
		hasActiveFilters={filters.hasActiveFilters}
		activeFilterCount={filters.activeFilterCount}
		resultsLabel={`${filters.filteredTotal} opportunities`}
		onClear={() => filters.clearFilters()}
	>
		<KbFilterSection
			title="Type"
			options={filters.facetValues.type?.map((t) => ({
				value: t,
				label: t,
				count: filters.facetCounts.type?.[t] ?? 0
			})) ?? []}
			selected={filters.getFacetSelection('type')}
			onToggle={(val) => filters.toggleFacet('type', val)}
			emptyLabel="No types"
		/>
		<KbFilterSection
			title="Status"
			options={filters.facetValues.status?.map((s) => ({
				value: s,
				label: s,
				count: filters.facetCounts.status?.[s] ?? 0
			})) ?? []}
			selected={filters.getFacetSelection('status')}
			onToggle={(val) => filters.toggleFacet('status', val)}
			emptyLabel="No statuses"
		/>
	</KbSidebar>
{/snippet}

<div>
	<KbHero
		coil="funding"
		eyebrow="Knowledge Basket · Coil 2"
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
			{openCount} Open
		</div>
		<div class="flex items-center gap-1.5 text-[13px] text-[var(--foreground)]">
			<span class="inline-block h-2 w-2 rounded-full bg-[var(--gold)]"></span>
			{rollingCount} Rolling
		</div>
		<div class="ml-auto text-[11px] text-[var(--muted-foreground)]">Updated regularly</div>
	</div>

	<KbTwoColumnLayout
		{sidebar}
		bind:mobileSearchQuery={filters.searchQuery}
		mobileSearchPlaceholder="Search funding…"
		mobileActiveFilterCount={filters.activeFilterCount}
		onMobileClear={() => filters.clearFilters()}
	>
		{#snippet children()}
			{#if data.dataUnavailable}
				<Alert class="mb-6 border-amber-300 bg-amber-50 text-amber-950">
					<AlertTitle>Live funding data is unavailable</AlertTitle>
					<AlertDescription>
						Some live funding data is temporarily unavailable, so you may be seeing limited results
						right now. Please try again in a little while.
					</AlertDescription>
				</Alert>
			{/if}

			<div
				class="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--rule)] pb-4"
			>
				<div class="font-sans text-sm text-[var(--muted-foreground)]">
					Showing <strong class="text-[var(--dark)]">{filters.filteredTotal}</strong> opportunities
				</div>
				{#if filters.activeFilterCount > 0}
					<div
						class="rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-3 py-1 font-sans text-[11px] font-bold tracking-[0.08em] text-[var(--primary)] uppercase"
					>
						{filters.activeFilterCount} active refinements
					</div>
				{/if}
			</div>

			{#if filters.filteredTotal === 0}
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
						onclick={() => filters.clearFilters()}>Clear all filters</button
					>
				</div>
			{:else}
				<div class="grid grid-cols-[repeat(auto-fill,minmax(310px,1fr))] gap-5">
					{#each filters.paginatedList as item, i (item.id)}
						<FundingCard {item} index={i} />
					{/each}
				</div>
			{/if}

			{#if filters.totalPages > 1}
				<Pagination
					class="pt-6"
					count={filters.filteredTotal}
					perPage={filters.perPage}
					bind:page={pageBinding}
					aria-label="Pagination"
				>
					{#snippet children({ pages })}
						<PaginationContent>
							<PaginationPrevious />
							{#each pages as pageItem (pageItem.key)}
								{#if pageItem.type === 'ellipsis'}
									<PaginationItem><PaginationEllipsis /></PaginationItem>
								{:else}
									<PaginationItem>
										<PaginationLink
											page={pageItem}
											isActive={pageItem.value === filters.currentPage}
										>
											{pageItem.value}
										</PaginationLink>
									</PaginationItem>
								{/if}
							{/each}
							<PaginationNext />
						</PaginationContent>
					{/snippet}
				</Pagination>
			{/if}
		{/snippet}
	</KbTwoColumnLayout>

	<KbSubmitBanner
		coil="funding"
		heading="Know of a funding opportunity?"
		description="Submit grants, loans, fellowships, and contracts for IFS staff review."
		href="/funding/submit"
		label="Submit Funding Opportunity"
	/>
</div>
