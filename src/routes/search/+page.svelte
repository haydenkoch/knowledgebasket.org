<script lang="ts">
	import { browser } from '$app/environment';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { trackSearchPerformed, trackSearchResultClicked } from '$lib/insights/events';
	import type { SearchFacetGroup, SearchIndexScope } from '$lib/server/search-contracts';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import SearchResultIcon from '$lib/components/organisms/search/SearchResultIcon.svelte';
	import { SEARCH_SCOPE_LABELS } from '$lib/search/search-constants';
	import { PUBLIC_SEARCH_PRESETS } from '$lib/search/public-search-presets';
	import { onMount } from 'svelte';

	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import HandCoins from '@lucide/svelte/icons/hand-coins';
	import Store from '@lucide/svelte/icons/store';
	import Briefcase from '@lucide/svelte/icons/briefcase';
	import Wrench from '@lucide/svelte/icons/wrench';
	import Search from '@lucide/svelte/icons/search';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import X from '@lucide/svelte/icons/x';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { buildOgImagePath } from '$lib/seo/metadata';

	let { data } = $props();
	let shortcutLabel = $state('Ctrl K');
	let filtersOpen = $state(false);
	let lastTrackedSearchSignature = $state('');

	const search = $derived(data.search);
	const query = $derived(search.query ?? '');
	const origin = $derived((data.seoOrigin ?? data.origin ?? '') as string);
	const hasStructuredSearch = $derived(
		search.request.scope !== 'all' ||
			Boolean(search.request.dateFrom) ||
			Boolean(search.request.dateTo) ||
			search.facets.some((facet) => facet.buckets.some((bucket) => bucket.active))
	);
	const hasActiveQuery = $derived(query.length >= 2 || hasStructuredSearch);
	const hasDateFilter = $derived(
		Boolean(search.request.dateFrom) || Boolean(search.request.dateTo)
	);
	/** Facets excluding "Content Areas" since scope tabs handle that */
	const refinementFacets = $derived(
		search.facets.filter((f) => f.key !== 'scope' && f.key !== 'contentArea')
	);
	const activeFilterCount = $derived(
		(hasDateFilter ? 1 : 0) +
			refinementFacets.reduce((n, f) => n + f.buckets.filter((b) => b.active).length, 0)
	);

	/* ── coil identity ─────────────────────────────────────── */
	const coilColors: Record<string, string> = {
		events: 'var(--teal)',
		funding: 'var(--gold)',
		redpages: 'var(--red)',
		jobs: 'var(--forest)',
		toolbox: 'var(--slate)'
	};
	const coilBg: Record<string, string> = {
		events: 'var(--color-lakebed-50)',
		funding: 'var(--color-flicker-50)',
		redpages: 'var(--color-salmonberry-50)',
		jobs: 'var(--color-pinyon-50)',
		toolbox: 'var(--color-granite-50)'
	};
	const coilIcons: Record<string, typeof CalendarDays> = {
		events: CalendarDays,
		funding: HandCoins,
		redpages: Store,
		jobs: Briefcase,
		toolbox: Wrench
	};

	function scopeColor(scope: string): string {
		return coilColors[scope] ?? 'var(--primary)';
	}
	function scopeBg(scope: string): string {
		return coilBg[scope] ?? 'var(--color-alpine-100)';
	}

	/* ── url builders ──────────────────────────────────────── */
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

	function trackResultClick(item: {
		id: string;
		scope: SearchIndexScope;
		kind: string;
		slug?: string;
		href: string;
	}) {
		const position =
			search.results.findIndex((result) => result.id === item.id && result.scope === item.scope) +
			1;

		trackSearchResultClicked({
			surface: 'global',
			query,
			scope: search.request.scope as 'all' | 'events' | 'funding' | 'redpages' | 'jobs' | 'toolbox',
			resultScope: item.scope,
			resultKind: item.kind,
			resultSlug: item.slug ?? item.id,
			href: item.href,
			position
		});
	}

	$effect(() => {
		if (!browser) return;
		if (!hasActiveQuery) {
			lastTrackedSearchSignature = '';
			return;
		}

		const signature = [
			query,
			search.request.scope,
			search.pagination.total,
			search.request.sort,
			activeFilterCount,
			search.resultSource,
			search.experience.degraded ? '1' : '0'
		].join('|');

		if (lastTrackedSearchSignature === signature) return;
		lastTrackedSearchSignature = signature;

		trackSearchPerformed({
			surface: 'global',
			query,
			scope: search.request.scope as 'all' | 'events' | 'funding' | 'redpages' | 'jobs' | 'toolbox',
			resultCount: search.pagination.total,
			sort: search.request.sort,
			hasFilters: activeFilterCount > 0,
			resultSource: search.resultSource,
			isDegraded: search.experience.degraded
		});
	});

	onMount(() => {
		if (navigator.platform.toLowerCase().includes('mac')) {
			shortcutLabel = '⌘K';
		}
	});
