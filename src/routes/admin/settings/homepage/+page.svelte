<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { flip } from 'svelte/animate';
	import { toast } from 'svelte-sonner';
	import { dragHandleZone, dragHandle, type DndEvent } from 'svelte-dnd-action';
	import AdminPageHeader from '$lib/components/organisms/admin/AdminPageHeader.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import HomepageSectionRow from '$lib/components/organisms/admin/homepage/HomepageSectionRow.svelte';
	import {
		createSection,
		DEFAULT_HEADINGS,
		HOMEPAGE_LAYOUT_LABELS,
		resolveSectionLayoutPreset,
		type HomepageSectionConfig,
		type SectionSource
	} from '$lib/data/homepage';
	import {
		BookOpen,
		Briefcase,
		Calendar,
		Coins,
		Columns2,
		Eye,
		EyeOff,
		FileText,
		GripVertical,
		ImageIcon,
		Plus,
		RefreshCw,
		Rocket,
		Sparkles,
		Wrench
	} from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	/* ── Sections state ── */

	let sections = $state<(HomepageSectionConfig & { id: string })[]>([]);
	let sectionPreviews = $state<Record<string, { id: string; title: string; skipped: boolean }[]>>(
		{}
	);
	let expandedSections = $state<Record<string, boolean>>({});
	let loadingPreviews = $state<Record<string, boolean>>({});

	$effect(() => {
		sections = data.draftConfig.sections.map((section: HomepageSectionConfig) => ({
			...section,
			excludedIds: section.excludedIds ? [...section.excludedIds] : undefined,
			items: section.items ? section.items.map((item) => ({ ...item })) : undefined
		}));
		sectionPreviews = Object.fromEntries(
			Object.entries(data.sectionPreviews ?? {}).map(([id, items]) => [
				id,
				[...(items as (typeof sectionPreviews)[string])]
			])
		);
		expandedSections = {};
	});

	const flipDurationMs = 200;

	function handleSectionDndConsider(
		e: CustomEvent<DndEvent<HomepageSectionConfig & { id: string }>>
	) {
		expandedSections = {};
		sections = e.detail.items;
	}

	function handleSectionDndFinalize(
		e: CustomEvent<DndEvent<HomepageSectionConfig & { id: string }>>
	) {
		sections = e.detail.items;
	}

	function updateSection(
		id: string,
		updater: (section: HomepageSectionConfig) => HomepageSectionConfig
	) {
		sections = sections.map((section) =>
			section.id === id ? { ...updater(section), id: section.id } : section
		);
	}

	function addSection(source: SectionSource) {
		const newSection = createSection(source);
		sections = [...sections, newSection];
		expandedSections = { ...expandedSections, [newSection.id]: true };
	}

	function removeSection(id: string) {
		sections = sections.filter((section) => section.id !== id);
		const nextPreviews = { ...sectionPreviews };
		delete nextPreviews[id];
		sectionPreviews = nextPreviews;
	}

	function toggleExcluded(sectionId: string, itemId: string, skipped: boolean) {
		updateSection(sectionId, (section) => ({
			...section,
			excludedIds: skipped
				? [...new Set([...(section.excludedIds ?? []), itemId])]
				: (section.excludedIds ?? []).filter((entry) => entry !== itemId)
		}));
		sectionPreviews = {
			...sectionPreviews,
			[sectionId]: (sectionPreviews[sectionId] ?? []).map((item) =>
				item.id === itemId ? { ...item, skipped } : item
			)
		};
	}

	async function fetchPreview(section: HomepageSectionConfig) {
		if (section.source === 'featured' || section.source === 'richtext') return;
		loadingPreviews = { ...loadingPreviews, [section.id]: true };
		try {
			const response = await fetch('/api/admin/homepage-preview', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(section)
			});
			if (!response.ok) throw new Error('Preview request failed');
			const payload = (await response.json()) as {
				items?: { id: string; title: string; skipped?: boolean }[];
			};
			sectionPreviews = {
				...sectionPreviews,
				[section.id]: (payload.items ?? []).map((item) => ({
					...item,
					skipped: item.skipped ?? false
				}))
			};
		} catch {
			/* silent — preview is non-critical */
		} finally {
			loadingPreviews = { ...loadingPreviews, [section.id]: false };
		}
	}

	/* Auto-refresh previews when section settings change (debounced) */

	function sectionFingerprint(s: HomepageSectionConfig): string {
		return `${s.source}|${s.limit}|${s.sortBy}|${s.sortDir}|${s.futureOnly}|${s.searchQuery ?? ''}|${(s.excludedIds ?? []).join(',')}`;
	}

	let prevFingerprints = $state<Record<string, string>>({});
	let previewTimers: Record<string, ReturnType<typeof setTimeout>> = {};

	$effect(() => {
		// Collect all sections including container children
		const allSections: HomepageSectionConfig[] = [];
		for (const section of sections) {
			allSections.push(section);
			if (section.source === 'container' && section.children) {
				allSections.push(...section.children);
			}
		}
		for (const section of allSections) {
			const fp = sectionFingerprint(section);
			const prev = prevFingerprints[section.id];
			if (prev !== undefined && prev !== fp) {
				clearTimeout(previewTimers[section.id]);
				const s = section;
				previewTimers[section.id] = setTimeout(() => fetchPreview(s), 350);
			}
			prevFingerprints[section.id] = fp;
		}
	});

	/* ── Derived counts ── */

	const totalFeaturedItems = $derived(
		sections
			.filter((s) => s.source === 'featured')
			.reduce((sum, s) => sum + (s.items?.length ?? 0), 0)
	);

	/* ── Source icon map for minimap ── */

	const SOURCE_ICONS: Record<string, typeof Calendar> = {
		events: Calendar,
		funding: Coins,
		jobs: Briefcase,
		redpages: BookOpen,
		toolbox: Wrench,
		featured: Sparkles,
		richtext: FileText,
		container: Columns2,
		image: ImageIcon
	};

	/* ── Add section options ── */

	const sourceOptions: Array<{ value: SectionSource; label: string }> = [
		{ value: 'featured', label: "Editor's Picks" },
		{ value: 'richtext', label: 'Announcement' },
		{ value: 'container', label: 'Container' },
		{ value: 'image', label: 'Image' },
		{ value: 'events', label: 'Events' },
		{ value: 'funding', label: 'Funding' },
		{ value: 'jobs', label: 'Jobs' },
		{ value: 'redpages', label: 'Red Pages' },
		{ value: 'toolbox', label: 'Toolbox' }
	];

	/* ── Form helpers ── */

	function enhanceToast(message: string): SubmitFunction {
		return () => {
			return async ({ result, update }) => {
				if (result.type === 'success') toast.success(message);
				else if (result.type === 'failure')
					toast.error((result.data as { error?: string })?.error ?? 'Action failed');
				await update({ reset: false, invalidateAll: true });
			};
		};
	}

	function itemCount(s: HomepageSectionConfig): number {
		if (s.source === 'featured') return s.items?.length ?? 0;
		if (s.source === 'richtext') return s.content?.trim() ? 1 : 0;
		if (s.source === 'container') return s.children?.length ?? 0;
		if (s.source === 'image') return s.imageUrl ? 1 : 0;
		return sectionPreviews[s.id]?.filter((p) => !p.skipped).length ?? s.limit;
	}

	function serializeSections(value: HomepageSectionConfig[]): string {
		return JSON.stringify(value);
	}

	const hasUnsavedSectionEdits = $derived(
		serializeSections(sections) !== serializeSections(data.draftConfig.sections)
	);
	const canPublish = $derived(data.hasChanges || hasUnsavedSectionEdits);

	const headerActionButtonClass =
		'border-[color:color-mix(in_srgb,var(--color-alpine-snow-100)_58%,transparent)] bg-[color:color-mix(in_srgb,var(--color-lakebed-50)_94%,transparent)] text-[var(--color-lakebed-950)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_8px_24px_rgba(23,38,71,0.18)] hover:bg-white focus-visible:ring-white/45';
	const headerPublishButtonClass =
		'border border-[color:color-mix(in_srgb,var(--color-flicker-100)_85%,transparent)] bg-[var(--color-flicker-200)] text-[var(--color-lakebed-950)] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_10px_26px_rgba(23,38,71,0.24)] hover:bg-[var(--color-flicker-100)] focus-visible:ring-[color:color-mix(in_srgb,var(--color-flicker-100)_72%,white)]';
