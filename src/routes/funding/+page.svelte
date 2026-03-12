<script lang="ts">
	import Input from '$lib/components/ui/input/input.svelte';
	import KbHero from '$lib/components/KbHero.svelte';
	import KbTwoColumnLayout from '$lib/components/KbTwoColumnLayout.svelte';
	import KbFilterSection from '$lib/components/KbFilterSection.svelte';
	import type { FundingItem } from '$lib/data/kb';
	import { getPlaceholderImage } from '$lib/data/placeholders';
	import { stripHtml, matchSearch, filterByFacets, facetCounts } from '$lib/utils/format';

	let { data } = $props();
	const funding = $derived(data.funding ?? []) as FundingItem[];
	const total = $derived(funding.length);

	let searchQuery = $state('');
	let typeFilter = $state<string[]>([]);
	let statusFilter = $state<string[]>([]);
	let focusFilter = $state<string[]>([]);

	const typeCounts = $derived(facetCounts(funding, 'fundingType'));
	const statusCounts = $derived(facetCounts(funding, 'status'));
	const focusCounts = $derived(facetCounts(funding, 'focus'));
	const typeValues = $derived(Object.keys(typeCounts).sort());
	const statusValues = $derived(Object.keys(statusCounts).sort());
	const focusValues = $derived(Object.keys(focusCounts).sort());

	const filtered = $derived(
		filterByFacets(
			funding.filter((e) => matchSearch(e, searchQuery, ['funder', 'amount'])),
			{
				fundingType: typeFilter,
				status: statusFilter,
				focus: focusFilter
			}
		)
	);
	const filteredTotal = $derived(filtered.length);
	const openCount = $derived(funding.filter((f) => f.status === 'Open' || f.status === 'Rolling / Ongoing').length);
	const rollingCount = $derived(funding.filter((f) => f.status === 'Rolling / Ongoing').length);

	function toggle(arr: string[], val: string) {
		return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
	}
	function clearFilters() {
		searchQuery = '';
		typeFilter = [];
		statusFilter = [];
		focusFilter = [];
	}
	</script>

<div class="kb-coil kb-coil--funding">
	<KbHero
		heroClass="kb-hero--funding"
		eyebrow="Knowledge Basket · Coil 2"
		title="Funding"
		description="Grants, contracts, and funding opportunities for Tribes, Native-led nonprofits, and Indigenous individuals."
	>
		<svelte:fragment slot="weave">
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
		</svelte:fragment>
		<svelte:fragment slot="stats">
			<div class="kb-hstat"><strong>{total}</strong><span>Total</span></div>
			<div class="kb-hstat"><strong>{openCount}</strong><span>Open</span></div>
		</svelte:fragment>
	</KbHero>

	<div class="kb-sbar">
		<div class="kb-spill"><span class="kb-dot green"></span> {openCount} Open</div>
		<div class="kb-spill"><span class="kb-dot gold"></span> {rollingCount} Rolling</div>
		<div class="kb-sbar-updated">Updated regularly</div>
	</div>

	<KbTwoColumnLayout>
		<svelte:fragment slot="sidebar">
			<div class="kb-search-wrap">
				<span class="kb-search-icon" aria-hidden="true">🔍</span>
				<Input
					type="search"
					placeholder="Search funding…"
					class="kb-search-input"
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
			<KbFilterSection
				title="Focus"
				options={focusValues.map((f) => ({ value: f, label: f, count: focusCounts[f] ?? 0 }))}
				selected={focusFilter}
				onToggle={(val) => (focusFilter = toggle(focusFilter, val))}
				emptyLabel="No focus areas"
			/>
			<button type="button" class="kb-clr" onclick={clearFilters}>Clear all filters</button>
		</svelte:fragment>

		<div class="kb-toolbar">
				<div class="kb-rcount">Showing <strong>{filteredTotal}</strong> opportunities</div>
				<select class="kb-ssort" aria-label="Sort">
					<option>Soonest deadline</option>
					<option>Recently added</option>
				</select>
			</div>
			<div class="kb-grid">
				{#each filtered as item, i (item.id)}
					<a href="/funding/{item.id}" class="kb-card">
						<div class="kb-cimg kb-cimg--funding">
							<img src={getPlaceholderImage(i)} alt="" class="kb-cimg-photo" />
							{#if item.status || item.fundingType}
								<span class="kb-cimg-lbl">{[item.status, item.fundingType].filter(Boolean).join(' · ')}</span>
							{/if}
						</div>
						<div class="kb-cbody">
							<div class="kb-ctags">
								{#if item.status}<span class="kb-tag kb-tag-tp">{item.status}</span>{/if}
								{#if item.fundingType}<span class="kb-tag kb-tag-ts">{item.fundingType}</span>{/if}
								{#if item.focus}<span class="kb-tag kb-tag-ts">{item.focus}</span>{/if}
							</div>
							<div class="kb-ctit">{item.title}</div>
							{#if item.amount}
								<div class="kb-cmeta kb-cmeta--amount">{item.amount}</div>
							{/if}
							{#if item.funder}<div class="kb-cmeta">🏛 {item.funder}</div>{/if}
							{#if item.description}<div class="kb-cdesc">{stripHtml(String(item.description))}</div>{/if}
							<span class="kb-ccta">View Opportunity</span>
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

	<div class="kb-subbanner" style="background: var(--gold-lt); border-top-color: var(--gold)">
		<div>
			<h3 style="color: var(--gold)">Know of a funding opportunity?</h3>
			<p>Submit grants, loans, fellowships, and contracts for IFS staff review.</p>
		</div>
		<a href="/funding/submit" class="kb-subbtn" style="background: var(--gold)">Submit Funding Opportunity</a>
	</div>
</div>
