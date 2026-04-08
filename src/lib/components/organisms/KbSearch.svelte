<script lang="ts">
	import { trackSearchPerformed } from '$lib/insights/events';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import SearchIcon from '@lucide/svelte/icons/search';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import X from '@lucide/svelte/icons/x';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import * as Command from '$lib/components/ui/command/index.js';
	import { Command as CommandPrimitive } from 'bits-ui';
	import SearchBrowseMenu from '$lib/components/organisms/SearchBrowseMenu.svelte';
	import SearchCommandResults from '$lib/components/organisms/search/SearchCommandResults.svelte';
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import { SEARCH_SCOPE_LABELS } from '$lib/search/search-constants';
	import type { SearchResponse } from '$lib/server/search-contracts';
	import {
		MIN_SEARCH_QUERY_LENGTH,
		SEARCH_DEBOUNCE_MS,
		buildSearchHref,
		buildScopedSearchHref,
		fetchSearchResponse,
		searchGroupsWithResults
	} from '$lib/search/search-client';
	import { PUBLIC_POPULAR_SEARCHES } from '$lib/search/public-search-presets';

	let {
		variant = 'default',
		placeholder = 'Search events, funding, businesses, jobs…'
	}: {
		variant?: 'default' | 'light';
		placeholder?: string;
	} = $props();

	const scopeOptions = ['all', 'events', 'funding', 'redpages', 'jobs', 'toolbox'] as const;
	const resultsListId = 'kb-home-search-results';

	let query = $state('');
	let focused = $state(false);
	let loading = $state(false);
	let errorMessage = $state('');
	let search = $state<SearchResponse | null>(null);
	let timer: ReturnType<typeof setTimeout> | undefined;
	let controller: AbortController | null = null;
	let inputEl = $state<HTMLInputElement | null>(null);
	let rootEl = $state<HTMLDivElement | null>(null);
	let shortcutLabel = $state('Ctrl K');
	let selectedScope = $state<(typeof scopeOptions)[number]>('all');
	let lastTrackedSearchSignature = $state('');
	const isMobile = new IsMobile();

	const badgeLabel = $derived(SEARCH_SCOPE_LABELS[selectedScope]);
	const groups = $derived(searchGroupsWithResults(search?.groups ?? []));
	const hasQuery = $derived(query.trim().length >= MIN_SEARCH_QUERY_LENGTH);
	const hasResults = $derived(groups.length > 0 && hasQuery);
	const searchAllHref = $derived(buildSearchHref({ q: query, scope: selectedScope }));
	const showSuggestions = $derived(focused && !hasQuery && !loading && !errorMessage);
	const showResults = $derived(focused && hasQuery && hasResults && !loading && !errorMessage);
	const showEmpty = $derived(focused && hasQuery && !hasResults && !loading && !errorMessage);
	const showPanel = $derived(
		showSuggestions || showResults || showEmpty || (focused && (loading || !!errorMessage))
	);

	function resetResults() {
		search = null;
		errorMessage = '';
		lastTrackedSearchSignature = '';
	}

	async function runSearch(nextQuery: string) {
		const term = nextQuery.trim();
		if (term.length < MIN_SEARCH_QUERY_LENGTH) {
			controller?.abort();
			loading = false;
			resetResults();
			return;
		}

		controller?.abort();
		controller = new AbortController();
		loading = true;
		errorMessage = '';

		try {
			const payload = await fetchSearchResponse(
				fetch,
				{
					q: term,
					surface: 'autocomplete',
					scope: selectedScope,
					limit: 6,
					sort: 'relevance'
				},
				controller
			);
			search = payload;
			const signature = [
				term,
				selectedScope,
				payload.pagination.total,
				payload.resultSource,
				payload.experience.degraded ? '1' : '0'
			].join('|');
			if (lastTrackedSearchSignature !== signature) {
				lastTrackedSearchSignature = signature;
				trackSearchPerformed({
					surface: 'autocomplete',
					query: term,
					scope: selectedScope,
					resultCount: payload.pagination.total,
					resultSource: payload.resultSource,
					isDegraded: payload.experience.degraded
				});
			}
		} catch (error) {
			if ((error as Error).name === 'AbortError') return;
			search = null;
			errorMessage = 'Search is temporarily unavailable.';
		} finally {
			loading = false;
		}
	}

	function onInput(event: Event) {
		query = (event.currentTarget as HTMLInputElement).value;
		clearTimeout(timer);
		timer = setTimeout(() => void runSearch(query), SEARCH_DEBOUNCE_MS);
	}

	async function navigate(href: string) {
		focused = false;
		await goto(href);
	}

	function onBlur(event: FocusEvent) {
		const related = event.relatedTarget as Node | null;
		if (related && rootEl?.contains(related)) return;
		focused = false;
	}

	function onFocus() {
		focused = true;
	}

	function clearScope() {
		setScope('all');
		inputEl?.focus();
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && focused) {
			event.preventDefault();
			focused = false;
			inputEl?.blur();
		}
		if (event.key === 'Backspace' && query === '' && selectedScope !== 'all') {
			event.preventDefault();
			clearScope();
		}
	}

	function setScope(scope: (typeof scopeOptions)[number]) {
		selectedScope = scope;
		focused = true;
		if (query.trim().length >= MIN_SEARCH_QUERY_LENGTH) {
			clearTimeout(timer);
			timer = setTimeout(() => void runSearch(query), 0);
			return;
		}
		resetResults();
	}

	onMount(() => {
		if (navigator.platform.toLowerCase().includes('mac')) {
			shortcutLabel = '⌘K';
		}

		const handleFocusSearch = () => {
			inputEl?.focus();
		};

		window.addEventListener('kb:focus-home-search', handleFocusSearch);

		return () => {
			window.removeEventListener('kb:focus-home-search', handleFocusSearch);
			controller?.abort();
			clearTimeout(timer);
		};
	});
