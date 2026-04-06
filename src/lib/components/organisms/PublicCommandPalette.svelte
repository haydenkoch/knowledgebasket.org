<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import SearchIcon from '@lucide/svelte/icons/search';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import type { CoilKey } from '$lib/data/kb';
	import type { SearchResponse } from '$lib/server/search-contracts';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Drawer from '$lib/components/ui/drawer/index.js';
	import SearchBrowseMenu from '$lib/components/organisms/SearchBrowseMenu.svelte';
	import SearchCommandResults from '$lib/components/organisms/search/SearchCommandResults.svelte';
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import { SEARCH_SCOPE_LABELS } from '$lib/search/search-constants';
	import {
		MIN_SEARCH_QUERY_LENGTH,
		SEARCH_DEBOUNCE_MS,
		buildSearchHref,
		buildScopedSearchHref,
		fetchSearchResponse,
		searchGroupsWithResults
	} from '$lib/search/search-client';
	import { PUBLIC_POPULAR_SEARCHES } from '$lib/search/public-search-presets';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	type QuickLink = {
		id: string;
		label: string;
		meta: string;
		href: string;
	};

	const quickLinks: QuickLink[] = [
		{
			id: 'about',
			label: 'About Knowledge Basket',
			meta: 'Learn about the project',
			href: '/about'
		},
		{
			id: 'open-source',
			label: 'Open source thanks',
			meta: 'See the libraries and tools behind the site',
			href: '/open-source'
		},
		{ id: 'privacy', label: 'Privacy', meta: 'Privacy and data practices', href: '/privacy' },
		{ id: 'cookies', label: 'Cookies', meta: 'Cookie and storage choices', href: '/cookies' }
	];
	const scopeOptions = ['all', 'events', 'funding', 'redpages', 'jobs', 'toolbox'] as const;

	const isMobile = new IsMobile();
	let query = $state('');
	let search = $state<SearchResponse | null>(null);
	let loading = $state(false);
	let errorMessage = $state('');
	let timer: ReturnType<typeof setTimeout> | undefined;
	let controller: AbortController | null = null;
	let inputEl = $state<HTMLInputElement | null>(null);
	let shortcutLabel = $state('Ctrl K');
	let selectedScope = $state<(typeof scopeOptions)[number]>('all');
	const pathname = $derived($page.url.pathname);
	const groups = $derived(searchGroupsWithResults(search?.groups ?? []));
	const currentScope = $derived.by((): CoilKey | null => {
		if (pathname.startsWith('/events')) return 'events';
		if (pathname.startsWith('/funding')) return 'funding';
		if (pathname.startsWith('/red-pages')) return 'redpages';
		if (pathname.startsWith('/jobs')) return 'jobs';
		if (pathname.startsWith('/toolbox')) return 'toolbox';
		return null;
	});
	const currentScopeLabel = $derived(
		currentScope === 'redpages'
			? 'Red Pages'
			: currentScope === 'events'
				? 'Events'
				: currentScope === 'funding'
					? 'Funding'
					: currentScope === 'jobs'
						? 'Jobs'
						: currentScope === 'toolbox'
							? 'Toolbox'
							: null
	);
	const browseHeadline = $derived(
		currentScopeLabel ? `Continue in ${currentScopeLabel}` : 'Start with a coil'
	);
	const browseDescription = $derived(
		currentScopeLabel
			? `You're already in ${currentScopeLabel}. Stay here or jump to another part of the basket.`
			: 'Pick the area you want, then choose a quick path.'
	);
	const searchAllHref = $derived(buildSearchHref({ q: query, scope: selectedScope }));
	const inputBadgeLabel = $derived(SEARCH_SCOPE_LABELS[selectedScope]);
	const inputPrompt = $derived(
		selectedScope === 'all'
			? 'Search with natural language'
			: `Searching in ${SEARCH_SCOPE_LABELS[selectedScope]}`
	);

	$effect(() => {
		if (!open) return;
		setTimeout(() => inputEl?.focus(), 0);
	});

	function clearSearchState(keepQuery = false) {
		if (!keepQuery) query = '';
		search = null;
		loading = false;
		errorMessage = '';
		controller?.abort();
	}

	async function navigate(href: string) {
		open = false;
		clearSearchState();
		await goto(href);
	}

	async function runSearch(nextQuery: string) {
		const term = nextQuery.trim();
		if (term.length < MIN_SEARCH_QUERY_LENGTH) {
			controller?.abort();
			search = null;
			errorMessage = '';
			loading = false;
			return;
		}

		controller?.abort();
		controller = new AbortController();
		loading = true;
		errorMessage = '';

		try {
			search = await fetchSearchResponse(
				fetch,
				{
					q: term,
					surface: 'global',
					scope: selectedScope,
					limit: 10,
					sort: 'relevance'
				},
				controller
			);
			if (query.trim() !== term) return;
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

	function searchAll() {
		void navigate(searchAllHref);
	}

	function openWithQuery(nextQuery = '') {
		open = true;
		selectedScope = currentScope ?? 'all';
		query = nextQuery;
		if (nextQuery.trim().length >= MIN_SEARCH_QUERY_LENGTH) {
			search = null;
			errorMessage = '';
			clearTimeout(timer);
			timer = setTimeout(() => void runSearch(nextQuery), 0);
		} else {
			search = null;
			errorMessage = '';
		}
	}

	function setScope(scope: (typeof scopeOptions)[number]) {
		selectedScope = scope;
		if (query.trim().length >= MIN_SEARCH_QUERY_LENGTH) {
			clearTimeout(timer);
			timer = setTimeout(() => void runSearch(query), 0);
			return;
		}
		search = null;
		errorMessage = '';
	}

	onMount(() => {
		if (navigator.platform.toLowerCase().includes('mac')) {
			shortcutLabel = '⌘K';
		}

		const handleOpenSearch = (event: Event) => {
			const detail = (event as CustomEvent<{ query?: string }>).detail;
			openWithQuery(detail?.query ?? '');
		};

		const handleKeydown = (event: KeyboardEvent) => {
			if (isMobile.current) return;
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
				event.preventDefault();
				if (pathname === '/') {
					window.dispatchEvent(new CustomEvent('kb:focus-home-search'));
					return;
				}
				open = !open;
				if (!open) clearSearchState();
				return;
			}

			if (event.key === 'Escape' && open) {
				open = false;
				clearSearchState();
			}
		};

		window.addEventListener('kb:open-global-search', handleOpenSearch as EventListener);
		window.addEventListener('keydown', handleKeydown);
		return () => {
			window.removeEventListener('kb:open-global-search', handleOpenSearch as EventListener);
			window.removeEventListener('keydown', handleKeydown);
			controller?.abort();
			clearTimeout(timer);
		};
	});
</script>

{#snippet searchSurface()}
	<Command.Root
		value={query}
		class="bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-alpine-100,var(--bone))_76%,white)_0%,white_18%,white_100%)] text-[var(--dark)]"
	>
		<div
			class="flex items-center gap-3 border-b border-[color:var(--rule)] bg-white/90 px-4 py-2 backdrop-blur"
		>
			<div class="relative min-w-0 flex-1">
				{#if !isMobile.current}
					<div
						class="pointer-events-none absolute top-1/2 left-3 z-10 flex -translate-y-1/2 items-center gap-2"
					>
						<span
							class="inline-flex items-center gap-1 rounded-[0.3rem] border border-[color:var(--rule)] bg-[color-mix(in_srgb,var(--color-lakebed-950)_4%,white)] px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-[var(--dark)] uppercase"
						>
							<Sparkles class="h-3 w-3 text-[var(--color-lakebed-900)]" />
							{inputBadgeLabel}
						</span>
					</div>
				{/if}
				<Command.Input
					bind:ref={inputEl}
					bind:value={query}
					oninput={onInput}
					placeholder={inputPrompt}
					class="min-w-0 flex-1 pr-10 text-[15px] text-[var(--dark)] placeholder:text-[var(--mid)] {isMobile.current
						? ''
						: 'pl-[9.25rem]'}"
				/>
				<button
					type="button"
					class="absolute top-1/2 right-0 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[0.4rem] bg-[var(--color-lakebed-900)] text-white transition-colors hover:bg-[var(--color-lakebed-950)]"
					onclick={searchAll}
					aria-label="Submit search"
				>
					<ChevronRight class="h-4 w-4" />
				</button>
			</div>
			{#if !isMobile.current}
				<span
					class="ml-3 hidden font-sans text-xs text-[var(--mid)]/50 sm:inline"
					aria-hidden="true"
				>
					{shortcutLabel}
				</span>
			{/if}
		</div>

		<Command.List class="max-h-[72vh] px-2 py-3">
			{#if query.trim().length < MIN_SEARCH_QUERY_LENGTH}
				<SearchBrowseMenu
					{query}
					initialScope={selectedScope === 'all' ? (currentScope ?? 'events') : selectedScope}
					compact={isMobile.current}
					headline={browseHeadline}
					description={browseDescription}
					onNavigate={(href) => navigate(href)}
					onScopeChange={setScope}
				/>

				<Command.Group heading={isMobile.current ? 'Popular' : 'Popular Searches'}>
					{#each isMobile.current ? PUBLIC_POPULAR_SEARCHES.slice(0, 3) : PUBLIC_POPULAR_SEARCHES as term}
						<Command.Item
							value={term}
							onSelect={() => void navigate(buildScopedSearchHref(term, selectedScope))}
							class="rounded-[0.45rem] px-3 py-3 aria-selected:bg-[color-mix(in_srgb,var(--color-lakebed-950)_10%,white)] aria-selected:text-[var(--dark)]"
						>
							<SearchIcon class="h-4 w-4 text-[var(--mid)]" />
							<div class="min-w-0">
								<div class="text-sm font-semibold text-[var(--dark)]">{term}</div>
								<div class="truncate text-xs text-[var(--mid)]">
									Search {SEARCH_SCOPE_LABELS[selectedScope].toLowerCase()}
								</div>
							</div>
						</Command.Item>
					{/each}
				</Command.Group>

				<Command.Group heading={isMobile.current ? 'Pages' : 'Useful Pages'}>
					{#each isMobile.current ? quickLinks.slice(0, 2) : quickLinks as link}
						<Command.Item
							value={`${link.label} ${link.meta}`}
							onSelect={() => void navigate(link.href)}
							class="rounded-[0.45rem] px-3 py-3 aria-selected:bg-[color-mix(in_srgb,var(--color-lakebed-950)_10%,white)] aria-selected:text-[var(--dark)]"
						>
							<div class="min-w-0">
								<div class="text-sm font-semibold text-[var(--dark)]">{link.label}</div>
								<div class="truncate text-xs text-[var(--mid)]">{link.meta}</div>
							</div>
						</Command.Item>
					{/each}
				</Command.Group>
			{:else if loading}
				<div class="px-4 py-6 text-sm text-[var(--mid)]">Searching…</div>
			{:else if errorMessage}
				<div class="px-4 py-6 text-sm text-[var(--color-ember-700)]">{errorMessage}</div>
			{:else}
				{#if search?.experience.degraded && search.experience.degradedLabel}
					<div
						class="mb-3 rounded-[0.45rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
					>
						{search.experience.degradedLabel}
					</div>
				{/if}
				<SearchCommandResults
					{groups}
					onNavigate={navigate}
					{searchAllHref}
					searchAllLabel={`View all results for "${query.trim()}"`}
					emptyLabel="No quick matches yet."
				/>
			{/if}
		</Command.List>

		{#if !isMobile.current}
			<div
				class="flex items-center gap-3 border-t border-[color:var(--rule)] px-4 py-2 text-[11px] text-[var(--mid)]/60"
			>
				<span><kbd class="font-sans">↑↓</kbd> navigate</span>
				<span><kbd class="font-sans">↵</kbd> open</span>
				<span><kbd class="font-sans">esc</kbd> close</span>
			</div>
		{/if}
	</Command.Root>
{/snippet}

{#if isMobile.current}
	<Drawer.Root
		bind:open={
			() => open,
			(value) => {
				open = value;
				if (!value) clearSearchState();
			}
		}
	>
		<Drawer.Content
			class="max-h-[88vh] overflow-hidden border-[color:var(--rule)] bg-[var(--background)] p-0 shadow-[0_30px_90px_rgba(10,18,28,0.28)]"
		>
			<Drawer.Header class="sr-only">
				<Drawer.DrawerTitle>Search Knowledge Basket</Drawer.DrawerTitle>
				<Drawer.DrawerDescription>
					Search across events, funding, Red Pages, jobs, and toolbox resources.
				</Drawer.DrawerDescription>
			</Drawer.Header>
			{@render searchSurface()}
		</Drawer.Content>
	</Drawer.Root>
{:else}
	<Dialog.Root
		bind:open={
			() => open,
			(value) => {
				open = value;
				if (!value) clearSearchState();
			}
		}
	>
		<Dialog.Content
			class="max-w-[min(40rem,calc(100vw-2rem))] sm:max-w-[min(40rem,calc(100vw-2rem))] overflow-hidden rounded-[0.85rem] border-[color:var(--rule)] bg-[var(--background)] p-0 shadow-[0_30px_90px_rgba(10,18,28,0.28)]"
		>
			<Dialog.Header class="sr-only">
				<Dialog.Title>Search Knowledge Basket</Dialog.Title>
				<Dialog.Description>
					Search across events, funding, Red Pages, jobs, and toolbox resources.
				</Dialog.Description>
			</Dialog.Header>
			{@render searchSurface()}
		</Dialog.Content>
	</Dialog.Root>
{/if}
