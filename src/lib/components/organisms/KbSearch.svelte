<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import HandCoins from '@lucide/svelte/icons/hand-coins';
	import Store from '@lucide/svelte/icons/store';
	import Briefcase from '@lucide/svelte/icons/briefcase';
	import Wrench from '@lucide/svelte/icons/wrench';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import SearchIcon from '@lucide/svelte/icons/search';

	let { variant = 'default' }: { variant?: 'default' | 'light' } = $props();

	let query = $state('');
	let results = $state<{ coil: string; title: string; slug: string; href: string }[]>([]);
	let open = $state(false);
	let focused = $state(false);
	let activeIndex = $state(-1);
	let timer: ReturnType<typeof setTimeout>;

	const coilPaths: Record<string, string> = {
		events: '/events',
		funding: '/funding',
		redpages: '/red-pages',
		jobs: '/jobs',
		toolbox: '/toolbox'
	};

	const coilNav = [
		{ key: 'events', label: 'Events', icon: CalendarDays, href: '/events', color: 'var(--teal)' },
		{ key: 'funding', label: 'Funding', icon: HandCoins, href: '/funding', color: 'var(--gold)' },
		{
			key: 'redpages',
			label: 'Red Pages',
			icon: Store,
			href: '/red-pages',
			color: 'var(--red)'
		},
		{ key: 'jobs', label: 'Jobs', icon: Briefcase, href: '/jobs', color: 'var(--forest)' },
		{ key: 'toolbox', label: 'Toolbox', icon: Wrench, href: '/toolbox', color: 'var(--slate)' }
	];

	const popularSearches = [
		'grant deadlines',
		'cultural events',
		'tribal employment',
		'Native-owned businesses',
		'economic development'
	];

	const coilIcons: Record<string, typeof CalendarDays> = {
		events: CalendarDays,
		funding: HandCoins,
		redpages: Store,
		jobs: Briefcase,
		toolbox: Wrench
	};

	const showSuggestions = $derived(focused && query.trim().length < 2 && results.length === 0);
	const showResults = $derived(open && results.length > 0);
	const showPanel = $derived(showSuggestions || showResults);
	const listboxId = 'kb-global-search-results';
	const viewAllHref = $derived(
		query.trim().length >= 2 ? `/search?q=${encodeURIComponent(query.trim())}` : '/search'
	);
	const suggestionOptions = $derived([
		...coilNav.map((item) => ({
			label: item.label,
			meta: 'Browse',
			action: 'goto' as const,
			href: item.href
		})),
		...popularSearches.map((term) => ({
			label: term,
			meta: 'Popular search',
			action: 'fill' as const,
			term
		}))
	]);
	const resultOptions = $derived([
		...results.map((item) => ({
			label: item.title,
			meta: item.coil,
			action: 'goto' as const,
			href: item.href
		})),
		...(query.trim().length >= 2
			? [
					{
						label: `View all results for "${query.trim()}"`,
						meta: 'Search',
						action: 'goto' as const,
						href: viewAllHref
					}
				]
			: [])
	]);
	const activeOptions = $derived(
		showResults ? resultOptions : showSuggestions ? suggestionOptions : []
	);
	const activeOptionId = $derived(
		activeIndex >= 0 && activeIndex < activeOptions.length
			? `kb-global-search-option-${activeIndex}`
			: undefined
	);

	async function search(q: string) {
		if (q.trim().length < 2) {
			results = [];
			open = false;
			activeIndex = -1;
			return;
		}
		try {
			const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
			const data = (await res.json()) as {
				results?: Record<string, { title: string; slug?: string; id?: string }[]>;
			};
			const flat: typeof results = [];
			for (const [coil, items] of Object.entries(data.results ?? {})) {
				for (const item of items.slice(0, 3)) {
					const slug = item.slug ?? item.id ?? '';
					if (!slug) continue;
					flat.push({
						coil,
						title: item.title,
						slug,
						href: `${coilPaths[coil] ?? `/${coil}`}/${slug}`
					});
				}
			}
			results = flat;
			open = flat.length > 0;
			activeIndex = flat.length > 0 ? 0 : -1;
		} catch {
			/* ignore */
		}
	}

	function onInput(e: Event) {
		query = (e.currentTarget as HTMLInputElement).value;
		clearTimeout(timer);
		timer = setTimeout(() => search(query), 280);
	}

	function fillSearch(term: string) {
		query = term;
		void search(term);
	}

	function onSubmit(e: Event) {
		e.preventDefault();
		if (!query.trim()) return;
		const url = new URL(resolve('/search'), window.location.origin);
		url.searchParams.set('q', query.trim());
		goto(url);
	}

	function onBlur() {
		setTimeout(() => {
			focused = false;
			open = false;
			activeIndex = -1;
		}, 150);
	}

	async function activateOption(index: number) {
		const option = activeOptions[index];
		if (!option) return;

		if (option.action === 'fill' && 'term' in option) {
			fillSearch(option.term);
			return;
		}

		if ('href' in option && option.href) {
			await goto(option.href);
		}
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			open = false;
			focused = false;
			activeIndex = -1;
			return;
		}

		if (!showPanel || activeOptions.length === 0) return;

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			activeIndex = activeIndex < activeOptions.length - 1 ? activeIndex + 1 : 0;
			return;
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			activeIndex = activeIndex > 0 ? activeIndex - 1 : activeOptions.length - 1;
			return;
		}

		if (event.key === 'Enter' && activeIndex >= 0) {
			event.preventDefault();
			void activateOption(activeIndex);
		}
	}
