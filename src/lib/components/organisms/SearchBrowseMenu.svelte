<script lang="ts">
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import HandCoins from '@lucide/svelte/icons/hand-coins';
	import Store from '@lucide/svelte/icons/store';
	import Briefcase from '@lucide/svelte/icons/briefcase';
	import Wrench from '@lucide/svelte/icons/wrench';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import type { CoilKey } from '$lib/data/kb';
	import {
		PUBLIC_SEARCH_PRESETS,
		buildSearchHref,
		buildScopedSearchHref
	} from '$lib/search/public-search-presets';

	let {
		query = '',
		initialScope = 'events',
		compact = false,
		headline = 'Start with a coil',
		description = 'Pick the area you want, then choose a quick path.',
		onNavigate,
		onScopeChange
	}: {
		query?: string;
		initialScope?: CoilKey;
		compact?: boolean;
		headline?: string;
		description?: string;
		onNavigate?: (href: string) => void | Promise<void>;
		onScopeChange?: (scope: CoilKey) => void;
	} = $props();

	const presetIcons: Record<CoilKey, typeof CalendarDays> = {
		events: CalendarDays,
		funding: HandCoins,
		redpages: Store,
		jobs: Briefcase,
		toolbox: Wrench
	};

	const presetColors: Record<CoilKey, string> = {
		events: 'var(--teal)',
		funding: 'var(--gold)',
		redpages: 'var(--red)',
		jobs: 'var(--forest)',
		toolbox: 'var(--slate)'
	};

	let activePreset = $state<CoilKey>('events');
	let detailActionEl = $state<HTMLAnchorElement | null>(null);

	$effect(() => {
		activePreset = initialScope;
	});

	const activePresetConfig = $derived(
		PUBLIC_SEARCH_PRESETS.find((preset) => preset.scope === activePreset) ??
			PUBLIC_SEARCH_PRESETS[0]
	);

	function setActivePreset(scope: CoilKey) {
		activePreset = scope;
		onScopeChange?.(scope);
	}

	function handlePresetRowKeydown(event: KeyboardEvent, scope: CoilKey) {
		if (event.key === 'Tab' && !event.shiftKey) {
			event.preventDefault();
			setActivePreset(scope);
			queueMicrotask(() => detailActionEl?.focus());
		}
	}

	function activePresetSearchHref() {
		return buildSearchHref({
			q: query,
			scope: activePresetConfig.scope,
			sort: query.trim() ? 'relevance' : 'recent'
		});
	}

	async function handleNavigate(event: MouseEvent, href: string) {
		event.preventDefault();
		if (onNavigate) {
			await onNavigate(href);
			return;
		}
		window.location.href = href;
	}
</script>

