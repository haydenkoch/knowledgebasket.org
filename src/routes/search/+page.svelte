<script lang="ts">
	import type { SearchFacetGroup } from '$lib/server/search-contracts';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import SearchResultIcon from '$lib/components/organisms/search/SearchResultIcon.svelte';
	import { SEARCH_SCOPE_LABELS } from '$lib/search/search-constants';
	import { PUBLIC_SEARCH_PRESETS } from '$lib/search/public-search-presets';
	import { onMount } from 'svelte';

	let { data } = $props();
	let shortcutLabel = $state('Ctrl K');

	const search = $derived(data.search);
	const query = $derived(search.query ?? '');
	const origin = $derived((data.origin ?? '') as string);
	const canonicalUrl = $derived(
		query ? `${origin}/search?q=${encodeURIComponent(query)}` : `${origin}/search`
	);
	const hasStructuredSearch = $derived(
		search.request.scope !== 'all' ||
			Boolean(search.request.dateFrom) ||
			Boolean(search.request.dateTo) ||
			search.facets.some((facet) => facet.buckets.some((bucket) => bucket.active))
	);

	function buildBaseParams(options: { excludeFacetKey?: string; includeFilters?: boolean } = {}) {
		const params = new URLSearchParams();
		if (query) params.set('q', query);
		if (search.request.scope !== 'all') params.set('coil', search.request.scope);
		if (search.request.sort !== 'relevance') params.set('sort', search.request.sort);
		if (search.request.dateFrom) params.set('from', search.request.dateFrom);
		if (search.request.dateTo) params.set('to', search.request.dateTo);
		if (options.includeFilters !== false) {
			for (const facet of search.facets) {
				if (facet.key === options.excludeFacetKey) continue;
				for (const bucket of facet.buckets) {
					if (bucket.active) params.append(facet.key, bucket.value);
				}
			}
		}
		return params;
	}

	function scopeHref(scope: string) {
		const params = buildBaseParams({ includeFilters: false });
		params.delete('coil');
		if (scope !== 'all') params.set('coil', scope);
		return `/search${params.toString() ? `?${params.toString()}` : ''}`;
	}

	function toggleFacetHref(facet: SearchFacetGroup, value: string) {
		const params = buildBaseParams({ excludeFacetKey: facet.key });

		const activeValues = new Set(
			facet.buckets.filter((bucket) => bucket.active).map((bucket) => bucket.value)
		);
		if (activeValues.has(value)) activeValues.delete(value);
		else activeValues.add(value);
		for (const active of activeValues) params.append(facet.key, active);

		return `/search?${params.toString()}`;
	}

	function sortHref(sort: string) {
		const params = buildBaseParams();
		if (sort !== 'relevance') params.set('sort', sort);
		return `/search?${params.toString()}`;
	}

	onMount(() => {
		if (navigator.platform.toLowerCase().includes('mac')) {
			shortcutLabel = '⌘K';
		}
	});
</script>

<svelte:head>
	<title
		>{query
			? `Search results for "${query}" | Knowledge Basket`
			: 'Search | Knowledge Basket'}</title
	>
	<meta
		name="description"
		content={query
			? `Search Knowledge Basket for ${query}. Browse matching events, funding opportunities, Red Pages listings, jobs, and toolbox resources.`
			: 'Search Knowledge Basket across events, funding, Red Pages, jobs, and toolbox resources.'}
	/>
	<link rel="canonical" href={canonicalUrl} />
	<meta name="robots" content="noindex,follow" />
</svelte:head>

