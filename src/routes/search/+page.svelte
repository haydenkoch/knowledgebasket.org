<script lang="ts">
	import { coilLabels, type CoilKey } from '$lib/data/kb';
	import { stripHtml } from '$lib/utils/format';
	import type { SearchDoc } from '$lib/server/meilisearch';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	let { data } = $props();

	const query = $derived((data.query ?? '') as string);
	const origin = $derived((data.origin ?? '') as string);
	const searchMode = $derived((data.searchMode ?? 'events-only') as 'all' | 'events-only');
	const results = $derived((data.results ?? {}) as Record<CoilKey, SearchDoc[]>);

	const canonicalUrl = $derived(
		query ? `${origin}/search?q=${encodeURIComponent(query)}` : `${origin}/search`
	);
	const totalResults = $derived(
		Object.values(results).reduce((sum, items) => sum + items.length, 0)
	);

	const coilPaths: Record<CoilKey, string> = {
		events: '/events',
		funding: '/funding',
		redpages: '/red-pages',
		jobs: '/jobs',
		toolbox: '/toolbox'
	};

	const orderedCoils: CoilKey[] = ['events', 'funding', 'redpages', 'jobs', 'toolbox'];

	function hrefFor(coil: CoilKey, item: SearchDoc): string {
		return `${coilPaths[coil]}/${item.slug ?? item.id}`;
	}
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

<section class="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
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
				Search across public Knowledge Basket content and jump directly into the right coil.
			</p>
		</div>

		<form action="/search" method="GET" class="flex flex-col gap-3 sm:flex-row">
			<input
				type="search"
				name="q"
				value={query}
				placeholder="Search events, funding, businesses, jobs, and resources"
				class="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm shadow-xs focus:border-ring focus:ring-2 focus:ring-ring focus:outline-none"
			/>
			<Button type="submit" class="sm:self-start">Search</Button>
		</form>
	</header>

	{#if searchMode === 'events-only'}
		<Alert class="mb-6 border-amber-300 bg-amber-50 text-amber-950">
			<AlertTitle>Search is currently limited</AlertTitle>
			<AlertDescription>
				Full cross-coil indexing is not available right now, so these results currently show events
				only.
			</AlertDescription>
		</Alert>
	{/if}

	{#if query.length < 2}
		<div class="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
			Enter at least 2 characters to search across the Knowledge Basket.
		</div>
	{:else if totalResults === 0}
		<div class="rounded-xl border border-border bg-card p-6">
			<h2 class="text-lg font-semibold">No results found</h2>
			<p class="mt-2 text-sm text-muted-foreground">
				Try a broader term, a different spelling, or search within a specific coil.
			</p>
		</div>
	{:else}
		<div class="mb-4 text-sm text-muted-foreground">
			Showing {totalResults} result{totalResults === 1 ? '' : 's'} across
			{searchMode === 'all' ? 'all available coils' : 'events'}.
		</div>

		<div class="space-y-8">
			{#each orderedCoils as coil}
				{#if results[coil]?.length}
					<section aria-labelledby={`search-${coil}`}>
						<div class="mb-3 flex items-center justify-between gap-3">
							<h2 id={`search-${coil}`} class="text-xl font-semibold">
								{coilLabels[coil]}
							</h2>
							<span class="text-sm text-muted-foreground">
								{results[coil].length} result{results[coil].length === 1 ? '' : 's'}
							</span>
						</div>

						<div class="grid gap-3">
							{#each results[coil] as item (item.id)}
								<a
									href={hrefFor(coil, item)}
									class="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
								>
									<div class="mb-2 flex items-center gap-2">
										<span
											class="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase"
										>
											{coilLabels[coil]}
										</span>
									</div>
									<h3 class="text-base font-semibold text-foreground">{item.title}</h3>
									{#if item.description}
										<p class="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
											{stripHtml(String(item.description))}
										</p>
									{/if}
								</a>
							{/each}
						</div>
					</section>
				{/if}
			{/each}
		</div>
	{/if}
</section>
