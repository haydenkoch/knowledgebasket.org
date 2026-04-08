<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Search, Sparkles } from '@lucide/svelte';
	import type { SearchResponse } from '$lib/server/search-contracts';
	import * as CommandUi from '$lib/components/ui/command/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import SearchCommandResults from '$lib/components/organisms/search/SearchCommandResults.svelte';
	import {
		MIN_SEARCH_QUERY_LENGTH,
		SEARCH_DEBOUNCE_MS,
		fetchSearchResponse,
		searchGroupsWithResults
	} from '$lib/search/search-client';

	type QuickLink = {
		id: string;
		label: string;
		meta: string;
		href: string;
	};

	const quickLinks: QuickLink[] = [
		{ id: 'work-queue', label: 'Work Queue', meta: 'Moderation', href: '/admin' },
		{ id: 'users', label: 'Users', meta: 'Administration', href: '/admin/users' },
		{ id: 'source-review', label: 'Import Review', meta: 'Sources', href: '/admin/sources/review' },
		{ id: 'source-health', label: 'Source Health', meta: 'Sources', href: '/admin/sources/health' },
		{
			id: 'homepage-editor',
			label: 'Homepage Editor',
			meta: 'Settings',
			href: '/admin/settings/homepage'
		},
		{
			id: 'search-ops',
			label: 'Search Operations',
			meta: 'Settings',
			href: '/admin/settings/search'
		}
	];

	let open = $state(false);
	let query = $state('');
	let search = $state<SearchResponse | null>(null);
	let loading = $state(false);
	let errorMessage = $state('');
	let timer: ReturnType<typeof setTimeout> | undefined;
	let controller: AbortController | null = null;
	let inputEl = $state<HTMLInputElement | null>(null);
	let shortcutLabel = $state('Ctrl K');
	const groups = $derived(searchGroupsWithResults(search?.groups ?? []));
	const pathname = $derived($page.url.pathname);
	const currentScopeLabel = $derived.by(() => {
		if (pathname.startsWith('/admin/events')) return 'Events';
		if (pathname.startsWith('/admin/funding')) return 'Funding';
		if (pathname.startsWith('/admin/red-pages')) return 'Red Pages';
		if (pathname.startsWith('/admin/jobs')) return 'Jobs';
		if (pathname.startsWith('/admin/toolbox')) return 'Toolbox';
		if (pathname.startsWith('/admin/users')) return 'Users';
		if (pathname.startsWith('/admin/organizations')) return 'Organizations';
		if (pathname.startsWith('/admin/venues')) return 'Venues';
		if (pathname.startsWith('/admin/sources')) return 'Sources';
		return 'Admin';
	});

	$effect(() => {
		if (open) {
			setTimeout(() => inputEl?.focus(), 0);
		}
	});

	function resetState() {
		query = '';
		search = null;
		loading = false;
		errorMessage = '';
		controller?.abort();
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
					surface: 'admin',
					scope: 'all',
					limit: 6,
					sort: 'relevance'
				},
				controller
			);
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
		open = false;
		resetState();
		await goto(href);
	}

	onMount(() => {
		if (navigator.platform.toLowerCase().includes('mac')) {
			shortcutLabel = '⌘K';
		}

		const handleKeydown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
				event.preventDefault();
				open = !open;
				if (!open) resetState();
				return;
			}
			if (event.key === 'Escape') {
				open = false;
				resetState();
			}
		};
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});
</script>

<Button type="button" variant="secondary" size="sm" onclick={() => (open = true)}>
	<Search class="mr-2 h-4 w-4" />
	Quick find
	<span class="ml-3 hidden text-xs text-[var(--dark)] sm:inline">
		{shortcutLabel}
	</span>
</Button>

<Dialog.Root
	bind:open={
		() => open,
		(value) => {
			open = value;
			if (!value) resetState();
		}
	}
>
	<Dialog.Content
		class="max-w-4xl overflow-hidden border-[color:var(--rule)] bg-[var(--background)] p-0 shadow-[0_30px_90px_rgba(10,18,28,0.28)]"
	>
		<Dialog.Header class="sr-only">
			<Dialog.Title>Quick find</Dialog.Title>
			<Dialog.Description>
				Search content, organizations, venues, and sources across the admin workspace.
			</Dialog.Description>
		</Dialog.Header>

		<CommandUi.Root
			value={query}
			class="bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-alpine-snow-100)_76%,white)_0%,white_18%,white_100%)] text-[var(--dark)]"
		>
			<div
				class="flex items-center gap-3 border-b border-[color:var(--rule)] bg-white/90 px-4 py-2 backdrop-blur"
			>
				<div class="relative min-w-0 flex-1">
					<div
						class="pointer-events-none absolute top-1/2 left-3 z-10 hidden -translate-y-1/2 items-center gap-2 sm:flex"
					>
						<span
							class="inline-flex items-center gap-1 rounded-full border border-[color:var(--rule)] bg-[color-mix(in_srgb,var(--color-lakebed-950)_4%,white)] px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-[var(--dark)] uppercase"
						>
							<Sparkles class="h-3 w-3 text-[var(--color-lakebed-900)]" />
							{currentScopeLabel}
						</span>
					</div>
					<CommandUi.Input
						bind:ref={inputEl}
						bind:value={query}
						oninput={onInput}
						placeholder={`Searching in ${currentScopeLabel}`}
						class="min-w-0 flex-1 text-[15px] text-[var(--dark)] placeholder:text-[var(--mid)] sm:pl-[9.25rem]"
					/>
				</div>
				<span class="hidden font-sans text-xs text-[var(--dark)] sm:inline" aria-hidden="true">
					{shortcutLabel}
				</span>
			</div>

			<CommandUi.List class="max-h-[72vh] px-2 py-3">
				{#if query.trim().length < MIN_SEARCH_QUERY_LENGTH}
					<CommandUi.Group heading="Quick links">
						{#each quickLinks as link}
							<CommandUi.Item
								value={`${link.label} ${link.meta}`}
								onSelect={() => void navigate(link.href)}
								class="rounded-xl px-3 py-3 aria-selected:bg-[color-mix(in_srgb,var(--color-lakebed-950)_10%,white)] aria-selected:text-[var(--dark)]"
							>
								<div class="min-w-0">
									<div class="text-sm font-semibold text-[var(--dark)]">{link.label}</div>
									<div class="truncate text-xs text-[var(--mid)]">{link.meta}</div>
								</div>
							</CommandUi.Item>
						{/each}
					</CommandUi.Group>
				{:else if loading}
					<div class="px-4 py-6 text-sm text-[var(--mid)]">Searching…</div>
				{:else if errorMessage}
					<div class="px-4 py-6 text-sm text-[var(--color-ember-700)]">{errorMessage}</div>
				{:else}
					{#if search?.experience.degraded && search.experience.degradedLabel}
						<div
							class="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
						>
							{search.experience.degradedLabel}
						</div>
					{/if}
					<SearchCommandResults
						{groups}
						onNavigate={navigate}
						emptyLabel="No admin results yet."
						isAdmin
					/>
				{/if}
			</CommandUi.List>

			<div
				class="flex items-center gap-3 border-t border-[color:var(--rule)] px-4 py-2 text-[11px] text-[var(--mid)]/60"
			>
				<span><kbd class="font-sans">↑↓</kbd> navigate</span>
				<span><kbd class="font-sans">↵</kbd> open</span>
				<span><kbd class="font-sans">esc</kbd> close</span>
			</div>
		</CommandUi.Root>
	</Dialog.Content>
</Dialog.Root>
