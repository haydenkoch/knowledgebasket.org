<script lang="ts">
	import Input from '$lib/components/ui/input/input.svelte';
	import KbHero from '$lib/components/organisms/KbHero.svelte';
	import KbTwoColumnLayout from '$lib/components/organisms/KbTwoColumnLayout.svelte';
	import KbFilterSection from '$lib/components/organisms/KbFilterSection.svelte';
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
			funding.filter((e) =>
				matchSearch(e, searchQuery, ['funderName', 'amountDescription', 'title'])
			),
			{
				fundingType: typeFilter,
				applicationStatus: statusFilter
			}
		)
	);
	const filteredTotal = $derived(filtered.length);
	const openCount = $derived(
		funding.filter((f) => f.applicationStatus === 'open' || f.applicationStatus === 'rolling')
			.length
	);
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
	<div class="font-sans text-white">
		<strong class="block text-[28px] leading-none font-bold">{total}</strong><span
			class="text-xs opacity-70">Total</span
		>
	</div>
	<div class="font-sans text-white">
		<strong class="block text-[28px] leading-none font-bold">{openCount}</strong><span
			class="text-xs opacity-70">Open</span
		>
	</div>
{/snippet}
{#snippet sidebar()}
	<div class="relative mb-7">
		<span
			class="absolute top-1/2 left-3 flex -translate-y-1/2 items-center justify-center text-[14px] text-[var(--muted-foreground)]"
			aria-hidden="true">🔍</span
		>
		<Input type="search" placeholder="Search funding…" class="pl-[38px]" bind:value={searchQuery} />
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
	<button
		type="button"
		class="mt-2 cursor-pointer border-none bg-transparent p-0 font-sans text-xs text-[var(--teal)] underline"
		onclick={clearFilters}>Clear all filters</button
	>
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
		class="flex flex-wrap items-center gap-4 border-b border-[var(--rule)] bg-[var(--card)] px-10 py-2 font-sans text-[13px]"
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

	<KbTwoColumnLayout {sidebar}>
		{#snippet children()}
			{#if data.dataUnavailable}
				<Alert class="mb-6 border-amber-300 bg-amber-50 text-amber-950">
					<AlertTitle>Live funding data is unavailable</AlertTitle>
					<AlertDescription>
						The page is showing a safe fallback because the local database connection failed. Check
						`DATABASE_URL`, start local services, and run `pnpm db:push` if the schema is missing.
					</AlertDescription>
				</Alert>
			{/if}
			<div class="mb-[22px] flex items-center justify-between border-b border-[var(--rule)] pb-4">
				<div class="font-sans text-[14px] text-[var(--muted-foreground)]">
					Showing <strong class="text-[var(--dark)]">{filteredTotal}</strong> opportunities
				</div>
				<select
					class="rounded border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-sm text-[var(--foreground)]"
					aria-label="Sort"
				>
					<option>Soonest deadline</option>
					<option>Recently added</option>
				</select>
			</div>
			<div class="grid grid-cols-[repeat(auto-fill,minmax(310px,1fr))] gap-5">
				{#each paginatedList as item, i (item.id)}
					<a
						href="/funding/{item.slug ?? item.id}"
						class="flex cursor-pointer flex-col overflow-hidden rounded-lg border border-[var(--rule)] bg-white no-underline shadow-[var(--sh)] transition-[transform,box-shadow] duration-150 hover:-translate-y-[3px] hover:no-underline hover:shadow-[var(--shh)]"
					>
						<div class="relative flex h-[148px] items-center justify-center overflow-hidden">
							{#if item.imageUrl}
								<img
									src={item.imageUrl}
									alt={item.title}
									class="h-full w-full object-cover"
									loading="lazy"
								/>
							{:else}
								<span class="absolute text-[48px] opacity-[0.35]" aria-hidden="true">💰</span>
							{/if}
							{#if item.applicationStatus}
								<span
									class="absolute bottom-2 left-3 rounded bg-black/30 px-2 py-0.5 text-[11px] font-bold tracking-[0.05em] text-white/90 uppercase"
									>{item.applicationStatus}</span
								>
							{/if}
						</div>
						<div class="flex min-h-0 flex-1 flex-col p-4 px-[18px]">
							<div class="mb-2 flex flex-wrap gap-[5px]">
								{#if item.applicationStatus}<span
										class="rounded bg-[var(--muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]"
										>{item.applicationStatus}</span
									>{/if}
								{#if item.fundingType}<span
										class="rounded bg-[var(--muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]"
										>{item.fundingType}</span
									>{/if}
							</div>
							<div
								class="mb-[5px] font-serif text-base leading-[1.35] font-semibold text-[var(--dark)]"
							>
								{item.title}
							</div>
							{#if item.amountDescription}
								<div
									class="mb-[6px] flex items-center gap-1 font-sans text-xs text-[var(--muted-foreground)]"
								>
									💵 {item.amountDescription}
								</div>
							{/if}
							{#if item.funderName}<div
									class="mb-[6px] flex items-center gap-1 font-sans text-xs text-[var(--muted-foreground)]"
								>
									🏛 {item.funderName}
								</div>{/if}
							{#if item.deadline}<div
									class="mb-[6px] flex items-center gap-1 font-sans text-xs text-[var(--muted-foreground)]"
								>
									📅 Deadline: {item.deadline}
								</div>{/if}
							{#if item.description}<div
									class="mb-[14px] line-clamp-3 min-h-0 flex-auto text-[13px] leading-[1.5] text-[var(--mid)]"
								>
									{stripHtml(String(item.description))}
								</div>{/if}
							<span
								class="mt-auto block flex-none rounded-[var(--radius)] bg-[var(--teal)] py-[9px] text-center font-sans text-[13px] font-bold tracking-[0.03em] text-white no-underline transition-[filter] duration-150 hover:brightness-110"
								>View Opportunity</span
							>
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

	<div
		class="flex flex-wrap items-center justify-between gap-6 px-10 py-8"
		style="background: var(--gold-lt); border-top-color: var(--gold)"
	>
		<div>
			<h3 style="color: var(--gold)">Know of a funding opportunity?</h3>
			<p>Submit grants, loans, fellowships, and contracts for IFS staff review.</p>
		</div>
		<a
			href="/funding/submit"
			class="inline-block flex-none rounded px-6 py-3 font-sans text-sm font-semibold text-white no-underline"
			style="background: var(--gold)">Submit Funding Opportunity</a
		>
	</div>
</div>
