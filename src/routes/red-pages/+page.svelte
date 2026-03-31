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
	import type { RedPagesItem } from '$lib/data/kb';
	import { stripHtml, matchSearch, filterByFacets, facetCounts } from '$lib/utils/format';

	let { data } = $props();
	const redpages = $derived(data.redpages ?? []) as RedPagesItem[];
	const total = $derived(redpages.length);

	let searchQuery = $state('');
	let serviceTypeFilter = $state<string[]>([]);
	let regionFilter = $state<string[]>([]);

	const serviceTypeCounts = $derived(facetCounts(redpages, 'serviceType'));
	const regionCounts = $derived(facetCounts(redpages, 'region'));
	const serviceTypeValues = $derived(Object.keys(serviceTypeCounts).sort());
	const regionValues = $derived(Object.keys(regionCounts).sort());

	const filtered = $derived(
		filterByFacets(
			redpages.filter((e) => matchSearch(e, searchQuery, ['tribalAffiliation', 'serviceType', 'region'])),
			{
				serviceType: serviceTypeFilter,
				region: regionFilter
			}
		)
	);
	const filteredTotal = $derived(filtered.length);
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

	function toggle(arr: string[], val: string) {
		return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
	}
	function clearFilters() {
		searchQuery = '';
		serviceTypeFilter = [];
		regionFilter = [];
	}
	function initials(title: string): string {
		return title
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((w) => w[0])
			.join('')
			.toUpperCase() || '?';
	}
	/** Split long serviceType (e.g. "A: x, y, z") into separate small tags */
	function serviceTags(serviceType?: string): string[] {
		if (!serviceType?.trim()) return [];
		const raw = serviceType
			.split(/[:,)]+/)
			.map((s) => s.replace(/\s*\([^)]*$/, '').trim())
			.filter((s) => s.length > 0 && s.length < 45);
		return [...new Set(raw)];
	}
	const FEATURED_COUNT = 6;
	const featured = $derived(filtered.slice(0, FEATURED_COUNT));
