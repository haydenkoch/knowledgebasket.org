<script lang="ts">
	import KbHero from '$lib/components/organisms/KbHero.svelte';
	import KbTwoColumnLayout from '$lib/components/organisms/KbTwoColumnLayout.svelte';
	import KbSidebar from '$lib/components/organisms/KbSidebar.svelte';
	import KbFilterSection from '$lib/components/organisms/KbFilterSection.svelte';
	import KbSubmitBanner from '$lib/components/organisms/KbSubmitBanner.svelte';
	import JobListItem from '$lib/components/molecules/JobListItem.svelte';
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
	import type { JobItem } from '$lib/data/kb';

	let { data } = $props();
	const canonicalUrl = $derived(`${data.origin ?? ''}/jobs`);

	const filters = useCoilFilters<JobItem>({
		items: () => (data.jobs ?? []) as JobItem[],
		facets: {
			type: { field: 'jobType' },
			sector: { field: 'sector' },
			level: { field: 'seniority' },
			workArrangement: { field: 'workArrangement' }
		},
		searchFields: ['employerName', 'location', 'jobType', 'sector']
	});

	let pageBinding = $state(1);
	$effect(() => {
		pageBinding = filters.currentPage;
	});
	$effect(() => {
		if (pageBinding !== filters.currentPage) filters.pageBinding = pageBinding;
	});
</script>

<svelte:head>
	<title>Job Board | Knowledge Basket</title>
	<meta
		name="description"
		content="Browse job openings, fellowships, and career opportunities with Tribes and Indigenous-serving organizations."
	/>
	<link rel="canonical" href={canonicalUrl} />
</svelte:head>

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
		<strong class="block text-[28px] leading-none font-bold">{filters.items.length}</strong>
		<span class="text-xs opacity-70">Open positions</span>
	</div>
{/snippet}
{#snippet sidebar()}
	<KbSidebar
		searchPlaceholder="Search jobs…"
		bind:searchQuery={filters.searchQuery}
		hasActiveFilters={filters.getFacetSelection('type').length > 0 ||
			filters.getFacetSelection('sector').length > 0 ||
			filters.getFacetSelection('level').length > 0 ||
			filters.getFacetSelection('workArrangement').length > 0}
		onClear={() => filters.clearFilters()}
	>
		<KbFilterSection
			title="Job Type"
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
			title="Sector"
			options={filters.facetValues.sector?.map((s) => ({
				value: s,
				label: s,
				count: filters.facetCounts.sector?.[s] ?? 0
			})) ?? []}
			selected={filters.getFacetSelection('sector')}
			onToggle={(val) => filters.toggleFacet('sector', val)}
			emptyLabel="No sectors"
		/>
		<KbFilterSection
			title="Level"
			options={filters.facetValues.level?.map((l) => ({
				value: l,
				label: l,
				count: filters.facetCounts.level?.[l] ?? 0
			})) ?? []}
			selected={filters.getFacetSelection('level')}
			onToggle={(val) => filters.toggleFacet('level', val)}
			emptyLabel="No levels"
		/>
		<KbFilterSection
			title="Work Arrangement"
			options={filters.facetValues.workArrangement?.map((w) => ({
				value: w,
				label: w,
				count: filters.facetCounts.workArrangement?.[w] ?? 0
			})) ?? []}
			selected={filters.getFacetSelection('workArrangement')}
			onToggle={(val) => filters.toggleFacet('workArrangement', val)}
			emptyLabel="None"
		/>
	</KbSidebar>
{/snippet}

<div>
	<KbHero
		coil="jobs"
		eyebrow="Knowledge Basket · Coil 4"
		title="Job Board"
		description="Career opportunities with Tribes, agencies, and organizations prioritizing Indigenous hiring."
		{weave}
		{stats}
	/>

	<KbTwoColumnLayout {sidebar}>
		{#snippet children()}
			{#if data.dataUnavailable}
				<Alert class="mb-6 border-amber-300 bg-amber-50 text-amber-950">
					<AlertTitle>Live job data is unavailable</AlertTitle>
					<AlertDescription>
						Some live job data is temporarily unavailable, so you may be seeing limited results
						right now. Please try again in a little while.
					</AlertDescription>
				</Alert>
			{/if}

			<div class="mb-5 flex items-center justify-between border-b border-[var(--rule)] pb-4">
				<div class="font-sans text-sm text-[var(--muted-foreground)]">
					Showing <strong class="text-[var(--dark)]">{filters.filteredTotal}</strong> jobs
				</div>
			</div>

			{#if filters.filteredTotal === 0}
				<div class="flex flex-col items-center justify-center py-16 text-center">
					<p class="mb-1 font-serif text-lg font-semibold text-[var(--dark)]">No jobs found</p>
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
				<div class="flex flex-col gap-3">
					{#each filters.paginatedList as job, i (job.id)}
						<JobListItem {job} index={i} />
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
		coil="jobs"
		heading="Post a job"
		description="Submit career opportunities for IFS staff review."
		href="/jobs/submit"
		label="Post a Job"
	/>
</div>
