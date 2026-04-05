<script lang="ts">
	import { browser } from '$app/environment';
	import { FileText, BookOpen, ClipboardList, Pin, Paperclip, Package } from '@lucide/svelte';
	import KbHero from '$lib/components/organisms/KbHero.svelte';
	import KbTwoColumnLayout from '$lib/components/organisms/KbTwoColumnLayout.svelte';
	import KbSidebar from '$lib/components/organisms/KbSidebar.svelte';
	import KbFilterSection from '$lib/components/organisms/KbFilterSection.svelte';
	import KbSubmitBanner from '$lib/components/organisms/KbSubmitBanner.svelte';
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
	import type { ToolboxItem } from '$lib/data/kb';
	import { TOOLBOX_SUBSECTIONS } from '$lib/data/formSchema';
	import { stripHtml } from '$lib/utils/format';

	let { data } = $props();
	const canonicalUrl = $derived(`${data.origin ?? ''}/toolbox`);

	const filters = useCoilFilters<ToolboxItem>({
		items: () => (data.toolbox ?? []) as ToolboxItem[],
		facets: {
			mediaType: { field: 'mediaType' },
			category: { field: 'category' }
		},
		searchFields: ['source', 'mediaType', 'category'],
		perPage: 100, // we handle subsection filtering + pagination ourselves
		pageParam: false
	});

	function getInitialSubsection() {
		if (!browser) return '';
		return new URL(window.location.href).searchParams.get('section') ?? '';
	}

	let activeSubsection = $state(getInitialSubsection());
	let lastSubsection = $state(getInitialSubsection());
	let lastToolboxSearch = $state(browser ? window.location.search : '');

	function subsectionMatch(item: ToolboxItem, subId: string): boolean {
		if (!subId) return true;
		const cat = (item.category ?? '').toLowerCase();
		const mt = (item.mediaType ?? '').toLowerCase();
		switch (subId) {
			case 'indigenous-economic-futures':
				return cat.includes('indigenous economic futures') || cat.includes('economic development');
			case 'tribal-govts-enterprises':
				return cat.includes('tribal allies');
			case 'toolkits':
				return mt.includes('toolkit');
			case 'agency-policy-docs':
				return mt.includes('policy document') || mt.includes('report');
			case 'library':
				return !mt.includes('toolkit') && !mt.includes('policy document') && !mt.includes('report');
			default:
				return true;
		}
	}

	const subsectionFiltered = $derived(
		activeSubsection
			? filters.filtered.filter((e) => subsectionMatch(e, activeSubsection))
			: filters.filtered
	);
	const filteredTotal = $derived(subsectionFiltered.length);

	const PER_PAGE = 6;
	let pageBinding = $state(1);
	const totalPages = $derived(Math.max(1, Math.ceil(filteredTotal / PER_PAGE)));
	const currentPage = $derived(Math.min(pageBinding, totalPages));
	const paginatedList = $derived(
		subsectionFiltered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)
	);
	$effect(() => {
		pageBinding = currentPage;
	});
	$effect(() => {
		if (activeSubsection !== lastSubsection) {
			pageBinding = 1;
			lastSubsection = activeSubsection;
		}
	});
	$effect(() => {
		if (!browser) return;

		const syncFromUrl = () => {
			const url = new URL(window.location.href);
			activeSubsection = url.searchParams.get('section') ?? '';
			pageBinding = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
			lastToolboxSearch = window.location.search;
			lastSubsection = activeSubsection;
		};

		window.addEventListener('popstate', syncFromUrl);
		return () => {
			window.removeEventListener('popstate', syncFromUrl);
		};
	});
	$effect(() => {
		if (!browser) return;

		const url = new URL(window.location.href);
		if (activeSubsection) url.searchParams.set('section', activeSubsection);
		else url.searchParams.delete('section');
		if (currentPage > 1) url.searchParams.set('page', String(currentPage));
		else url.searchParams.delete('page');

		const nextSearch = url.search;
		if (nextSearch !== lastToolboxSearch) {
			window.history.replaceState(window.history.state, '', url.toString());
			lastToolboxSearch = nextSearch;
		}
	});

	const mediaTypeIcons: Record<string, typeof FileText> = {
		Toolkit: Package,
		Report: FileText,
		'Policy Document': ClipboardList,
		Guide: BookOpen,
		'Case Study': Pin,
		Other: Paperclip
	};
	function iconFor(r: ToolboxItem) {
		return mediaTypeIcons[r.mediaType ?? ''] ?? Paperclip;
	}

	function handleClearAll() {
		filters.clearFilters();
		activeSubsection = '';
		pageBinding = 1;
	}

	const activeFilterCount = $derived(filters.activeFilterCount + (activeSubsection ? 1 : 0));
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
		<strong class="block text-[28px] leading-none font-bold">{filters.items.length}</strong>
		<span class="text-xs opacity-70">Resources</span>
	</div>
	<div class="font-sans text-white">
		<strong class="block text-[28px] leading-none font-bold"
			>{filters.facetValues.mediaType?.length ?? 0}</strong
		>
		<span class="text-xs opacity-70">Media types</span>
	</div>
{/snippet}
{#snippet sidebar()}
	<KbSidebar
		searchPlaceholder="Search toolbox…"
		bind:searchQuery={filters.searchQuery}
		hasActiveFilters={activeFilterCount > 0}
		{activeFilterCount}
		resultsLabel={`${filteredTotal} resources`}
		onClear={handleClearAll}
	>
		<KbFilterSection
			title="Media Type"
			options={filters.facetValues.mediaType?.map((t) => ({
				value: t,
				label: t,
				count: filters.facetCounts.mediaType?.[t] ?? 0
			})) ?? []}
			selected={filters.getFacetSelection('mediaType')}
			onToggle={(val) => filters.toggleFacet('mediaType', val)}
			emptyLabel="No types"
		/>
		<KbFilterSection
			title="Category"
			options={filters.facetValues.category?.map((c) => ({
				value: c,
				label: c,
				count: filters.facetCounts.category?.[c] ?? 0
			})) ?? []}
			selected={filters.getFacetSelection('category')}
			onToggle={(val) => filters.toggleFacet('category', val)}
			emptyLabel="No categories"
		/>
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

	<KbTwoColumnLayout
		{sidebar}
		bind:mobileSearchQuery={filters.searchQuery}
		mobileSearchPlaceholder="Search toolbox…"
		mobileActiveFilterCount={activeFilterCount}
		onMobileClear={handleClearAll}
	>
		{#snippet children()}
			{#if data.dataUnavailable}
				<Alert class="mb-6 border-amber-300 bg-amber-50 text-amber-950">
					<AlertTitle>Live toolbox data is unavailable</AlertTitle>
					<AlertDescription>
						Some live toolbox data is temporarily unavailable, so you may be seeing limited results
						right now. Please try again in a little while.
					</AlertDescription>
				</Alert>
			{/if}

			<div class="mb-4 flex flex-wrap gap-2 border-b border-[var(--rule)] pb-4" role="tablist">
				{#each TOOLBOX_SUBSECTIONS as sub}
					<button
						type="button"
						class="cursor-pointer rounded border px-3 py-1.5 text-sm font-semibold transition-colors {activeSubsection ===
						sub.id
							? 'border-[var(--color-lakebed-950)] bg-[var(--color-lakebed-950)] text-white'
							: 'border-[var(--border)] bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--accent)]'}"
						role="tab"
						aria-selected={activeSubsection === sub.id}
						onclick={() => (activeSubsection = sub.id)}>{sub.label}</button
					>
				{/each}
			</div>

			<div
				class="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--rule)] pb-4"
			>
				<div class="font-sans text-sm text-[var(--muted-foreground)]">
					Showing <strong class="text-[var(--dark)]">{filteredTotal}</strong> resources
				</div>
				{#if activeFilterCount > 0}
					<div
						class="rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] px-3 py-1 font-sans text-[11px] font-bold tracking-[0.08em] text-[var(--primary)] uppercase"
					>
						{activeFilterCount} active refinements
					</div>
				{/if}
			</div>

			{#if filteredTotal === 0}
				<div class="flex flex-col items-center justify-center py-16 text-center">
					<p class="mb-1 font-serif text-lg font-semibold text-[var(--dark)]">No resources found</p>
					<p class="mb-4 text-sm text-[var(--muted-foreground)]">
						Try adjusting your filters or search terms.
					</p>
					<button
						type="button"
						class="cursor-pointer rounded border-none bg-[var(--teal)] px-4 py-2 font-sans text-sm font-semibold text-white"
						onclick={handleClearAll}>Clear all filters</button
					>
				</div>
			{:else}
				<div class="flex flex-col gap-3">
					{#each paginatedList as resource (resource.id)}
						{@const Icon = iconFor(resource)}
						<a
							href="/toolbox/{resource.slug ?? resource.id}"
							class="flex items-start gap-4 rounded-lg border border-[var(--rule)] bg-white p-4 text-inherit no-underline transition-shadow duration-150 hover:shadow-[var(--shh)]"
						>
							<div
								class="flex h-10 w-10 flex-none items-center justify-center rounded-md bg-[var(--muted)] text-[var(--muted-foreground)]"
								aria-hidden="true"
							>
								<Icon class="h-5 w-5" />
							</div>
							<div class="min-w-0 flex-1">
								<h3 class="mb-1 font-serif text-base font-semibold text-[var(--dark)]">
									{resource.title}
								</h3>
								{#if resource.source}
									<p class="mb-1 text-sm text-[var(--muted-foreground)]">{resource.source}</p>
								{/if}
								{#if resource.description}
									<p class="mb-2 line-clamp-2 text-[13px] leading-[1.5] text-[var(--mid)]">
										{stripHtml(String(resource.description))}
									</p>
								{/if}
								<div class="flex flex-wrap gap-1.5">
									{#if resource.mediaType}
										<span
											class="rounded bg-[var(--muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]"
											>{resource.mediaType}</span
										>
									{/if}
									{#if resource.category}
										<span
											class="rounded bg-[var(--muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]"
											>{resource.category}</span
										>
									{/if}
								</div>
							</div>
						</a>
					{/each}
				</div>
			{/if}

			{#if totalPages > 1}
				<Pagination
					class="pt-6"
					count={filteredTotal}
					perPage={PER_PAGE}
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
										<PaginationLink page={pageItem} isActive={pageItem.value === currentPage}>
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
		coil="toolbox"
		heading="Submit a resource"
		description="Add toolkits, reports, and policy documents for IFS staff review."
		href="/toolbox/submit"
		label="Submit a Resource"
	/>
</div>