</script>

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
	<div class="font-sans text-white"><strong class="text-[28px] font-bold block leading-none">{total}</strong><span class="text-xs opacity-70">Listings</span></div>
	<div class="font-sans text-white"><strong class="text-[28px] font-bold block leading-none">{serviceTypeValues.length}</strong><span class="text-xs opacity-70">Service Types</span></div>
{/snippet}
{#snippet sidebar()}
	<div class="relative mb-7">
		<span class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] text-[14px] flex items-center justify-center" aria-hidden="true">🔍</span>
		<Input
			type="search"
			placeholder="Search Red Pages…"
			class="pl-[38px]"
			bind:value={searchQuery}
		/>
	</div>
	<KbFilterSection
		title="Service Type"
		options={serviceTypeValues.map((t) => ({ value: t, label: t, count: serviceTypeCounts[t] ?? 0 }))}
		selected={serviceTypeFilter}
		onToggle={(val) => (serviceTypeFilter = toggle(serviceTypeFilter, val))}
		emptyLabel="No types"
	/>
	<KbFilterSection
		title="Region"
		options={regionValues.map((r) => ({ value: r, label: r, count: regionCounts[r] ?? 0 }))}
		selected={regionFilter}
		onToggle={(val) => (regionFilter = toggle(regionFilter, val))}
		emptyLabel="No regions"
	/>
	<button type="button" class="font-sans text-xs text-[var(--teal)] cursor-pointer underline bg-transparent border-none p-0 mt-2" onclick={clearFilters}>Clear all filters</button>
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
		<section class="px-10 pt-5 pb-3 bg-[var(--color-alpine-100,var(--bone))] border-b border-[var(--rule)]" aria-label="Featured vendors">
			<div class="font-sans text-[11px] font-bold tracking-[0.12em] uppercase text-[var(--color-elderberry-950,var(--red))] mb-[10px]">Featured vendors</div>
			<div class="flex flex-wrap gap-3">
				{#each featured as v (v.id)}
					{@const tags = serviceTags(v.serviceType).slice(0, 2)}
					<a href="/red-pages/{v.slug ?? v.id}" class="flex gap-4 items-start bg-white border-2 border-[var(--color-salmonberry-100,var(--red-lt))] rounded-lg p-4 px-[18px] no-underline text-inherit shadow-[var(--sh)] transition-[box-shadow,border-color,transform] duration-150 hover:shadow-[var(--shh)] hover:translate-x-[3px] hover:border-[var(--color-salmonberry-900,var(--red))]">
						<div class="w-16 h-16 rounded-full bg-[var(--red)] text-white font-sans text-[22px] font-bold flex items-center justify-center flex-none">{initials(v.title)}</div>
						<div class="flex-1 min-w-0 flex flex-col gap-1">
							<span class="font-sans text-[11px] font-bold tracking-[0.08em] uppercase py-0.5 px-2 rounded-full bg-[var(--color-salmonberry-900,var(--red))] text-white mb-1 inline-flex items-center gap-1">★ Featured</span>
							<div class="font-serif text-base font-semibold text-[var(--dark)] mb-1">{v.title}</div>
							{#if v.tribalAffiliation}
								<div class="text-sm text-[var(--muted-foreground)] mb-1">{v.tribalAffiliation}</div>
							{/if}
							{#if tags.length || v.region}
								<div class="flex flex-wrap gap-1.5 my-1.5">
									{#if tags.length}
										<span class="text-[11px] font-semibold px-2 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">{tags.join(', ')}</span>
									{/if}
									{#if v.region}
										<span class="text-[11px] font-semibold px-2 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">{v.region}</span>
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
		<div class="flex items-center justify-between mb-[22px] pb-4 border-b border-[var(--rule)]">
				<div class="font-sans text-[14px] text-[var(--muted-foreground)]">Showing <strong class="text-[var(--dark)]">{filteredTotal}</strong> listings</div>
				<select class="text-sm border border-[var(--border)] rounded px-2 py-1 bg-[var(--card)] text-[var(--foreground)]" aria-label="Sort">
					<option>A–Z</option>
					<option>Recently added</option>
				</select>
			</div>
			<div class="flex flex-col gap-3">
				{#each paginatedList as vendor (vendor.id)}
					<a href="/red-pages/{vendor.slug ?? vendor.id}" class="flex gap-4 items-start bg-white border border-[var(--rule)] rounded-lg p-4 px-[18px] no-underline text-inherit shadow-[var(--sh)] transition-[box-shadow,transform] duration-150 hover:shadow-[var(--shh)] hover:translate-x-[3px]">
						<div class="w-16 h-16 rounded-full bg-[var(--red)] text-white font-sans text-[22px] font-bold flex items-center justify-center flex-none">{initials(vendor.title)}</div>
						<div class="flex-1 min-w-0 flex flex-col gap-1">
							<div class="font-serif text-base font-semibold text-[var(--dark)]">{vendor.title}</div>
							{#if vendor.tribalAffiliation}<div class="text-sm text-[var(--muted-foreground)] mb-1">{vendor.tribalAffiliation}</div>{/if}
							<div class="flex flex-wrap gap-1.5">
								<span class="text-[11px] font-semibold px-2 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">Native-owned</span>
								{#if vendor.region}<span class="text-[11px] font-semibold px-2 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">{vendor.region}</span>{/if}
								{#each serviceTags(vendor.serviceType) as tag}
									<span class="text-[11px] font-semibold px-2 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">{tag}</span>
								{/each}
							</div>
							{#if vendor.region || vendor.serviceType}
								<div class="font-sans text-xs text-[var(--muted-foreground)] mb-[6px] flex items-center gap-1">{vendor.region}{#if vendor.region && vendor.serviceType} · {/if}{vendor.serviceType}</div>
							{/if}
							{#if vendor.description}<div class="text-[13px] leading-[1.5] text-[var(--mid)] mb-[14px] flex-auto min-h-0 line-clamp-3">{stripHtml(String(vendor.description))}</div>{/if}
							<span class="block flex-none text-center bg-[var(--teal)] text-white font-sans text-[13px] font-bold py-[9px] rounded-[var(--radius)] no-underline tracking-[0.03em] transition-[filter] duration-150 mt-auto hover:brightness-110">View Profile</span>
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

	<div class="flex items-center justify-between gap-6 px-10 py-8 flex-wrap">
		<div>
			<h3>Add your business</h3>
			<p>Submit your Native-owned business or service for IFS staff review.</p>
		</div>
		<a href="/red-pages/submit" class="inline-block px-6 py-3 rounded text-white font-sans font-semibold text-sm no-underline flex-none">Add your business</a>
	</div>
</div>