</script>

<div class="space-y-5">
	<AdminPageHeader
		eyebrow="Settings"
		title="Homepage"
		description="Arrange sections, curate featured picks, and publish."
	>
		{#snippet actions()}
			<div class="flex flex-wrap gap-2">
				<Button
					href="/?preview=draft"
					target="_blank"
					rel="noreferrer"
					variant="secondary"
					size="sm"
					class={headerActionButtonClass}
				>
					<Eye class="mr-1.5 h-3.5 w-3.5" />
					Preview
				</Button>
				<form method="POST" action="?/resetDraft" use:enhance={enhanceToast('Draft reset to live')}>
					<Button
						type="submit"
						variant="secondary"
						size="sm"
						disabled={!data.hasChanges && !hasUnsavedSectionEdits}
						class={headerActionButtonClass}
					>
						<RefreshCw class="mr-1.5 h-3.5 w-3.5" />
						Reset
					</Button>
				</form>
				<form
					method="POST"
					action="?/publishDraft"
					use:enhance={enhanceToast('Homepage published')}
				>
					<input type="hidden" name="sectionsPayload" value={JSON.stringify(sections)} />
					<Button
						type="submit"
						variant="secondary"
						size="sm"
						disabled={!canPublish}
						class={headerPublishButtonClass}
					>
						<Rocket class="mr-1.5 h-3.5 w-3.5" />
						Publish
					</Button>
				</form>
			</div>
		{/snippet}
		{#snippet meta()}
			<span>{sections.length} sections</span>
			<span>{totalFeaturedItems} featured items</span>
			<span
				>{hasUnsavedSectionEdits
					? 'Unsaved edits'
					: data.hasChanges
						? 'Unpublished changes'
						: 'In sync'}</span
			>
			{#if data.publishMeta?.publishedAt}
				<span>Published {new Date(data.publishMeta.publishedAt).toLocaleDateString()}</span>
			{/if}
		{/snippet}
	</AdminPageHeader>

	<div class="flex gap-5">
		<!-- ═══════════ Left: Section editor ═══════════ -->
		<div class="min-w-0 flex-1 space-y-3">
			<!-- Add section row -->
			<div
				class="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-[color:var(--rule)] px-3 py-2.5"
			>
				<span class="mr-1 text-xs font-medium text-[var(--mid)]">Add:</span>
				{#each sourceOptions as option}
					<Button
						type="button"
						variant="ghost"
						size="sm"
						class="h-7 px-2 text-xs"
						onclick={() => addSection(option.value)}
					>
						<Plus class="mr-1 h-3 w-3" />
						{option.label}
					</Button>
				{/each}
			</div>

			<!-- DnD section list -->
			<form
				method="POST"
				action="?/saveSections"
				use:enhance={enhanceToast('Sections saved')}
				class="space-y-1.5"
			>
				<input type="hidden" name="sectionsPayload" value={JSON.stringify(sections)} />

				<div
					use:dragHandleZone={{
						items: sections,
						flipDurationMs,
						type: 'sections',
						dropTargetStyle: {}
					}}
					onconsider={handleSectionDndConsider}
					onfinalize={handleSectionDndFinalize}
					class="space-y-1.5"
				>
					{#each sections as section (section.id)}
						<div animate:flip={{ duration: flipDurationMs }}>
							<div class="flex items-start gap-1">
								<div
									use:dragHandle
									aria-label="Drag to reorder {section.heading}"
									class="mt-2.5 flex h-7 w-5 shrink-0 cursor-grab items-center justify-center rounded text-[var(--mid)] hover:text-[var(--color-lakebed-700)] active:cursor-grabbing"
								>
									<GripVertical class="h-4 w-4" />
								</div>
								<div class="min-w-0 flex-1">
									<HomepageSectionRow
										{section}
										expanded={expandedSections[section.id] ?? false}
										sectionPreview={sectionPreviews[section.id] ?? []}
										loadingPreview={loadingPreviews[section.id] ?? false}
										onupdate={(updated) => updateSection(section.id, () => updated)}
										onremove={() => removeSection(section.id)}
										ontoggleexpand={() =>
											(expandedSections = {
												...expandedSections,
												[section.id]: !(expandedSections[section.id] ?? false)
											})}
										ontoggleexcluded={(itemId, skipped) =>
											toggleExcluded(section.id, itemId, skipped)}
									/>
								</div>
							</div>
						</div>
					{/each}
				</div>

				{#if sections.length === 0}
					<div
						class="rounded-xl border border-dashed border-[color:var(--rule)] px-6 py-8 text-center text-sm text-[var(--mid)]"
					>
						No sections yet. Add one above to get started.
					</div>
				{/if}

				<div class="flex justify-end pt-2">
					<Button type="submit" size="sm">Save sections</Button>
				</div>
			</form>
		</div>

		<!-- ═══════════ Right: Visual page preview ═══════════ -->
		<div class="hidden w-72 shrink-0 xl:block">
			<div class="sticky top-20">
				<p class="mb-2 text-[10px] font-semibold tracking-[0.08em] text-[var(--mid)] uppercase">
					Page preview
				</p>

				<!-- Page frame -->
				<div
					class="overflow-hidden rounded-xl border border-[color:var(--rule)] bg-[var(--color-alpine-snow-100)]/60 shadow-sm"
				>
					<!-- Hero block -->
					<div class="bg-[var(--color-lakebed-900)] px-4 py-5">
						<div class="mx-auto max-w-[200px] space-y-2">
							<div class="h-1.5 w-12 rounded-full bg-white/20"></div>
							<div class="h-2.5 w-3/4 rounded bg-white/30"></div>
							<div class="h-1.5 w-full rounded-full bg-white/15"></div>
							<!-- Search bar -->
							<div class="mt-1 h-4 rounded-md border border-white/20 bg-white/10"></div>
						</div>
					</div>

					<!-- Section blocks (visible only) -->
					{#each sections.filter((s) => s.visible) as section, index (section.id)}
						{@const layout = resolveSectionLayoutPreset(section)}
						{@const count = itemCount(section)}
						{@const isActive = expandedSections[section.id] ?? false}
						{@const bg = index % 2 === 0 ? 'bg-[var(--color-alpine-snow-100)]/80' : 'bg-white'}
						<button
							type="button"
							class="group/block relative w-full border-b border-[color:var(--rule)] px-4 py-3 text-left transition-all {bg} {isActive
								? 'ring-2 ring-[var(--color-lakebed-400)] ring-inset'
								: 'hover:bg-[var(--color-lakebed-50)]/40'}"
							onclick={() =>
								(expandedSections = {
									...expandedSections,
									[section.id]: !isActive
								})}
						>
							<!-- Section heading wire -->
							<div class="mb-2 flex items-center gap-1.5">
								<div class="h-px w-3 bg-[var(--mid)]/40"></div>
								<span
									class="truncate text-[8px] font-bold tracking-[0.06em] text-[var(--mid)] uppercase"
								>
									{section.heading || DEFAULT_HEADINGS[section.source]}
								</span>
							</div>

							<!-- Layout block representation -->
							{#if section.source === 'richtext'}
								<!-- Banner / text block -->
								{#if layout === 'cards'}
									<div class="rounded border border-[color:var(--rule)] bg-white p-2">
										<div class="space-y-1">
											<div class="h-1 w-3/4 rounded-full bg-[var(--mid)]/15"></div>
											<div class="h-1 w-full rounded-full bg-[var(--mid)]/10"></div>
											<div class="h-1 w-1/2 rounded-full bg-[var(--mid)]/10"></div>
										</div>
									</div>
								{:else}
									<div
										class="rounded border border-[var(--color-elderberry-200)]/30 bg-[var(--color-elderberry-50)]/20 p-2"
									>
										<div class="space-y-1">
											<div class="h-1 w-3/4 rounded-full bg-[var(--mid)]/15"></div>
											<div class="h-1 w-full rounded-full bg-[var(--mid)]/10"></div>
											<div class="h-1 w-1/2 rounded-full bg-[var(--mid)]/10"></div>
										</div>
									</div>
								{/if}
							{:else if section.source === 'featured'}
								<!-- Featured: lead + sidebar or other layouts -->
								{#if layout === 'cards' || layout === 'auto'}
									<div class="grid grid-cols-[1fr_0.45fr] gap-1.5">
										<!-- Lead card -->
										<div class="rounded border border-[color:var(--rule)] bg-white">
											<div
												class="h-10 rounded-t bg-gradient-to-br from-[var(--color-flicker-200)]/40 to-[var(--color-flicker-100)]/20"
											></div>
											<div class="space-y-0.5 p-1.5">
												<div class="h-1 w-3/4 rounded-full bg-[var(--mid)]/20"></div>
												<div class="h-1 w-1/2 rounded-full bg-[var(--mid)]/10"></div>
											</div>
										</div>
										<!-- Secondary stack -->
										<div class="space-y-1">
											{#each { length: Math.min(Math.max(count - 1, 0), 3) } as _}
												<div
													class="flex gap-1 rounded border border-[color:var(--rule)] bg-white p-1"
												>
													<div class="h-3 w-3 shrink-0 rounded bg-[var(--mid)]/10"></div>
													<div class="flex-1 space-y-0.5 py-0.5">
														<div class="h-0.5 w-full rounded-full bg-[var(--mid)]/15"></div>
														<div class="h-0.5 w-2/3 rounded-full bg-[var(--mid)]/10"></div>
													</div>
												</div>
											{/each}
										</div>
									</div>
								{:else if layout === 'list'}
									<div class="space-y-1">
										{#each { length: Math.min(count, 4) } as _}
											<div
												class="flex gap-1.5 rounded border border-[color:var(--rule)] bg-white p-1.5"
											>
												<div class="h-5 w-5 shrink-0 rounded bg-[var(--mid)]/10"></div>
												<div class="flex-1 space-y-0.5 py-0.5">
													<div class="h-1 w-3/4 rounded-full bg-[var(--mid)]/15"></div>
													<div class="h-0.5 w-1/2 rounded-full bg-[var(--mid)]/10"></div>
												</div>
											</div>
										{/each}
									</div>
								{:else}
									<!-- compact -->
									<div
										class="divide-y divide-[var(--rule)] rounded border border-[color:var(--rule)] bg-white"
									>
										{#each { length: Math.min(count, 5) } as _}
											<div class="flex items-center gap-1.5 px-1.5 py-1">
												<div class="h-2.5 w-2.5 shrink-0 rounded-sm bg-[var(--mid)]/10"></div>
												<div class="h-0.5 flex-1 rounded-full bg-[var(--mid)]/15"></div>
											</div>
										{/each}
									</div>
								{/if}
							{:else if section.source === 'container'}
								<!-- Container: columns -->
								<div
									class="grid gap-1"
									style="grid-template-columns: repeat({section.columns ?? 2}, 1fr)"
								>
									{#each section.children?.filter((c) => c.visible) ?? [] as child}
										<div class="rounded border border-[color:var(--rule)] bg-white p-1">
											<div class="mb-0.5 h-0.5 w-2/3 rounded-full bg-[var(--mid)]/15"></div>
											<div class="h-0.5 w-full rounded-full bg-[var(--mid)]/10"></div>
											<div class="mt-0.5 h-0.5 w-1/2 rounded-full bg-[var(--mid)]/10"></div>
										</div>
									{:else}
										{#each { length: section.columns ?? 2 } as _}
											<div class="rounded border border-dashed border-[color:var(--rule)] p-2">
												<div class="h-3 rounded bg-[var(--mid)]/5"></div>
											</div>
										{/each}
									{/each}
								</div>
							{:else if section.source === 'image'}
								<!-- Image block -->
								<div
									class="overflow-hidden {section.imageRounded !== false
										? 'rounded'
										: ''} border border-[color:var(--rule)] bg-gradient-to-br from-[var(--color-lakebed-100)]/30 to-[var(--color-alpine-snow-200)]/40 {section.imageHeight ===
									'sm'
										? 'h-6'
										: section.imageHeight === 'lg'
											? 'h-14'
											: section.imageHeight === 'xl'
												? 'h-18'
												: 'h-10'}"
								>
									<div class="flex h-full items-center justify-center">
										<ImageIcon class="h-3 w-3 text-[var(--mid)]/30" />
									</div>
								</div>
							{:else}
								<!-- Feed sections: events, funding, jobs, etc -->
								{#if layout === 'cards'}
									{@const cols = Math.min(count, 3)}
									<div class="grid gap-1.5" style="grid-template-columns: repeat({cols}, 1fr)">
										{#each { length: Math.min(count, cols * 2) } as _}
											<div class="rounded border border-[color:var(--rule)] bg-white">
												<div
													class="h-6 rounded-t bg-gradient-to-br from-[var(--color-lakebed-100)]/50 to-transparent"
												></div>
												<div class="space-y-0.5 p-1">
													<div class="h-0.5 w-3/4 rounded-full bg-[var(--mid)]/15"></div>
													<div class="h-0.5 w-1/2 rounded-full bg-[var(--mid)]/10"></div>
												</div>
											</div>
										{/each}
									</div>
								{:else if layout === 'list'}
									<div class="space-y-1">
										{#each { length: Math.min(count, 4) } as _}
											<div
												class="flex gap-1.5 rounded border border-[color:var(--rule)] bg-white p-1.5"
											>
												<div
													class="h-5 w-5 shrink-0 rounded bg-[var(--color-lakebed-100)]/50"
												></div>
												<div class="flex-1 space-y-0.5 py-0.5">
													<div class="h-1 w-3/4 rounded-full bg-[var(--mid)]/15"></div>
													<div class="h-0.5 w-1/2 rounded-full bg-[var(--mid)]/10"></div>
												</div>
											</div>
										{/each}
									</div>
								{:else}
									<!-- compact -->
									<div
										class="divide-y divide-[var(--rule)] rounded border border-[color:var(--rule)] bg-white"
									>
										{#each { length: Math.min(count, 5) } as _}
											<div class="flex items-center gap-1.5 px-1.5 py-1">
												<div
													class="h-2.5 w-2.5 shrink-0 rounded-sm bg-[var(--color-lakebed-100)]/50"
												></div>
												<div class="h-0.5 flex-1 rounded-full bg-[var(--mid)]/15"></div>
												<div class="h-0.5 w-4 rounded-full bg-[var(--mid)]/10"></div>
											</div>
										{/each}
									</div>
								{/if}
							{/if}

							<!-- Item count pill -->
							<div class="mt-1.5 flex items-center gap-1.5">
								<span class="text-[8px] text-[var(--mid)]">
									{count} item{count !== 1 ? 's' : ''}
								</span>
								<span
									class="rounded bg-[var(--color-alpine-snow-200)]/80 px-1 py-px text-[7px] font-medium text-[var(--mid)]"
								>
									{HOMEPAGE_LAYOUT_LABELS[layout]}
								</span>
							</div>
						</button>
					{/each}

					{#if sections.filter((s) => s.visible).length === 0}
						<div class="px-4 py-8 text-center">
							<p class="text-[10px] text-[var(--mid)]">
								{sections.length === 0 ? 'No sections yet' : 'All sections hidden'}
							</p>
						</div>
					{/if}

					<!-- Footer nav wire -->
					<div class="bg-[var(--color-lakebed-900)] px-4 py-3">
						<div class="flex justify-center gap-2">
							{#each { length: 5 } as _}
								<div class="h-1 w-6 rounded-full bg-white/20"></div>
							{/each}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
