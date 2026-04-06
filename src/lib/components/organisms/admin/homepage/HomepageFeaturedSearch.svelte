<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { coilLabels, type CoilKey } from '$lib/data/kb';
	import { Search } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import {
		MIN_SEARCH_QUERY_LENGTH,
		SEARCH_DEBOUNCE_MS,
		fetchSearchResponse,
		searchGroupsWithResults
	} from '$lib/search/search-client';

	let {
		onadd,
		existingIds
	}: {
		onadd: (item: { coil: CoilKey; itemId: string; title: string }) => void;
		existingIds: string[];
	} = $props();

	let searchQuery = $state('');
	let searchResults = $state<{ coil: CoilKey; itemId: string; title: string; summary?: string }[]>(
		[]
	);
	let searchOpen = $state(false);
	let searchFocused = $state(false);
	let searching = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	function alreadyAdded(itemId: string) {
		return existingIds.includes(itemId);
	}

	async function runSearch(query: string) {
		if (query.trim().length < MIN_SEARCH_QUERY_LENGTH) {
			searchResults = [];
			searchOpen = false;
			return;
		}
		searching = true;
		try {
			const payload = await fetchSearchResponse(fetch, {
				q: query.trim(),
				surface: 'autocomplete',
				scope: 'all',
				limit: 5,
				sort: 'relevance'
			});
			searchResults = searchGroupsWithResults(payload.groups)
				.filter((group) => ['events', 'funding', 'jobs', 'redpages', 'toolbox'].includes(group.key))
				.flatMap((group) =>
					group.results.map((item) => ({
						coil: group.key as CoilKey,
						itemId: item.id,
						title: item.title,
						summary: item.summary
					}))
				);
			searchOpen = searchResults.length > 0;
		} catch {
			searchResults = [];
			searchOpen = false;
		} finally {
			searching = false;
		}
	}

	function onSearchInput(event: Event) {
		searchQuery = (event.currentTarget as HTMLInputElement).value;
		clearTimeout(timer);
		timer = setTimeout(() => void runSearch(searchQuery), SEARCH_DEBOUNCE_MS);
	}

	function handleAdd(result: { coil: CoilKey; itemId: string; title: string }) {
		if (alreadyAdded(result.itemId)) {
			toast.error('Already featured');
			return;
		}
		onadd(result);
		searchQuery = '';
		searchResults = [];
		searchOpen = false;
	}
</script>

<div class="space-y-2">
	<div class="relative">
		<Input
			value={searchQuery}
			oninput={onSearchInput}
			onfocus={() => (searchFocused = true)}
			onblur={() =>
				setTimeout(() => {
					searchFocused = false;
					searchOpen = false;
				}, 200)}
			placeholder="Search published content to feature..."
			class="h-9 pr-9 text-sm"
		/>
		<Search
			class="pointer-events-none absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 text-[var(--mid)]"
		/>
	</div>

	{#if searching}
		<p class="text-xs text-[var(--mid)]">Searching...</p>
	{/if}

	{#if searchFocused && searchOpen}
		<div class="space-y-1 rounded-xl border border-[color:var(--rule)] bg-white p-2 shadow-sm">
			{#each searchResults as result}
				<button
					type="button"
					class="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-[var(--color-alpine-snow-100)]/60"
					onclick={() => handleAdd(result)}
					disabled={alreadyAdded(result.itemId)}
				>
					<div class="min-w-0 flex-1">
						<span class="block truncate font-medium text-[var(--dark)]">{result.title}</span>
						<span class="text-xs text-[var(--mid)]">{coilLabels[result.coil]}</span>
						{#if result.summary}
							<span class="mt-0.5 block truncate text-xs text-[var(--mid)]">{result.summary}</span>
						{/if}
					</div>
					<span
						class="shrink-0 text-xs font-medium"
						class:text-[var(--color-lakebed-700)]={!alreadyAdded(result.itemId)}
						class:text-[var(--mid)]={alreadyAdded(result.itemId)}
					>
						{alreadyAdded(result.itemId) ? 'Added' : 'Add'}
					</span>
				</button>
			{/each}
		</div>
	{/if}
</div>