</script>

<SeoHead
	{origin}
	pathname="/search"
	title={query ? `Search results for "${query}" | Knowledge Basket` : 'Search | Knowledge Basket'}
	description={query
		? `Search Knowledge Basket for ${query}. Browse matching events, funding opportunities, Red Pages listings, jobs, and toolbox resources.`
		: 'Search Knowledge Basket across events, funding, Red Pages, jobs, and toolbox resources.'}
	robotsMode="noindex-follow"
	ogImage={buildOgImagePath({
		title: query ? `Search: ${query}` : 'Search Knowledge Basket',
		eyebrow: 'Global search',
		theme: 'site',
		meta: 'Events, funding, Red Pages, jobs, and toolbox resources'
	})}
	ogImageAlt="Knowledge Basket search social preview"
/>

<section class="search-page mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
	<!-- ── Search bar (always visible) ────────────────────── -->
	<form action="/search" method="GET" class="mb-6">
		<div
			class="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition-shadow focus-within:shadow-md"
		>
			<Search class="h-5 w-5 shrink-0 text-muted-foreground" />
			<input
				id="search-q"
				type="search"
				name="q"
				value={query}
				placeholder="Search events, funding, businesses, jobs, and resources"
				class="w-full bg-transparent text-base focus:outline-none"
			/>
			<span
				class="hidden shrink-0 rounded-md border border-border/80 bg-background px-2 py-1 text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase lg:inline-flex"
			>
				{shortcutLabel}
			</span>
			<!-- Hidden fields to preserve state on re-submit -->
			{#if search.request.scope !== 'all'}
				<input type="hidden" name="coil" value={search.request.scope} />
			{/if}
			{#if search.request.sort !== 'relevance'}
				<input type="hidden" name="sort" value={search.request.sort} />
			{/if}
			{#if search.request.dateFrom}
				<input type="hidden" name="from" value={search.request.dateFrom} />
			{/if}
			{#if search.request.dateTo}
				<input type="hidden" name="to" value={search.request.dateTo} />
			{/if}
			{#each search.facets as facet}
				{#each facet.buckets.filter((b) => b.active) as bucket}
					<input type="hidden" name={facet.key} value={bucket.value} />
				{/each}
			{/each}
			<Button type="submit" size="sm" class="shrink-0">Search</Button>
		</div>
	</form>

	<!-- ── Readiness alert ────────────────────────────────── -->
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
						? 'Results are using the database fallback while indexed search catches up.'
						: 'Indexed search is available, but some parts of the search stack still need attention.')}
			</AlertDescription>
		</Alert>
	{/if}

	<!-- ── Discovery presets (no active query) ────────────── -->
	{#if !hasActiveQuery}
		<div class="search-enter space-y-8">
			<div class="text-center">
				<h2 class="font-serif text-2xl font-semibold">Browse by section</h2>
				<p class="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
					Jump into a curated coil path, or use the search bar above.
				</p>
			</div>

			<div class="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
				{#each PUBLIC_SEARCH_PRESETS as preset, i}
					{@const Icon = coilIcons[preset.scope]}
					{@const accent = scopeColor(preset.scope)}
					<section
						class="preset-card group relative overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:shadow-md"
						style="--preset-accent: {accent}; animation-delay: {i * 60}ms"
					>
						<div
							class="h-1 w-full transition-all duration-300 group-hover:h-1.5"
							style="background: {accent}"
						></div>

						<div class="p-5">
							<div class="mb-4 flex items-start gap-3">
								<div
									class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105"
									style="background: color-mix(in srgb, {accent} 12%, transparent)"
								>
									{#if Icon}<Icon class="h-5 w-5" style="color: {accent}" />{/if}
								</div>
								<div class="min-w-0 flex-1">
									<h3 class="font-serif text-lg leading-tight font-semibold">{preset.label}</h3>
									<p class="mt-0.5 text-sm leading-5 text-muted-foreground">{preset.description}</p>
								</div>
								<a
									href={preset.href}
									class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground no-underline transition-all duration-200 hover:bg-muted hover:text-foreground hover:no-underline"
									aria-label="Browse {preset.label}"
								>
									<ArrowRight class="h-4 w-4" />
								</a>
							</div>

							<div class="mb-3 flex flex-wrap gap-2">
								{#each preset.quickLinks as link}
									<a
										href={link.href}
										class="rounded-full px-3 py-1.5 text-sm font-medium no-underline transition-colors hover:no-underline"
										style="background: color-mix(in srgb, {accent} 8%, transparent); color: {accent}"
										title={link.hint}
									>
										{link.label}
									</a>
								{/each}
							</div>

							<div class="grid gap-2 sm:grid-cols-3">
								{#each preset.queries as suggestion}
									<a
										href={`/search?q=${encodeURIComponent(suggestion.term)}&coil=${preset.scope}`}
										class="suggestion-link rounded-lg border border-border/60 p-2.5 no-underline transition-all duration-200 hover:bg-muted/50 hover:no-underline"
									>
										<div class="text-sm font-semibold text-foreground">{suggestion.label}</div>
										<div class="mt-0.5 text-xs leading-4 text-muted-foreground">
											{suggestion.hint}
										</div>
									</a>
								{/each}
							</div>
						</div>
					</section>
				{/each}
			</div>
		</div>

		<!-- ── Active search results ──────────────────────────── -->
	{:else}
		<!-- Unified control bar: scope tabs + count + sort -->
		<div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<!-- Scope tabs (left) -->
			<div class="flex flex-wrap gap-1.5">
				{#each ['all', 'events', 'funding', 'redpages', 'jobs', 'toolbox'] as scope}
					{@const active = search.request.scope === scope}
					{@const Icon = scope !== 'all' ? coilIcons[scope] : undefined}
					<a
						href={scopeHref(scope)}
						class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium no-underline transition-all duration-200 hover:no-underline"
						class:border-transparent={active}
						class:text-white={active}
						class:border-border={!active}
						class:text-muted-foreground={!active}
						class:hover:bg-muted={!active}
						style={active
							? `background: ${scope === 'all' ? 'var(--primary)' : scopeColor(scope)}`
							: ''}
					>
						{#if Icon}<Icon class="h-3.5 w-3.5" />{/if}
						{SEARCH_SCOPE_LABELS[scope as keyof typeof SEARCH_SCOPE_LABELS]}
					</a>
				{/each}
			</div>

			<!-- Count + sort (right) -->
			<div class="flex items-center gap-3">
				<span class="text-sm text-muted-foreground">
					<strong class="text-foreground">{search.pagination.total}</strong>
					result{search.pagination.total === 1 ? '' : 's'}
				</span>
				<span class="text-border">·</span>
				<div class="flex gap-1">
					{#each ['relevance', 'recent', 'title', 'date'] as sort}
						<a
							href={sortHref(sort)}
							class="rounded-md px-2 py-1 text-xs font-medium no-underline transition-colors hover:no-underline"
							class:bg-primary={search.request.sort === sort}
							class:text-primary-foreground={search.request.sort === sort}
							class:text-muted-foreground={search.request.sort !== sort}
							class:hover:bg-muted={search.request.sort !== sort}
						>
							{sort === 'relevance'
								? 'Best'
								: sort === 'recent'
									? 'Recent'
									: sort === 'title'
										? 'A-Z'
										: 'Date'}
						</a>
					{/each}
				</div>
			</div>
		</div>

		<!-- Active filter chips + filter toggle -->
		<div class="mb-5 flex flex-wrap items-center gap-2">
			<!-- Date chip -->
			{#if hasDateFilter}
				<span
					class="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm text-foreground"
				>
					<CalendarDays class="h-3.5 w-3.5 text-muted-foreground" />
					{search.request.dateFrom ?? 'Any'} — {search.request.dateTo ?? 'Any'}
				</span>
			{/if}
			<!-- Active facet chips -->
			{#each refinementFacets as facet}
				{#each facet.buckets.filter((b) => b.active) as bucket}
					<a
						href={toggleFacetHref(facet, bucket.value)}
						class="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-sm text-primary-foreground no-underline transition-colors hover:bg-primary/90 hover:no-underline"
					>
						{bucket.label}
						<X class="h-3 w-3" />
					</a>
				{/each}
			{/each}
			<!-- Filter toggle button -->
			<button
				type="button"
				onclick={() => (filtersOpen = !filtersOpen)}
				class="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				class:bg-muted={filtersOpen}
				class:text-foreground={filtersOpen}
			>
				<SlidersHorizontal class="h-3.5 w-3.5" />
				Filters
				{#if activeFilterCount > 0}
					<span
						class="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground"
					>
						{activeFilterCount}
					</span>
				{/if}
				<ChevronDown
					class="h-3.5 w-3.5 transition-transform duration-200"
					style={filtersOpen ? 'transform: rotate(180deg)' : ''}
				/>
			</button>
			{#if hasStructuredSearch}
				<a
					href={`/search${query ? `?q=${encodeURIComponent(query)}` : ''}`}
					class="text-xs text-muted-foreground no-underline transition-colors hover:text-foreground hover:no-underline"
				>
					Clear filters
				</a>
			{/if}
		</div>

		<!-- Collapsible filter panel -->
		{#if filtersOpen}
			<div class="filter-panel mb-6 overflow-hidden rounded-xl border border-border bg-card p-4">
				<div class="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
					<!-- Date range -->
					<form action="/search" method="GET" class="contents">
						<input type="hidden" name="q" value={query} />
						{#if search.request.scope !== 'all'}
							<input type="hidden" name="coil" value={search.request.scope} />
						{/if}
						{#if search.request.sort !== 'relevance'}
							<input type="hidden" name="sort" value={search.request.sort} />
						{/if}
						{#each search.facets as facet}
							{#each facet.buckets.filter((b) => b.active) as bucket}
								<input type="hidden" name={facet.key} value={bucket.value} />
							{/each}
						{/each}
						<div>
							<label
								class="mb-1.5 block text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase"
								for="filter-from"
							>
								From date
							</label>
							<input
								id="filter-from"
								type="date"
								name="from"
								value={search.request.dateFrom ?? ''}
								class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:ring-2 focus:ring-ring focus:outline-none"
							/>
						</div>
						<div>
							<label
								class="mb-1.5 block text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase"
								for="filter-to"
							>
								To date
							</label>
							<input
								id="filter-to"
								type="date"
								name="to"
								value={search.request.dateTo ?? ''}
								class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:ring-2 focus:ring-ring focus:outline-none"
							/>
						</div>
						<div class="flex items-end">
							<Button type="submit" variant="outline" size="sm">Apply dates</Button>
						</div>
					</form>
				</div>

				<!-- Facet groups (non-scope) -->
				{#if refinementFacets.length > 0}
					<div class="mt-4 border-t border-border/60 pt-4">
						<div class="grid gap-4 lg:grid-cols-2">
							{#each refinementFacets as facet}
								<div class="space-y-2">
									<h3
										class="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase"
									>
										{facet.label}
									</h3>
									<div class="flex flex-wrap gap-1.5">
										{#each facet.buckets as bucket}
											<a
												href={toggleFacetHref(facet, bucket.value)}
												class="rounded-full border px-2.5 py-1 text-sm no-underline transition-colors hover:no-underline"
												class:border-primary={bucket.active}
												class:bg-primary={bucket.active}
												class:text-primary-foreground={bucket.active}
												class:border-border={!bucket.active}
												class:text-muted-foreground={!bucket.active}
												class:hover:bg-muted={!bucket.active}
											>
												{bucket.label}
												<span class="ml-0.5 opacity-60">({bucket.count})</span>
											</a>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Empty state -->
		{#if search.results.length === 0}
			<div class="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
				<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
					<Search class="h-7 w-7 text-muted-foreground" />
				</div>
				<h2 class="font-serif text-xl font-semibold">No results found</h2>
				<p class="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
					Try a broader term, a different spelling, or switch to another content area.
				</p>
				{#if search.suggestions.length > 0}
					<div class="mt-5 flex flex-wrap justify-center gap-2">
						{#each search.suggestions as suggestion}
							<a
								href={suggestion.href}
								class="rounded-full border border-border px-3 py-1.5 text-sm font-medium no-underline transition-colors hover:bg-muted hover:no-underline"
							>
								{suggestion.label}
							</a>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Result groups -->
		{:else}
			<div class="search-enter space-y-10">
				{#each search.groups as group, gi}
					{@const groupColor = scopeColor(group.key)}
					{@const GroupIcon = coilIcons[group.key]}
					<section aria-labelledby={`search-${group.key}`} style="animation-delay: {gi * 80}ms">
						<!-- Group header -->
						<div class="mb-4 flex items-center gap-3">
							{#if GroupIcon}
								<div
									class="flex h-8 w-8 items-center justify-center rounded-lg"
									style="background: color-mix(in srgb, {groupColor} 12%, transparent)"
								>
									<GroupIcon class="h-4 w-4" style="color: {groupColor}" />
								</div>
							{/if}
							<h2 id={`search-${group.key}`} class="font-serif text-xl font-semibold">
								{group.label}
							</h2>
							<div
								class="h-px flex-1"
								style="background: color-mix(in srgb, {groupColor} 20%, transparent)"
							></div>
							<span class="text-sm text-muted-foreground">
								{group.total} result{group.total === 1 ? '' : 's'}
							</span>
						</div>

						<!-- Result cards -->
						<div class="grid gap-3">
							{#each group.results as item, ri (item.scope + '-' + item.id)}
								{@const itemColor = scopeColor(item.scope)}
								<a
									href={item.href}
									onclick={() => trackResultClick(item)}
									class="result-card group relative overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:shadow-md"
									style="--item-accent: {itemColor}; animation-delay: {gi * 80 + ri * 40}ms"
								>
									<!-- Left accent stripe -->
									<div
										class="absolute top-0 left-0 h-full w-1 transition-all duration-200 group-hover:w-1.5"
										style="background: {itemColor}"
									></div>

									<div class="flex gap-4 p-4 pl-5">
										<!-- Icon -->
										<div
											class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105"
											style="background: color-mix(in srgb, {itemColor} 10%, transparent)"
										>
											<span style="color: {itemColor}">
												<SearchResultIcon icon={item.presentation.icon} class="h-4.5 w-4.5" />
											</span>
										</div>

										<!-- Content -->
										<div class="min-w-0 flex-1">
											<div class="mb-1.5 flex flex-wrap items-center gap-2">
												<span
													class="rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-[0.06em] uppercase"
													style="background: color-mix(in srgb, {itemColor} 8%, transparent); color: {itemColor}"
												>
													{item.presentation.badge}
												</span>
												{#if item.presentation.subtitle}
													<span class="text-xs text-muted-foreground">
														{item.presentation.subtitle}
													</span>
												{/if}
											</div>
											<h3
												class="font-serif text-base leading-snug font-semibold text-foreground group-hover:text-foreground/80"
											>
												{item.title}
											</h3>
											{#if item.summary}
												<p class="mt-1.5 line-clamp-2 text-sm leading-6 text-muted-foreground">
													{item.summary}
												</p>
											{/if}
											<div
												class="mt-2 text-[11px] font-semibold tracking-[0.08em] uppercase"
												style="color: {itemColor}"
											>
												{item.presentation.destinationLabel}
												<ArrowRight
													class="ml-0.5 inline h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5"
												/>
											</div>
										</div>
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

<style>
	/* Override global a:hover underline — this page has only navigation/card links, no inline prose */
	.search-page :global(a) {
		text-decoration: none;
	}
	.search-page :global(a:hover) {
		text-decoration: none;
	}

	@keyframes search-fade-up {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.search-enter :global(.preset-card),
	.search-enter :global(section[aria-labelledby]) {
		animation: search-fade-up 0.4s ease-out both;
	}

	.result-card {
		animation: search-fade-up 0.3s ease-out both;
	}

	.result-card:hover {
		border-color: color-mix(in srgb, var(--item-accent) 30%, transparent);
	}

	@keyframes filter-slide {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.filter-panel {
		animation: filter-slide 0.2s ease-out both;
	}

	@media (prefers-reduced-motion: reduce) {
		.search-enter :global(.preset-card),
		.search-enter :global(section[aria-labelledby]),
		.result-card,
		.filter-panel {
			animation: none;
		}
	}
</style>
