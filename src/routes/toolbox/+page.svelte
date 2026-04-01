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
	import type { ToolboxItem } from '$lib/data/kb';
	import { TOOLBOX_SUBSECTIONS } from '$lib/data/formSchema';
	import { stripHtml, matchSearch, filterByFacets, facetCounts } from '$lib/utils/format';

	let { data } = $props();
	const toolbox = $derived(data.toolbox ?? []) as ToolboxItem[];
	const total = $derived(toolbox.length);

	let searchQuery = $state('');
	let mediaTypeFilter = $state<string[]>([]);
	let categoryFilter = $state<string[]>([]);
	let activeSubsection = $state('');

	const mediaTypeCounts = $derived(facetCounts(toolbox, 'mediaType'));
	const categoryCounts = $derived(facetCounts(toolbox, 'category'));
	const mediaTypeValues = $derived(Object.keys(mediaTypeCounts).sort());
	const categoryValues = $derived(Object.keys(categoryCounts).sort());

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

	const baseFiltered = $derived(
		filterByFacets(
			toolbox.filter((e) => matchSearch(e, searchQuery, ['source', 'mediaType', 'category'])),
			{ mediaType: mediaTypeFilter, category: categoryFilter }
		)
	);
	const filtered = $derived(
		activeSubsection
			? baseFiltered.filter((e) => subsectionMatch(e, activeSubsection))
			: baseFiltered
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
		mediaTypeFilter = [];
		categoryFilter = [];
		activeSubsection = '';
	}

	const mediaTypeIcon: Record<string, string> = {
		Toolkit: '📦',
		Report: '📄',
		'Policy Document': '📋',
		Guide: '📖',
		'Case Study': '📌',
		Other: '📎'
	};
	function iconFor(r: ToolboxItem) {
		return mediaTypeIcon[r.mediaType ?? ''] ?? '📎';
	}
</script>

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
		<strong class="block text-[28px] leading-none font-bold">{total}</strong><span
			class="text-xs opacity-70">Resources</span
		>
	</div>
	<div class="font-sans text-white">
		<strong class="block text-[28px] leading-none font-bold">{mediaTypeValues.length}</strong><span
			class="text-xs opacity-70">Media types</span
		>
	</div>
{/snippet}
{#snippet sidebar()}
	<div class="relative mb-7">
		<span
			class="absolute top-1/2 left-3 flex -translate-y-1/2 items-center justify-center text-[14px] text-[var(--muted-foreground)]"
			aria-hidden="true">🔍</span
		>
		<Input type="search" placeholder="Search toolbox…" class="pl-[38px]" bind:value={searchQuery} />
	</div>
	<KbFilterSection
		title="Media Type"
		options={mediaTypeValues.map((t) => ({ value: t, label: t, count: mediaTypeCounts[t] ?? 0 }))}
		selected={mediaTypeFilter}
		onToggle={(val) => (mediaTypeFilter = toggle(mediaTypeFilter, val))}
		emptyLabel="No types"
	/>
	<KbFilterSection
		title="Category"
		options={categoryValues.map((c) => ({ value: c, label: c, count: categoryCounts[c] ?? 0 }))}
		selected={categoryFilter}
		onToggle={(val) => (categoryFilter = toggle(categoryFilter, val))}
		emptyLabel="No categories"
	/>
	<button
		type="button"
		class="mt-2 cursor-pointer border-none bg-transparent p-0 font-sans text-xs text-[var(--teal)] underline"
		onclick={clearFilters}>Clear all filters</button
	>
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

	<KbTwoColumnLayout {sidebar}>
		{#snippet children()}
			{#if data.dataUnavailable}
				<Alert class="mb-6 border-amber-300 bg-amber-50 text-amber-950">
					<AlertTitle>Live toolbox data is unavailable</AlertTitle>
					<AlertDescription>
						The page is showing a safe fallback because the local database connection failed. Check
						`DATABASE_URL`, start local services, and run `pnpm db:push` if the schema is missing.
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
						onclick={() => (activeSubsection = sub.id)}
					>
						{sub.label}
					</button>
				{/each}
			</div>
			<div class="mb-[22px] flex items-center justify-between border-b border-[var(--rule)] pb-4">
				<div class="font-sans text-[14px] text-[var(--muted-foreground)]">
					Showing <strong class="text-[var(--dark)]">{filteredTotal}</strong> resources
				</div>
				<select
					class="rounded border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-sm text-[var(--foreground)]"
					aria-label="Sort"
				>
					<option>A–Z</option>
					<option>Recently added</option>
				</select>
			</div>
			<div class="flex flex-col gap-3">
				{#each paginatedList as resource (resource.id)}
					<a
						href="/toolbox/{resource.slug ?? resource.id}"
						class="flex items-start gap-4 rounded-lg border border-[var(--rule)] bg-white p-4 text-inherit no-underline transition-shadow duration-150 hover:shadow-[var(--shh)]"
					>
						<div class="w-10 flex-none text-center text-3xl leading-none" aria-hidden="true">
							{iconFor(resource)}
						</div>
						<div style="flex: 1; min-width: 0;">
							<span class="mb-1 block font-serif text-base font-semibold text-[var(--dark)]"
								>{resource.title}</span
							>
							{#if resource.source}<div class="mb-1 text-sm text-[var(--muted-foreground)]">
									{resource.source}
								</div>{/if}
							{#if resource.description}<div
									class="mb-2 line-clamp-2 text-[13px] leading-[1.5] text-[var(--mid)]"
								>
									{stripHtml(String(resource.description))}
								</div>{/if}
							<div class="flex flex-wrap gap-1.5">
								{#if resource.mediaType}<span
										class="rounded bg-[var(--muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]"
										>{resource.mediaType}</span
									>{/if}
								{#if resource.category}<span
										class="rounded bg-[var(--muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]"
										>{resource.category}</span
									>{/if}
							</div>
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

	<div class="flex flex-wrap items-center justify-between gap-6 px-10 py-8">
		<div>
			<h3>Submit a resource</h3>
			<p>Add toolkits, reports, and policy documents for IFS staff review.</p>
		</div>
		<a
			href="/toolbox/submit"
			class="inline-block flex-none rounded px-6 py-3 font-sans text-sm font-semibold text-white no-underline"
			>Submit a resource</a
		>
	</div>
</div>
