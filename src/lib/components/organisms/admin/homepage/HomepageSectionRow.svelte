<script lang="ts">
	import { flip } from 'svelte/animate';
	import { dragHandleZone, dragHandle } from 'svelte-dnd-action';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import {
		DEFAULT_HEADINGS,
		HOMEPAGE_LAYOUT_LABELS,
		IMAGE_HEIGHT_LABELS,
		SOURCE_HAS_DATE_FILTER,
		SOURCE_LAYOUT_PRESETS,
		SOURCE_SORT_OPTIONS,
		CONTAINER_CHILD_SOURCES,
		createSection,
		genSectionId,
		type HomepageSectionConfig,
		type HomepageFeaturedRef,
		type HomepageLayoutPreset,
		type ContainerColumns,
		type ImageHeight,
		type ImageFit,
		type SectionSource
	} from '$lib/data/homepage';
	import HomepageFeaturedSearch from './HomepageFeaturedSearch.svelte';
	import {
		BookOpen,
		Briefcase,
		Calendar,
		ChevronDown,
		Coins,
		Columns2,
		Columns3,
		Eye,
		EyeOff,
		FileText,
		GripVertical,
		ImageIcon,
		Sparkles,
		Plus,
		Trash2,
		Wrench,
		X
	} from '@lucide/svelte';
	import { coilLabels, type CoilKey } from '$lib/data/kb';
	import { toast } from 'svelte-sonner';

	let {
		section,
		expanded = false,
		sectionPreview = [],
		loadingPreview = false,
		onupdate,
		onremove,
		ontoggleexpand,
		ontoggleexcluded
	}: {
		section: HomepageSectionConfig;
		expanded: boolean;
		sectionPreview: { id: string; title: string; skipped: boolean }[];
		loadingPreview: boolean;
		onupdate: (section: HomepageSectionConfig) => void;
		onremove: () => void;
		ontoggleexpand: () => void;
		ontoggleexcluded: (itemId: string, skipped: boolean) => void;
	} = $props();

	const SOURCE_LABELS: Record<string, string> = {
		events: 'Events',
		funding: 'Funding',
		jobs: 'Jobs',
		redpages: 'Red Pages',
		toolbox: 'Toolbox',
		featured: "Editor's Picks",
		richtext: 'Rich Text',
		container: 'Container',
		image: 'Image'
	};

	const CHILD_SOURCE_OPTIONS: Array<{ value: SectionSource; label: string }> =
		CONTAINER_CHILD_SOURCES.map((s) => ({ value: s, label: SOURCE_LABELS[s] ?? s }));

	let advancedOpen = $state(false);
	const flipDurationMs = 200;

	function update(updater: (s: HomepageSectionConfig) => HomepageSectionConfig) {
		onupdate(updater(section));
	}

	/* ── Featured items DnD (for featured sections) ── */

	type DndFeaturedItem = HomepageFeaturedRef & { id: string };

	let featuredDnd = $state<DndFeaturedItem[]>([]);
	const featuredIds = $derived((section.items ?? []).map((item) => item.itemId));

	// Mirror parent +page.svelte sections pattern: sync from the external prop only.
	// Reading featuredDnd here would cause the effect to re-run during a drag and revert it.
	$effect(() => {
		featuredDnd = (section.items ?? []).map((item) => ({ ...item, id: item.itemId }));
	});

	function handleFeaturedConsider(e: CustomEvent) {
		featuredDnd = e.detail.items as DndFeaturedItem[];
	}

	function handleFeaturedFinalize(e: CustomEvent) {
		featuredDnd = e.detail.items as DndFeaturedItem[];
		const items = featuredDnd.map(({ id: _, ...rest }) => rest);
		update((s) => ({ ...s, items }));
	}

	function addFeaturedItem(item: { coil: CoilKey; itemId: string; title: string }) {
		const current = section.items ?? [];
		if (current.length >= 8) {
			toast.error('Maximum 8 items per featured section');
			return;
		}
		update((s) => ({ ...s, items: [...(s.items ?? []), item] }));
	}

	function removeFeaturedItem(index: number) {
		update((s) => ({
			...s,
			items: (s.items ?? []).filter((_, i) => i !== index)
		}));
	}

	const isFeatured = $derived(section.source === 'featured');
	const isContainer = $derived(section.source === 'container');
	const isImage = $derived(section.source === 'image');

	/* ── Container child management ── */

	function addChild(source: SectionSource) {
		const child = createSection(source);
		update((s) => ({ ...s, children: [...(s.children ?? []), child] }));
	}

	function updateChild(
		childId: string,
		updater: (c: HomepageSectionConfig) => HomepageSectionConfig
	) {
		update((s) => ({
			...s,
			children: (s.children ?? []).map((c) => (c.id === childId ? updater(c) : c))
		}));
	}

	function removeChild(childId: string) {
		update((s) => ({
			...s,
			children: (s.children ?? []).filter((c) => c.id !== childId)
		}));
	}

	// DnD for container children
	const childrenDnd = $derived((section.children ?? []).map((c) => ({ ...c })));

	function handleChildConsider(e: CustomEvent) {
		update((s) => ({ ...s, children: e.detail.items }));
	}

	function handleChildFinalize(e: CustomEvent) {
		update((s) => ({ ...s, children: e.detail.items }));
	}
	const availableLayouts = $derived(SOURCE_LAYOUT_PRESETS[section.source]);
	const activeLayout = $derived(section.layoutPreset ?? 'auto');

	function setLayout(preset: HomepageLayoutPreset) {
		update((s) => ({ ...s, layoutPreset: preset }));
	}
