<script lang="ts">
	import Input from '$lib/components/ui/input/input.svelte';
	import KbHero from '$lib/components/organisms/KbHero.svelte';
	import KbTwoColumnLayout from '$lib/components/organisms/KbTwoColumnLayout.svelte';
	import KbFilterSection from '$lib/components/organisms/KbFilterSection.svelte';
	import {
		Pagination,
		PaginationContent,
		PaginationItem,
		PaginationLink,
		PaginationPrevious,
		PaginationNext,
		PaginationEllipsis
	} from '$lib/components/ui/pagination/index.js';
	import type { FundingItem } from '$lib/data/kb';
	import { getPlaceholderImage } from '$lib/data/placeholders';
	import { stripHtml, matchSearch, filterByFacets, facetCounts } from '$lib/utils/format';

	let { data } = $props();
	const funding = $derived(data.funding ?? []) as FundingItem[];
	const total = $derived(funding.length);

	let searchQuery = $state('');
	let typeFilter = $state<string[]>([]);
	let statusFilter = $state<string[]>([]);

	const typeCounts = $derived(facetCounts(funding, 'fundingType'));
	const statusCounts = $derived(facetCounts(funding, 'applicationStatus'));
	const typeValues = $derived(Object.keys(typeCounts).sort());
	const statusValues = $derived(Object.keys(statusCounts).sort());

	const filtered = $derived(
		filterByFacets(
			funding.filter((e) => matchSearch(e, searchQuery, ['funderName', 'amountDescription', 'title'])),
			{
				fundingType: typeFilter,
				applicationStatus: statusFilter
			}
		)
	);
	const filteredTotal = $derived(filtered.length);
	const openCount = $derived(funding.filter((f) => f.applicationStatus === 'open' || f.applicationStatus === 'rolling').length);
	const rollingCount = $derived(funding.filter((f) => f.applicationStatus === 'rolling').length);

	function toggle(arr: string[], val: string) {
		return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
	}
	function clearFilters() {
		searchQuery = '';
		typeFilter = [];
		statusFilter = [];
	}

	const PER_PAGE = 6;
	let pageBinding = $state(1);
	const totalPages = $derived(Math.max(1, Math.ceil(filteredTotal / PER_PAGE)));
	const currentPage = $derived(Math.min(pageBinding, totalPages));
	const paginatedList = $derived(
		filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)
	);
	$effect(() => {
		pageBinding = currentPage;
	});
