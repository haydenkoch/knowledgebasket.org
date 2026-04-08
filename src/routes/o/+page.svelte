<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { untrack } from 'svelte';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import KbHero from '$lib/components/organisms/KbHero.svelte';
	import ListLocationMap from '$lib/components/organisms/ListLocationMap.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { buildOgImagePath } from '$lib/seo/metadata';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import SearchIcon from '@lucide/svelte/icons/search';
	import BadgeCheckIcon from '@lucide/svelte/icons/badge-check';

	type PaginationToken =
		| { key: string; type: 'page'; value: number }
		| { key: string; type: 'ellipsis' };

	let { data } = $props();
	const origin = $derived((data.seoOrigin ?? '') as string);
	const organizations = $derived(data.organizations);
	const pagination = $derived(data.pagination);
	const mapPoints = $derived(data.mapPoints ?? []);
	const mapboxToken = $derived((data.mapboxToken ?? null) as string | null);

	let searchQuery = $state('');
	let syncingFromData = false;
	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	let lastCommittedQuery = '';
	const routeSearch = $derived($page.url.search);

	$effect(() => {
		const _current = routeSearch;
		untrack(() => {
			syncingFromData = true;
			searchQuery = data.query ?? '';
			lastCommittedQuery = searchQuery;
			queueMicrotask(() => {
				syncingFromData = false;
			});
		});
	});

	$effect(() => {
		const q = searchQuery;
		if (syncingFromData) return;
		if (q === lastCommittedQuery) return;
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			lastCommittedQuery = q;
			const url = new URL($page.url);
			if (q.trim()) url.searchParams.set('q', q.trim());
			else url.searchParams.delete('q');
			url.searchParams.delete('page');
			goto(url, { keepFocus: true, noScroll: true, replaceState: true });
		}, 220);
		return () => clearTimeout(searchTimer);
	});

	function buildPageHref(next: number) {
		const url = new URL($page.url);
		if (next > 1) url.searchParams.set('page', String(next));
		else url.searchParams.delete('page');
		return `${url.pathname}${url.search}`;
	}

	const paginationTokens = $derived.by<PaginationToken[]>(() => {
		const totalPages = pagination.totalPages;
		const currentPage = pagination.page;
		if (totalPages <= 1) return [];
		const pages = new Set(
			[1, currentPage - 1, currentPage, currentPage + 1, totalPages].filter(
				(v) => v >= 1 && v <= totalPages
			)
		);
		const sorted = [...pages].sort((a, b) => a - b);
		const tokens: PaginationToken[] = [];
		let prev = 0;
		for (const p of sorted) {
			if (prev && p - prev > 1) {
				tokens.push({ key: `e-${prev}-${p}`, type: 'ellipsis' });
			}
			tokens.push({ key: `p-${p}`, type: 'page', value: p });
			prev = p;
		}
		return tokens;
	});
</script>

<SeoHead
	{origin}
	pathname="/o"
	title="Organizations | Knowledge Basket"
	description="Browse Tribes, agencies, and Indigenous-serving organizations in the Knowledge Basket network."
	ogImage={buildOgImagePath({
		title: 'Organizations',
		eyebrow: 'Knowledge Basket',
		theme: 'events',
		meta: 'Tribes, agencies, and Indigenous-serving partners'
	})}
	ogImageAlt="Knowledge Basket organizations social preview"
	breadcrumbItems={[
		{ name: 'Knowledge Basket', pathname: '/' },
		{ name: 'Organizations', pathname: '/o' }
	]}
/>

