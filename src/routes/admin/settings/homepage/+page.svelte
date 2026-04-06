<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { flip } from 'svelte/animate';
	import { dndzone } from 'svelte-dnd-action';
	import AdminPageHeader from '$lib/components/organisms/admin/AdminPageHeader.svelte';
	import RichTextEditor from '$lib/components/molecules/RichTextEditor.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { coilLabels, type CoilKey } from '$lib/data/kb';
	import {
		DEFAULT_HEADINGS,
		HOMEPAGE_LAYOUT_LABELS,
		SOURCE_SORT_OPTIONS,
		SOURCE_HAS_DATE_FILTER,
		SOURCE_LAYOUT_PRESETS,
		createSection,
		resolveSectionLayoutPreset,
		type SectionSource,
		type HomepageSectionConfig
	} from '$lib/data/homepage';
	import {
		CalendarDays,
		HandCoins,
		Store,
		Briefcase,
		Wrench,
		Star,
		FileText as FileTextIcon,
		ChevronRight,
		ChevronDown,
		X,
		EyeOff,
		Search,
		RotateCcw,
		Trash2,
		GripVertical,
		ExternalLink,
		Plus
	} from '@lucide/svelte';

	let { data } = $props();
	type SectionPreviewItem = { id: string; title: string; skipped?: boolean };
	type FeaturedEditorItem = {
		id: string;
		coil: string;
		itemId: string;
		title: string;
		itemTitle: string;
	};

	const sourceIcons: Record<string, typeof CalendarDays> = {
		featured: Star,
		richtext: FileTextIcon,
		events: CalendarDays,
		funding: HandCoins,
		redpages: Store,
		jobs: Briefcase,
		toolbox: Wrench
	};
	const sourceColors: Record<string, string> = {
		featured: 'var(--color-flicker-600)',
		richtext: 'var(--color-elderberry-600)',
		events: 'var(--teal)',
		funding: 'var(--gold)',
		redpages: 'var(--red)',
		jobs: 'var(--forest)',
		toolbox: 'var(--slate)'
	};
	const sourceLabels: Record<string, string> = {
		featured: "Editor's Picks",
		richtext: 'Rich Text',
		...coilLabels
	};

	const FLIP_MS = 200;
	const paletteSourceTypes: SectionSource[] = [
		'events',
		'funding',
		'jobs',
		'redpages',
		'toolbox',
		'featured',
		'richtext'
	];

	// ── Editor state ──────────────────────────────────────────
	let sections = $state<HomepageSectionConfig[]>([]);
	let visibilityState = $state<Record<string, boolean>>({});
	let expandedSections = $state<Set<string>>(new Set());
	let richtextValues = $state<Record<string, string>>({});
	let sectionPreviews = $state<Record<string, SectionPreviewItem[]>>({});
	let previewLoadingState = $state<Record<string, boolean>>({});
	let featItems = $state<FeaturedEditorItem[]>([]);
	let dragPaletteSource = $state<SectionSource | null>(null);
	let dragInsertIndex = $state<number | null>(null);
	const previewTimers = new Map<string, ReturnType<typeof setTimeout>>();

	$effect(() => {
		const nextSections = data.config.sections.map((s) => ({
			...s,
			excludedIds: s.excludedIds ? [...s.excludedIds] : undefined
		}));
		sections = nextSections;
		const vis: Record<string, boolean> = {};
		const rtv: Record<string, string> = {};
		for (const s of nextSections) {
			vis[s.id] = s.visible;
			if (s.source === 'richtext') rtv[s.id] = s.content ?? '';
		}
		visibilityState = vis;
		richtextValues = rtv;
		sectionPreviews = Object.fromEntries(
			Object.entries(data.sectionPreviews ?? {}).map(([sectionId, items]) => [
				sectionId,
				(items as SectionPreviewItem[]).map((item) => ({ ...item }))
			])
		);
		featItems = data.featuredItems.map((f) => ({
			id: `feat_${f.coil}_${f.item.id}`,
			coil: f.coil,
			itemId: f.item.id,
			title: f.item.title,
			itemTitle: f.item.title
		}));
	});

	function isVisible(id: string) {
		return visibilityState[id] ?? true;
	}
	function toggleVisibility(id: string) {
		visibilityState = { ...visibilityState, [id]: !isVisible(id) };
	}
	function setPreviewLoading(id: string, loading: boolean) {
		previewLoadingState = { ...previewLoadingState, [id]: loading };
	}
	function isPreviewLoading(id: string) {
		return previewLoadingState[id] ?? false;
	}
	function displayHeading(section: HomepageSectionConfig) {
		return section.heading || DEFAULT_HEADINGS[section.source];
	}
	function displayLayout(section: HomepageSectionConfig) {
		return HOMEPAGE_LAYOUT_LABELS[resolveSectionLayoutPreset(section)];
	}
	function layoutPresetsFor(source: SectionSource) {
		return SOURCE_LAYOUT_PRESETS[source] ?? ['auto'];
	}
	function resolvePresetOption(section: HomepageSectionConfig, preset: string) {
		return resolveSectionLayoutPreset({
			source: section.source,
			limit: section.limit,
			layoutPreset: preset as HomepageSectionConfig['layoutPreset']
		});
	}
	function layoutPresetHint(section: HomepageSectionConfig, preset: string) {
		const resolved = resolvePresetOption(section, preset);
		if (preset === 'auto') {
			return `Currently ${HOMEPAGE_LAYOUT_LABELS[resolved].toLowerCase()}`;
		}
		switch (resolved) {
			case 'cards':
				return 'Side-by-side story cards';
			case 'list':
				return 'Simple stacked rows';
			case 'compact':
				return 'Dense two-column links';
			case 'banner':
				return 'Wide announcement banner';
			default:
				return HOMEPAGE_LAYOUT_LABELS[resolved];
		}
	}
	function getSection(id: string) {
		return sections.find((section) => section.id === id);
	}
	function updateSection(
		id: string,
		updater: (section: HomepageSectionConfig) => HomepageSectionConfig
	) {
		sections = sections.map((section) => (section.id === id ? updater(section) : section));
	}
	function updateLayoutPreset(id: string, layoutPreset: string) {
		updateSection(id, (section) => ({
			...section,
			layoutPreset: layoutPreset as HomepageSectionConfig['layoutPreset']
		}));
	}
	async function refreshSectionPreview(sectionId: string) {
		const section = getSection(sectionId);
		if (!section || section.source === 'featured' || section.source === 'richtext') {
			return;
		}

		setPreviewLoading(sectionId, true);
		try {
			const res = await fetch('/api/admin/homepage-preview', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(section)
			});
			if (!res.ok) throw new Error('Preview request failed');
			const json = (await res.json()) as { items?: SectionPreviewItem[] };
			sectionPreviews = {
				...sectionPreviews,
				[sectionId]: (json.items ?? []).map((item) => ({ ...item }))
			};
		} catch {
			toast.error('Could not refresh section preview');
		} finally {
			setPreviewLoading(sectionId, false);
		}
	}
	function queueSectionPreview(sectionId: string, delay = 180) {
		const existing = previewTimers.get(sectionId);
		if (existing) clearTimeout(existing);
		const timer = setTimeout(() => {
			previewTimers.delete(sectionId);
			void refreshSectionPreview(sectionId);
		}, delay);
		previewTimers.set(sectionId, timer);
	}
	function canAddSection(source: SectionSource) {
		return source !== 'featured' || !sections.some((section) => section.source === 'featured');
	}
	function createInsertedSection(source: SectionSource, insertAt = sections.length) {
		if (!canAddSection(source)) return;
		const nextSection = createSection(source);
		const nextSections = [...sections];
		nextSections.splice(Math.max(0, Math.min(insertAt, nextSections.length)), 0, nextSection);
		sections = nextSections;
		visibilityState = { ...visibilityState, [nextSection.id]: true };
		if (source === 'richtext') {
			richtextValues = { ...richtextValues, [nextSection.id]: '' };
		}
		expandedSections = new Set([...expandedSections, nextSection.id]);
		if (source !== 'featured' && source !== 'richtext') {
			setPreviewLoading(nextSection.id, true);
			queueSectionPreview(nextSection.id, 0);
		}
	}
	function addSection(source: SectionSource) {
		createInsertedSection(source);
	}
	function clearPaletteDrag() {
		dragPaletteSource = null;
		dragInsertIndex = null;
	}
	function handlePaletteDragStart(source: SectionSource, event: DragEvent) {
		if (!canAddSection(source)) {
			event.preventDefault();
			return;
		}
		dragPaletteSource = source;
		dragInsertIndex = sections.length;
		event.dataTransfer?.setData('text/plain', source);
		if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
	}
	function handleSectionsDragOver(event: DragEvent) {
		if (!dragPaletteSource) return;
		event.preventDefault();
		const container = event.currentTarget as HTMLElement;
		const cards = Array.from(container.querySelectorAll<HTMLElement>('[data-section-card="true"]'));
		let nextIndex = cards.length;
		for (const [index, card] of cards.entries()) {
			const rect = card.getBoundingClientRect();
			if (event.clientY < rect.top + rect.height / 2) {
				nextIndex = index;
				break;
			}
		}
		dragInsertIndex = nextIndex;
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
	}
	function handleSectionsDrop(event: DragEvent) {
		if (!dragPaletteSource) return;
		event.preventDefault();
		createInsertedSection(dragPaletteSource, dragInsertIndex ?? sections.length);
		clearPaletteDrag();
	}
	function handleSectionsDragLeave(event: DragEvent) {
		if (!dragPaletteSource) return;
		const currentTarget = event.currentTarget as HTMLElement;
		const nextTarget = event.relatedTarget;
		if (!(nextTarget instanceof Node) || !currentTarget.contains(nextTarget)) {
			dragInsertIndex = null;
		}
	}
	function removeSection(id: string) {
		const timer = previewTimers.get(id);
		if (timer) {
			clearTimeout(timer);
			previewTimers.delete(id);
		}
		const nextVisibilityState = { ...visibilityState };
		delete nextVisibilityState[id];
		visibilityState = nextVisibilityState;

		const nextRichtextValues = { ...richtextValues };
		delete nextRichtextValues[id];
		richtextValues = nextRichtextValues;

		const nextPreviews = { ...sectionPreviews };
		delete nextPreviews[id];
		sectionPreviews = nextPreviews;

		const nextExpanded = new Set(expandedSections);
		nextExpanded.delete(id);
		expandedSections = nextExpanded;
		sections = sections.filter((section) => section.id !== id);
	}
	function toggleExpand(id: string) {
		const next = new Set(expandedSections);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expandedSections = next;
	}

	// ── DnD: sections ─────────────────────────────────────────
	function handleSectionConsider(e: CustomEvent<{ items: typeof sections }>) {
		sections = e.detail.items;
	}
	function handleSectionFinalize(e: CustomEvent<{ items: typeof sections }>) {
		sections = e.detail.items;
	}

	// ── Featured item search ──────────────────────────────────
	let searchQuery = $state('');
	let searchResults = $state<{ coil: string; id: string; title: string; description?: string }[]>(
		[]
	);
	let searching = $state(false);
	let searchOpen = $state(false);
	let searchFocused = $state(false);
	let searchTimer: ReturnType<typeof setTimeout>;

	const showSuggestions = $derived(
		searchFocused && searchQuery.trim().length < 2 && !searchResults.length
	);
	const showResults = $derived(searchOpen && searchResults.length > 0);

	async function doSearch(q: string) {
		if (q.trim().length < 2) {
			searchResults = [];
			searchOpen = false;
			return;
		}
		searching = true;
		try {
			const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=5`);
			const json = (await res.json()) as {
				results?: Record<
					string,
					Array<{ id?: string; slug?: string; title: string; description?: string }>
				>;
			};
			const flat: typeof searchResults = [];
			for (const [coil, items] of Object.entries(json.results ?? {})) {
				for (const item of items) {
					const id = item.id ?? item.slug ?? '';
					if (id) flat.push({ coil, id, title: item.title, description: item.description });
				}
			}
			searchResults = flat;
			searchOpen = flat.length > 0;
		} catch {
			searchResults = [];
		} finally {
			searching = false;
		}
	}
	function onSearchInput(e: Event) {
		searchQuery = (e.currentTarget as HTMLInputElement).value;
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => doSearch(searchQuery), 280);
	}
	function onSearchBlur() {
		setTimeout(() => {
			searchFocused = false;
			searchOpen = false;
		}, 300);
	}
	function isAlreadyFeatured(coil: string, id: string) {
		return featItems.some((item) => item.coil === coil && item.itemId === id);
	}
	async function addFeatured(coil: string, itemId: string, title: string) {
		if (isAlreadyFeatured(coil, itemId)) {
			toast.error('Already featured');
			return;
		}
		if (featItems.length >= 8) {
			toast.error('Maximum 8 featured items');
			return;
		}
		featItems = [
			...featItems,
			{
				id: `feat_${coil}_${itemId}`,
				coil,
				itemId,
				title,
				itemTitle: title
			}
		];
		searchQuery = '';
		searchResults = [];
		searchOpen = false;
	}
	async function removeFeatured(coil: string, itemId: string) {
		featItems = featItems.filter((item) => !(item.coil === coil && item.itemId === itemId));
	}
	function excludeItem(sectionId: string, itemId: string) {
		sections = sections.map((section) =>
			section.id === sectionId
				? {
						...section,
						excludedIds: [...new Set([...(section.excludedIds ?? []), itemId])]
					}
				: section
		);
		sectionPreviews = {
			...sectionPreviews,
			[sectionId]: (sectionPreviews[sectionId] ?? []).map((item) =>
				item.id === itemId ? { ...item, skipped: true } : item
			)
		};
		queueSectionPreview(sectionId, 0);
	}
	function unexcludeItem(sectionId: string, itemId: string) {
		sections = sections.map((section) =>
			section.id === sectionId
				? {
						...section,
						excludedIds: (section.excludedIds ?? []).filter((id) => id !== itemId)
					}
				: section
		);
		sectionPreviews = {
			...sectionPreviews,
			[sectionId]: (sectionPreviews[sectionId] ?? []).map((item) =>
				item.id === itemId ? { ...item, skipped: false } : item
			)
		};
		queueSectionPreview(sectionId, 0);
	}

	// ── Featured DnD ──────────────────────────────────────────
	function handleFeatConsider(e: CustomEvent<{ items: typeof featItems }>) {
		featItems = e.detail.items;
	}
	function handleFeatFinalize(e: CustomEvent<{ items: typeof featItems }>) {
		featItems = e.detail.items;
	}

	function enhanceToast(msg: string) {
		return () =>
			async ({
				result,
				update
			}: {
				result: { type: string; data?: Record<string, unknown> };
				update: (options?: { reset?: boolean; invalidateAll?: boolean }) => Promise<void>;
			}) => {
				if (result.type === 'success') toast.success(msg);
				else if (result.type === 'failure')
					toast.error((result.data as { error?: string })?.error ?? 'Failed');
				await update({ reset: false, invalidateAll: true });
			};
	}
</script>

<svelte:head><title>Homepage | KB Admin</title></svelte:head>

<AdminPageHeader
	eyebrow="Settings"
	title="Homepage Editor"
	description="Build the homepage in one clean pass: add sections, drag to reorder, tune filters, then save everything together."
>
	{#snippet actions()}
		<Button href="/" variant="outline" size="sm" target="_blank" rel="noreferrer">
			<ExternalLink class="mr-1.5 h-4 w-4" /> View homepage
		</Button>
	{/snippet}
</AdminPageHeader>

<div class="grid max-w-[1200px] gap-8 xl:grid-cols-[1fr_300px]">
	<div>
		<!-- Palette: add sections -->
		<div class="mb-4">
			<p class="mb-2 text-xs font-semibold text-muted-foreground uppercase">Add a section</p>
			<div class="grid gap-2 sm:grid-cols-2">
				{#each paletteSourceTypes as source}
					{@const Icon = sourceIcons[source]}
					<button
						type="button"
						class="flex items-center gap-2 rounded-lg border border-[var(--rule)] bg-white px-3 py-2 text-left text-sm font-medium shadow-xs transition-shadow hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
						onclick={() => addSection(source)}
						draggable={canAddSection(source)}
						ondragstart={(event) => handlePaletteDragStart(source, event)}
						ondragend={clearPaletteDrag}
						disabled={!canAddSection(source)}
					>
						<span
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
							style="background: {sourceColors[source]}"
						>
							{#if Icon}<Icon class="h-4 w-4" />{/if}
						</span>
						<span class="min-w-0 flex-1">{sourceLabels[source]}</span>
						{#if canAddSection(source)}
							<Plus class="h-4 w-4 text-muted-foreground" />
						{:else}
							<span class="text-[11px] font-semibold text-muted-foreground uppercase">Added</span>
						{/if}
					</button>
				{/each}
			</div>
			<p class="mt-2 text-xs text-muted-foreground">
				Drag the cards below to change section order. Changes stay local until you save.
			</p>
		</div>

		<!-- Section list -->
		<form method="POST" action="?/saveSections" use:enhance={enhanceToast('Saved')}>
			<input type="hidden" name="sectionOrder" value={sections.map((s) => s.id).join(',')} />
			<input
				type="hidden"
				name="featuredOrder"
				value={JSON.stringify(
					featItems.map((item) => ({ coil: item.coil, itemId: item.itemId, title: item.itemTitle }))
				)}
			/>
			{#each sections as sec}
				<input type="hidden" name="source_{sec.id}" value={sec.source} />
				<input
					type="hidden"
					name="excludedIds_{sec.id}"
					value={(sec.excludedIds ?? []).join(',')}
				/>
				{#if sec.source === 'richtext'}
					<input
						type="hidden"
						name="content_{sec.id}"
						value={richtextValues[sec.id] ?? sec.content ?? ''}
					/>
				{/if}
			{/each}

			<div
				use:dndzone={{
					items: sections,
					type: 'sections',
					flipDurationMs: FLIP_MS,
					dropTargetStyle: {}
				}}
				onconsider={handleSectionConsider}
				onfinalize={handleSectionFinalize}
				ondragover={handleSectionsDragOver}
				ondrop={handleSectionsDrop}
				ondragleave={handleSectionsDragLeave}
				class="min-h-[80px] space-y-2 rounded-lg"
				role="list"
			>
				{#each sections as sec, sectionIdx (sec.id)}
					{@const Icon = sourceIcons[sec.source]}
					{@const isFeatured = sec.source === 'featured'}
					{@const isRichtext = sec.source === 'richtext'}
					{@const isCoil = !isFeatured && !isRichtext}
					{@const isExpanded = expandedSections.has(sec.id)}
					{@const previews = isCoil ? (sectionPreviews[sec.id] ?? []) : []}
					{@const sortOpts = SOURCE_SORT_OPTIONS[sec.source] ?? []}
					{@const hasDateFilter = SOURCE_HAS_DATE_FILTER[sec.source] ?? false}

					<div
						animate:flip={{ duration: FLIP_MS }}
						class="rounded-lg border border-[var(--rule)] bg-white"
						data-section-card="true"
					>
						{#if dragPaletteSource && dragInsertIndex === sectionIdx}
							<div class="h-0.5 rounded-t-lg bg-[var(--teal)]"></div>
						{/if}
						<!-- Header row -->
						<button
							type="button"
							class="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/30"
							onclick={() => toggleExpand(sec.id)}
						>
							<GripVertical class="h-4 w-4 shrink-0 cursor-grab text-muted-foreground/40" />
							<span
								class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
								style="background: {sourceColors[sec.source]}"
							>
								{#if Icon}<Icon class="h-4 w-4" />{/if}
							</span>
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<p class="text-sm font-semibold text-[var(--dark)]">{displayHeading(sec)}</p>
									<span
										class="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
										>{sourceLabels[sec.source]}</span
									>
									{#if !isVisible(sec.id)}<EyeOff class="h-3 w-3 text-muted-foreground" />{/if}
								</div>
								<p class="text-[11px] text-muted-foreground">
									{#if isFeatured}
										{featItems.length} item{featItems.length !== 1 ? 's' : ''}
									{:else if isRichtext}
										{displayLayout(sec)} layout · custom HTML content
									{:else}
										{sec.sortBy}
										{sec.sortDir}{sec.futureOnly ? ' · future only' : ''}{sec.searchQuery
											? ` · filter "${sec.searchQuery}"`
											: ''} · {displayLayout(sec)} · {previews.length}/{sec.limit}
										{#if sec.excludedIds?.length}
											· {sec.excludedIds.length} skipped{/if}
									{/if}
								</p>
							</div>
							<ChevronDown
								class="h-4 w-4 shrink-0 text-muted-foreground transition-transform {isExpanded
									? 'rotate-180'
									: ''}"
							/>
						</button>

						{#if isExpanded}
							<div class="border-t border-[var(--rule)]">
								<!-- Controls -->
								<div
									class="flex flex-wrap items-end gap-3 bg-[var(--color-alpine-100,var(--bone))]/50 px-4 py-3"
								>
									<input
										type="hidden"
										name="visible_{sec.id}"
										value={isVisible(sec.id) ? 'on' : ''}
									/>
									<button
										type="button"
										class="flex items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 text-xs hover:bg-accent"
										onclick={(e) => {
											e.stopPropagation();
											toggleVisibility(sec.id);
										}}
									>
										{#if isVisible(sec.id)}
											<span class="font-medium text-[var(--forest)]">Visible</span>
										{:else}
											<EyeOff class="h-3.5 w-3.5 text-muted-foreground" />
											<span class="font-medium text-muted-foreground">Hidden</span>
										{/if}
									</button>

									{#if isCoil}
										<div class="min-w-[320px] flex-[1.35] space-y-1.5">
											<div class="flex items-center justify-between gap-2">
												<Label class="text-[10px] font-semibold text-muted-foreground uppercase"
													>Layout</Label
												>
												<span
													class="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[var(--dark)]"
												>
													Showing {displayLayout(sec)}
												</span>
											</div>
											<input
												type="hidden"
												name="layoutPreset_{sec.id}"
												value={sec.layoutPreset ?? 'auto'}
											/>
											<div class="grid gap-2 sm:grid-cols-3">
												{#each layoutPresetsFor(sec.source) as preset}
													{@const selected = (sec.layoutPreset ?? 'auto') === preset}
													{@const previewLayout = resolvePresetOption(sec, preset)}
													<button
														type="button"
														class="rounded-xl border p-2.5 text-left transition-all {selected
															? 'border-[var(--teal)] bg-white shadow-[var(--sh)]'
															: 'border-[var(--rule)] bg-white/80 hover:border-[var(--teal)]/40 hover:bg-white'}"
														aria-pressed={selected}
														onclick={() => updateLayoutPreset(sec.id, preset)}
													>
														<div class="flex items-start justify-between gap-2">
															<div>
																<div class="text-xs font-semibold text-[var(--dark)]">
																	{HOMEPAGE_LAYOUT_LABELS[preset]}
																</div>
																<div class="mt-0.5 text-[10px] text-muted-foreground">
																	{layoutPresetHint(sec, preset)}
																</div>
															</div>
															{#if preset === 'auto'}
																<span
																	class="rounded-full bg-[var(--color-pinyon-100)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--mid)] uppercase"
																>
																	Auto
																</span>
															{/if}
														</div>
														<div
															class="mt-2 rounded-lg border border-[var(--rule)] bg-[var(--muted)]/20 p-2"
														>
															{#if previewLayout === 'cards'}
																<div class="grid grid-cols-3 gap-1">
																	{#each Array(3) as _}
																		<div
																			class="h-8 rounded-md border border-[var(--rule)] bg-white"
																		></div>
																	{/each}
																</div>
															{:else if previewLayout === 'compact'}
																<div class="grid grid-cols-2 gap-1">
																	{#each Array(4) as _}
																		<div
																			class="h-4 rounded-md border border-[var(--rule)] bg-white"
																		></div>
																	{/each}
																</div>
															{:else}
																<div class="space-y-1">
																	{#each Array(previewLayout === 'banner' ? 2 : 4) as _, index}
																		<div
																			class="rounded-md border border-[var(--rule)] bg-white {previewLayout ===
																				'banner' && index === 0
																				? 'h-7'
																				: 'h-3.5'}"
																		></div>
																	{/each}
																</div>
															{/if}
														</div>
													</button>
												{/each}
											</div>
										</div>
										{#if sortOpts.length}
											<div class="space-y-0.5">
												<Label class="text-[10px] font-semibold text-muted-foreground uppercase"
													>Sort by</Label
												>
												<select
													name="sortBy_{sec.id}"
													value={sec.sortBy}
													class="h-8 rounded-md border border-input bg-background px-2 text-sm"
													onchange={(e) => {
														updateSection(sec.id, (section) => ({
															...section,
															sortBy: (e.currentTarget as HTMLSelectElement)
																.value as HomepageSectionConfig['sortBy']
														}));
														queueSectionPreview(sec.id, 0);
													}}
												>
													{#each sortOpts as opt}<option value={opt.value}>{opt.label}</option
														>{/each}
												</select>
											</div>
										{/if}
										<div class="space-y-0.5">
											<Label class="text-[10px] font-semibold text-muted-foreground uppercase"
												>Direction</Label
											>
											<select
												name="sortDir_{sec.id}"
												value={sec.sortDir}
												class="h-8 rounded-md border border-input bg-background px-2 text-sm"
												onchange={(e) => {
													updateSection(sec.id, (section) => ({
														...section,
														sortDir: (e.currentTarget as HTMLSelectElement)
															.value as HomepageSectionConfig['sortDir']
													}));
													queueSectionPreview(sec.id, 0);
												}}
											>
												<option value="asc">Ascending</option>
												<option value="desc">Descending</option>
											</select>
										</div>
										{#if hasDateFilter}
											<label
												class="flex items-center gap-1.5 self-end rounded-md border border-input px-2.5 py-1.5 text-xs"
											>
												<input
													type="checkbox"
													name="futureOnly_{sec.id}"
													checked={sec.futureOnly}
													class="rounded"
													onchange={(e) => {
														updateSection(sec.id, (section) => ({
															...section,
															futureOnly: (e.currentTarget as HTMLInputElement).checked
														}));
														queueSectionPreview(sec.id, 0);
													}}
												/>
												<span>Future only</span>
											</label>
										{/if}
										<div class="space-y-0.5">
											<Label class="text-[10px] font-semibold text-muted-foreground uppercase"
												>Items</Label
											>
											<input
												type="number"
												name="limit_{sec.id}"
												value={sec.limit}
												min="1"
												max="12"
												class="h-8 w-16 rounded-md border border-input bg-background px-2 text-center text-sm"
												oninput={(e) => {
													const value = Math.min(
														Math.max(
															parseInt((e.currentTarget as HTMLInputElement).value, 10) || 1,
															1
														),
														12
													);
													updateSection(sec.id, (section) => ({ ...section, limit: value }));
													queueSectionPreview(sec.id);
												}}
											/>
										</div>
										<div class="min-w-[220px] flex-1 space-y-0.5">
											<Label class="text-[10px] font-semibold text-muted-foreground uppercase"
												>Keyword filter</Label
											>
											<Input
												name="searchQuery_{sec.id}"
												value={sec.searchQuery ?? ''}
												placeholder="Optional filter for matching items"
												class="h-8 text-sm"
												oninput={(e) => {
													const value = (e.currentTarget as HTMLInputElement).value;
													updateSection(sec.id, (section) => ({
														...section,
														searchQuery: value.trim() ? value : undefined
													}));
													queueSectionPreview(sec.id, 260);
												}}
											/>
										</div>
									{/if}

									{#if isRichtext}
										<div class="min-w-[320px] flex-[1.35] space-y-1.5">
											<div class="flex items-center justify-between gap-2">
												<Label class="text-[10px] font-semibold text-muted-foreground uppercase"
													>Layout</Label
												>
												<span
													class="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[var(--dark)]"
												>
													Showing {displayLayout(sec)}
												</span>
											</div>
											<input
												type="hidden"
												name="layoutPreset_{sec.id}"
												value={sec.layoutPreset ?? 'auto'}
											/>
											<div class="grid gap-2 sm:grid-cols-3">
												{#each layoutPresetsFor('richtext') as preset}
													{@const selected = (sec.layoutPreset ?? 'auto') === preset}
													{@const previewLayout = resolvePresetOption(sec, preset)}
													<button
														type="button"
														class="rounded-xl border p-2.5 text-left transition-all {selected
															? 'border-[var(--teal)] bg-white shadow-[var(--sh)]'
															: 'border-[var(--rule)] bg-white/80 hover:border-[var(--teal)]/40 hover:bg-white'}"
														aria-pressed={selected}
														onclick={() => updateLayoutPreset(sec.id, preset)}
													>
														<div class="flex items-start justify-between gap-2">
															<div>
																<div class="text-xs font-semibold text-[var(--dark)]">
																	{HOMEPAGE_LAYOUT_LABELS[preset]}
																</div>
																<div class="mt-0.5 text-[10px] text-muted-foreground">
																	{layoutPresetHint(sec, preset)}
																</div>
															</div>
															{#if preset === 'auto'}
																<span
																	class="rounded-full bg-[var(--color-pinyon-100)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--mid)] uppercase"
																>
																	Auto
																</span>
															{/if}
														</div>
														<div
															class="mt-2 rounded-lg border border-[var(--rule)] bg-[var(--muted)]/20 p-2"
														>
															{#if previewLayout === 'cards'}
																<div
																	class="rounded-md border border-[var(--rule)] bg-white p-2 shadow-xs"
																>
																	<div class="h-2.5 w-2/3 rounded-sm bg-muted"></div>
																	<div class="mt-1 h-2 w-full rounded-sm bg-muted/60"></div>
																	<div class="mt-1 h-2 w-5/6 rounded-sm bg-muted/40"></div>
																</div>
															{:else}
																<div
																	class="rounded-md border border-[var(--rule)] bg-white px-2 py-2.5"
																>
																	<div class="h-2.5 w-1/2 rounded-sm bg-muted"></div>
																	<div class="mt-1.5 h-2 w-full rounded-sm bg-muted/60"></div>
																	<div class="mt-1 h-2 w-4/5 rounded-sm bg-muted/40"></div>
																</div>
															{/if}
														</div>
													</button>
												{/each}
											</div>
										</div>
									{/if}

									<div class="min-w-[220px] flex-1 space-y-0.5">
										<Label class="text-[10px] font-semibold text-muted-foreground uppercase"
											>Heading</Label
										>
										<Input
											name="heading_{sec.id}"
											value={sec.heading}
											placeholder={DEFAULT_HEADINGS[sec.source]}
											class="h-8 text-sm"
											oninput={(e) => {
												const value = (e.currentTarget as HTMLInputElement).value;
												updateSection(sec.id, (section) => ({ ...section, heading: value }));
											}}
										/>
									</div>

									<Button
										type="button"
										variant="ghost"
										size="sm"
										class="h-8 px-2 text-destructive hover:text-destructive"
										onclick={() => removeSection(sec.id)}
									>
										<Trash2 class="h-3.5 w-3.5" />
									</Button>
								</div>

								<!-- Content area -->
								<div class="border-t border-[var(--rule)] bg-white px-4 py-3">
									{#if isFeatured}
										<!-- Featured items with DnD -->
										<div class="space-y-2">
											{#if featItems.length === 0}
												<p class="py-1 text-center text-sm text-muted-foreground">
													No items. Search below to add.
												</p>
											{:else}
												<div
													use:dndzone={{
														items: featItems,
														type: 'featured',
														flipDurationMs: FLIP_MS,
														dropTargetStyle: {}
													}}
													onconsider={handleFeatConsider}
													onfinalize={handleFeatFinalize}
													class="space-y-1"
													role="list"
												>
													{#each featItems as feat (feat.id)}
														{@const FIcon = sourceIcons[feat.coil]}
														<div
															animate:flip={{ duration: FLIP_MS }}
															class="flex items-center gap-2 rounded-md border p-2 {feat ===
															featItems[0]
																? 'border-[color:var(--teal)] bg-[var(--teal)]/5'
																: 'border-[var(--rule)]'}"
														>
															<GripVertical
																class="h-3 w-3 shrink-0 cursor-grab text-muted-foreground/40"
															/>
															<span
																class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
																style="background: {sourceColors[feat.coil]}"
															>
																{#if FIcon}<FIcon class="h-2.5 w-2.5" />{/if}
															</span>
															<span class="min-w-0 flex-1 truncate text-sm">{feat.itemTitle}</span>
															{#if feat === featItems[0]}<span
																	class="rounded bg-[var(--teal)]/10 px-1 py-0.5 text-[9px] font-bold text-[var(--teal)]"
																	>LEAD</span
																>{/if}
															<span class="text-[10px] text-muted-foreground uppercase"
																>{coilLabels[feat.coil as CoilKey]}</span
															>
															<button
																type="button"
																class="text-muted-foreground/50 hover:text-destructive"
																onclick={() => removeFeatured(feat.coil, feat.itemId)}
															>
																<X class="h-3.5 w-3.5" />
															</button>
														</div>
													{/each}
												</div>
											{/if}
											<Separator />
											<!-- Search -->
											<div class="relative">
												<Search
													class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
												/>
												<input
													type="search"
													placeholder="Search to add items…"
													value={searchQuery}
													oninput={onSearchInput}
													onfocus={() => {
														searchFocused = true;
														if (searchResults.length) searchOpen = true;
													}}
													onblur={onSearchBlur}
													class="w-full rounded-lg border border-input bg-background py-2 pr-4 pl-10 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
													autocomplete="off"
												/>
												{#if searching}<span
														class="absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground"
														>Searching…</span
													>{/if}

												{#if showSuggestions}
													<div
														class="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-md"
													>
														<div class="border-b border-border px-3 py-2">
															<span
																class="text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase"
																>Browse by coil</span
															>
														</div>
														<ul>
															{#each ['events', 'funding', 'redpages', 'jobs', 'toolbox'] as key}
																{@const CIcon = sourceIcons[key]}
																<li>
																	<a
																		href="/admin/{key === 'redpages' ? 'red-pages' : key}"
																		class="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent"
																	>
																		{#if CIcon}<CIcon
																				class="h-4 w-4"
																				style="color: {sourceColors[key]}"
																			/>{/if}
																		<span class="flex-1">{sourceLabels[key]}</span>
																		<ChevronRight class="h-3.5 w-3.5 text-muted-foreground" />
																	</a>
																</li>
															{/each}
														</ul>
														<div class="border-t border-border px-3 py-2">
															<p class="text-[11px] text-muted-foreground">
																Type to search published items.
															</p>
														</div>
													</div>
												{/if}

												{#if showResults}
													<div
														class="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-md"
													>
														<ul class="max-h-[300px] overflow-y-auto">
															{#each searchResults as r}
																{@const RIcon = sourceIcons[r.coil]}
																{@const added = isAlreadyFeatured(r.coil, r.id)}
																<li class="border-b border-border last:border-b-0">
																	{#if added}
																		<div class="flex items-center gap-3 px-3 py-2 opacity-40">
																			<span
																				class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
																				style="background: {sourceColors[r.coil]}"
																				>{#if RIcon}<RIcon class="h-2.5 w-2.5" />{/if}</span
																			>
																			<span class="min-w-0 flex-1 truncate text-sm">{r.title}</span>
																			<span class="text-[10px] text-muted-foreground">Added</span>
																		</div>
																	{:else}
																		<button
																			type="button"
																			class="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent"
																			onclick={() => addFeatured(r.coil, r.id, r.title)}
																		>
																			<span
																				class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
																				style="background: {sourceColors[r.coil]}"
																				>{#if RIcon}<RIcon class="h-2.5 w-2.5" />{/if}</span
																			>
																			<div class="min-w-0 flex-1">
																				<p class="truncate text-sm font-medium text-[var(--dark)]">
																					{r.title}
																				</p>
																				<p class="text-[10px] text-muted-foreground uppercase">
																					{coilLabels[r.coil as CoilKey]}
																				</p>
																			</div>
																			<span
																				class="shrink-0 rounded bg-[var(--teal)]/10 px-1.5 py-0.5 text-[11px] font-semibold text-[var(--teal)]"
																				>+ Add</span
																			>
																		</button>
																	{/if}
																</li>
															{/each}
														</ul>
													</div>
												{/if}
											</div>
										</div>
									{:else if isRichtext}
										<!-- Rich text editor -->
										<RichTextEditor
											bind:value={richtextValues[sec.id]}
											name="content_{sec.id}_editor"
											placeholder="Write your announcement, HTML, or markdown content here…"
											minHeight="160px"
										/>
									{:else}
										<!-- Coil item previews — unified list with skip/restore -->
										{#if isPreviewLoading(sec.id)}
											<p class="py-1 text-sm text-muted-foreground">Refreshing preview…</p>
										{:else if previews.length === 0}
											<p class="py-1 text-sm text-muted-foreground">
												No published items match the current settings.
											</p>
										{:else}
											{@const activeItems = previews.filter((p) => !p.skipped)}
											<div class="space-y-0.5">
												{#each previews as item}
													{#if item.skipped}
														<div
															class="flex items-center gap-2 rounded bg-[var(--color-salmonberry-100)]/40 px-2 py-1.5 text-sm"
														>
															<span class="min-w-0 flex-1 truncate text-[var(--mid)] line-through"
																>{item.title}</span
															>
															<span
																class="text-[10px] font-medium text-[var(--color-salmonberry-700)]"
																>skipped</span
															>
															<button
																type="button"
																class="shrink-0 text-[11px] font-medium text-[var(--teal)] hover:underline"
																onclick={() => unexcludeItem(sec.id, item.id)}>restore</button
															>
														</div>
													{:else}
														<div
															class="flex items-center gap-2 rounded bg-[var(--color-pinyon-100)]/30 px-2 py-1.5 text-sm"
														>
															<span class="min-w-0 flex-1 truncate text-[var(--dark)]"
																>{item.title}</span
															>
															<button
																type="button"
																class="shrink-0 text-[11px] text-muted-foreground hover:text-[var(--color-salmonberry-700)]"
																onclick={() => excludeItem(sec.id, item.id)}>skip</button
															>
														</div>
													{/if}
												{/each}
											</div>
											{#if activeItems.length < sec.limit}
												<p class="mt-1 text-[11px] text-muted-foreground">
													Showing {activeItems.length} of {sec.limit} · {previews.length -
														activeItems.length} skipped. Save to refresh with more matches.
												</p>
											{/if}
										{/if}
									{/if}
								</div>
							</div>
						{/if}
					</div>
				{/each}
				{#if dragPaletteSource && dragInsertIndex === sections.length}
					<div class="h-0.5 rounded bg-[var(--teal)]"></div>
				{/if}
			</div>

			<div class="mt-4 flex flex-wrap items-center gap-3">
				<Button type="submit">Save all changes</Button>
				<p class="text-sm text-muted-foreground">
					Section order, announcements, featured picks, and skips all save together.
				</p>
			</div>
		</form>

		<form method="POST" action="?/resetConfig" use:enhance={enhanceToast('Reset')} class="mt-3">
			<Button
				type="submit"
				variant="ghost"
				size="sm"
				class="text-destructive hover:text-destructive"
			>
				<RotateCcw class="mr-1 h-3.5 w-3.5" /> Reset to defaults
			</Button>
		</form>
	</div>

	<!-- Layout Preview -->
	<div class="hidden xl:block">
		<div class="sticky top-20 space-y-3">
			<div class="rounded-lg border border-[var(--rule)] bg-white p-4">
				<p class="mb-3 text-xs font-semibold text-[var(--dark)]">Homepage Preview</p>
				<div
					class="space-y-1.5 rounded-lg border border-[var(--rule)] bg-[var(--muted)]/20 p-2.5 text-[10px]"
				>
					<div class="rounded bg-[var(--color-lakebed-950)] px-3 py-3 text-center text-white">
						<div class="text-[8px] tracking-wider uppercase opacity-50">Knowledge Basket</div>
						<div class="mt-0.5 text-[10px] font-bold">Search</div>
						<div
							class="mx-auto mt-1.5 h-4 w-3/4 rounded-sm border border-white/20 bg-white/10"
						></div>
					</div>

					{#each sections as sec}
						{#if isVisible(sec.id)}
							{#if sec.source === 'featured' && featItems.length > 0}
								<div>
									<div
										class="mb-0.5 flex items-center gap-1 px-0.5 text-[8px] tracking-wider text-muted-foreground uppercase"
									>
										<span
											class="inline-block h-1 w-1 rounded-full"
											style="background: {sourceColors.featured}"
										></span>
										{displayHeading(sec)}
									</div>
									<div
										class="grid gap-1 {featItems.length > 1
											? 'grid-cols-[1fr_70px]'
											: 'grid-cols-1'}"
									>
										<div
											class="rounded border bg-white p-1.5"
											style="border-left: 3px solid {sourceColors[featItems[0].coil]}"
										>
											<div class="text-[8px] leading-tight font-bold">
												{featItems[0].itemTitle.slice(0, 30)}{featItems[0].itemTitle.length > 30
													? '…'
													: ''}
											</div>
										</div>
										{#if featItems.length > 1}
											<div class="flex flex-col gap-0.5">
												{#each featItems.slice(1, 4) as feat}
													<div
														class="rounded border bg-white px-1 py-0.5"
														style="border-left: 2px solid {sourceColors[feat.coil]}"
													>
														<div class="truncate text-[7px]">{feat.itemTitle}</div>
													</div>
												{/each}
											</div>
										{/if}
									</div>
								</div>
							{:else if sec.source === 'richtext'}
								{@const layout = resolveSectionLayoutPreset(sec)}
								<div>
									<div
										class="mb-0.5 flex items-center gap-1 px-0.5 text-[8px] tracking-wider text-muted-foreground uppercase"
									>
										<span
											class="inline-block h-1 w-1 rounded-full"
											style="background: {sourceColors.richtext}"
										></span>
										{displayHeading(sec)}
										<span class="ml-auto shrink-0 opacity-60">{HOMEPAGE_LAYOUT_LABELS[layout]}</span
										>
									</div>
									<div class="rounded border border-[var(--rule)] bg-white p-1.5">
										{#if layout === 'cards'}
											<div class="rounded border border-[var(--rule)] bg-white p-1.5 shadow-xs">
												<div class="h-3 w-3/4 rounded-sm bg-muted"></div>
												<div class="mt-1 h-2 w-full rounded-sm bg-muted/60"></div>
												<div class="mt-1 h-2 w-5/6 rounded-sm bg-muted/40"></div>
											</div>
										{:else}
											<div class="h-3 w-1/2 rounded-sm bg-muted"></div>
											<div class="mt-1 h-2 w-full rounded-sm bg-muted/60"></div>
										{/if}
									</div>
								</div>
							{:else if sec.source !== 'featured'}
								{@const previews = sectionPreviews[sec.id] ?? []}
								{@const layout = resolveSectionLayoutPreset(sec)}
								<div>
									<div
										class="mb-0.5 flex items-center gap-1 px-0.5 text-[8px] tracking-wider text-muted-foreground uppercase"
									>
										<span
											class="inline-block h-1 w-1 rounded-full"
											style="background: {sourceColors[sec.source]}"
										></span>
										<span class="truncate">{displayHeading(sec)}</span>
										<span class="shrink-0 opacity-60">{HOMEPAGE_LAYOUT_LABELS[layout]}</span>
										<span class="ml-auto shrink-0 text-[7px] opacity-50">{sec.limit}</span>
									</div>
									{#if layout === 'cards'}
										<div class="flex gap-0.5">
											{#each Array(Math.min(previews.length || sec.limit, 4)) as _}
												<div class="h-7 flex-1 rounded border border-[var(--rule)] bg-white"></div>
											{/each}
										</div>
									{:else if layout === 'compact'}
										<div class="grid grid-cols-2 gap-0.5">
											{#each Array(Math.min(previews.length || sec.limit, 4)) as _}
												<div class="h-5 rounded border border-[var(--rule)] bg-white"></div>
											{/each}
										</div>
									{:else}
										<div class="space-y-px">
											{#each Array(Math.min(previews.length || sec.limit, 4)) as _}
												<div class="h-3.5 rounded border border-[var(--rule)] bg-white"></div>
											{/each}
										</div>
									{/if}
								</div>
							{/if}
						{/if}
					{/each}

					<div class="rounded bg-[var(--color-lakebed-950)] px-1.5 py-1.5">
						<div class="grid grid-cols-5 gap-0.5">
							{#each Object.entries(coilLabels) as [key]}
								<div
									class="h-2.5 rounded-sm"
									style="background: color-mix(in srgb, {sourceColors[key]} 30%, transparent)"
								></div>
							{/each}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
