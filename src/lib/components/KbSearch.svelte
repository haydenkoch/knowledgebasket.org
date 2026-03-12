<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import { coilLabels, getCoilPath, type CoilKey, type BaseItem } from '$lib/data/kb';
	import { Search } from '@lucide/svelte';

	type SearchResults = Partial<Record<CoilKey, BaseItem[]>>;

	/** 'light' = white box for hero/home (mockup style); 'dark' = pill for header */
	let { variant = 'light' }: { variant?: 'light' | 'dark' } = $props();

	let query = $state('');
	let results = $state<SearchResults | null>(null);
	let open = $state(false);
	let containerEl: HTMLDivElement | undefined;

	const DEBOUNCE_MS = 180;
	let debounceId: ReturnType<typeof setTimeout> | null = null;

	async function runSearch() {
		if (debounceId) clearTimeout(debounceId);
		debounceId = setTimeout(async () => {
			debounceId = null;
			const q = query.trim();
			if (q.length < 2) {
				results = null;
				open = false;
				return;
			}
			try {
				const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
				const data = await res.json();
				results = data.results ?? null;
			} catch {
				results = null;
			}
			open = true;
		}, DEBOUNCE_MS);
	}

	function onInput() {
		runSearch();
	}

	function goToItem(coil: CoilKey, slug: string) {
		const path = getCoilPath(coil);
		open = false;
		query = '';
		results = null;
		goto(`/${path}/${slug}`);
	}

	function handleClickOutside(e: MouseEvent) {
		if (containerEl && !containerEl.contains(e.target as Node)) open = false;
	}

	onMount(() => {
		if (browser) document.addEventListener('click', handleClickOutside);
	});
	onDestroy(() => {
		if (browser) document.removeEventListener('click', handleClickOutside);
		if (debounceId) clearTimeout(debounceId);
	});

	const totalCount = $derived(
		results ? Object.values(results).reduce((sum, arr) => sum + (arr?.length ?? 0), 0) : 0
	);
</script>

<div class="kb-search-container kb-search-container--{variant}" bind:this={containerEl}>
	<div class="kb-search-input-wrap">
		<div class="kb-search-icon">
			<Search class="size-4" aria-hidden="true" />
		</div>
		<input
			type="search"
			autocomplete="off"
			role="combobox"
			aria-expanded={open && totalCount > 0}
			aria-haspopup="listbox"
			aria-controls="kb-search-results"
			bind:value={query}
			oninput={onInput}
			onfocus={() => query.length >= 2 && (open = true)}
			placeholder="Search events, funding, Red Pages, jobs, and tools…"
			class="kb-search-input"
		/>
	</div>

	{#if open && (results || query.trim().length >= 2)}
		<div
			id="kb-search-results"
			role="listbox"
			class="kb-search-dropdown absolute left-0 right-0 top-full z-50 mt-2 max-h-[min(70vh,420px)] overflow-auto rounded-xl border border-[var(--color-kb-slate-light)] bg-white shadow-xl"
		>
			{#if results && Object.keys(results).length > 0}
				{#each Object.entries(results) as [coilKey, items]}
					{#if items && items.length}
						<div class="border-b border-[var(--color-kb-slate-light)] last:border-b-0">
							<div
								class="sticky top-0 bg-[var(--color-kb-bone)] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--color-kb-slate)]"
							>
								{coilLabels[coilKey as CoilKey]}
							</div>
							<ul class="py-1">
								{#each items as item (item.id)}
									<li role="option" aria-selected="false">
										<button
											type="button"
											class="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left hover:bg-[var(--color-kb-teal-light)]/50 focus:bg-[var(--color-kb-teal-light)]/50 focus:outline-none"
											onclick={() => goToItem(coilKey as CoilKey, item.id)}
										>
											<span class="font-semibold text-[var(--color-kb-navy)]">{item.title}</span>
											{#if item.description}
												<span class="line-clamp-1 text-xs text-[var(--color-kb-slate)]">
													{item.description}
												</span>
											{/if}
										</button>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				{/each}
			{:else if query.trim().length >= 2}
				<div class="px-4 py-6 text-center text-sm text-[var(--color-kb-slate)]">
					No results for “{query}”. Try different words or browse a coil below.
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.kb-search-container {
		position: relative;
		width: 100%;
	}
	.kb-search-container--light {
		max-width: 100%;
	}
	.kb-search-container--dark {
		max-width: 32rem;
	}
	.kb-search-input-wrap {
		position: relative;
		display: flex;
		align-items: center;
		width: 100%;
		overflow: hidden;
	}
	.kb-search-container--light .kb-search-input-wrap {
		background: #fff;
		border: 1px solid var(--rule);
		border-radius: var(--r);
		box-shadow: var(--sh);
	}
	.kb-search-container--dark .kb-search-input-wrap {
		border-radius: 9999px;
		border: 1px solid rgba(46, 107, 126, 0.4);
		background: rgba(26, 43, 60, 0.6);
		backdrop-filter: blur(8px);
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
	}
	.kb-search-icon {
		position: absolute;
		left: 0;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}
	.kb-search-container--light .kb-search-icon {
		left: 14px;
		color: var(--muted);
	}
	.kb-search-container--dark .kb-search-icon {
		left: 1rem;
		color: var(--color-kb-teal-light);
	}
	.kb-search-input {
		width: 100%;
		border: none;
		background: transparent;
		outline: none;
		font-family: var(--font-sans);
		font-size: 15px;
	}
	.kb-search-container--light .kb-search-input {
		padding: 14px 18px 14px 44px;
		color: var(--dark);
	}
	.kb-search-container--light .kb-search-input::placeholder {
		color: var(--muted);
	}
	.kb-search-container--dark .kb-search-input {
		padding: 12px 1rem 12px 2.75rem;
		font-size: 14px;
		color: #fff;
	}
	.kb-search-container--dark .kb-search-input::placeholder {
		color: rgba(255, 255, 255, 0.5);
	}
	.kb-search-container--light .kb-search-input-wrap:focus-within {
		border-color: var(--teal);
		box-shadow: 0 0 0 2px rgba(46, 107, 126, 0.2);
	}
	.kb-search-dropdown {
		scroll-behavior: smooth;
	}
</style>
