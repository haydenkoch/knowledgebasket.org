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
			redpages.filter((e) =>
				matchSearch(e, searchQuery, ['tribalAffiliation', 'serviceType', 'region'])
			),
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
	<div class="font-sans text-white">
		<strong class="block text-[28px] leading-none font-bold">{total}</strong><span
			class="text-xs opacity-70">Listings</span
		>
	</div>
	<div class="font-sans text-white">
		<strong class="block text-[28px] leading-none font-bold">{serviceTypeValues.length}</strong
		><span class="text-xs opacity-70">Service Types</span>
	</div>
{/snippet}
{#snippet sidebar()}
	<div class="relative mb-7">
		<span
			class="absolute top-1/2 left-3 flex -translate-y-1/2 items-center justify-center text-[14px] text-[var(--muted-foreground)]"
			aria-hidden="true">🔍</span
		>
		<Input
			type="search"
			placeholder="Search Red Pages…"
			class="pl-[38px]"
			bind:value={searchQuery}
		/>
	</div>
	<KbFilterSection
		title="Service Type"
		options={serviceTypeValues.map((t) => ({
			value: t,
			label: t,
			count: serviceTypeCounts[t] ?? 0
		}))}
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
	<button
		type="button"
		class="mt-2 cursor-pointer border-none bg-transparent p-0 font-sans text-xs text-[var(--teal)] underline"
		onclick={clearFilters}>Clear all filters</button
	>
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
			class="border-b border-[var(--rule)] bg-[var(--color-alpine-100,var(--bone))] px-10 pt-5 pb-3"
			aria-label="Featured vendors"
		>
			<div
				class="mb-[10px] font-sans text-[11px] font-bold tracking-[0.12em] text-[var(--color-elderberry-950,var(--red))] uppercase"
			>
				Featured vendors
			</div>
			<div class="flex flex-wrap gap-3">
				{#each featured as v (v.id)}
					{@const tags = serviceTags(v.serviceType).slice(0, 2)}
					<a
						href="/red-pages/{v.slug ?? v.id}"
						class="flex items-start gap-4 rounded-lg border-2 border-[var(--color-salmonberry-100,var(--red-lt))] bg-white p-4 px-[18px] text-inherit no-underline shadow-[var(--sh)] transition-[box-shadow,border-color,transform] duration-150 hover:translate-x-[3px] hover:border-[var(--color-salmonberry-900,var(--red))] hover:shadow-[var(--shh)]"
					>
						<div
							class="flex h-16 w-16 flex-none items-center justify-center rounded-full bg-[var(--red)] font-sans text-[22px] font-bold text-white"
						>
							{initials(v.title)}
						</div>
						<div class="flex min-w-0 flex-1 flex-col gap-1">
							<span
								class="mb-1 inline-flex items-center gap-1 rounded-full bg-[var(--color-salmonberry-900,var(--red))] px-2 py-0.5 font-sans text-[11px] font-bold tracking-[0.08em] text-white uppercase"
								>★ Featured</span
							>
							<div class="mb-1 font-serif text-base font-semibold text-[var(--dark)]">
								{v.title}
							</div>
							{#if v.tribalAffiliation}
								<div class="mb-1 text-sm text-[var(--muted-foreground)]">{v.tribalAffiliation}</div>
							{/if}
							{#if tags.length || v.region}
								<div class="my-1.5 flex flex-wrap gap-1.5">
									{#if tags.length}
										<span
											class="rounded bg-[var(--muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]"
											>{tags.join(', ')}</span
										>
									{/if}
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
						The page is showing a safe fallback because the local database connection failed. Check
						`DATABASE_URL`, start local services, and run `pnpm db:push` if the schema is missing.
					</AlertDescription>
				</Alert>
			{/if}
			<div class="mb-[22px] flex items-center justify-between border-b border-[var(--rule)] pb-4">
				<div class="font-sans text-[14px] text-[var(--muted-foreground)]">
					Showing <strong class="text-[var(--dark)]">{filteredTotal}</strong> listings
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
				{#each paginatedList as vendor (vendor.id)}
					<a
						href="/red-pages/{vendor.slug ?? vendor.id}"
						class="flex items-start gap-4 rounded-lg border border-[var(--rule)] bg-white p-4 px-[18px] text-inherit no-underline shadow-[var(--sh)] transition-[box-shadow,transform] duration-150 hover:translate-x-[3px] hover:shadow-[var(--shh)]"
					>
						<div
							class="flex h-16 w-16 flex-none items-center justify-center rounded-full bg-[var(--red)] font-sans text-[22px] font-bold text-white"
						>
							{initials(vendor.title)}
						</div>
						<div class="flex min-w-0 flex-1 flex-col gap-1">
							<div class="font-serif text-base font-semibold text-[var(--dark)]">
								{vendor.title}
							</div>
							{#if vendor.tribalAffiliation}<div
									class="mb-1 text-sm text-[var(--muted-foreground)]"
								>
									{vendor.tribalAffiliation}
								</div>{/if}
							<div class="flex flex-wrap gap-1.5">
								<span
									class="rounded bg-[var(--muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]"
									>Native-owned</span
								>
								{#if vendor.region}<span
										class="rounded bg-[var(--muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]"
										>{vendor.region}</span
									>{/if}
								{#each serviceTags(vendor.serviceType) as tag}
									<span
										class="rounded bg-[var(--muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]"
										>{tag}</span
									>
								{/each}
							</div>
							{#if vendor.region || vendor.serviceType}
								<div
									class="mb-[6px] flex items-center gap-1 font-sans text-xs text-[var(--muted-foreground)]"
								>
									{vendor.region}{#if vendor.region && vendor.serviceType}
										·
									{/if}{vendor.serviceType}
								</div>
							{/if}
							{#if vendor.description}<div
									class="mb-[14px] line-clamp-3 min-h-0 flex-auto text-[13px] leading-[1.5] text-[var(--mid)]"
								>
									{stripHtml(String(vendor.description))}
								</div>{/if}
							<span
								class="mt-auto block flex-none rounded-[var(--radius)] bg-[var(--teal)] py-[9px] text-center font-sans text-[13px] font-bold tracking-[0.03em] text-white no-underline transition-[filter] duration-150 hover:brightness-110"
								>View Profile</span
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

	<div class="flex flex-wrap items-center justify-between gap-6 px-10 py-8">
		<div>
			<h3>Add your business</h3>
			<p>Submit your Native-owned business or service for IFS staff review.</p>
		</div>
		<a
			href="/red-pages/submit"
			class="inline-block flex-none rounded px-6 py-3 font-sans text-sm font-semibold text-white no-underline"
			>Add your business</a
		>
	</div>
</div>
