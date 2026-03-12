<script lang="ts">
	import Input from '$lib/components/ui/input/input.svelte';
	import KbHero from '$lib/components/organisms/KbHero.svelte';
	import KbTwoColumnLayout from '$lib/components/organisms/KbTwoColumnLayout.svelte';
	import KbFilterSection from '$lib/components/organisms/KbFilterSection.svelte';
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
		activeSubsection ? baseFiltered.filter((e) => subsectionMatch(e, activeSubsection)) : baseFiltered
	);
	const filteredTotal = $derived(filtered.length);

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
		'Toolkit': '📦',
		'Report': '📄',
		'Policy Document': '📋',
		'Guide': '📖',
		'Case Study': '📌',
		'Other': '📎'
	};
	function iconFor(r: ToolboxItem) {
		return mediaTypeIcon[r.mediaType ?? ''] ?? '📎';
	}
	</script>

<div class="kb-library kb-coil kb-coil--toolbox">
	<KbHero
		heroClass="kb-hero--toolbox"
		eyebrow="Knowledge Basket · Coil 5"
		title="Toolbox"
		description="Toolkits, policy documents, and a digital library for building Indigenous economic futures."
	>
		<svelte:fragment slot="weave">
			<defs>
				<pattern id="wv-toolbox" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
					<rect x="0" y="0" width="10" height="4" fill="white" />
					<rect x="10" y="10" width="10" height="4" fill="white" />
					<rect x="0" y="6" width="4" height="8" fill="white" opacity=".5" />
				</pattern>
			</defs>
			<rect width="200" height="400" fill="url(#wv-toolbox)" />
		</svelte:fragment>
		<svelte:fragment slot="stats">
			<div class="kb-hstat"><strong>{total}</strong><span>Resources</span></div>
			<div class="kb-hstat"><strong>{mediaTypeValues.length}</strong><span>Media types</span></div>
		</svelte:fragment>
	</KbHero>

	<KbTwoColumnLayout>
		<svelte:fragment slot="sidebar">
			<div class="kb-search-wrap">
				<span class="kb-search-icon" aria-hidden="true">🔍</span>
				<Input
					type="search"
					placeholder="Search toolbox…"
					class="kb-search-input"
					bind:value={searchQuery}
				/>
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
			<button type="button" class="kb-clr" onclick={clearFilters}>Clear all filters</button>
		</svelte:fragment>

		<div class="kb-tbtabs" role="tablist">
				{#each TOOLBOX_SUBSECTIONS as sub}
					<button
						type="button"
						class="kb-tbtab"
						class:active={activeSubsection === sub.id}
						role="tab"
						aria-selected={activeSubsection === sub.id}
						onclick={() => (activeSubsection = sub.id)}
					>
						{sub.label}
					</button>
				{/each}
			</div>
			<div class="kb-toolbar">
				<div class="kb-rcount">Showing <strong>{filteredTotal}</strong> resources</div>
				<select class="kb-ssort" aria-label="Sort">
					<option>A–Z</option>
					<option>Recently added</option>
				</select>
			</div>
			<div class="kb-rlist">
				{#each filtered as resource (resource.id)}
					<a href="/toolbox/{resource.id}" class="kb-ritem">
						<div class="kb-rico" aria-hidden="true">{iconFor(resource)}</div>
						<div style="flex: 1; min-width: 0;">
							<span class="kb-rtit">{resource.title}</span>
							{#if resource.source}<div class="kb-rorg">{resource.source}</div>{/if}
							{#if resource.description}<div class="kb-rdesc">{stripHtml(String(resource.description))}</div>{/if}
							<div class="kb-rtags">
								{#if resource.mediaType}<span class="kb-tag kb-tag-tp">{resource.mediaType}</span>{/if}
								{#if resource.category}<span class="kb-tag kb-tag-ts">{resource.category}</span>{/if}
							</div>
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

	<div class="kb-subbanner kb-subbanner--toolbox">
		<div>
			<h3>Submit a resource</h3>
			<p>Add toolkits, reports, and policy documents for IFS staff review.</p>
		</div>
		<a href="/toolbox/submit" class="kb-subbtn kb-subbtn--toolbox">Submit a resource</a>
	</div>
</div>
