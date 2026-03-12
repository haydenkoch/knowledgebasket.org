<script lang="ts">
	import Input from '$lib/components/ui/input/input.svelte';
	import KbHero from '$lib/components/KbHero.svelte';
	import KbTwoColumnLayout from '$lib/components/KbTwoColumnLayout.svelte';
	import KbFilterSection from '$lib/components/KbFilterSection.svelte';
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
			redpages.filter((e) => matchSearch(e, searchQuery, ['tribe', 'serviceType', 'region'])),
			{
				serviceType: serviceTypeFilter,
				region: regionFilter
			}
		)
	);
	const filteredTotal = $derived(filtered.length);

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

<div class="kb-coil kb-coil--redpages">
	<KbHero
		heroClass="kb-hero--redpages"
		eyebrow="Knowledge Basket · Coil 3"
		title="Red Pages"
		description="Native-owned vendors, artists, and service providers you can hire, collaborate with, and support."
	>
		<svelte:fragment slot="weave">
			<defs>
				<pattern id="wv-redpages" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
					<polygon points="8,0 16,8 8,16 0,8" fill="none" stroke="white" stroke-width="0.8" />
					<polygon points="8,4 12,8 8,12 4,8" fill="white" opacity="0.3" />
				</pattern>
			</defs>
			<rect width="200" height="400" fill="url(#wv-redpages)" />
		</svelte:fragment>
		<svelte:fragment slot="stats">
			<div class="kb-hstat"><strong>{total}</strong><span>Listings</span></div>
			<div class="kb-hstat"><strong>{serviceTypeValues.length}</strong><span>Service Types</span></div>
		</svelte:fragment>
	</KbHero>

	{#if featured.length > 0}
		<section class="kb-fstrip" aria-label="Featured vendors">
			<div class="kb-fslbl">Featured vendors</div>
			<div class="kb-fscroll">
				{#each featured as v (v.id)}
					{@const tags = serviceTags(v.serviceType).slice(0, 2)}
					<a href="/red-pages/{v.id}" class="kb-vcard kb-vcard--featured">
						<div class="kb-vcard-logo">{initials(v.title)}</div>
						<div class="kb-vcard-body">
							<span class="kb-fbadge">Featured</span>
							<div class="kb-vcard-title">{v.title}</div>
							{#if v.tribe}
								<div class="kb-taff">{v.tribe}</div>
							{/if}
							{#if tags.length || v.region}
								<div class="kb-vcard-tags">
									{#if tags.length}
										<span class="kb-tag kb-tag-ts">{tags.join(', ')}</span>
									{/if}
									{#if v.region}
										<span class="kb-tag kb-tag-tp">{v.region}</span>
									{/if}
								</div>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<KbTwoColumnLayout>
		<svelte:fragment slot="sidebar">
			<div class="kb-search-wrap">
				<span class="kb-search-icon" aria-hidden="true">🔍</span>
				<Input
					type="search"
					placeholder="Search Red Pages…"
					class="kb-search-input"
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
			<button type="button" class="kb-clr" onclick={clearFilters}>Clear all filters</button>
		</svelte:fragment>

		<div class="kb-toolbar">
				<div class="kb-rcount">Showing <strong>{filteredTotal}</strong> listings</div>
				<select class="kb-ssort" aria-label="Sort">
					<option>A–Z</option>
					<option>Recently added</option>
				</select>
			</div>
			<div class="kb-vlist">
				{#each filtered as vendor (vendor.id)}
					<a href="/red-pages/{vendor.id}" class="kb-vcard">
						<div class="kb-vcard-logo">{initials(vendor.title)}</div>
						<div class="kb-vcard-body">
							<div class="kb-vcard-title">{vendor.title}</div>
							{#if vendor.tribe}<div class="kb-taff">{vendor.tribe}</div>{/if}
							<div class="kb-vcard-tags">
								<span class="kb-tag kb-tag-ts">Native-owned</span>
								{#if vendor.region}<span class="kb-tag kb-tag-tp">{vendor.region}</span>{/if}
								{#each serviceTags(vendor.serviceType) as tag}
									<span class="kb-tag kb-tag-tp">{tag}</span>
								{/each}
							</div>
							{#if vendor.region || vendor.serviceType}
								<div class="kb-cmeta">{vendor.region}{#if vendor.region && vendor.serviceType} · {/if}{vendor.serviceType}</div>
							{/if}
							{#if vendor.description}<div class="kb-cdesc">{stripHtml(String(vendor.description))}</div>{/if}
							<span class="kb-ccta">View Profile</span>
						</div>
					</a>
				{/each}
			</div>
			{#if filteredTotal > 6}
				<nav class="kb-pagi" aria-label="Pagination">
					<button type="button" class="kb-pbtn active">1</button>
					<button type="button" class="kb-pbtn">2</button>
				</nav>
			{/if}
	</KbTwoColumnLayout>

	<div class="kb-subbanner kb-subbanner--redpages">
		<div>
			<h3>Add your business</h3>
			<p>Submit your Native-owned business or service for IFS staff review.</p>
		</div>
		<a href="/red-pages/submit" class="kb-subbtn kb-subbtn--redpages">Add your business</a>
	</div>
</div>
