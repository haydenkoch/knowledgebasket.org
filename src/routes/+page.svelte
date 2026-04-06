<script lang="ts">
	import KbSearch from '$lib/components/organisms/KbSearch.svelte';
	import KbHero from '$lib/components/organisms/KbHero.svelte';
	import EventCard from '$lib/components/molecules/EventCard.svelte';
	import EventListItem from '$lib/components/molecules/EventListItem.svelte';
	import FundingCard from '$lib/components/molecules/FundingCard.svelte';
	import JobListItem from '$lib/components/molecules/JobListItem.svelte';
	import RedPagesListItem from '$lib/components/molecules/RedPagesListItem.svelte';
	import { coilLabels, coilPaths, type CoilKey } from '$lib/data/kb';
	import type { EventItem, FundingItem, JobItem, ToolboxItem, RedPagesItem } from '$lib/data/kb';
	import { stripHtml } from '$lib/utils/format';
	import {
		DEFAULT_HEADINGS,
		buildHomepageSectionMoreHref,
		resolveSectionLayoutPreset,
		type SectionSource
	} from '$lib/data/homepage';

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
	const canonicalUrl = $derived(`${data.origin ?? ''}/`);

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
		if (!d) return '';
		try {
			return new Date(d).toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric'
			});
		} catch {
			return '';
		}
	}

	function coilHref(coil: CoilKey) {
		return `/${coilPaths[coil] ?? coil}`;
	}

	function itemHref(coil: CoilKey, item: { slug?: string; id: string }) {
		return `${coilHref(coil)}/${item.slug ?? item.id}`;
	}

	function sectionMoreHref(section: {
		source: SectionSource;
		searchQuery?: string;
		futureOnly?: boolean;
	}) {
		return buildHomepageSectionMoreHref(section);
	}

	// Featured items
	const lead = $derived(data.featured[0] ?? null);
	const LeadIcon = $derived(lead ? coilIcons[lead.coil] : null);
	const secondary = $derived(data.featured.slice(1));
</script>

<svelte:head>
	<title>Knowledge Basket</title>
	<meta
		name="description"
		content="Search Knowledge Basket for Indigenous-led events, funding opportunities, Native-owned businesses, jobs, and practical resources."
	/>
	<link rel="canonical" href={canonicalUrl} />
</svelte:head>

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
			><strong class="text-lg font-bold text-white">{data.counts.redpages}</strong> Businesses</span
		>
		<span
			><strong class="text-lg font-bold text-white">{data.counts.toolbox}</strong> Resources</span
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
		{#if section.source === 'featured' && lead}
			<section
				class="border-b border-[var(--rule)] px-4 py-8 sm:px-6 lg:px-10 {bgClass}"
				aria-labelledby="kb-featured"
			>
				<div class="mx-auto max-w-[1080px]">
					<h2
						id="kb-featured"
						class="mb-5 flex items-center gap-2 font-sans text-[11px] font-bold tracking-[0.12em] text-[var(--mid)] uppercase"
					>
						<span class="inline-block h-px w-5 bg-[var(--mid)]" aria-hidden="true"></span>
						{section.heading || "Editor's Picks"}
					</h2>

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
		{:else if section.source !== 'featured' && section.source !== 'richtext' && (items as unknown[]).length > 0}
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
						{#if resolvedLayout === 'list'}
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
						{#if resolvedLayout === 'list'}
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
						{#if resolvedLayout === 'compact'}
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
						{#if resolvedLayout === 'compact'}
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
						{#if resolvedLayout === 'compact'}
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