</script>

<div class="relative" bind:this={rootEl}>
	<Command.Root shouldFilter={false} class="overflow-visible bg-transparent">
		<div class="relative min-w-0">
			<SearchIcon
				class="pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground"
				aria-hidden="true"
			/>
			<div
				class="absolute top-1/2 left-10 z-10 hidden -translate-y-1/2 items-center gap-1.5 md:flex"
			>
				<button
					type="button"
					class="inline-flex cursor-pointer items-center gap-1 rounded-[0.3rem] border border-[color:var(--rule)] bg-[color-mix(in_srgb,var(--color-lakebed-950)_4%,white)] px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-[var(--dark)] uppercase transition-colors hover:bg-[color-mix(in_srgb,var(--color-lakebed-950)_8%,white)]"
					onclick={() => {
						focused = true;
						inputEl?.focus();
					}}
					onmousedown={(e) => e.preventDefault()}
					tabindex={-1}
				>
					<Sparkles class="h-3 w-3 text-[var(--color-lakebed-900)]" />
					{badgeLabel}
				</button>
				{#if selectedScope !== 'all'}
					<button
						type="button"
						class="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-[color:var(--rule)] bg-[color-mix(in_srgb,var(--color-lakebed-950)_4%,white)] text-[var(--mid)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-lakebed-950)_12%,white)] hover:text-[var(--dark)]"
						aria-label="Clear scope filter"
						onclick={clearScope}
						onmousedown={(e) => e.preventDefault()}
						tabindex={-1}
					>
						<X class="h-3 w-3" />
					</button>
				{/if}
			</div>
			<CommandPrimitive.Input bind:ref={inputEl} bind:value={query} {placeholder}>
				{#snippet child({ props })}
					<input
						{...props}
						oninput={onInput}
						onfocus={onFocus}
						onblur={onBlur}
						onkeydown={onKeydown}
						aria-controls={resultsListId}
						aria-expanded={showPanel}
						class="w-full rounded-[0.5rem] border border-input bg-background py-3 pr-26 pl-10 text-sm shadow-[0_18px_45px_rgba(15,23,42,0.12)] focus:ring-2 focus:ring-ring focus:outline-none sm:pr-32 md:pl-[10.5rem] {variant ===
						'light'
							? 'bg-white/90'
							: ''}"
						autocomplete="off"
					/>
				{/snippet}
			</CommandPrimitive.Input>
			<span
				class="pointer-events-none absolute top-1/2 right-12 hidden -translate-y-1/2 font-sans text-xs text-[var(--mid)]/80 md:inline"
				aria-hidden="true"
			>
				{shortcutLabel}
			</span>
			<button
				type="button"
				class="absolute top-1/2 right-2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[0.4rem] bg-[var(--color-lakebed-900)] text-white shadow-[0_8px_18px_rgba(15,23,42,0.16)] transition-colors hover:bg-[var(--color-lakebed-950)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-flicker-400)]"
				aria-label="Submit search"
				onclick={() => void navigate(searchAllHref)}
			>
				<ChevronRight class="h-4 w-4" />
			</button>
		</div>

		{#if showPanel}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="absolute top-full right-0 left-0 z-50 mt-1.5 overflow-hidden rounded-[0.65rem] border border-[color:var(--rule)] bg-white text-[var(--dark)] shadow-[0_24px_70px_rgba(15,23,42,0.18)]"
				onmousedown={(e) => e.preventDefault()}
			>
				<Command.List id={resultsListId} class="max-h-[min(480px,60vh)]">
					{#if loading}
						<div class="flex items-center gap-2 px-4 py-4 text-sm text-[var(--mid)]">
							<LoaderCircle class="h-4 w-4 animate-spin" />
							Searching…
						</div>
					{:else if errorMessage}
						<div class="px-4 py-4 text-sm text-[var(--mid)]">{errorMessage}</div>
					{:else if showSuggestions}
						<SearchBrowseMenu
							{query}
							initialScope={selectedScope === 'all' ? 'events' : selectedScope}
							compact={isMobile.current}
							onNavigate={navigate}
							onScopeChange={setScope}
						/>

						<div
							class="border-t border-[color:var(--rule)] px-2 pt-1.5 pb-1 text-[9px] font-semibold tracking-[0.1em] text-[var(--mid)]/70 uppercase"
						>
							Trending
						</div>
						<Command.Group class="px-1 pb-1">
							{#each PUBLIC_POPULAR_SEARCHES.slice(0, 4) as term}
								<Command.Item
									value={`popular ${term}`}
									onSelect={() => void navigate(buildScopedSearchHref(term, selectedScope))}
									class="rounded-[0.4rem] px-2 py-1.5 aria-selected:bg-[color-mix(in_srgb,var(--color-lakebed-950)_8%,white)] aria-selected:text-[var(--dark)]"
								>
									<SearchIcon class="h-3.5 w-3.5 shrink-0 text-[var(--mid)]" />
									<span class="text-[13px] text-[var(--dark)]">{term}</span>
								</Command.Item>
							{/each}
						</Command.Group>
					{:else if showEmpty}
						<div class="px-4 py-4 text-sm text-[var(--mid)]">
							No quick matches yet. Press Enter to open the full search page.
						</div>
					{:else if showResults}
						<div class="px-2 py-2">
							<SearchCommandResults
								{groups}
								onNavigate={navigate}
								{searchAllHref}
								searchAllLabel={`View all results for "${query.trim()}"`}
								emptyLabel="No quick matches yet."
								surface="autocomplete"
								{query}
								{selectedScope}
							/>
						</div>
					{/if}
				</Command.List>

				{#if !isMobile.current && (showResults || showSuggestions)}
					<div
						class="flex items-center gap-3 border-t border-[color:var(--rule)] px-4 py-2 text-[11px] text-[var(--mid)]/60"
					>
						<span><kbd class="font-sans">↑↓</kbd> navigate</span>
						<span><kbd class="font-sans">↵</kbd> open</span>
						{#if selectedScope !== 'all'}
							<span><kbd class="font-sans">⌫</kbd> clear scope</span>
						{/if}
						<span><kbd class="font-sans">esc</kbd> close</span>
					</div>
				{/if}
			</div>
		{/if}
	</Command.Root>
</div>