</script>

{#snippet layoutIcon(preset: HomepageLayoutPreset)}
	<svg viewBox="0 0 36 28" class="h-full w-full" fill="none">
		{#if preset === 'auto'}
			<!-- Wand / sparkle shape -->
			<rect x="4" y="4" width="12" height="8" rx="1.5" fill="currentColor" opacity="0.5" />
			<rect x="20" y="4" width="12" height="3" rx="1" fill="currentColor" opacity="0.35" />
			<rect x="20" y="9" width="8" height="3" rx="1" fill="currentColor" opacity="0.25" />
			<rect x="4" y="16" width="28" height="3" rx="1" fill="currentColor" opacity="0.25" />
			<rect x="4" y="22" width="28" height="3" rx="1" fill="currentColor" opacity="0.15" />
		{:else if preset === 'cards'}
			<!-- Grid of cards -->
			<rect x="2" y="2" width="14" height="11" rx="1.5" fill="currentColor" opacity="0.45" />
			<rect x="20" y="2" width="14" height="11" rx="1.5" fill="currentColor" opacity="0.35" />
			<rect x="2" y="16" width="14" height="11" rx="1.5" fill="currentColor" opacity="0.25" />
			<rect x="20" y="16" width="14" height="11" rx="1.5" fill="currentColor" opacity="0.15" />
		{:else if preset === 'list'}
			<!-- Stacked rows -->
			<rect x="2" y="2" width="6" height="5" rx="1" fill="currentColor" opacity="0.4" />
			<rect x="11" y="2.5" width="16" height="2" rx="0.75" fill="currentColor" opacity="0.35" />
			<rect x="11" y="5.5" width="10" height="1.5" rx="0.75" fill="currentColor" opacity="0.2" />
			<rect x="2" y="10" width="6" height="5" rx="1" fill="currentColor" opacity="0.3" />
			<rect x="11" y="10.5" width="16" height="2" rx="0.75" fill="currentColor" opacity="0.35" />
			<rect x="11" y="13.5" width="10" height="1.5" rx="0.75" fill="currentColor" opacity="0.2" />
			<rect x="2" y="18" width="6" height="5" rx="1" fill="currentColor" opacity="0.2" />
			<rect x="11" y="18.5" width="16" height="2" rx="0.75" fill="currentColor" opacity="0.35" />
			<rect x="11" y="21.5" width="10" height="1.5" rx="0.75" fill="currentColor" opacity="0.2" />
		{:else if preset === 'compact'}
			<!-- Dense lines -->
			{#each [2, 7, 12, 17, 22] as y}
				<rect x="2" {y} width="3" height="3" rx="0.75" fill="currentColor" opacity="0.3" />
				<rect
					x="7"
					y={y + 0.5}
					width="20"
					height="2"
					rx="0.75"
					fill="currentColor"
					opacity="0.25"
				/>
			{/each}
		{:else if preset === 'banner'}
			<!-- Full-width banner -->
			<rect x="2" y="4" width="32" height="20" rx="2" fill="currentColor" opacity="0.3" />
			<rect x="6" y="10" width="18" height="2.5" rx="1" fill="currentColor" opacity="0.4" />
			<rect x="6" y="14" width="12" height="2" rx="1" fill="currentColor" opacity="0.25" />
		{/if}
	</svg>
{/snippet}

{#snippet layoutPicker()}
	<div class="space-y-1.5">
		<Label class="text-xs">Layout</Label>
		<div class="flex gap-1.5">
			{#each availableLayouts as preset}
				<button
					type="button"
					class="group/lp flex flex-col items-center gap-1 rounded-lg border px-2 py-1.5 transition-all {activeLayout ===
					preset
						? 'border-[var(--color-lakebed-600)] bg-[var(--color-lakebed-50)] text-[var(--color-lakebed-800)]'
						: 'border-[color:var(--rule)] bg-white text-[var(--mid)] hover:border-[var(--color-lakebed-300)] hover:text-[var(--color-lakebed-700)]'}"
					onclick={() => setLayout(preset)}
					title={HOMEPAGE_LAYOUT_LABELS[preset]}
				>
					<div class="h-5 w-7">
						{@render layoutIcon(preset)}
					</div>
					<span class="text-[9px] leading-none font-medium">{HOMEPAGE_LAYOUT_LABELS[preset]}</span>
				</button>
			{/each}
		</div>
	</div>
{/snippet}

<Collapsible.Root open={expanded} onOpenChange={() => ontoggleexpand()}>
	<!-- Collapsed row -->
	<div
		class="group flex items-center gap-2 rounded-xl border border-[color:var(--rule)] bg-white px-3 py-2.5 transition-colors hover:bg-[var(--color-alpine-snow-100)]/40 {!section.visible
			? 'opacity-50'
			: ''}"
	>
		<!-- Source icon -->
		<div
			class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg {isFeatured
				? 'bg-[var(--color-flicker-100)]/60'
				: 'bg-[var(--color-alpine-snow-200)]/60'}"
		>
			{#if section.source === 'events'}
				<Calendar class="h-3.5 w-3.5 text-[var(--color-lakebed-800)]" />
			{:else if section.source === 'funding'}
				<Coins class="h-3.5 w-3.5 text-[var(--color-lakebed-800)]" />
			{:else if section.source === 'jobs'}
				<Briefcase class="h-3.5 w-3.5 text-[var(--color-lakebed-800)]" />
			{:else if section.source === 'redpages'}
				<BookOpen class="h-3.5 w-3.5 text-[var(--color-lakebed-800)]" />
			{:else if section.source === 'toolbox'}
				<Wrench class="h-3.5 w-3.5 text-[var(--color-lakebed-800)]" />
			{:else if section.source === 'featured'}
				<Sparkles class="h-3.5 w-3.5 text-[var(--color-flicker-900)]" />
			{:else if section.source === 'richtext'}
				<FileText class="h-3.5 w-3.5 text-[var(--color-lakebed-800)]" />
			{:else if section.source === 'container'}
				{#if section.columns === 3}
					<Columns3 class="h-3.5 w-3.5 text-[var(--color-lakebed-800)]" />
				{:else}
					<Columns2 class="h-3.5 w-3.5 text-[var(--color-lakebed-800)]" />
				{/if}
			{:else if section.source === 'image'}
				<ImageIcon class="h-3.5 w-3.5 text-[var(--color-lakebed-800)]" />
			{/if}
		</div>

		<!-- Heading -->
		<div class="min-w-0 flex-1">
			<span class="block truncate text-sm font-medium text-[var(--dark)]">
				{section.heading || DEFAULT_HEADINGS[section.source]}
			</span>
		</div>

		<!-- Source badge -->
		<span
			class="hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline {isFeatured
				? 'bg-[var(--color-flicker-100)] text-[var(--color-flicker-900)]'
				: 'bg-[var(--color-alpine-snow-200)]/80 text-[var(--mid)]'}"
		>
			{SOURCE_LABELS[section.source]}
		</span>

		<!-- Layout badge -->
		<span
			class="hidden shrink-0 rounded-full bg-[var(--color-lakebed-50)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-lakebed-700)] sm:inline"
		>
			{HOMEPAGE_LAYOUT_LABELS[section.layoutPreset ?? 'auto']}
		</span>

		<!-- Item count for featured -->
		{#if isFeatured}
			<span class="hidden shrink-0 text-[10px] text-[var(--mid)] sm:inline">
				{(section.items ?? []).length}/8
			</span>
		{/if}

		<!-- Container column + child count -->
		{#if isContainer}
			<span class="hidden shrink-0 text-[10px] text-[var(--mid)] sm:inline">
				{section.columns ?? 2}-col, {(section.children ?? []).length} sections
			</span>
		{/if}

		<!-- Visibility toggle -->
		<button
			type="button"
			class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-alpine-snow-200)]"
			onclick={(e) => {
				e.stopPropagation();
				update((s) => ({ ...s, visible: !s.visible }));
			}}
			title={section.visible ? 'Hide section' : 'Show section'}
		>
			{#if section.visible}
				<Eye class="h-3.5 w-3.5 text-[var(--mid)]" />
			{:else}
				<EyeOff class="h-3.5 w-3.5 text-[var(--mid)]" />
			{/if}
		</button>

		<!-- Expand toggle -->
		<Collapsible.Trigger
			class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[var(--color-alpine-snow-200)]"
		>
			<ChevronDown
				class="h-4 w-4 text-[var(--mid)] transition-transform duration-200 {expanded
					? 'rotate-180'
					: ''}"
			/>
		</Collapsible.Trigger>
	</div>

	<!-- Expanded content -->
	<Collapsible.Content>
		<div class="mt-1 space-y-4 rounded-xl border border-[color:var(--rule)] bg-white px-4 py-4">
			{#if isFeatured}
				<!-- Featured section controls -->
				<div class="space-y-1.5">
					<Label for={`heading-${section.id}`} class="text-xs">Heading</Label>
					<Input
						id={`heading-${section.id}`}
						value={section.heading}
						class="h-8 text-sm"
						oninput={(e) =>
							update((s) => ({
								...s,
								heading: (e.currentTarget as HTMLInputElement).value
							}))}
					/>
				</div>

				{@render layoutPicker()}

				<!-- Search to add items -->
				<div class="space-y-1.5">
					<Label class="text-xs">Items</Label>
					<HomepageFeaturedSearch onadd={addFeaturedItem} existingIds={featuredIds} />
				</div>

				<!-- DnD items list -->
				{#if featuredDnd.length > 0}
					<div
						use:dragHandleZone={{
							items: featuredDnd,
							flipDurationMs,
							type: `feat-${section.id}`,
							dropTargetStyle: {}
						}}
						onconsider={handleFeaturedConsider}
						onfinalize={handleFeaturedFinalize}
						class="space-y-1"
					>
						{#each featuredDnd as item, index (item.id)}
							<div animate:flip={{ duration: flipDurationMs }}>
								<div
									class="group/item flex items-center gap-1.5 rounded-lg border border-[color:var(--rule)] bg-[var(--color-alpine-snow-50)]/60 px-2 py-1.5"
								>
									<div
										use:dragHandle
										aria-label="Drag to reorder {item.title}"
										class="flex h-5 w-4 shrink-0 cursor-grab items-center justify-center text-[var(--mid)] hover:text-[var(--color-lakebed-700)] active:cursor-grabbing"
									>
										<GripVertical class="h-3 w-3" />
									</div>
									<span
										class="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold {index ===
										0
											? 'bg-[var(--color-flicker-100)] text-[var(--color-flicker-900)]'
											: 'bg-[var(--color-alpine-snow-200)]/60 text-[var(--mid)]'}"
									>
										{index + 1}
									</span>
									<span class="min-w-0 flex-1 truncate text-xs font-medium text-[var(--dark)]">
										{item.title}
									</span>
									<span class="shrink-0 text-[10px] text-[var(--mid)]">
										{coilLabels[item.coil]}
									</span>
									<button
										type="button"
										class="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--mid)] opacity-0 transition-all group-hover/item:opacity-100 hover:bg-[var(--color-ember-50)] hover:text-[var(--color-ember-700)]"
										onclick={() => removeFeaturedItem(index)}
										title="Remove"
									>
										<X class="h-3 w-3" />
									</button>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div
						class="rounded-lg border border-dashed border-[color:var(--rule)] px-4 py-4 text-center"
					>
						<Sparkles class="mx-auto mb-1 h-4 w-4 text-[var(--mid)]" />
						<p class="text-xs text-[var(--mid)]">No items yet. Search above to add content.</p>
					</div>
				{/if}
			{:else if isContainer}
				<!-- Container controls -->
				<div class="flex items-center gap-3">
					<Label class="text-xs">Columns</Label>
					<div class="flex gap-1.5">
						<button
							type="button"
							class="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all {section.columns ===
							2
								? 'border-[var(--color-lakebed-600)] bg-[var(--color-lakebed-50)] text-[var(--color-lakebed-800)]'
								: 'border-[color:var(--rule)] bg-white text-[var(--mid)] hover:border-[var(--color-lakebed-300)]'}"
							onclick={() => update((s) => ({ ...s, columns: 2 as ContainerColumns }))}
						>
							<Columns2 class="h-3.5 w-3.5" />
							2 columns
						</button>
						<button
							type="button"
							class="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all {section.columns ===
							3
								? 'border-[var(--color-lakebed-600)] bg-[var(--color-lakebed-50)] text-[var(--color-lakebed-800)]'
								: 'border-[color:var(--rule)] bg-white text-[var(--mid)] hover:border-[var(--color-lakebed-300)]'}"
							onclick={() => update((s) => ({ ...s, columns: 3 as ContainerColumns }))}
						>
							<Columns3 class="h-3.5 w-3.5" />
							3 columns
						</button>
					</div>
				</div>

				<!-- Container children -->
				<div class="space-y-1.5">
					<div class="flex items-center justify-between">
						<Label class="text-xs">Sections</Label>
					</div>

					{#if childrenDnd.length > 0}
						<div
							use:dragHandleZone={{
								items: childrenDnd,
								flipDurationMs,
								type: `container-${section.id}`,
								dropTargetStyle: {}
							}}
							onconsider={handleChildConsider}
							onfinalize={handleChildFinalize}
							class="grid gap-2"
							style="grid-template-columns: repeat({section.columns ?? 2}, 1fr)"
						>
							{#each childrenDnd as child (child.id)}
								<div animate:flip={{ duration: flipDurationMs }}>
									<div
										class="group/child rounded-lg border border-[color:var(--rule)] bg-[var(--color-alpine-snow-50)]/60 p-2"
									>
										<!-- Child header -->
										<div class="mb-1.5 flex items-center gap-1.5">
											<div
												use:dragHandle
												aria-label="Drag to reorder"
												class="flex h-4 w-4 shrink-0 cursor-grab items-center justify-center text-[var(--mid)] active:cursor-grabbing"
											>
												<GripVertical class="h-3 w-3" />
											</div>
											<span
												class="min-w-0 flex-1 truncate text-[10px] font-semibold text-[var(--dark)]"
											>
												{child.heading || SOURCE_LABELS[child.source] || child.source}
											</span>
											<span
												class="rounded bg-[var(--color-alpine-snow-200)]/80 px-1 py-px text-[8px] font-medium text-[var(--mid)]"
											>
												{SOURCE_LABELS[child.source]}
											</span>
											<button
												type="button"
												class="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[var(--mid)] opacity-0 group-hover/child:opacity-100 hover:text-[var(--color-ember-700)]"
												onclick={() => removeChild(child.id)}
											>
												<X class="h-2.5 w-2.5" />
											</button>
										</div>
										<!-- Child inline config -->
										<div class="space-y-1">
											<input
												type="text"
												value={child.heading}
												class="w-full rounded border border-[color:var(--rule)] bg-white px-1.5 py-0.5 text-[10px]"
												placeholder="Heading"
												oninput={(e) =>
													updateChild(child.id, (c) => ({
														...c,
														heading: (e.currentTarget as HTMLInputElement).value
													}))}
											/>
											{#if child.source === 'image'}
												<input
													type="text"
													value={child.imageUrl ?? ''}
													class="w-full rounded border border-[color:var(--rule)] bg-white px-1.5 py-0.5 text-[10px]"
													placeholder="Image URL"
													oninput={(e) =>
														updateChild(child.id, (c) => ({
															...c,
															imageUrl: (e.currentTarget as HTMLInputElement).value
														}))}
												/>
											{:else if child.source !== 'richtext' && child.source !== 'featured'}
												<div class="flex gap-1">
													<input
														type="number"
														value={child.limit}
														min="1"
														max="12"
														class="w-12 rounded border border-[color:var(--rule)] bg-white px-1.5 py-0.5 text-[10px]"
														oninput={(e) =>
															updateChild(child.id, (c) => ({
																...c,
																limit: Math.min(
																	Math.max(
																		Number((e.currentTarget as HTMLInputElement).value) || 1,
																		1
																	),
																	12
																)
															}))}
													/>
													<select
														class="flex-1 rounded border border-[color:var(--rule)] bg-white px-1 py-0.5 text-[10px]"
														value={child.layoutPreset ?? 'auto'}
														onchange={(e) =>
															updateChild(child.id, (c) => ({
																...c,
																layoutPreset: (e.currentTarget as HTMLSelectElement)
																	.value as HomepageLayoutPreset
															}))}
													>
														{#each SOURCE_LAYOUT_PRESETS[child.source] ?? ['auto'] as preset}
															<option value={preset}>{HOMEPAGE_LAYOUT_LABELS[preset]}</option>
														{/each}
													</select>
												</div>
											{/if}
										</div>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div
							class="rounded-lg border border-dashed border-[color:var(--rule)] px-4 py-4 text-center"
						>
							<p class="text-xs text-[var(--mid)]">Add sections to fill the columns.</p>
						</div>
					{/if}

					<!-- Add child buttons -->
					<div class="flex flex-wrap gap-1">
						{#each CHILD_SOURCE_OPTIONS as option}
							<button
								type="button"
								class="rounded border border-[color:var(--rule)] bg-white px-2 py-1 text-[10px] font-medium text-[var(--mid)] transition-colors hover:border-[var(--color-lakebed-300)] hover:text-[var(--dark)]"
								onclick={() => addChild(option.value)}
							>
								<Plus class="mr-0.5 inline h-2.5 w-2.5" />{option.label}
							</button>
						{/each}
					</div>
				</div>
			{:else if isImage}
				<!-- Image controls -->
				<div class="space-y-3">
					<div class="space-y-1.5">
						<Label class="text-xs">Image URL</Label>
						<Input
							value={section.imageUrl ?? ''}
							class="h-8 text-sm"
							placeholder="https://..."
							oninput={(e) =>
								update((s) => ({
									...s,
									imageUrl: (e.currentTarget as HTMLInputElement).value
								}))}
						/>
					</div>
					<div class="grid gap-3 sm:grid-cols-2">
						<div class="space-y-1.5">
							<Label class="text-xs">Alt text</Label>
							<Input
								value={section.imageAlt ?? ''}
								class="h-8 text-sm"
								placeholder="Describe the image"
								oninput={(e) =>
									update((s) => ({
										...s,
										imageAlt: (e.currentTarget as HTMLInputElement).value
									}))}
							/>
						</div>
						<div class="space-y-1.5">
							<Label class="text-xs">Link (optional)</Label>
							<Input
								value={section.imageHref ?? ''}
								class="h-8 text-sm"
								placeholder="/page or https://..."
								oninput={(e) =>
									update((s) => ({
										...s,
										imageHref: (e.currentTarget as HTMLInputElement).value.trim() || undefined
									}))}
							/>
						</div>
					</div>

					<!-- Height picker -->
					<div class="space-y-1.5">
						<Label class="text-xs">Height</Label>
						<div class="flex gap-1.5">
							{#each ['sm', 'md', 'lg', 'xl'] as const as h}
								<button
									type="button"
									class="flex flex-col items-center gap-0.5 rounded-lg border px-3 py-1.5 transition-all {(section.imageHeight ??
										'md') === h
										? 'border-[var(--color-lakebed-600)] bg-[var(--color-lakebed-50)] text-[var(--color-lakebed-800)]'
										: 'border-[color:var(--rule)] bg-white text-[var(--mid)] hover:border-[var(--color-lakebed-300)]'}"
									onclick={() => update((s) => ({ ...s, imageHeight: h }))}
								>
									<div
										class="w-6 rounded-sm bg-current/20"
										style="height: {h === 'sm' ? 6 : h === 'md' ? 10 : h === 'lg' ? 14 : 18}px"
									></div>
									<span class="text-[9px] font-medium">{IMAGE_HEIGHT_LABELS[h]}</span>
								</button>
							{/each}
						</div>
					</div>

					<!-- Fit + Rounded -->
					<div class="flex items-center gap-4">
						<div class="flex items-center gap-2">
							<Label class="text-xs">Fit</Label>
							<div class="flex gap-1">
								{#each ['cover', 'contain'] as const as fit}
									<button
										type="button"
										class="rounded-md border px-2 py-1 text-[10px] font-medium transition-all {(section.imageFit ??
											'cover') === fit
											? 'border-[var(--color-lakebed-600)] bg-[var(--color-lakebed-50)] text-[var(--color-lakebed-800)]'
											: 'border-[color:var(--rule)] bg-white text-[var(--mid)] hover:border-[var(--color-lakebed-300)]'}"
										onclick={() => update((s) => ({ ...s, imageFit: fit }))}
									>
										{fit === 'cover' ? 'Fill' : 'Fit'}
									</button>
								{/each}
							</div>
						</div>
						<label class="flex items-center gap-1.5 text-xs">
							<input
								type="checkbox"
								checked={section.imageRounded !== false}
								onchange={(e) =>
									update((s) => ({
										...s,
										imageRounded: (e.currentTarget as HTMLInputElement).checked
									}))}
							/>
							Rounded
						</label>
					</div>

					<!-- Image preview -->
					{#if section.imageUrl}
						<div
							class="overflow-hidden {section.imageRounded !== false
								? 'rounded-xl'
								: ''} border border-[color:var(--rule)]"
						>
							<img
								src={section.imageUrl}
								alt={section.imageAlt || ''}
								class="w-full object-{section.imageFit ?? 'cover'} {section.imageHeight === 'sm'
									? 'h-20'
									: section.imageHeight === 'lg'
										? 'h-40'
										: section.imageHeight === 'xl'
											? 'h-48'
											: 'h-28'}"
							/>
						</div>
					{/if}
				</div>
			{:else if section.source === 'richtext'}
				<!-- Richtext controls -->
				<div class="space-y-1.5">
					<Label for={`heading-${section.id}`} class="text-xs">Heading</Label>
					<Input
						id={`heading-${section.id}`}
						value={section.heading}
						class="h-8 text-sm"
						oninput={(e) =>
							update((s) => ({
								...s,
								heading: (e.currentTarget as HTMLInputElement).value
							}))}
					/>
				</div>
				{@render layoutPicker()}
				<div class="space-y-1.5">
					<Label for={`content-${section.id}`} class="text-xs">HTML content</Label>
					<Textarea
						id={`content-${section.id}`}
						rows={6}
						value={section.content ?? ''}
						class="text-sm"
						oninput={(e) =>
							update((s) => ({
								...s,
								content: (e.currentTarget as HTMLTextAreaElement).value
							}))}
					/>
				</div>
			{:else}
				<!-- Feed section: full controls -->
				<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<div class="space-y-1.5 sm:col-span-2">
						<Label for={`heading-${section.id}`} class="text-xs">Heading</Label>
						<Input
							id={`heading-${section.id}`}
							value={section.heading}
							class="h-8 text-sm"
							oninput={(e) =>
								update((s) => ({
									...s,
									heading: (e.currentTarget as HTMLInputElement).value
								}))}
						/>
					</div>
					<div class="space-y-1.5">
						<Label for={`limit-${section.id}`} class="text-xs">Limit</Label>
						<Input
							id={`limit-${section.id}`}
							type="number"
							min="1"
							max="12"
							value={String(section.limit)}
							class="h-8 text-sm"
							oninput={(e) =>
								update((s) => ({
									...s,
									limit: Math.min(
										Math.max(Number((e.currentTarget as HTMLInputElement).value) || 1, 1),
										12
									)
								}))}
						/>
					</div>
				</div>

				{@render layoutPicker()}

				<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					<div class="space-y-1.5">
						<Label for={`sort-by-${section.id}`} class="text-xs">Sort by</Label>
						<select
							id={`sort-by-${section.id}`}
							class="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm shadow-xs"
							value={section.sortBy}
							onchange={(e) =>
								update((s) => ({
									...s,
									sortBy: (e.currentTarget as HTMLSelectElement)
										.value as HomepageSectionConfig['sortBy']
								}))}
						>
							{#each SOURCE_SORT_OPTIONS[section.source] as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
					<div class="space-y-1.5">
						<Label for={`sort-dir-${section.id}`} class="text-xs">Direction</Label>
						<select
							id={`sort-dir-${section.id}`}
							class="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm shadow-xs"
							value={section.sortDir}
							onchange={(e) =>
								update((s) => ({
									...s,
									sortDir: (e.currentTarget as HTMLSelectElement)
										.value as HomepageSectionConfig['sortDir']
								}))}
						>
							<option value="asc">Ascending</option>
							<option value="desc">Descending</option>
						</select>
					</div>
					<div class="space-y-1.5">
						<Label for={`query-${section.id}`} class="text-xs">Keyword filter</Label>
						<Input
							id={`query-${section.id}`}
							value={section.searchQuery ?? ''}
							class="h-8 text-sm"
							placeholder="Optional"
							oninput={(e) =>
								update((s) => ({
									...s,
									searchQuery: (e.currentTarget as HTMLInputElement).value.trim() || undefined
								}))}
						/>
					</div>
					{#if SOURCE_HAS_DATE_FILTER[section.source]}
						<label
							class="flex items-center gap-2 self-end rounded-md border border-input px-2 py-1.5 text-xs"
						>
							<input
								type="checkbox"
								checked={section.futureOnly}
								onchange={(e) =>
									update((s) => ({
										...s,
										futureOnly: (e.currentTarget as HTMLInputElement).checked
									}))}
							/>
							<span>Future only</span>
						</label>
					{/if}
				</div>

				<!-- Section preview -->
				<div
					class="rounded-lg border border-[color:var(--rule)] bg-[var(--color-alpine-snow-50)]/60 p-3"
				>
					<p class="mb-2 text-xs font-medium text-[var(--dark)]">
						Preview
						{#if loadingPreview}
							<span class="ml-1 text-[var(--mid)]">updating...</span>
						{/if}
					</p>
					{#if sectionPreview.length > 0}
						<div class="space-y-1">
							{#each sectionPreview as item}
								<div
									class="flex items-center justify-between gap-2 rounded-md bg-white px-2.5 py-1.5 text-xs"
								>
									<span class="truncate {item.skipped ? 'text-[var(--mid)] line-through' : ''}">
										{item.title}
									</span>
									<button
										type="button"
										class="shrink-0 text-[10px] font-medium text-[var(--mid)] hover:text-[var(--dark)]"
										onclick={() => ontoggleexcluded(item.id, !item.skipped)}
									>
										{item.skipped ? 'Restore' : 'Skip'}
									</button>
								</div>
							{/each}
						</div>
					{:else if !loadingPreview}
						<p class="text-xs text-[var(--mid)]">No items match current settings.</p>
					{/if}
				</div>
			{/if}

			<!-- Remove row -->
			<div class="flex items-center justify-between border-t border-[color:var(--rule)] pt-3">
				{#if section.source !== 'richtext' && section.source !== 'featured'}
					<button
						type="button"
						class="text-xs text-[var(--mid)] hover:text-[var(--dark)]"
						onclick={() => (advancedOpen = !advancedOpen)}
					>
						{advancedOpen ? 'Hide advanced' : 'Advanced'}
					</button>
				{:else}
					<span></span>
				{/if}
				<Button
					type="button"
					variant="ghost"
					size="sm"
					class="h-7 px-2 text-xs text-[var(--color-ember-700)] hover:bg-[var(--color-ember-50)] hover:text-[var(--color-ember-800)]"
					onclick={onremove}
				>
					<Trash2 class="mr-1 h-3 w-3" />
					Remove
				</Button>
			</div>

			{#if advancedOpen}
				<div class="space-y-1.5 rounded-lg border border-dashed border-[color:var(--rule)] p-3">
					<Label class="text-xs">Excluded IDs</Label>
					<Textarea
						rows={3}
						value={(section.excludedIds ?? []).join('\n')}
						class="text-xs"
						oninput={(e) =>
							update((s) => ({
								...s,
								excludedIds: (e.currentTarget as HTMLTextAreaElement).value
									.split(/\r?\n/)
									.map((v) => v.trim())
									.filter(Boolean)
							}))}
					/>
					<p class="text-[10px] text-[var(--mid)]">One ID per line</p>
				</div>
			{/if}
		</div>
	</Collapsible.Content>
</Collapsible.Root>
