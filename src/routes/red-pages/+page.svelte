<script lang="ts">
	import KbHero from '$lib/components/organisms/KbHero.svelte';
	import KbTwoColumnLayout from '$lib/components/organisms/KbTwoColumnLayout.svelte';
	import KbSidebar from '$lib/components/organisms/KbSidebar.svelte';
	import KbFilterSection from '$lib/components/organisms/KbFilterSection.svelte';
	import KbSubmitBanner from '$lib/components/organisms/KbSubmitBanner.svelte';
	import RedPagesListItem from '$lib/components/molecules/RedPagesListItem.svelte';
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
	import type { RedPagesItem } from '$lib/data/kb';

	let { data } = $props();
	const canonicalUrl = $derived(`${data.origin ?? ''}/red-pages`);

	const filters = useCoilFilters<RedPagesItem>({
		items: () => (data.redpages ?? []) as RedPagesItem[],
		facets: {
			serviceType: { field: 'serviceType' },
			region: { field: 'region' }
		},
		searchFields: ['tribalAffiliation', 'serviceType', 'region']
	});

	const FEATURED_COUNT = 6;
	const featured = $derived(filters.filtered.slice(0, FEATURED_COUNT));

	function initials(title: string): string {
		return (
			title
				.split(/\s+/)
				.filter(Boolean)
				.slice(0, 2)
				.map((w) => w[0])
				.join('')
				.toUpperCase() || '?'
		);
	}

	function serviceTags(serviceType?: string): string[] {
		if (!serviceType?.trim()) return [];
		const raw = serviceType
			.split(/[:,)]+/)
			.map((s) => s.replace(/\s*\([^)]*$/, '').trim())
			.filter((s) => s.length > 0 && s.length < 45);
		return [...new Set(raw)];
	}

	let pageBinding = $state(1);
	$effect(() => {
		pageBinding = filters.currentPage;
	});
	$effect(() => {
		if (pageBinding !== filters.currentPage) filters.pageBinding = pageBinding;
	});
</script>

<svelte:head>
	<title>Red Pages | Knowledge Basket</title>
	<meta
		name="description"
		content="Browse Native-owned businesses, artists, and service providers in the Red Pages directory."
	/>
	<link rel="canonical" href={canonicalUrl} />
</svelte:head>

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
		<strong class="block text-[28px] leading-none font-bold">{filters.items.length}</strong>
		<span class="text-xs opacity-70">Listings</span>
	</div>
	<div class="font-sans text-white">
		<strong class="block text-[28px] leading-none font-bold"
			>{filters.facetValues.serviceType?.length ?? 0}</strong
		>
		<span class="text-xs opacity-70">Service Types</span>
	</div>
{/snippet}
{#snippet sidebar()}
	<KbSidebar
		searchPlaceholder="Search Red Pages…"
		bind:searchQuery={filters.searchQuery}
		hasActiveFilters={filters.getFacetSelection('serviceType').length > 0 ||
			filters.getFacetSelection('region').length > 0}
		onClear={() => filters.clearFilters()}
	>
		<KbFilterSection
			title="Service Type"
			options={filters.facetValues.serviceType?.map((t) => ({
				value: t,
				label: t,
				count: filters.facetCounts.serviceType?.[t] ?? 0
			})) ?? []}
			selected={filters.getFacetSelection('serviceType')}
			onToggle={(val) => filters.toggleFacet('serviceType', val)}
			emptyLabel="No types"
		/>
		<KbFilterSection
			title="Region"
			options={filters.facetValues.region?.map((r) => ({
				value: r,
				label: r,
				count: filters.facetCounts.region?.[r] ?? 0
			})) ?? []}
			selected={filters.getFacetSelection('region')}
			onToggle={(val) => filters.toggleFacet('region', val)}
			emptyLabel="No regions"
		/>
	</KbSidebar>
{/snippet}

<div>
	<KbHero
		coil="redpages"
		eyebrow="Knowledge Basket · Coil 3"
		title="Red Pages"
		description="Native-owned vendors, artists, and service providers you can hire, collaborate with, and support."
		{weave}
		{stats}
	/>

	{#if featured.length > 0}
		<section
			class="border-b border-[var(--rule)] bg-[var(--color-alpine-100,var(--bone))] px-4 pt-5 pb-3 sm:px-6 lg:px-10"
			aria-label="Featured vendors"
		>
			<div
				class="mb-2 font-sans text-[11px] font-bold tracking-[0.12em] text-[var(--color-elderberry-950,var(--red))] uppercase"
			>
				Featured vendors
			</div>
			<div class="flex flex-wrap gap-3">
				{#each featured as v (v.id)}
					{@const tags = serviceTags(v.serviceType).slice(0, 2)}
					<a
						href="/red-pages/{v.slug ?? v.id}"
						class="flex items-start gap-4 rounded-lg border-2 border-[var(--color-salmonberry-100,var(--red-lt))] bg-white p-4 text-inherit no-underline shadow-[var(--sh)] transition-[box-shadow,border-color,transform] duration-150 hover:translate-x-[3px] hover:border-[var(--color-salmonberry-900,var(--red))] hover:shadow-[var(--shh)]"
					>
						<div
							class="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-[var(--red)] font-sans text-xl font-bold text-white"
						>
							{initials(v.title)}
						</div>
						<div class="flex min-w-0 flex-1 flex-col gap-1">
							<span
								class="mb-1 inline-flex items-center gap-1 rounded-full bg-[var(--color-salmonberry-900,var(--red))] px-2 py-0.5 font-sans text-[11px] font-bold tracking-[0.08em] text-white uppercase"
							>
								&#9733; Featured
							</span>
							<div class="mb-1 font-serif text-base font-semibold text-[var(--dark)]">
								{v.title}
							</div>
							{#if v.tribalAffiliation}
								<div class="mb-1 text-sm text-[var(--muted-foreground)]">{v.tribalAffiliation}</div>
							{/if}
							{#if tags.length || v.region}
								<div class="my-1 flex flex-wrap gap-1.5">
									{#each tags as tag}
										<span
											class="rounded bg-[var(--muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]"
											>{tag}</span
										>
									{/each}
									{#if v.region}
										<span
											class="rounded bg-[var(--muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]"
											>{v.region}</span
										>
									{/if}
								</div>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<KbTwoColumnLayout {sidebar}>
		{#snippet children()}
			{#if data.dataUnavailable}
				<Alert class="mb-6 border-amber-300 bg-amber-50 text-amber-950">
					<AlertTitle>Live Red Pages data is unavailable</AlertTitle>
					<AlertDescription>
						Some live directory data is temporarily unavailable, so you may be seeing limited
						results right now. Please try again in a little while.
					</AlertDescription>
				</Alert>
			{/if}

			<div class="mb-5 flex items-center justify-between border-b border-[var(--rule)] pb-4">
				<div class="font-sans text-sm text-[var(--muted-foreground)]">
					Showing <strong class="text-[var(--dark)]">{filters.filteredTotal}</strong> listings
				</div>
			</div>

			{#if filters.filteredTotal === 0}
				<div class="flex flex-col items-center justify-center py-16 text-center">
					<p class="mb-1 font-serif text-lg font-semibold text-[var(--dark)]">No listings found</p>
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
					{#each filters.paginatedList as vendor, i (vendor.id)}
						<RedPagesListItem {vendor} index={i} />
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
		coil="redpages"
		heading="Add your business"
		description="Submit your Native-owned business or service for IFS staff review."
		href="/red-pages/submit"
		label="Add Your Business"
	/>
</div>