</script>

<div class="relative">
	<form onsubmit={onSubmit} role="search">
		<label for="kb-global-search" class="sr-only">Search Knowledge Basket</label>
		<div class="relative">
			<SearchIcon
				class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
				aria-hidden="true"
			/>
			<input
				id="kb-global-search"
				type="search"
				placeholder="Search events, funding, businesses, jobs…"
				value={query}
				oninput={onInput}
				onkeydown={onKeydown}
				onfocus={() => {
					focused = true;
					if (results.length) open = true;
				}}
				onblur={onBlur}
				role="combobox"
				aria-autocomplete="list"
				aria-expanded={showPanel}
				aria-controls={showPanel ? listboxId : undefined}
				aria-activedescendant={activeOptionId}
				class="w-full rounded-lg border border-input bg-background py-2.5 pr-4 pl-10 text-sm shadow-xs focus:ring-2 focus:ring-ring focus:outline-none {variant ===
				'light'
					? 'bg-white/90'
					: ''}"
				autocomplete="off"
			/>
		</div>
	</form>

	{#if showSuggestions}
		<div
			id={listboxId}
			role="listbox"
			class="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md"
		>
			<div class="border-b border-border px-3 py-2">
				<span class="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase"
					>Browse</span
				>
			</div>
			<ul>
				{#each coilNav as c, index}
					<li>
						<button
							type="button"
							id={`kb-global-search-option-${index}`}
							role="option"
							aria-selected={activeIndex === index}
							class="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
							class:bg-accent={activeIndex === index}
							class:text-accent-foreground={activeIndex === index}
							onmousedown={(event) => {
								event.preventDefault();
								activeIndex = index;
								void goto(c.href);
							}}
						>
							<c.icon class="h-4 w-4 shrink-0" style="color: {c.color}" />
							<span class="flex-1">{c.label}</span>
							<ChevronRight class="h-3.5 w-3.5 text-muted-foreground" />
						</button>
					</li>
				{/each}
			</ul>
			<div class="border-t border-border px-3 py-2">
				<span class="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase"
					>Popular searches</span
				>
			</div>
			<ul class="pb-1">
				{#each popularSearches as term, termIndex}
					{@const optionIndex = coilNav.length + termIndex}
					<li>
						<button
							type="button"
							id={`kb-global-search-option-${optionIndex}`}
							role="option"
							aria-selected={activeIndex === optionIndex}
							class="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
							class:bg-accent={activeIndex === optionIndex}
							class:text-accent-foreground={activeIndex === optionIndex}
							onmousedown={(event) => {
								event.preventDefault();
								activeIndex = optionIndex;
								fillSearch(term);
							}}
						>
							<SearchIcon class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
							<span>{term}</span>
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if showResults}
		<ul
			id={listboxId}
			role="listbox"
			class="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md"
		>
			{#each results as r, index}
				{@const Icon = coilIcons[r.coil]}
				<li>
					<button
						type="button"
						id={`kb-global-search-option-${index}`}
						role="option"
						aria-selected={activeIndex === index}
						class="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
						class:bg-accent={activeIndex === index}
						class:text-accent-foreground={activeIndex === index}
						onmousedown={(event) => {
							event.preventDefault();
							activeIndex = index;
							void goto(r.href);
						}}
					>
						{#if Icon}
							<Icon class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
						{/if}
						<span
							class="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground uppercase"
							>{r.coil}</span
						>
						<span class="truncate">{r.title}</span>
					</button>
				</li>
			{/each}
			<li class="border-t border-border">
				<button
					type="button"
					id={`kb-global-search-option-${results.length}`}
					role="option"
					aria-selected={activeIndex === results.length}
					class="flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
					class:bg-accent={activeIndex === results.length}
					class:text-accent-foreground={activeIndex === results.length}
					onmousedown={(event) => {
						event.preventDefault();
						activeIndex = results.length;
						void goto(viewAllHref);
					}}
				>
					View all results
					<ChevronRight class="h-3.5 w-3.5" />
				</button>
			</li>
		</ul>
	{/if}
</div>