</script>

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
	<div class="font-sans text-white"><strong class="text-[28px] font-bold block leading-none">{total}</strong><span class="text-xs opacity-70">Total</span></div>
	<div class="font-sans text-white"><strong class="text-[28px] font-bold block leading-none">{openCount}</strong><span class="text-xs opacity-70">Open</span></div>
{/snippet}
{#snippet sidebar()}
	<div class="relative mb-7">
		<span class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] text-[14px] flex items-center justify-center" aria-hidden="true">🔍</span>
		<Input
			type="search"
			placeholder="Search funding…"
			class="pl-[38px]"
			bind:value={searchQuery}
		/>
	</div>
	<KbFilterSection
		title="Type"
		options={typeValues.map((t) => ({ value: t, label: t, count: typeCounts[t] ?? 0 }))}
		selected={typeFilter}
		onToggle={(val) => (typeFilter = toggle(typeFilter, val))}
		emptyLabel="No types"
	/>
	<KbFilterSection
		title="Status"
		options={statusValues.map((s) => ({ value: s, label: s, count: statusCounts[s] ?? 0 }))}
		selected={statusFilter}
		onToggle={(val) => (statusFilter = toggle(statusFilter, val))}
		emptyLabel="No statuses"
	/>
	<button type="button" class="font-sans text-xs text-[var(--teal)] cursor-pointer underline bg-transparent border-none p-0 mt-2" onclick={clearFilters}>Clear all filters</button>
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

	<div class="flex items-center gap-4 px-10 py-2 bg-[var(--card)] border-b border-[var(--rule)] text-[13px] font-sans flex-wrap">
		<div class="flex items-center gap-1.5 text-[13px] text-[var(--foreground)]"><span class="inline-block w-2 h-2 rounded-full bg-[var(--green,#22c55e)]"></span> {openCount} Open</div>
		<div class="flex items-center gap-1.5 text-[13px] text-[var(--foreground)]"><span class="inline-block w-2 h-2 rounded-full bg-[var(--gold)]"></span> {rollingCount} Rolling</div>
		<div class="ml-auto text-[11px] text-[var(--muted-foreground)]">Updated regularly</div>
	</div>

	<KbTwoColumnLayout {sidebar}>
		{#snippet children()}
		<div class="flex items-center justify-between mb-[22px] pb-4 border-b border-[var(--rule)]">
				<div class="font-sans text-[14px] text-[var(--muted-foreground)]">Showing <strong class="text-[var(--dark)]">{filteredTotal}</strong> opportunities</div>
				<select class="text-sm border border-[var(--border)] rounded px-2 py-1 bg-[var(--card)] text-[var(--foreground)]" aria-label="Sort">
					<option>Soonest deadline</option>
					<option>Recently added</option>
				</select>
			</div>
			<div class="grid grid-cols-[repeat(auto-fill,minmax(310px,1fr))] gap-5">
				{#each paginatedList as item, i (item.id)}
					<a href="/funding/{item.slug ?? item.id}" class="bg-white rounded-lg shadow-[var(--sh)] overflow-hidden flex flex-col transition-[transform,box-shadow] duration-150 cursor-pointer border border-[var(--rule)] no-underline hover:-translate-y-[3px] hover:shadow-[var(--shh)] hover:no-underline">
						<div class="h-[148px] flex items-center justify-center relative overflow-hidden">
							{#if item.imageUrl}
								<img src={item.imageUrl} alt={item.title} class="w-full h-full object-cover" loading="lazy" />
							{:else}
								<span class="absolute text-[48px] opacity-[0.35]" aria-hidden="true">💰</span>
							{/if}
							{#if item.applicationStatus}
								<span class="absolute bottom-2 left-3 text-[11px] font-bold tracking-[0.05em] uppercase text-white/90 bg-black/30 px-2 py-0.5 rounded">{item.applicationStatus}</span>
							{/if}
						</div>
						<div class="p-4 px-[18px] flex-1 min-h-0 flex flex-col">
							<div class="flex flex-wrap gap-[5px] mb-2">
								{#if item.applicationStatus}<span class="text-[11px] font-semibold px-2 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">{item.applicationStatus}</span>{/if}
								{#if item.fundingType}<span class="text-[11px] font-semibold px-2 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">{item.fundingType}</span>{/if}
							</div>
							<div class="font-serif text-base font-semibold text-[var(--dark)] leading-[1.35] mb-[5px]">{item.title}</div>
							{#if item.amountDescription}
								<div class="font-sans text-xs text-[var(--muted-foreground)] mb-[6px] flex items-center gap-1">💵 {item.amountDescription}</div>
							{/if}
							{#if item.funderName}<div class="font-sans text-xs text-[var(--muted-foreground)] mb-[6px] flex items-center gap-1">🏛 {item.funderName}</div>{/if}
							{#if item.deadline}<div class="font-sans text-xs text-[var(--muted-foreground)] mb-[6px] flex items-center gap-1">📅 Deadline: {item.deadline}</div>{/if}
							{#if item.description}<div class="text-[13px] leading-[1.5] text-[var(--mid)] mb-[14px] flex-auto min-h-0 line-clamp-3">{stripHtml(String(item.description))}</div>{/if}
							<span class="block flex-none text-center bg-[var(--teal)] text-white font-sans text-[13px] font-bold py-[9px] rounded-[var(--radius)] no-underline tracking-[0.03em] transition-[filter] duration-150 mt-auto hover:brightness-110">View Opportunity</span>
						</div>
					</a>
				{/each}
			</div>
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
									<PaginationItem>
										<PaginationEllipsis />
									</PaginationItem>
								{:else}
									<PaginationItem>
										<PaginationLink
											page={pageItem}
											isActive={pageItem.value === currentPage}
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

	<div class="flex items-center justify-between gap-6 px-10 py-8 flex-wrap" style="background: var(--gold-lt); border-top-color: var(--gold)">
		<div>
			<h3 style="color: var(--gold)">Know of a funding opportunity?</h3>
			<p>Submit grants, loans, fellowships, and contracts for IFS staff review.</p>
		</div>
		<a href="/funding/submit" class="inline-block px-6 py-3 rounded text-white font-sans font-semibold text-sm no-underline flex-none" style="background: var(--gold)">Submit Funding Opportunity</a>
	</div>
</div>
