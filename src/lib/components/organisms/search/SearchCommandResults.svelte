<script lang="ts">
	import { trackSearchResultClicked } from '$lib/analytics/events';
	import * as Command from '$lib/components/ui/command/index.js';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import CornerDownLeft from '@lucide/svelte/icons/corner-down-left';
	import type { SearchGroup } from '$lib/server/search-contracts';
	import SearchResultIcon from '$lib/components/organisms/search/SearchResultIcon.svelte';

	let {
		groups,
		onNavigate,
		searchAllHref,
		searchAllLabel,
		emptyLabel,
		isAdmin = false,
		surface = undefined,
		query = '',
		selectedScope = 'all'
	}: {
		groups: SearchGroup[];
		onNavigate: (href: string) => void | Promise<void>;
		searchAllHref?: string;
		searchAllLabel?: string;
		emptyLabel: string;
		isAdmin?: boolean;
		surface?: 'global' | 'autocomplete';
		query?: string;
		selectedScope?: 'all' | 'events' | 'funding' | 'redpages' | 'jobs' | 'toolbox';
	} = $props();

	function itemValue(groupLabel: string, title: string, subtitle: string): string {
		return [title, groupLabel, subtitle].filter(Boolean).join(' ');
	}

	function trackResultClick(result: SearchGroup['results'][number], position: number) {
		if (!surface) return;

		trackSearchResultClicked({
			surface,
			query,
			scope: selectedScope,
			resultScope: result.scope,
			resultKind: result.kind,
			resultSlug: result.slug ?? result.id,
			href: result.href,
			position
		});
	}
</script>

{#if groups.length === 0}
	<div class="space-y-4 px-4 py-6">
		<div class="text-sm text-[var(--mid)]">{emptyLabel}</div>
		{#if searchAllHref && searchAllLabel}
			<button
				type="button"
				class="inline-flex items-center gap-2 rounded-full border border-[color:var(--rule)] bg-white px-4 py-2 font-sans text-sm font-semibold text-[var(--dark)] transition-colors hover:bg-[var(--color-alpine-100,var(--bone))]"
				onclick={() => void onNavigate(searchAllHref)}
			>
				{searchAllLabel}
			</button>
		{/if}
	</div>
{:else}
	{#each groups as group}
		<Command.Group heading={group.label}>
			{#each group.results as result, index}
				<Command.Item
					value={itemValue(group.label, result.title, result.presentation.subtitle)}
					onSelect={() => {
						trackResultClick(result, index + 1);
						void onNavigate(result.href);
					}}
					class="rounded-xl px-3 py-3 aria-selected:bg-[color-mix(in_srgb,var(--color-lakebed-950)_10%,white)] aria-selected:text-[var(--dark)]"
				>
					<div class="flex min-w-0 flex-1 items-center gap-3">
						<div
							class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-lakebed-950)_6%,white)]"
						>
							<SearchResultIcon
								icon={result.presentation.icon}
								class="h-4 w-4 text-[var(--color-lakebed-900)]"
							/>
						</div>
						<div class="min-w-0 flex-1">
							<div class="truncate text-sm font-semibold text-[var(--dark)]">{result.title}</div>
							<div class="truncate text-xs text-[var(--mid)]">{result.presentation.subtitle}</div>
						</div>
					</div>
					<div class="ml-3 flex shrink-0 items-center gap-2">
						<span
							class="hidden rounded-full bg-[color-mix(in_srgb,var(--color-lakebed-950)_6%,white)] px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-[var(--mid)] uppercase sm:inline-flex"
						>
							{result.presentation.badge}
						</span>
						{#if isAdmin}
							<CornerDownLeft class="h-4 w-4 text-[var(--mid)]" />
						{:else}
							<ChevronRight class="h-4 w-4 text-[var(--mid)]" />
						{/if}
					</div>
				</Command.Item>
			{/each}
		</Command.Group>
	{/each}

	{#if searchAllHref && searchAllLabel && !isAdmin}
		<button
			type="button"
			class="flex w-full items-center justify-between gap-3 border-t border-[color:var(--rule)] px-4 py-3 text-left text-sm font-semibold text-[var(--dark)] transition-colors hover:bg-[var(--color-alpine-100,var(--bone))]"
			onclick={() => void onNavigate(searchAllHref)}
		>
			<span>{searchAllLabel}</span>
			<ChevronRight class="h-4 w-4 shrink-0 text-[var(--mid)]" />
		</button>
	{/if}
{/if}
