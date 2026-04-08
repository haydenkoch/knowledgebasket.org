<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import KbSearch from '$lib/components/organisms/KbSearch.svelte';
	import KbHero from '$lib/components/organisms/KbHero.svelte';
	import EventCard from '$lib/components/molecules/EventCard.svelte';
	import EventListItem from '$lib/components/molecules/EventListItem.svelte';
	import FundingCard from '$lib/components/molecules/FundingCard.svelte';
	import JobListItem from '$lib/components/molecules/JobListItem.svelte';
	import RedPagesListItem from '$lib/components/molecules/RedPagesListItem.svelte';
	import { coilLabels, coilPaths, type CoilKey } from '$lib/data/kb';
	import type { EventItem, FundingItem, JobItem, ToolboxItem, RedPagesItem } from '$lib/data/kb';
	import { formatEventDateShort, stripHtml } from '$lib/utils/format';
	import { formatDisplayDate } from '$lib/utils/display';
	import {
		DEFAULT_HEADINGS,
		buildHomepageItemHref,
		buildHomepageSectionMoreHref,
		resolveSectionLayoutPreset,
		type SectionSource
	} from '$lib/data/homepage';
	import { buildOgImagePath, buildWebSiteJsonLd } from '$lib/seo/metadata';

	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import HandCoins from '@lucide/svelte/icons/hand-coins';
	import Store from '@lucide/svelte/icons/store';
	import Briefcase from '@lucide/svelte/icons/briefcase';
	import Wrench from '@lucide/svelte/icons/wrench';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import FileText from '@lucide/svelte/icons/file-text';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import Package from '@lucide/svelte/icons/package';
	import Paperclip from '@lucide/svelte/icons/paperclip';

	let { data } = $props();
	const origin = $derived((data.seoOrigin ?? data.origin ?? '') as string);

	const coilIcons: Record<string, typeof CalendarDays> = {
		events: CalendarDays,
		funding: HandCoins,
		redpages: Store,
		jobs: Briefcase,
		toolbox: Wrench
	};

	const coilColors: Record<string, string> = {
		events: 'var(--teal)',
		funding: 'var(--gold)',
		jobs: 'var(--forest)',
		redpages: 'var(--red)',
		toolbox: 'var(--slate)'
	};

	const mediaTypeIcons: Record<string, typeof FileText> = {
		Toolkit: Package,
		Report: FileText,
		'Policy Document': ClipboardList,
		Guide: BookOpen,
		'Case Study': Paperclip,
		Other: Paperclip
	};
	function toolboxIcon(r: ToolboxItem) {
		return mediaTypeIcons[r.mediaType ?? ''] ?? Paperclip;
	}

	function formatDate(d?: string) {
		return formatDisplayDate(
			d,
			{
				month: 'short',
				day: 'numeric',
				year: 'numeric'
			},
			''
		);
	}

	function coilHref(coil: CoilKey) {
		return `/${coilPaths[coil] ?? coil}`;
	}

	function itemHref(coil: CoilKey, item: { slug?: string; id: string }) {
		return buildHomepageItemHref(coil, item);
	}

	function sectionItemHref(
		source: SectionSource,
		item: { slug?: string; id: string; coil?: CoilKey }
	) {
		return buildHomepageItemHref(source, item) ?? '#';
	}

	function sectionMoreHref(section: {
		source: SectionSource;
		searchQuery?: string;
		futureOnly?: boolean;
	}) {
		return buildHomepageSectionMoreHref(section);
	}

	type ResolvedFeatured = {
		coil: CoilKey;
		item: EventItem | FundingItem | JobItem | ToolboxItem | RedPagesItem;
	};

	type EventDateCandidate = Pick<EventItem, 'startDate' | 'endDate'>;

	function eventDateLabel(item?: EventDateCandidate | null) {
		if (!item?.startDate) return '';
		return formatEventDateShort(item.startDate, item.endDate);
	}

	function featuredEventDateLabel(item: ResolvedFeatured) {
		return item.coil === 'events' ? eventDateLabel(item.item as EventDateCandidate) : '';
	}

	function sectionEventDateLabel(source: SectionSource, item: unknown) {
		if (source !== 'events' || !item || typeof item !== 'object') return '';
		return eventDateLabel(item as EventDateCandidate);
	}
</script>

<SeoHead
	{origin}
	pathname="/"
	title="Knowledge Basket"
	description="Search Knowledge Basket for Indigenous-led events, funding opportunities, Native-owned businesses, jobs, and practical resources."
	robotsMode={data.seoIndexable === false ? 'noindex-follow' : 'index'}
	ogImage={buildOgImagePath({
		title: 'Knowledge Basket',
		eyebrow: 'Indigenous-led opportunities and resources',
		theme: 'site',
		meta: 'Events, funding, businesses, jobs, and practical resources'
	})}
	ogImageAlt="Knowledge Basket homepage social preview"
	jsonLd={[buildWebSiteJsonLd(origin)]}