{#snippet stats()}
	<div class="font-sans text-white">
		<strong class="block text-[28px] leading-none font-bold">{pagination.total}</strong>
		<span class="text-xs opacity-70">Organizations listed</span>
	</div>
{/snippet}

<div>
	<KbHero
		coil="home"
		eyebrow="Knowledge Basket · Organizations"
		title="Organizations"
		description="Tribes, agencies, and Indigenous-serving organizations active across the network."
		{stats}
	/>

	{#if mapboxToken && mapPoints.length}
		<div class="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
			<ListLocationMap
				token={mapboxToken}
				kind="organization"
				points={mapPoints}
			/>
		</div>
	{/if}

	<div class="mx-auto max-w-6xl px-4 py-6 sm:px-6">
		<div
			class="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--rule)] pb-4"
		>
			<div class="relative w-full max-w-sm">
				<SearchIcon
					class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--muted-foreground)]"
				/>
				<Input
					type="search"
					placeholder="Search organizations, regions, tribes"
					bind:value={searchQuery}
					class="pl-9"
				/>
			</div>
			<div class="font-sans text-sm text-[var(--muted-foreground)]">
				Showing <strong class="text-[var(--foreground)]">{pagination.total}</strong> organizations
			</div>
		</div>

		{#if organizations.length === 0}
			<div class="flex flex-col items-center justify-center py-16 text-center">
				<p class="mb-1 font-serif text-lg font-semibold text-[var(--foreground)]">
					No organizations found
				</p>
				<p class="text-sm text-[var(--muted-foreground)]">
					Try adjusting your search or check back soon.
				</p>
			</div>
		{:else}
			<ul class="grid list-none gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
				{#each organizations as org (org.id)}
					{@const location = [org.city, org.state].filter(Boolean).join(', ')}
					<li>
						<a
							href={`/o/${org.slug}`}
							class="flex h-full flex-col rounded-[18px] border border-[var(--border)] bg-[var(--card)] p-5 text-inherit no-underline shadow-[var(--sh)] transition-transform hover:-translate-y-0.5 hover:[&_*]:no-underline"
						>
							<div class="flex items-start gap-4">
								{#if org.logoUrl}
									<img
										src={org.logoUrl}
										alt=""
										class="size-12 shrink-0 rounded-xl border border-[var(--border)] bg-white object-contain p-1.5"
									/>
								{/if}
								<div class="min-w-0 flex-1">
									<div class="mb-1 flex flex-wrap items-center gap-1.5">
										{#if org.verified}
											<span
												class="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--teal)_12%,white)] px-2 py-0.5 text-[10px] font-bold tracking-[0.08em] text-[var(--teal)] uppercase"
											>
												<BadgeCheckIcon class="size-3" />
												Verified
											</span>
										{/if}
										{#if org.orgType}
											<span
												class="rounded-full bg-[var(--muted)] px-2 py-0.5 text-[10px] font-bold tracking-[0.08em] text-[var(--muted-foreground)] uppercase"
											>
												{org.orgType}
											</span>
										{/if}
									</div>
									<h2
										class="font-serif text-xl leading-tight font-semibold text-[var(--foreground)]"
									>
										{org.name}
									</h2>
								</div>
							</div>
							{#if org.description}
								<p class="mt-3 line-clamp-3 text-sm leading-6 text-[var(--muted-foreground)]">
									{org.description}
								</p>
							{/if}
							{#if location || org.region}
								<div
									class="mt-3 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]"
								>
									<MapPinIcon class="size-3.5 shrink-0" />
									<span class="truncate">{location || org.region}</span>
								</div>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		{/if}

		{#if pagination.totalPages > 1}
			<nav class="flex flex-wrap items-center justify-center gap-1 pt-6" aria-label="Pagination">
				<Button
					variant="ghost"
					href={pagination.page > 1 ? buildPageHref(pagination.page - 1) : undefined}
					disabled={pagination.page <= 1}
				>
					Previous
				</Button>
				{#each paginationTokens as token (token.key)}
					{#if token.type === 'ellipsis'}
						<span class="px-2 text-sm text-[var(--muted-foreground)]">…</span>
					{:else}
						<Button
							variant={token.value === pagination.page ? 'outline' : 'ghost'}
							size="icon-sm"
							href={buildPageHref(token.value)}
							aria-current={token.value === pagination.page ? 'page' : undefined}
						>
							{token.value}
						</Button>
					{/if}
				{/each}
				<Button
					variant="ghost"
					href={pagination.page < pagination.totalPages
						? buildPageHref(pagination.page + 1)
						: undefined}
					disabled={pagination.page >= pagination.totalPages}
				>
					Next
				</Button>
			</nav>
		{/if}
	</div>
</div>
