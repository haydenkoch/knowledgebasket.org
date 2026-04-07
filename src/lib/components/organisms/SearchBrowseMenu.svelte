<script lang="ts">
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import HandCoins from '@lucide/svelte/icons/hand-coins';
	import Store from '@lucide/svelte/icons/store';
	import Briefcase from '@lucide/svelte/icons/briefcase';
	import Wrench from '@lucide/svelte/icons/wrench';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import SearchIcon from '@lucide/svelte/icons/search';
	import type { CoilKey } from '$lib/data/kb';
	import { PUBLIC_SEARCH_PRESETS, buildScopedSearchHref } from '$lib/search/public-search-presets';

	type NavigateHandler = (href: string) => void | Promise<void>;
	type ScopeChangeHandler = (scope: CoilKey) => void;

	let {
		query = '',
		initialScope = 'events',
		compact = false,
		onNavigate,
		onScopeChange
	}: {
		query?: string;
		initialScope?: CoilKey;
		compact?: boolean;
		onNavigate?: NavigateHandler;
		onScopeChange?: ScopeChangeHandler;
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
	let firstSuggestionEl = $state<HTMLAnchorElement | null>(null);

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
			queueMicrotask(() => firstSuggestionEl?.focus());
		}
	}

	function firstSuggestionAction(node: HTMLAnchorElement, enabled: boolean) {
		if (enabled) {
			firstSuggestionEl = node;
		}

		return {
			update(nextEnabled: boolean) {
				if (nextEnabled) {
					firstSuggestionEl = node;
				} else if (firstSuggestionEl === node) {
					firstSuggestionEl = null;
				}
			},
			destroy() {
				if (firstSuggestionEl === node) {
					firstSuggestionEl = null;
				}
			}
		};
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
	<div class="px-2 pt-2 pb-1">
		<div
			class="-mx-2 flex gap-1 overflow-x-auto px-2 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
		>
			{#each PUBLIC_SEARCH_PRESETS as preset}
				{@const Icon = presetIcons[preset.scope]}
				{@const isActive = activePreset === preset.scope}
				<button
					type="button"
					class="inline-flex shrink-0 items-center gap-1.5 rounded-[0.35rem] border px-2.5 py-1.5 text-[11px] font-semibold transition-colors {isActive
						? 'border-[var(--color-lakebed-900)] bg-[var(--color-lakebed-900)] text-white'
						: 'border-[color:var(--rule)] bg-white text-[var(--mid)]'}"
					onclick={() => setActivePreset(preset.scope)}
				>
					<Icon
						class="h-3 w-3"
						style={isActive ? 'color: white' : `color: ${presetColors[preset.scope]}`}
					/>
					{preset.label}
				</button>
			{/each}
		</div>

		{#if activePresetConfig.quickLinks.length > 0}
			<div class="mt-1 flex flex-wrap gap-1">
				{#each activePresetConfig.quickLinks as link}
					<a
						href={link.href}
						class="rounded-[0.3rem] bg-[color-mix(in_srgb,var(--color-lakebed-950)_6%,white)] px-2 py-1 text-[10px] font-semibold tracking-[0.02em] text-[var(--dark)] no-underline transition-colors hover:bg-[color-mix(in_srgb,var(--color-lakebed-950)_12%,white)] hover:no-underline"
						title={link.hint}
						onmousedown={(event) => event.preventDefault()}
						onclick={(event) => void handleNavigate(event, link.href)}
					>
						{link.label}
					</a>
				{/each}
			</div>
		{/if}

		<ul class="-mx-1 mt-1.5 space-y-0">
			{#each activePresetConfig.queries.slice(0, 4) as suggestion, i}
				<li>
					<a
						use:firstSuggestionAction={i === 0}
						href={buildScopedSearchHref(suggestion.term, activePresetConfig.scope)}
						class="group flex items-center gap-2 rounded-[0.4rem] px-2 py-1.5 no-underline transition-colors hover:bg-[color-mix(in_srgb,var(--color-lakebed-950)_7%,white)] hover:no-underline"
						onmousedown={(event) => event.preventDefault()}
						onclick={(event) =>
							void handleNavigate(
								event,
								buildScopedSearchHref(suggestion.term, activePresetConfig.scope)
							)}
					>
						<SearchIcon class="h-3.5 w-3.5 shrink-0 text-[var(--mid)]" />
						<span class="truncate text-[13px] font-medium text-[var(--dark)]">
							{suggestion.label}
						</span>
						<span class="ml-auto truncate font-mono text-[10px] text-[var(--mid)]/70 tabular-nums">
							{suggestion.term}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	</div>
{:else}
	<div class="grid gap-0 md:grid-cols-[164px_minmax(0,1fr)]">
		<div
			class="border-b border-[color:var(--rule)] p-1.5 md:border-r md:border-b-0 md:bg-[color-mix(in_srgb,var(--color-lakebed-950)_3%,white)]"
		>
			<div class="space-y-0.5">
				{#each PUBLIC_SEARCH_PRESETS as preset}
					{@const Icon = presetIcons[preset.scope]}
					{@const isActive = activePreset === preset.scope}
					<button
						type="button"
						class="flex w-full items-center gap-2 rounded-[0.4rem] px-2 py-1.5 text-left transition-colors {isActive
							? 'bg-white shadow-[0_1px_0_rgba(15,23,42,0.05),0_0_0_1px_rgba(15,23,42,0.06)]'
							: 'hover:bg-white/70'}"
						onclick={() => setActivePreset(preset.scope)}
						onmouseenter={() => setActivePreset(preset.scope)}
						onfocus={() => setActivePreset(preset.scope)}
						onkeydown={(event) => handlePresetRowKeydown(event, preset.scope)}
					>
						<Icon class="h-3.5 w-3.5 shrink-0" style={`color: ${presetColors[preset.scope]}`} />
						<span
							class="flex-1 truncate text-[13px] font-semibold {isActive
								? 'text-[var(--dark)]'
								: 'text-[var(--mid)]'}"
						>
							{preset.label}
						</span>
						{#if isActive}
							<span
								class="h-1.5 w-1.5 shrink-0 rounded-full"
								style={`background: ${presetColors[preset.scope]}`}
							></span>
						{/if}
					</button>
				{/each}
			</div>
		</div>

		<div class="p-2">
			{#if activePresetConfig.quickLinks.length > 0}
				<div class="flex flex-wrap gap-1 px-1 pb-1.5">
					{#each activePresetConfig.quickLinks as link}
						<a
							href={link.href}
							class="inline-flex items-center rounded-[0.3rem] bg-[color-mix(in_srgb,var(--color-lakebed-950)_6%,white)] px-2 py-1 text-[10px] font-semibold tracking-[0.02em] text-[var(--dark)] no-underline transition-colors hover:bg-[color-mix(in_srgb,var(--color-lakebed-950)_12%,white)] hover:no-underline"
							title={link.hint}
							onmousedown={(event) => event.preventDefault()}
							onclick={(event) => void handleNavigate(event, link.href)}
						>
							{link.label}
						</a>
					{/each}
				</div>
			{/if}

			<ul class="space-y-0">
				{#each activePresetConfig.queries as suggestion, i}
					<li>
						<a
							use:firstSuggestionAction={i === 0}
							href={buildScopedSearchHref(suggestion.term, activePresetConfig.scope)}
							class="group flex items-center gap-2 rounded-[0.4rem] px-2 py-1.5 no-underline transition-colors hover:bg-[color-mix(in_srgb,var(--color-lakebed-950)_7%,white)] hover:no-underline"
							onmousedown={(event) => event.preventDefault()}
							onclick={(event) =>
								void handleNavigate(
									event,
									buildScopedSearchHref(suggestion.term, activePresetConfig.scope)
								)}
						>
							<SearchIcon class="h-3.5 w-3.5 shrink-0 text-[var(--mid)]" />
							<span class="truncate text-[13px] font-medium text-[var(--dark)]">
								{suggestion.label}
							</span>
							<span
								class="ml-auto hidden truncate font-mono text-[10px] text-[var(--mid)]/70 tabular-nums sm:inline"
							>
								{suggestion.term}
							</span>
							<ArrowUpRight
								class="h-3 w-3 shrink-0 text-[var(--mid)]/0 transition-colors group-hover:text-[var(--mid)]"
							/>
						</a>
					</li>
				{/each}
			</ul>
		</div>
	</div>
{/if}