/>

{#snippet weaveHome()}
	<defs>
		<pattern id="wv-home" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
			<rect x="0" y="0" width="10" height="4" fill="white" />
			<rect x="10" y="10" width="10" height="4" fill="white" />
			<rect x="0" y="6" width="4" height="8" fill="white" opacity=".5" />
		</pattern>
	</defs>
	<rect width="200" height="400" fill="url(#wv-home)" />
{/snippet}

{#snippet statsSnippet()}
	<div class="flex flex-wrap gap-x-7 gap-y-2 font-sans text-sm text-white/80">
		<span><strong class="text-lg font-bold text-white">{data.counts.events}</strong> Events</span>
		<span><strong class="text-lg font-bold text-white">{data.counts.funding}</strong> Funding</span>
		<span><strong class="text-lg font-bold text-white">{data.counts.jobs}</strong> Jobs</span>
		<span
			><strong class="text-lg font-bold text-white">{data.counts.redpages}</strong> Red Page Businesses</span
		>
		<span
			><strong class="text-lg font-bold text-white">{data.counts.toolbox}</strong> Toolbox Resources</span
		>
	</div>
{/snippet}

<div>
	<!-- Hero -->
	<KbHero
		coil="home"
		eyebrow="Knowledge Basket"
		title="Search the Knowledge Basket"
		description="Find events, funding, Native-owned vendors, jobs, and tools that support Indigenous-led economies in the Sierra Nevada and beyond."
		weave={weaveHome}
		stats={statsSnippet}
	/>

	<!-- Search -->
	<section
		class="border-b border-[var(--rule)] bg-[var(--color-alpine-100,var(--bone))] px-4 py-5 pb-7 sm:px-6 lg:px-10"
		aria-labelledby="kb-home-search"
	>
		<div class="mx-auto max-w-[720px]">
			<h2 id="kb-home-search" class="sr-only">Search Knowledge Basket</h2>
			<KbSearch variant="light" />
			<p class="mt-2 font-sans text-[13px] text-[var(--muted-foreground)]">
				Search events, funding, Red Pages vendors, jobs, and toolbox resources from one place.
			</p>
		</div>
	</section>

	<!-- Dynamic Sections -->
	{#each data.sections as section, sectionIdx (section.id)}
		{@const items = (data.sectionData as Record<string, unknown[]>)[section.id] ?? []}
		{@const Icon = coilIcons[section.source]}
		{@const color = coilColors[section.source]}
		{@const resolvedLayout = resolveSectionLayoutPreset(section)}
		{@const moreHref = sectionMoreHref(section)}
		{@const bgClass =
			sectionIdx % 2 === 0 ? 'bg-[var(--color-alpine-100,var(--bone))]' : 'bg-white'}

		<!-- Featured section -->
		{#if section.source === 'featured' && (items as ResolvedFeatured[]).length > 0}
			{@const featItems = items as ResolvedFeatured[]}
			{@const lead = featItems[0]}
			{@const LeadIcon = coilIcons[lead.coil]}
			{@const leadEventDate = featuredEventDateLabel(lead)}
			{@const secondary = featItems.slice(1)}
			<section
				class="border-b border-[var(--rule)] px-4 py-8 sm:px-6 lg:px-10 {bgClass}"
				aria-label={`${section.heading || "Editor's Picks"} featured section ${sectionIdx + 1}`}
			>
				<div class="mx-auto max-w-[1080px]">
					<h2
						id="kb-featured-{section.id}"
						class="mb-5 flex items-center gap-2 font-sans text-[11px] font-bold tracking-[0.12em] text-[var(--mid)] uppercase"
					>
						<span class="inline-block h-px w-5 bg-[var(--mid)]" aria-hidden="true"></span>
						{section.heading || "Editor's Picks"}
					</h2>

					{#if resolvedLayout === 'auto' || resolvedLayout === 'cards'}
						<!-- Lead + sidebar layout -->
						<div class="grid gap-5 lg:grid-cols-[1fr_340px]">
							<a
								href={itemHref(lead.coil, lead.item)}
								class="group relative flex flex-col overflow-hidden rounded-xl border border-[var(--rule)] bg-white no-underline shadow-[var(--sh)] transition-shadow duration-200 hover:no-underline hover:shadow-[var(--shh)]"
							>
								<div
									class="relative flex h-[220px] items-center justify-center overflow-hidden sm:h-[280px]"
									style="background: linear-gradient(135deg, color-mix(in srgb, {coilColors[
										lead.coil
									]} 85%, black), color-mix(in srgb, {coilColors[lead.coil]} 50%, white))"
								>
									{#if 'imageUrl' in lead.item && lead.item.imageUrl}
										<img
											src={lead.item.imageUrl}
											alt=""
											class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
											loading="eager"
										/>
									{:else if LeadIcon}
										<LeadIcon class="h-16 w-16 text-white/25" />
									{/if}
									<span
										class="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-[11px] font-bold tracking-[0.06em] text-white uppercase backdrop-blur-sm"
									>
										{#if LeadIcon}<LeadIcon class="h-3 w-3" />{/if}
										{coilLabels[lead.coil]}
									</span>
								</div>
								<div class="flex flex-1 flex-col p-5 sm:p-6">
									<h3
										class="font-display mb-2 text-2xl leading-tight font-bold text-[var(--dark)] sm:text-[28px]"
									>
										{lead.item.title}
									</h3>
									{#if leadEventDate}
										<p
											class="mb-3 flex items-center gap-1.5 font-sans text-sm font-semibold"
											style="color: {coilColors[lead.coil]}"
										>
											<CalendarDays class="h-4 w-4" aria-hidden="true" />
											{leadEventDate}
										</p>
									{/if}
									{#if lead.item.description}
										<p class="mb-3 line-clamp-3 text-[15px] leading-[1.55] text-[var(--mid)]">
											{stripHtml(String(lead.item.description))}
										</p>
									{/if}
									<span
										class="mt-auto flex items-center gap-1 font-sans text-sm font-semibold"
										style="color: {coilColors[lead.coil]}"
									>
										Read more <ArrowRight class="h-4 w-4" />
									</span>
								</div>
							</a>

							{#if secondary.length}
								<div class="flex flex-col gap-3">
									{#each secondary as feat}
										{@const FeatIcon = coilIcons[feat.coil]}
										{@const featEventDate = featuredEventDateLabel(feat)}
										<a
											href={itemHref(feat.coil, feat.item)}
											class="group flex gap-4 rounded-lg border border-[var(--rule)] bg-white p-4 no-underline transition-shadow duration-150 hover:no-underline hover:shadow-[var(--shh)]"
										>
											<div
												class="flex h-14 w-14 flex-none items-center justify-center rounded-lg"
												style="background: color-mix(in srgb, {coilColors[
													feat.coil
												]} 12%, transparent)"
											>
												{#if FeatIcon}<FeatIcon
														class="h-6 w-6"
														style="color: {coilColors[feat.coil]}"
													/>{/if}
											</div>
											<div class="min-w-0 flex-1">
												<span
													class="mb-1 block text-[10px] font-bold tracking-[0.08em] uppercase"
													style="color: {coilColors[feat.coil]}"
												>
													{coilLabels[feat.coil]}
												</span>
												<h3
													class="mb-1 font-serif text-[15px] leading-tight font-semibold text-[var(--dark)] group-hover:underline"
												>
													{feat.item.title}
												</h3>
												{#if featEventDate}
													<p
														class="mb-1 flex items-center gap-1 text-[12px] font-medium"
														style="color: {coilColors[feat.coil]}"
													>
														<CalendarDays class="h-3.5 w-3.5" aria-hidden="true" />
														{featEventDate}
													</p>
												{/if}
												{#if feat.item.description}
													<p class="line-clamp-2 text-[13px] leading-[1.45] text-[var(--mid)]">
														{stripHtml(String(feat.item.description))}
													</p>
												{/if}
											</div>
										</a>
									{/each}
								</div>
							{/if}
						</div>
					{:else if resolvedLayout === 'list'}
						<!-- List layout -->
						<div class="space-y-3">
							{#each featItems as feat}
								{@const FeatIcon = coilIcons[feat.coil]}
								{@const featEventDate = featuredEventDateLabel(feat)}
								<a
									href={itemHref(feat.coil, feat.item)}
									class="group flex gap-4 rounded-lg border border-[var(--rule)] bg-white p-4 no-underline transition-shadow duration-150 hover:no-underline hover:shadow-[var(--shh)]"
								>
									<div
										class="flex h-14 w-14 flex-none items-center justify-center rounded-lg"
										style="background: color-mix(in srgb, {coilColors[feat.coil]} 12%, transparent)"
									>
										{#if FeatIcon}<FeatIcon
												class="h-6 w-6"
												style="color: {coilColors[feat.coil]}"
											/>{/if}
									</div>
									<div class="min-w-0 flex-1">
										<span
											class="mb-1 block text-[10px] font-bold tracking-[0.08em] uppercase"
											style="color: {coilColors[feat.coil]}"
										>
											{coilLabels[feat.coil]}
										</span>
										<h3
											class="mb-1 font-serif text-[15px] leading-tight font-semibold text-[var(--dark)] group-hover:underline"
										>
											{feat.item.title}
										</h3>
										{#if featEventDate}
											<p
												class="mb-1 flex items-center gap-1 text-[12px] font-medium"
												style="color: {coilColors[feat.coil]}"
											>
												<CalendarDays class="h-3.5 w-3.5" aria-hidden="true" />
												{featEventDate}
											</p>
										{/if}
										{#if feat.item.description}
											<p class="line-clamp-2 text-[13px] leading-[1.45] text-[var(--mid)]">
												{stripHtml(String(feat.item.description))}
											</p>
										{/if}
									</div>
								</a>
							{/each}
						</div>
					{:else}
						<!-- Compact layout -->
						<div
							class="divide-y divide-[var(--rule)] rounded-xl border border-[var(--rule)] bg-white"
						>
							{#each featItems as feat}
								{@const FeatIcon = coilIcons[feat.coil]}
								{@const featEventDate = featuredEventDateLabel(feat)}
								<a
									href={itemHref(feat.coil, feat.item)}
									class="group flex items-center gap-3 px-4 py-3 no-underline transition-colors hover:bg-[var(--color-alpine-snow-100)]/40 hover:no-underline"
								>
									<div
										class="flex h-8 w-8 flex-none items-center justify-center rounded-md"
										style="background: color-mix(in srgb, {coilColors[feat.coil]} 12%, transparent)"
									>
										{#if FeatIcon}<FeatIcon
												class="h-4 w-4"
												style="color: {coilColors[feat.coil]}"
											/>{/if}
									</div>
									<div class="min-w-0 flex-1">
										<h3
											class="truncate text-sm font-medium text-[var(--dark)] group-hover:underline"
										>
											{feat.item.title}
										</h3>
										{#if featEventDate}
											<p class="mt-0.5 truncate text-[11px] text-[var(--mid)]">
												{featEventDate}
											</p>
										{/if}
									</div>
									<span
										class="shrink-0 text-[10px] font-bold tracking-[0.06em] uppercase"
										style="color: {coilColors[feat.coil]}"
									>
										{coilLabels[feat.coil]}
									</span>
								</a>
							{/each}
						</div>
					{/if}
				</div>
			</section>

			<!-- Richtext / announcement sections -->
		{:else if section.source === 'richtext' && section.content}
			<section class="border-b border-[var(--rule)] px-4 py-8 sm:px-6 lg:px-10 {bgClass}">
				<div class="mx-auto max-w-[1080px]">
					{#if section.heading}
						<h2 class="mb-4 font-serif text-xl font-semibold text-[var(--dark)]">
							{section.heading}
						</h2>
					{/if}
					{#if resolvedLayout === 'cards'}
						<div
							class="rounded-2xl border border-[var(--rule)] bg-white p-6 shadow-[var(--sh)] sm:p-8"
						>
							<div class="prose prose-sm max-w-none [&_a]:no-underline [&_a:hover]:underline">
								{@html section.content}
							</div>
						</div>
					{:else}
						<div
							class="rounded-2xl border border-[color:color-mix(in_srgb,var(--color-elderberry-600)_12%,transparent)] bg-[color:color-mix(in_srgb,var(--color-elderberry-600)_6%,white)] px-5 py-5 sm:px-7 sm:py-6"
						>
							<div class="prose prose-sm max-w-none [&_a]:no-underline [&_a:hover]:underline">
								{@html section.content}
							</div>
						</div>
					{/if}
				</div>
			</section>

			<!-- Coil sections -->
		{:else if section.source === 'container' && section.children?.length}
			<section class="border-b border-[var(--rule)] px-4 py-10 sm:px-6 lg:px-10 {bgClass}">
				<div class="mx-auto max-w-[1080px]">
					{#if section.heading}
						<h2 class="mb-6 font-serif text-xl font-semibold text-[var(--dark)]">
							{section.heading}
						</h2>
					{/if}
					<div
						class="grid grid-cols-1 gap-6 md:[grid-template-columns:var(--kb-container-cols)]"
						style="--kb-container-cols: repeat({section.columns ?? 2}, minmax(0, 1fr))"
					>
						{#each section.children.filter((c) => c.visible) as child (child.id)}
							{@const childItems = (data.sectionData as Record<string, unknown[]>)[child.id] ?? []}
							{@const childLayout = resolveSectionLayoutPreset(child)}
							{@const ChildIcon = coilIcons[child.source]}
							{@const childColor = coilColors[child.source]}
							<div class="min-w-0">
								{#if child.heading}
									<h3
										class="mb-3 flex items-center gap-2 font-sans text-[11px] font-bold tracking-[0.08em] text-[var(--mid)] uppercase"
									>
										{#if ChildIcon}<ChildIcon
												class="h-3.5 w-3.5"
												style="color: {childColor}"
											/>{/if}
										{child.heading}
									</h3>
								{/if}
								{#if child.source === 'image' && child.imageUrl}
									{@const imgClass =
										child.imageHeight === 'sm'
											? 'h-32 sm:h-40'
											: child.imageHeight === 'lg'
												? 'h-64 sm:h-80'
												: child.imageHeight === 'xl'
													? 'h-80 sm:h-[28rem]'
													: 'h-48 sm:h-56'}
									{#if child.imageHref}
										<a href={child.imageHref} class="block">
											<img
												src={child.imageUrl}
												alt={child.imageAlt ?? ''}
												class="w-full object-{child.imageFit ??
													'cover'} {imgClass} {child.imageRounded !== false ? 'rounded-xl' : ''}"
											/>
										</a>
									{:else}
										<img
											src={child.imageUrl}
											alt={child.imageAlt ?? ''}
											class="w-full object-{child.imageFit ??
												'cover'} {imgClass} {child.imageRounded !== false ? 'rounded-xl' : ''}"
										/>
									{/if}
								{:else if child.source === 'richtext' && child.content}
									<div class="prose prose-sm max-w-none [&_a]:no-underline [&_a:hover]:underline">
										{@html child.content}
									</div>
								{:else if childItems.length > 0}
									{#if childLayout === 'compact'}
										<div
											class="divide-y divide-[var(--rule)] rounded-xl border border-[var(--rule)] bg-white"
										>
											{#each childItems as childItem}
												{@const ci = childItem as {
													id: string;
													title: string;
													slug?: string;
													coil?: CoilKey;
												}}
												{@const childEventDate = sectionEventDateLabel(child.source, childItem)}
												<a
													href={sectionItemHref(child.source, ci)}
													class="group flex items-center gap-2 px-3 py-2 no-underline hover:bg-[var(--color-alpine-snow-100)]/40 hover:no-underline"
												>
													<div class="min-w-0 flex-1">
														<span
															class="block truncate text-sm text-[var(--dark)] group-hover:underline"
															>{ci.title}</span
														>
														{#if childEventDate}
															<span class="block text-[11px] text-[var(--mid)]">
																{childEventDate}
															</span>
														{/if}
													</div>
												</a>
											{/each}
										</div>
									{:else if childLayout === 'list'}
										<div class="space-y-2">
											{#each childItems as childItem}
												{@const ci = childItem as {
													id: string;
													title: string;
													slug?: string;
													description?: string;
													coil?: CoilKey;
												}}
												{@const childEventDate = sectionEventDateLabel(child.source, childItem)}
												<a
													href={sectionItemHref(child.source, ci)}
													class="group block rounded-lg border border-[var(--rule)] bg-white p-3 no-underline hover:no-underline hover:shadow-[var(--shh)]"
												>
													<h4 class="text-sm font-medium text-[var(--dark)] group-hover:underline">
														{ci.title}
													</h4>
													{#if childEventDate}
														<p class="mt-1 text-[11px] font-medium text-[var(--teal)]">
															{childEventDate}
														</p>
													{/if}
													{#if ci.description}
														<p class="mt-1 line-clamp-1 text-xs text-[var(--mid)]">
															{stripHtml(String(ci.description))}
														</p>
													{/if}
												</a>
											{/each}
										</div>
									{:else}
										<div
											class="grid gap-3"
											style="grid-template-columns: repeat(auto-fill, minmax(160px, 1fr))"
										>
											{#each childItems as childItem}
												{@const ci = childItem as {
													id: string;
													title: string;
													slug?: string;
													coil?: CoilKey;
												}}
												{@const childEventDate = sectionEventDateLabel(child.source, childItem)}
												<a
													href={sectionItemHref(child.source, ci)}
													class="group rounded-lg border border-[var(--rule)] bg-white p-3 no-underline shadow-[var(--sh)] hover:no-underline hover:shadow-[var(--shh)]"
												>
													<h4 class="text-sm font-medium text-[var(--dark)] group-hover:underline">
														{ci.title}
													</h4>
													{#if childEventDate}
														<p class="mt-1 text-[11px] font-medium text-[var(--teal)]">
															{childEventDate}
														</p>
													{/if}
												</a>
											{/each}
										</div>
									{/if}
								{/if}
							</div>
						{/each}
					</div>
				</div>
			</section>
		{:else if section.source === 'image' && section.imageUrl}
			{@const imgClass =
				section.imageHeight === 'sm'
					? 'h-32 sm:h-40'
					: section.imageHeight === 'lg'
						? 'h-64 sm:h-80'
						: section.imageHeight === 'xl'
							? 'h-80 sm:h-[28rem]'
							: 'h-48 sm:h-56'}
			<section class="border-b border-[var(--rule)] px-4 py-8 sm:px-6 lg:px-10 {bgClass}">
				<div class="mx-auto max-w-[1080px]">
					{#if section.heading}
						<h2 class="mb-4 font-serif text-xl font-semibold text-[var(--dark)]">
							{section.heading}
						</h2>
					{/if}
					{#if section.imageHref}
						<a href={section.imageHref} class="block">
							<img
								src={section.imageUrl}
								alt={section.imageAlt ?? ''}
								class="w-full object-{section.imageFit ??
									'cover'} {imgClass} {section.imageRounded !== false ? 'rounded-xl' : ''}"
							/>
						</a>
					{:else}
						<img
							src={section.imageUrl}
							alt={section.imageAlt ?? ''}
							class="w-full object-{section.imageFit ??
								'cover'} {imgClass} {section.imageRounded !== false ? 'rounded-xl' : ''}"
						/>
					{/if}
				</div>
			</section>
		{:else if section.source !== 'featured' && section.source !== 'richtext' && section.source !== 'container' && section.source !== 'image' && (items as unknown[]).length > 0}
			<section class="border-b border-[var(--rule)] px-4 py-10 sm:px-6 lg:px-10 {bgClass}">
				<div class="mx-auto max-w-[1080px]">
					<div class="mb-6 flex items-center justify-between">
						<h2
							class="flex items-center gap-2.5 font-serif text-xl font-semibold text-[var(--dark)]"
						>
							{#if Icon}<Icon class="h-5 w-5" style="color: {color}" />{/if}
							{section.heading || DEFAULT_HEADINGS[section.source]}
						</h2>
						{#if moreHref}
							<a
								href={moreHref}
								class="flex items-center gap-0.5 font-sans text-sm font-semibold no-underline hover:underline"
								style="color: {color}"
							>
								View all <ChevronRight class="h-4 w-4" />
							</a>
						{/if}
					</div>

					<!-- Events -->
					{#if section.source === 'events'}
						{#if resolvedLayout === 'compact'}
							<div
								class="divide-y divide-[var(--rule)] rounded-xl border border-[var(--rule)] bg-white"
							>
								{#each items as event}
									{@const ev = event as EventItem}
									<a
										href={itemHref('events', ev)}
										class="group flex items-center gap-3 px-4 py-3 no-underline transition-colors hover:bg-[var(--color-alpine-snow-100)]/40 hover:no-underline"
									>
										{#if Icon}<div
												class="flex h-8 w-8 flex-none items-center justify-center rounded-md"
												style="background: color-mix(in srgb, {color} 12%, transparent)"
											>
												<Icon class="h-4 w-4" style="color: {color}" />
											</div>{/if}
										<div class="min-w-0 flex-1">
											<h3
												class="truncate text-sm font-medium text-[var(--dark)] group-hover:underline"
											>
												{ev.title}
											</h3>
										</div>
										{#if ev.startDate}
											<span class="shrink-0 text-[11px] text-[var(--mid)]"
												>{formatDate(ev.startDate)}</span
											>
										{/if}
									</a>
								{/each}
							</div>
						{:else if resolvedLayout === 'list'}
							<div class="flex flex-col gap-3">
								{#each items as event, i}
									<EventListItem event={event as EventItem} index={i} />
								{/each}
							</div>
						{:else}
							<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
								{#each items as event, i}
									<EventCard event={event as EventItem} index={i} />
								{/each}
							</div>
						{/if}

						<!-- Funding -->
					{:else if section.source === 'funding'}
						{#if resolvedLayout === 'compact'}
							<div
								class="divide-y divide-[var(--rule)] rounded-xl border border-[var(--rule)] bg-white"
							>
								{#each items as item}
									{@const fundingItem = item as FundingItem}
									<a
										href={itemHref('funding', fundingItem)}
										class="group flex items-center gap-3 px-4 py-3 no-underline transition-colors hover:bg-[var(--color-alpine-snow-100)]/40 hover:no-underline"
									>
										{#if Icon}<div
												class="flex h-8 w-8 flex-none items-center justify-center rounded-md"
												style="background: color-mix(in srgb, {color} 12%, transparent)"
											>
												<Icon class="h-4 w-4" style="color: {color}" />
											</div>{/if}
										<div class="min-w-0 flex-1">
											<h3
												class="truncate text-sm font-medium text-[var(--dark)] group-hover:underline"
											>
												{fundingItem.title}
											</h3>
										</div>
										{#if fundingItem.deadline}
											<span class="shrink-0 text-[11px] text-[var(--mid)]"
												>{formatDate(fundingItem.deadline)}</span
											>
										{/if}
									</a>
								{/each}
							</div>
						{:else if resolvedLayout === 'list'}
							<div class="flex flex-col gap-3">
								{#each items as item (/** @type {FundingItem} */ (item as FundingItem).id)}
									{@const fundingItem = item as FundingItem}
									<a
										href={itemHref('funding', fundingItem)}
										class="rounded-xl border border-[var(--rule)] bg-white p-4 text-inherit no-underline transition-shadow hover:shadow-[var(--shh)]"
									>
										<div class="flex flex-wrap items-start justify-between gap-3">
											<div class="min-w-0 flex-1">
												<h3 class="font-serif text-lg font-semibold text-[var(--dark)]">
													{fundingItem.title}
												</h3>
												{#if fundingItem.funderName}
													<p class="mt-1 text-sm text-[var(--muted-foreground)]">
														{fundingItem.funderName}
													</p>
												{/if}
											</div>
											{#if fundingItem.deadline}
												<span
													class="rounded-full bg-[color:color-mix(in_srgb,var(--gold)_18%,transparent)] px-3 py-1 text-[11px] font-semibold text-[var(--dark)]"
												>
													Deadline {formatDate(fundingItem.deadline)}
												</span>
											{/if}
										</div>
										{#if fundingItem.description}
											<p class="mt-3 line-clamp-2 text-sm leading-[1.5] text-[var(--mid)]">
												{stripHtml(String(fundingItem.description))}
											</p>
										{/if}
									</a>
								{/each}
							</div>
						{:else}
							<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
								{#each items as item, i}
									<FundingCard item={item as FundingItem} index={i} />
								{/each}
							</div>
						{/if}

						<!-- Jobs -->
					{:else if section.source === 'jobs'}
						{#if resolvedLayout === 'cards'}
							<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
								{#each items as job}
									{@const jobItem = job as JobItem}
									<a
										href={itemHref('jobs', jobItem)}
										class="group flex flex-col rounded-xl border border-[var(--rule)] bg-white p-5 text-inherit no-underline shadow-[var(--sh)] transition-shadow hover:shadow-[var(--shh)]"
									>
										<h3
											class="mb-1 font-serif text-base font-semibold text-[var(--dark)] group-hover:underline"
										>
											{jobItem.title}
										</h3>
										{#if jobItem.employerName}
											<p class="text-sm text-[var(--muted-foreground)]">{jobItem.employerName}</p>
										{/if}
										{#if jobItem.location}
											<p class="mt-2 text-[13px] text-[var(--mid)]">{jobItem.location}</p>
										{/if}
										{#if jobItem.compensationType}
											<p class="mt-auto pt-3 text-[13px] font-medium text-[var(--dark)]">
												{jobItem.compensationType}
											</p>
										{/if}
									</a>
								{/each}
							</div>
						{:else if resolvedLayout === 'compact'}
							<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
								{#each items as job (/** @type {JobItem} */ (job as JobItem).id)}
									{@const jobItem = job as JobItem}
									<a
										href={itemHref('jobs', jobItem)}
										class="rounded-lg border border-[var(--rule)] bg-white p-4 text-inherit no-underline transition-shadow hover:shadow-[var(--shh)]"
									>
										<h3 class="font-serif text-base font-semibold text-[var(--dark)]">
											{jobItem.title}
										</h3>
										{#if jobItem.employerName}
											<p class="mt-1 text-sm text-[var(--muted-foreground)]">
												{jobItem.employerName}
											</p>
										{/if}
										{#if jobItem.location}
											<p class="mt-2 text-[13px] text-[var(--mid)]">{jobItem.location}</p>
										{/if}
									</a>
								{/each}
							</div>
						{:else}
							<div class="flex flex-col gap-3">
								{#each items as job, i}
									<JobListItem job={job as JobItem} index={i} />
								{/each}
							</div>
						{/if}

						<!-- Red Pages -->
					{:else if section.source === 'redpages'}
						{#if resolvedLayout === 'cards'}
							<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
								{#each items as vendor}
									{@const vendorItem = vendor as RedPagesItem}
									<a
										href={itemHref('redpages', vendorItem)}
										class="group flex flex-col rounded-xl border border-[var(--rule)] bg-white p-5 text-inherit no-underline shadow-[var(--sh)] transition-shadow hover:shadow-[var(--shh)]"
									>
										<h3
											class="mb-1 font-serif text-base font-semibold text-[var(--dark)] group-hover:underline"
										>
											{vendorItem.title}
										</h3>
										{#if vendorItem.tribalAffiliation}
											<p class="text-sm text-[var(--muted-foreground)]">
												{vendorItem.tribalAffiliation}
											</p>
										{/if}
										{#if vendorItem.serviceType}
											<p class="mt-2 line-clamp-2 text-[13px] text-[var(--mid)]">
												{vendorItem.serviceType}
											</p>
										{/if}
									</a>
								{/each}
							</div>
						{:else if resolvedLayout === 'compact'}
							<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
								{#each items as vendor (/** @type {RedPagesItem} */ (vendor as RedPagesItem).id)}
									{@const vendorItem = vendor as RedPagesItem}
									<a
										href={itemHref('redpages', vendorItem)}
										class="rounded-lg border border-[var(--rule)] bg-white p-4 text-inherit no-underline transition-shadow hover:shadow-[var(--shh)]"
									>
										<h3 class="font-serif text-base font-semibold text-[var(--dark)]">
											{vendorItem.title}
										</h3>
										{#if vendorItem.tribalAffiliation}
											<p class="mt-1 text-sm text-[var(--muted-foreground)]">
												{vendorItem.tribalAffiliation}
											</p>
										{/if}
										{#if vendorItem.serviceType}
											<p class="mt-2 line-clamp-2 text-[13px] text-[var(--mid)]">
												{vendorItem.serviceType}
											</p>
										{/if}
									</a>
								{/each}
							</div>
						{:else}
							<div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
								{#each items as vendor, i}
									<RedPagesListItem vendor={vendor as RedPagesItem} index={i} />
								{/each}
							</div>
						{/if}

						<!-- Toolbox -->
					{:else if section.source === 'toolbox'}
						{#if resolvedLayout === 'cards'}
							<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
								{#each items as resource}
									{@const res = resource as ToolboxItem}
									{@const TbIcon = toolboxIcon(res)}
									<a
										href="/toolbox/{res.slug ?? res.id}"
										class="group flex flex-col rounded-xl border border-[var(--rule)] bg-white p-5 text-inherit no-underline shadow-[var(--sh)] transition-shadow hover:shadow-[var(--shh)]"
									>
										<div
											class="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-[var(--muted)] text-[var(--muted-foreground)]"
										>
											<TbIcon class="h-5 w-5" />
										</div>
										<h3
											class="mb-1 font-serif text-base font-semibold text-[var(--dark)] group-hover:underline"
										>
											{res.title}
										</h3>
										{#if res.source}
											<p class="text-sm text-[var(--muted-foreground)]">{res.source}</p>
										{/if}
										{#if res.description}
											<p class="mt-2 line-clamp-2 text-[13px] text-[var(--mid)]">
												{stripHtml(String(res.description))}
											</p>
										{/if}
									</a>
								{/each}
							</div>
						{:else if resolvedLayout === 'compact'}
							<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
								{#each items as resource (/** @type {ToolboxItem} */ (resource as ToolboxItem).id)}
									{@const res = resource as ToolboxItem}
									{@const TbIcon = toolboxIcon(res)}
									<a
										href="/toolbox/{res.slug ?? res.id}"
										class="flex items-start gap-3 rounded-lg border border-[var(--rule)] bg-white p-4 text-inherit no-underline transition-shadow duration-150 hover:shadow-[var(--shh)]"
									>
										<div
											class="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-[var(--muted)] text-[var(--muted-foreground)]"
											aria-hidden="true"
										>
											<TbIcon class="h-4 w-4" />
										</div>
										<div class="min-w-0 flex-1">
											<h3 class="font-serif text-base font-semibold text-[var(--dark)]">
												{res.title}
											</h3>
											{#if res.source}
												<p class="mt-1 text-sm text-[var(--muted-foreground)]">{res.source}</p>
											{/if}
										</div>
									</a>
								{/each}
							</div>
						{:else}
							<div class="flex flex-col gap-3">
								{#each items as resource (/** @type {ToolboxItem} */ (resource as ToolboxItem).id)}
									{@const res = resource as ToolboxItem}
									{@const TbIcon = toolboxIcon(res)}
									<a
										href="/toolbox/{res.slug ?? res.id}"
										class="flex items-start gap-4 rounded-lg border border-[var(--rule)] bg-white p-4 text-inherit no-underline transition-shadow duration-150 hover:shadow-[var(--shh)]"
									>
										<div
											class="flex h-10 w-10 flex-none items-center justify-center rounded-md bg-[var(--muted)] text-[var(--muted-foreground)]"
											aria-hidden="true"
										>
											<TbIcon class="h-5 w-5" />
										</div>
										<div class="min-w-0 flex-1">
											<h3 class="mb-1 font-serif text-base font-semibold text-[var(--dark)]">
												{res.title}
											</h3>
											{#if res.source}
												<p class="mb-1 text-sm text-[var(--muted-foreground)]">{res.source}</p>
											{/if}
											{#if res.description}
												<p class="mb-2 line-clamp-2 text-[13px] leading-[1.5] text-[var(--mid)]">
													{stripHtml(String(res.description))}
												</p>
											{/if}
											<div class="flex flex-wrap gap-1.5">
												{#if res.mediaType}
													<span
														class="rounded bg-[var(--muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]"
														>{res.mediaType}</span
													>
												{/if}
												{#if res.category}
													<span
														class="rounded bg-[var(--muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]"
														>{res.category}</span
													>
												{/if}
											</div>
										</div>
									</a>
								{/each}
							</div>
						{/if}
					{/if}
				</div>
			</section>
		{/if}
	{/each}

	<!-- Quick Navigation -->
	<section
		class="bg-[var(--color-lakebed-950)] px-4 py-10 sm:px-6 lg:px-10"
		aria-labelledby="kb-coils-nav"
	>
		<div class="mx-auto max-w-[1080px]">
			<h2
				id="kb-coils-nav"
				class="mb-5 font-sans text-[11px] font-bold tracking-[0.12em] text-white/60 uppercase"
			>
				Explore all five coils
			</h2>
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
				{#each Object.entries(coilLabels) as [key, label]}
					{@const Icon = coilIcons[key]}
					<a
						href={coilHref(key as CoilKey)}
						class="group flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 no-underline transition-[background,border-color] duration-150 hover:border-white/20 hover:bg-white/10 hover:no-underline"
					>
						{#if Icon}
							<Icon
								class="h-5 w-5 shrink-0 text-white/50 transition-colors group-hover:text-white/80"
							/>
						{/if}
						<span class="font-sans text-sm font-semibold text-white/80 group-hover:text-white"
							>{label}</span
						>
					</a>
				{/each}
			</div>
		</div>
	</section>
</div>