<section class="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
	<header class="mb-8 space-y-4">
		<p class="text-sm font-semibold tracking-[0.18em] text-muted-foreground uppercase">Search</p>
		<div class="space-y-3">
			<h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">
				{#if query}
					Results for "{query}"
				{:else}
					Search Knowledge Basket
				{/if}
			</h1>
			<p class="max-w-3xl text-base leading-7 text-muted-foreground">
				Explore the Knowledge Basket with one shared search system across events, funding,
				businesses, jobs, and resources.
			</p>
		</div>

		<form
			action="/search"
			method="GET"
			class="grid gap-3 rounded-2xl border border-border bg-card p-4 lg:grid-cols-[minmax(0,2fr)_180px_180px_1fr_1fr_auto]"
		>
			<div class="lg:col-span-2">
				<div class="mb-1.5 flex items-center justify-between gap-3">
					<label
						class="block text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase"
						for="search-q"
					>
						Query
					</label>
					<span
						class="hidden rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase lg:inline-flex"
					>
						Quick open {shortcutLabel}
					</span>
				</div>
				<input
					id="search-q"
					type="search"
					name="q"
					value={query}
					placeholder="Search events, funding, businesses, jobs, and resources"
					class="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm shadow-xs focus:border-ring focus:ring-2 focus:ring-ring focus:outline-none"
				/>
			</div>
			<div>
				<label
					class="mb-1.5 block text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase"
					for="search-scope"
				>
					Scope
				</label>
				<select
					id="search-scope"
					name="coil"
					class="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm shadow-xs focus:border-ring focus:ring-2 focus:ring-ring focus:outline-none"
				>
					{#each ['all', 'events', 'funding', 'redpages', 'jobs', 'toolbox'] as scope}
						<option value={scope === 'all' ? '' : scope} selected={search.request.scope === scope}>
							{SEARCH_SCOPE_LABELS[scope as keyof typeof SEARCH_SCOPE_LABELS]}
						</option>
					{/each}
				</select>
			</div>
			<div>
				<label
					class="mb-1.5 block text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase"
					for="search-sort"
				>
					Sort
				</label>
				<select
					id="search-sort"
					name="sort"
					class="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm shadow-xs focus:border-ring focus:ring-2 focus:ring-ring focus:outline-none"
				>
					<option value="relevance" selected={search.request.sort === 'relevance'}
						>Best match</option
					>
					<option value="recent" selected={search.request.sort === 'recent'}
						>Recently updated</option
					>
					<option value="title" selected={search.request.sort === 'title'}>Title</option>
					<option value="date" selected={search.request.sort === 'date'}>Date</option>
				</select>
			</div>
			<div>
				<label
					class="mb-1.5 block text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase"
					for="search-from"
				>
					From date
				</label>
				<input
					id="search-from"
					type="date"
					name="from"
					value={search.request.dateFrom ?? ''}
					class="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm shadow-xs focus:border-ring focus:ring-2 focus:ring-ring focus:outline-none"
				/>
			</div>
			<div>
				<label
					class="mb-1.5 block text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase"
					for="search-to"
				>
					To date
				</label>
				<input
					id="search-to"
					type="date"
					name="to"
					value={search.request.dateTo ?? ''}
					class="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm shadow-xs focus:border-ring focus:ring-2 focus:ring-ring focus:outline-none"
				/>
			</div>
			{#each search.facets as facet}
				{#each facet.buckets.filter((bucket) => bucket.active) as bucket}
					<input type="hidden" name={facet.key} value={bucket.value} />
				{/each}
			{/each}
			<div class="flex items-end gap-2 lg:justify-end">
				<Button type="submit">Search</Button>
				<a
					href="/search"
					class="inline-flex min-h-10 items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium no-underline transition-colors hover:bg-accent/50 hover:no-underline"
				>
					Clear
				</a>
			</div>
		</form>
	</header>

	{#if search.readiness.state !== 'ready'}
		<Alert class="mb-6 border-amber-300 bg-amber-50 text-amber-950">
			<AlertTitle>
				{search.readiness.detail === 'host-unavailable'
					? 'Search is running in compatibility mode'
					: search.readiness.detail === 'missing-indexes'
						? 'Search indexes are still being rebuilt'
						: 'Search settings need to be refreshed'}
			</AlertTitle>
			<AlertDescription>
				{search.experience.degradedLabel ??
					(search.resultSource === 'database'
						? 'These results are using the database fallback so the experience stays truthful while indexed search catches up.'
						: 'Indexed search is available, but some parts of the search stack still need attention.')}
			</AlertDescription>
		</Alert>
	{/if}

	{#if query.length < 2 && !hasStructuredSearch}
		<div class="space-y-6">
			<div class="rounded-2xl border border-border bg-card p-6">
				<h2 class="text-lg font-semibold">Start broad or jump straight to a refined search</h2>
				<p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
					Use the advanced controls above, or pick a curated coil path below to start with smarter
					defaults like date windows, open funding, or newest resources.
				</p>
			</div>

			<div class="grid gap-4 lg:grid-cols-2">
				{#each PUBLIC_SEARCH_PRESETS as preset}
					<section class="rounded-2xl border border-border bg-card p-5">
						<div class="flex items-start justify-between gap-3">
							<div>
								<h2 class="text-lg font-semibold">{preset.label}</h2>
								<p class="mt-1 text-sm leading-6 text-muted-foreground">{preset.description}</p>
							</div>
							<a
								href={preset.href}
								class="rounded-full border border-border px-3 py-1.5 text-sm font-medium no-underline transition-colors hover:bg-accent/50 hover:no-underline"
							>
								Browse
							</a>
						</div>

						<div class="mt-4 flex flex-wrap gap-2">
							{#each preset.quickLinks as link}
								<a
									href={link.href}
									class="rounded-full bg-accent/60 px-3 py-1.5 text-sm font-medium text-foreground no-underline transition-colors hover:bg-accent hover:no-underline"
									title={link.hint}
								>
									{link.label}
								</a>
							{/each}
						</div>

						<div class="mt-4 grid gap-2 sm:grid-cols-3">
							{#each preset.queries as suggestion}
								<a
									href={`/search?q=${encodeURIComponent(suggestion.term)}&coil=${preset.scope}`}
									class="rounded-xl border border-border p-3 no-underline transition-colors hover:bg-accent/40 hover:no-underline"
								>
									<div class="text-sm font-semibold text-foreground">{suggestion.label}</div>
									<div class="mt-1 text-xs leading-5 text-muted-foreground">
										{suggestion.hint}
									</div>
								</a>
							{/each}
						</div>
					</section>
				{/each}
			</div>
		</div>
	{:else}
		{#if search.request.dateFrom || search.request.dateTo}
			<div class="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
				<span class="rounded-full bg-accent/70 px-3 py-1.5 text-foreground">
					Date range:
					{search.request.dateFrom ?? 'Any time'} to {search.request.dateTo ?? 'Any time'}
				</span>
			</div>
		{/if}

		<div class="mb-5 flex flex-wrap items-center gap-3">
			<div class="text-sm text-muted-foreground">
				Showing <strong class="text-foreground">{search.pagination.total}</strong> result{search
					.pagination.total === 1
					? ''
					: 's'} using {search.resultSource === 'meilisearch'
					? 'indexed search'
					: 'database fallback'}.
			</div>
			<div class="flex flex-wrap gap-2">
				{#each ['relevance', 'recent', 'title', 'date'] as sort}
					<a
						href={sortHref(sort)}
						class="rounded-full border px-3 py-1.5 text-sm no-underline transition-colors hover:no-underline"
						class:border-primary={search.request.sort === sort}
						class:bg-primary={search.request.sort === sort}
						class:text-primary-foreground={search.request.sort === sort}
						class:border-border={search.request.sort !== sort}
						class:text-muted-foreground={search.request.sort !== sort}
					>
						{sort === 'relevance'
							? 'Best match'
							: sort === 'recent'
								? 'Recently updated'
								: sort === 'title'
									? 'Title'
									: 'Date'}
					</a>
				{/each}
			</div>
		</div>

		<div class="mb-6 flex flex-wrap gap-2">
			{#each ['all', 'events', 'funding', 'redpages', 'jobs', 'toolbox'] as scope}
				<a
					href={scopeHref(scope)}
					class="rounded-full border px-3 py-1.5 text-sm font-medium no-underline transition-colors hover:no-underline"
					class:border-primary={search.request.scope === scope}
					class:bg-primary={search.request.scope === scope}
					class:text-primary-foreground={search.request.scope === scope}
					class:border-border={search.request.scope !== scope}
					class:text-muted-foreground={search.request.scope !== scope}
				>
					{SEARCH_SCOPE_LABELS[scope as keyof typeof SEARCH_SCOPE_LABELS]}
				</a>
			{/each}
		</div>

		{#if search.facets.length > 0}
			<div class="mb-8 grid gap-4 rounded-2xl border border-border bg-card p-4 lg:grid-cols-2">
				{#each search.facets as facet}
					<div class="space-y-3">
						<h2 class="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
							{facet.label}
						</h2>
						<div class="flex flex-wrap gap-2">
							{#each facet.buckets as bucket}
								<a
									href={toggleFacetHref(facet, bucket.value)}
									class="rounded-full border px-3 py-1.5 text-sm no-underline transition-colors hover:no-underline"
									class:border-primary={bucket.active}
									class:bg-primary={bucket.active}
									class:text-primary-foreground={bucket.active}
									class:border-border={!bucket.active}
									class:text-muted-foreground={!bucket.active}
								>
									{bucket.label} <span class="opacity-70">({bucket.count})</span>
								</a>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		{#if search.results.length === 0}
			<div class="rounded-2xl border border-border bg-card p-6">
				<h2 class="text-lg font-semibold">No results found</h2>
				<p class="mt-2 text-sm text-muted-foreground">
					Try a broader term, a different spelling, or switch to another content area.
				</p>
				<div class="mt-4 flex flex-wrap gap-2">
					{#each search.suggestions as suggestion}
						<a
							href={suggestion.href}
							class="rounded-full border border-border px-3 py-1.5 text-sm font-medium no-underline transition-colors hover:border-primary/40 hover:bg-accent/50 hover:no-underline"
						>
							{suggestion.label}
						</a>
					{/each}
				</div>
			</div>
		{:else}
			<div class="space-y-8">
				{#each search.groups as group}
					<section aria-labelledby={`search-${group.key}`}>
						<div class="mb-3 flex items-center justify-between gap-3">
							<h2 id={`search-${group.key}`} class="text-xl font-semibold">
								{group.label}
							</h2>
							<span class="text-sm text-muted-foreground">
								{group.total} result{group.total === 1 ? '' : 's'}
							</span>
						</div>

						<div class="grid gap-3">
							{#each group.results as item (item.scope + '-' + item.id)}
								<a
									href={item.href}
									class="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/30"
								>
									<div class="mb-2 flex flex-wrap items-center gap-2">
										<div
											class="flex h-9 w-9 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-lakebed-950)_6%,white)]"
										>
											<SearchResultIcon
												icon={item.presentation.icon}
												class="h-4 w-4 text-[var(--color-lakebed-900)]"
											/>
										</div>
										<span
											class="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase"
										>
											{item.presentation.badge}
										</span>
										{#if item.presentation.subtitle}
											<span class="text-xs text-muted-foreground">
												{item.presentation.subtitle}
											</span>
										{/if}
									</div>
									<h3 class="text-base font-semibold text-foreground">{item.title}</h3>
									{#if item.summary}
										<p class="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
											{item.summary}
										</p>
									{/if}
									<div
										class="mt-3 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase"
									>
										{item.presentation.destinationLabel}
									</div>
								</a>
							{/each}
						</div>
					</section>
				{/each}
			</div>
		{/if}
	{/if}
</section>