{#if compact}
	<div class="space-y-3 px-3 py-2">
		<div class="space-y-1">
			<div class="text-[11px] font-semibold tracking-[0.08em] text-[var(--mid)] uppercase">
				{headline}
			</div>
			<p class="text-xs leading-5 text-[var(--mid)]">{description}</p>
		</div>

		<div class="flex flex-wrap gap-1.5">
			{#each PUBLIC_SEARCH_PRESETS as preset}
				<button
					type="button"
					class="rounded-[0.3rem] border px-3 py-1.5 text-[11px] font-semibold transition-colors {activePreset ===
					preset.scope
						? 'border-[var(--color-lakebed-900)] bg-[color-mix(in_srgb,var(--color-lakebed-950)_9%,white)] text-[var(--dark)]'
						: 'border-[color:var(--rule)] bg-white text-[var(--mid)]'}"
					onclick={() => setActivePreset(preset.scope)}
				>
					{preset.label}
				</button>
			{/each}
		</div>

		<div class="space-y-1.5 rounded-[0.55rem] border border-[color:var(--rule)] bg-white p-3">
			<div class="flex items-center justify-between gap-3">
				<div class="text-sm font-semibold text-[var(--dark)]">{activePresetConfig.label}</div>
				<a
					bind:this={detailActionEl}
					href={activePresetSearchHref()}
					class="inline-flex items-center gap-1 rounded-[0.3rem] bg-[color-mix(in_srgb,var(--color-lakebed-950)_6%,white)] px-2.5 py-1 text-[10px] font-semibold text-[var(--dark)] no-underline"
					onmousedown={(event) => event.preventDefault()}
					onclick={(event) => void handleNavigate(event, activePresetSearchHref())}
				>
					{query.trim() ? 'Search coil' : 'Browse'}
					<ChevronRight class="h-3 w-3" />
				</a>
			</div>
			<div class="flex flex-wrap gap-1.5">
				{#each activePresetConfig.quickLinks.slice(0, 2) as link}
					<a
						href={link.href}
						class="rounded-[0.3rem] bg-[color-mix(in_srgb,var(--color-lakebed-950)_6%,white)] px-2.5 py-1 text-[10px] font-semibold text-[var(--dark)] no-underline"
						onmousedown={(event) => event.preventDefault()}
						onclick={(event) => void handleNavigate(event, link.href)}
					>
						{link.label}
					</a>
				{/each}
			</div>
			<div class="grid gap-1.5">
				{#each activePresetConfig.queries.slice(0, 3) as suggestion}
					<a
						href={buildScopedSearchHref(suggestion.term, activePresetConfig.scope)}
						class="rounded-[0.45rem] border border-[color:var(--rule)] px-3 py-2 no-underline transition-colors hover:bg-[var(--color-alpine-100,var(--bone))] hover:no-underline"
						onmousedown={(event) => event.preventDefault()}
						onclick={(event) =>
							void handleNavigate(
								event,
								buildScopedSearchHref(suggestion.term, activePresetConfig.scope)
							)}
					>
						<span class="block text-sm font-semibold text-[var(--dark)]">{suggestion.label}</span>
						<span class="mt-0.5 block text-[11px] leading-5 text-[var(--mid)]">
							{suggestion.hint}
						</span>
					</a>
				{/each}
			</div>
		</div>
	</div>
{:else}
	<div class="border-b border-[color:var(--rule)] px-4 py-2.5">
		<div class="text-[11px] font-semibold tracking-[0.08em] text-[var(--mid)] uppercase">
			{headline}
		</div>
		<p class="mt-1 text-sm text-[var(--mid)]">{description}</p>
	</div>

	<div class="grid gap-0 md:grid-cols-[180px_minmax(0,1fr)]">
		<div class="border-b border-[color:var(--rule)] p-2 md:border-r md:border-b-0">
			<div class="space-y-1">
				{#each PUBLIC_SEARCH_PRESETS as preset}
					{@const Icon = presetIcons[preset.scope]}
					<button
						type="button"
						class="flex w-full items-center gap-3 rounded-[0.45rem] px-3 py-2 text-left transition-colors {activePreset ===
						preset.scope
							? 'bg-[color-mix(in_srgb,var(--color-lakebed-950)_8%,white)]'
							: 'hover:bg-[var(--color-alpine-100,var(--bone))]'}"
						onclick={() => setActivePreset(preset.scope)}
						onmouseenter={() => setActivePreset(preset.scope)}
						onfocus={() => setActivePreset(preset.scope)}
						onkeydown={(event) => handlePresetRowKeydown(event, preset.scope)}
					>
						<div
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.45rem] bg-[color-mix(in_srgb,var(--color-alpine-100,var(--bone))_72%,white)]"
						>
							<Icon class="h-4 w-4" style={`color: ${presetColors[preset.scope]}`} />
						</div>
						<div class="min-w-0 flex-1">
							<div class="text-sm font-semibold text-[var(--dark)]">{preset.label}</div>
							<div class="truncate text-[11px] text-[var(--mid)]">{preset.description}</div>
						</div>
						<ChevronRight
							class="h-4 w-4 shrink-0 text-[var(--mid)] {activePreset === preset.scope
								? 'opacity-100'
								: 'opacity-45'}"
						/>
					</button>
				{/each}
			</div>
		</div>

		<div class="space-y-3 p-3">
			<div class="flex flex-wrap items-start justify-between gap-3">
				<div>
					<div class="text-sm font-semibold text-[var(--dark)]">{activePresetConfig.label}</div>
					<div class="mt-1 text-xs leading-5 text-[var(--mid)]">
						{query.trim()
							? `Keep your search focused inside ${activePresetConfig.label.toLowerCase()}.`
							: activePresetConfig.description}
					</div>
				</div>
				<a
					bind:this={detailActionEl}
					href={activePresetSearchHref()}
					class="inline-flex shrink-0 items-center gap-1 rounded-[0.3rem] border border-[color:var(--rule)] bg-[color-mix(in_srgb,var(--color-lakebed-950)_4%,white)] px-3 py-1.5 text-xs font-semibold text-[var(--dark)] no-underline transition-colors hover:bg-[var(--color-alpine-100,var(--bone))] hover:no-underline"
					onmousedown={(event) => event.preventDefault()}
					onclick={(event) => void handleNavigate(event, activePresetSearchHref())}
				>
					{query.trim()
						? `Search only ${activePresetConfig.label}`
						: `Browse ${activePresetConfig.label}`}
					<ChevronRight class="h-3.5 w-3.5" />
				</a>
			</div>

			<div class="space-y-1.5">
				<div class="text-[10px] font-semibold tracking-[0.08em] text-[var(--mid)] uppercase">
					Quick Filters
				</div>
				<div class="flex flex-wrap gap-1.5">
					{#each activePresetConfig.quickLinks as link}
						<a
							href={link.href}
							class="rounded-[0.3rem] bg-[color-mix(in_srgb,var(--color-lakebed-950)_6%,white)] px-3 py-1.5 text-[11px] font-semibold text-[var(--dark)] no-underline transition-colors hover:bg-[color-mix(in_srgb,var(--color-lakebed-950)_10%,white)] hover:no-underline"
							title={link.hint}
							onmousedown={(event) => event.preventDefault()}
							onclick={(event) => void handleNavigate(event, link.href)}
						>
							{link.label}
						</a>
					{/each}
				</div>
			</div>

			<div class="space-y-1.5">
				<div class="text-[10px] font-semibold tracking-[0.08em] text-[var(--mid)] uppercase">
					Friendly Starts
				</div>
				<div class="grid gap-1.5 sm:grid-cols-2">
					{#each activePresetConfig.queries as suggestion}
						<a
							href={buildScopedSearchHref(suggestion.term, activePresetConfig.scope)}
							class="rounded-[0.45rem] border border-[color:var(--rule)] px-3 py-2 text-left no-underline transition-colors hover:bg-[var(--color-alpine-100,var(--bone))] hover:no-underline"
							onmousedown={(event) => event.preventDefault()}
							onclick={(event) =>
								void handleNavigate(
									event,
									buildScopedSearchHref(suggestion.term, activePresetConfig.scope)
								)}
						>
							<span class="block text-sm font-semibold text-[var(--dark)]">{suggestion.label}</span>
							<span class="mt-0.5 block text-[11px] leading-5 text-[var(--mid)]">
								{suggestion.hint}
							</span>
						</a>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}
