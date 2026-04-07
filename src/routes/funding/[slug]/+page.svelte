<script lang="ts">
	import { browser } from '$app/environment';
	import { trackContentViewed, trackExternalLinkClicked } from '$lib/analytics/events';
	import type { FundingItem } from '$lib/data/kb';
	import { formatDisplayValue } from '$lib/utils/display.js';
	import { stripHtml } from '$lib/utils/format';
	import { Button } from '$lib/components/ui/button/index.js';
	import CoilDetailActionRail from '$lib/components/organisms/CoilDetailActionRail.svelte';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';

	let { data } = $props();
	let item = $derived(data.item as FundingItem | null);
	const galleryImages = $derived(
		item
			? item.imageUrl
				? [item.imageUrl, ...(item.imageUrls ?? [])]
				: (item.imageUrls ?? [])
			: []
	);
	let selectedGalleryIndex = $state(0);
	const origin = $derived(data.origin ?? '');
	const isBookmarked = $derived(Boolean(data.isBookmarked));
	const loginHref = $derived(
		item?.slug
			? `/auth/login?redirect=${encodeURIComponent(`/funding/${item.slug}`)}`
			: '/auth/login?redirect=%2Ffunding'
	);

	const canonicalUrl = $derived(
		item?.slug ? `${origin}/funding/${item.slug}` : `${origin}/funding`
	);
	const metaDescription = $derived(
		item
			? item.description
				? stripHtml(String(item.description)).slice(0, 160)
				: `${item.title}${item.funderName ? ` from ${item.funderName}` : ''}${item.amountDescription ? `. ${item.amountDescription}` : ''}.`
			: ''
	);

	const fundingTypesDisplay = $derived(
		(item?.fundingTypes?.length
			? item.fundingTypes
			: item?.fundingType
				? [item.fundingType]
				: []
		).map((value) => formatDisplayValue(value, { key: 'fundingType' }))
	);
	const eligibilityDisplay = $derived(
		(item?.eligibilityTypes?.length
			? item.eligibilityTypes
			: item?.eligibilityType
				? [item.eligibilityType]
				: []
		).map((value) => formatDisplayValue(value, { key: 'eligibilityType' }))
	);
	const applicationStatusLabel = $derived(
		item?.applicationStatus
			? formatDisplayValue(item.applicationStatus, { key: 'applicationStatus' })
			: null
	);
	const openDateLabel = $derived(
		item?.openDate ? formatDisplayValue(item.openDate, { key: 'openDate' }) : null
	);
	const deadlineLabel = $derived(
		item?.deadline ? formatDisplayValue(item.deadline, { key: 'deadline' }) : null
	);

	const cycleLabel = $derived(() => {
		if (!item?.isRecurring) return null;
		return item.recurringSchedule ? `Recurring — ${item.recurringSchedule}` : 'Recurring';
	});

	// Deadline countdown — parse the raw deadline (not the formatted label).
	const deadlineCountdown = $derived.by(() => {
		if (!item?.deadline) return null;
		const parsed = new Date(item.deadline);
		if (Number.isNaN(parsed.getTime())) return null;
		const now = Date.now();
		const ms = parsed.getTime() - now;
		const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
		if (days < 0) return { label: 'Closed', urgent: false, closed: true };
		if (days === 0) return { label: 'Closes today', urgent: true, closed: false };
		if (days === 1) return { label: '1 day left', urgent: true, closed: false };
		if (days <= 14) return { label: `${days} days left`, urgent: true, closed: false };
		if (days <= 60) return { label: `${days} days left`, urgent: false, closed: false };
		return null;
	});
	const jsonLd = $derived.by(() => {
		if (!item) return null;
		const ld: Record<string, unknown> = {
			'@context': 'https://schema.org',
			'@type': 'Grant',
			name: item.title,
			description: metaDescription,
			url: canonicalUrl
		};
		if (item.funderName) ld.funder = { '@type': 'Organization', name: item.funderName };
		if (item.amountMin != null || item.amountMax != null) {
			ld.amount = {
				'@type': 'MonetaryAmount',
				minValue: item.amountMin ?? undefined,
				maxValue: item.amountMax ?? undefined,
				currency: 'USD'
			};
		}
		if (item.deadline) ld.endDate = item.deadline;
		if (item.imageUrl) ld.image = item.imageUrl;
		return ld;
	});
	const jsonLdScript = $derived.by(() =>
		jsonLd
			? [
					'<script type="application/ld+json">',
					JSON.stringify(jsonLd).replaceAll('<', '\\u003c'),
					'</scr' + 'ipt>'
				].join('')
			: null
	);

	let lastTrackedSlug = $state('');

	$effect(() => {
		const slug = item?.slug?.trim();
		if (!browser || !slug || lastTrackedSlug === slug) return;
		lastTrackedSlug = slug;
		trackContentViewed({
			contentType: 'funding',
			slug,
			signedIn: Boolean(data.user)
		});
	});
</script>

<svelte:head>
	<title
		>{item
			? `${item.title} | Funding | Knowledge Basket`
			: 'Opportunity not found | Knowledge Basket'}</title
	>
	{#if item}
		<meta name="description" content={metaDescription} />
		<link rel="canonical" href={canonicalUrl} />
		<meta property="og:title" content={item.title} />
		<meta property="og:description" content={metaDescription} />
		{#if item.imageUrl}<meta property="og:image" content={item.imageUrl} />{/if}
		<meta property="og:url" content={canonicalUrl} />
		<meta property="og:type" content="website" />
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:title" content={item.title} />
		<meta name="twitter:description" content={metaDescription} />
		{#if item.imageUrl}<meta name="twitter:image" content={item.imageUrl} />{/if}
		{#if jsonLdScript}{@html jsonLdScript}{/if}
	{/if}
</svelte:head>

{#if !item}
	<div class="mx-auto max-w-3xl px-4 py-12 sm:px-6">
		<p class="text-[var(--muted-foreground)]">This opportunity is no longer available.</p>
		<Button variant="outline" href="/funding" class="mt-4"
			><ArrowLeft class="inline h-4 w-4" /> Back to Funding</Button
		>
	</div>
{:else}
	<div class="kb-funding-wrap">
		<!-- Hero header -->
		<div class="kb-funding-hero" class:has-image={galleryImages.length > 0}>
			<!-- Decorative grant-paper motif -->
			<svg
				class="kb-funding-hero-motif"
				viewBox="0 0 400 400"
				xmlns="http://www.w3.org/2000/svg"
				aria-hidden="true"
			>
				<defs>
					<pattern id="kb-fund-grid" width="28" height="28" patternUnits="userSpaceOnUse">
						<path d="M28 0H0V28" fill="none" stroke="currentColor" stroke-width="0.5" />
					</pattern>
				</defs>
				<rect width="400" height="400" fill="url(#kb-fund-grid)" />
				<circle cx="340" cy="60" r="70" fill="currentColor" opacity="0.08" />
				<circle cx="340" cy="60" r="40" fill="currentColor" opacity="0.08" />
			</svg>
			<div class="kb-funding-hero-body">
				<div class="kb-funding-hero-text">
					<div class="kb-funding-hero-badges">
						{#if applicationStatusLabel}
							<span class="kb-funding-badge kb-funding-badge--status">{applicationStatusLabel}</span
							>
						{/if}
						{#each fundingTypesDisplay as ft (ft)}
							<span class="kb-funding-badge">{ft}</span>
						{/each}
						{#if deadlineCountdown}
							<span
								class="kb-funding-badge kb-funding-badge--countdown"
								class:is-urgent={deadlineCountdown.urgent}
								class:is-closed={deadlineCountdown.closed}
							>
								{deadlineCountdown.label}
							</span>
						{/if}
					</div>
					{#if item.amountDescription}
						<p class="kb-funding-amount">{item.amountDescription}</p>
					{/if}
					<h1 class="kb-funding-title">{item.title}</h1>
					{#if item.funderName}
						<p class="kb-funding-funder">Funded by {item.funderName}</p>
					{/if}
				</div>
				{#if galleryImages.length > 0}
					<figure class="kb-funding-hero-figure">
						<img src={galleryImages[selectedGalleryIndex] ?? galleryImages[0]} alt="" loading="lazy" />
						{#if galleryImages.length > 1}
							<div class="kb-funding-filmstrip" role="tablist" aria-label="Gallery">
								{#each galleryImages as url, i (url + i)}
									<button
										type="button"
										class="kb-funding-thumb"
										class:selected={i === selectedGalleryIndex}
										aria-label="View image {i + 1}"
										aria-selected={i === selectedGalleryIndex}
										role="tab"
										onclick={() => (selectedGalleryIndex = i)}
									>
										<img src={url} alt="" loading="lazy" />
									</button>
								{/each}
							</div>
						{/if}
					</figure>
				{/if}
			</div>
		</div>

		<CoilDetailActionRail
			isAuthed={!!data.user}
			{isBookmarked}
			{loginHref}
			contentType="funding"
			contentSlug={item.slug}
			saveLabel="opportunity"
			accent="var(--color-flicker-700, #ca4404)"
		>
			{#snippet meta()}
				{#if deadlineLabel}
					<span class="kb-funding-meta-deadline">Deadline · {deadlineLabel}</span>
				{/if}
			{/snippet}
			{#snippet primary()}
				{#if item.applyUrl}
					<Button
						href={item.applyUrl}
						target="_blank"
						rel="noopener"
						size="sm"
						onclick={() =>
							trackExternalLinkClicked({
								contentType: 'funding',
								slug: item.slug,
								action: 'apply',
								href: item.applyUrl,
								signedIn: Boolean(data.user)
							})}
					>
						Apply <ExternalLinkIcon class="size-[14px]" />
					</Button>
				{/if}
			{/snippet}
		</CoilDetailActionRail>

		<div class="kb-funding-grid">
			<!-- Main content -->
			<div class="min-w-0">
				{#if item.description}
					<section class="kb-funding-section">
						<h2 class="kb-funding-section-title">About this opportunity</h2>
						<div
							class="prose prose-sm max-w-[68ch] text-[var(--muted-foreground)] [&_a]:text-[var(--teal)] [&_a]:no-underline [&_a:hover]:underline"
						>
							{@html item.description}
						</div>
					</section>
				{/if}

				{#if item.focusAreas?.length}
					<section class="kb-funding-section">
						<h2 class="kb-funding-section-title">Focus areas</h2>
						<div class="flex flex-wrap gap-1.5">
							{#each item.focusAreas as area}
								<span
									class="inline-block rounded-full bg-[var(--muted)] px-2.5 py-1 text-xs font-medium text-[var(--muted-foreground)]"
									>{area}</span
								>
							{/each}
						</div>
					</section>
				{/if}
			</div>

			<!-- Sidebar -->
			<aside class="flex flex-col gap-4">
				<div class="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
					<h3
						class="mb-3 font-sans text-xs font-bold tracking-wider text-[var(--muted-foreground)] uppercase"
					>
						Details
					</h3>
					<dl class="flex flex-col gap-3 text-sm">
						{#if item.amountDescription}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Amount
								</dt>
								<dd class="mt-0.5 font-medium text-[var(--foreground)]">
									{item.amountDescription}
								</dd>
							</div>
						{/if}
						{#if applicationStatusLabel}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Status
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{applicationStatusLabel}</dd>
							</div>
						{/if}
						{#if item.funderName}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Funder
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{item.funderName}</dd>
							</div>
						{/if}
						{#if openDateLabel}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Opens
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{openDateLabel}</dd>
							</div>
						{/if}
						{#if deadlineLabel}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Deadline
								</dt>
								<dd class="mt-0.5 font-medium text-[var(--foreground)]">{deadlineLabel}</dd>
								{#if item.fundingCycleNotes}
									<dd class="mt-0.5 text-xs text-[var(--muted-foreground)]">
										{item.fundingCycleNotes}
									</dd>
								{/if}
							</div>
						{/if}
						{#if cycleLabel()}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Cycle
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{cycleLabel()}</dd>
							</div>
						{/if}
						{#if fundingTypesDisplay.length}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Funding type
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{fundingTypesDisplay.join(', ')}</dd>
							</div>
						{/if}
						{#if eligibilityDisplay.length}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Eligibility
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{eligibilityDisplay.join(', ')}</dd>
							</div>
						{/if}
						{#if item.region}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Region
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{item.region}</dd>
							</div>
						{/if}
						{#if item.geographicRestrictions}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Geographic restrictions
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{item.geographicRestrictions}</dd>
							</div>
						{/if}
						{#if item.contactEmail}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Contact
								</dt>
								<dd class="mt-0.5">
									<a href="mailto:{item.contactEmail}" class="text-sm text-[var(--teal)]"
										>{item.contactEmail}</a
									>
								</dd>
							</div>
						{/if}
					</dl>
				</div>

				<Button variant="outline" href="/funding" class="w-full"
					><ArrowLeft class="inline h-4 w-4" /> Back to Funding</Button
				>
			</aside>
		</div>
	</div>
{/if}

<style>
	.kb-funding-wrap {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1.5rem 1.5rem 3rem;
	}
	.kb-funding-hero {
		position: relative;
		overflow: hidden;
		border-radius: 18px 18px 0 0;
		background: linear-gradient(
			135deg,
			var(--color-flicker-900, #461404) 0%,
			var(--color-flicker-700, #ca4404) 55%,
			var(--color-elderberry-950, #3f0d16) 100%
		);
		padding: 2.25rem 2rem 2.25rem;
		color: white;
		isolation: isolate;
	}
	@media (min-width: 1024px) {
		.kb-funding-hero {
			padding: 3rem 2.5rem;
		}
	}
	.kb-funding-hero-motif {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		color: white;
		opacity: 0.16;
		z-index: 0;
		pointer-events: none;
	}
	.kb-funding-hero-body {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: flex-start;
		gap: 1.5rem;
	}
	.kb-funding-hero-text {
		flex: 1 1 auto;
		min-width: 0;
	}
	.kb-funding-hero-figure {
		display: none;
		flex-shrink: 0;
		width: 200px;
		height: 200px;
		border-radius: 12px;
		overflow: hidden;
		margin: 0;
		border: 1px solid rgba(255, 255, 255, 0.25);
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
		transform: rotate(-1.5deg);
	}
	.kb-funding-hero-figure img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	@media (min-width: 768px) {
		.kb-funding-hero.has-image .kb-funding-hero-figure {
			display: block;
		}
	}
	/* ── Gallery filmstrip inside figure ── */
	.kb-funding-filmstrip {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		padding: 0.375rem;
		margin-top: 0.5rem;
		background: rgba(0, 0, 0, 0.25);
		border-radius: 8px;
	}
	.kb-funding-thumb {
		width: 48px;
		height: 48px;
		padding: 0;
		border: 2px solid transparent;
		border-radius: 4px;
		overflow: hidden;
		cursor: pointer;
		transition:
			border-color 0.15s,
			transform 0.15s;
	}
	.kb-funding-thumb:hover {
		transform: translateY(-1px);
	}
	.kb-funding-thumb.selected {
		border-color: white;
	}
	.kb-funding-thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	@media (min-width: 1024px) {
		.kb-funding-hero-figure {
			width: 240px;
			height: 240px;
		}
	}
	.kb-funding-hero-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin-bottom: 0.5rem;
	}
	.kb-funding-badge {
		display: inline-block;
		padding: 0.2rem 0.5rem;
		background: rgba(255, 255, 255, 0.18);
		border-radius: 4px;
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.kb-funding-badge--status {
		background: rgba(255, 255, 255, 0.28);
	}
	.kb-funding-badge--countdown {
		background: rgba(255, 255, 255, 0.14);
		border: 1px solid rgba(255, 255, 255, 0.22);
	}
	.kb-funding-badge--countdown.is-urgent {
		background: var(--color-flicker-400, #f97316);
		color: rgba(0, 0, 0, 0.88);
		border-color: transparent;
		animation: kb-funding-pulse 2.4s ease-in-out infinite;
	}
	.kb-funding-badge--countdown.is-closed {
		background: rgba(255, 255, 255, 0.12);
		text-decoration: line-through;
		opacity: 0.7;
	}
	@keyframes kb-funding-pulse {
		0%,
		100% {
			box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.55);
		}
		50% {
			box-shadow: 0 0 0 8px rgba(249, 115, 22, 0);
		}
	}
	.kb-funding-amount {
		font-family: var(--font-display, var(--font-serif));
		font-size: clamp(2rem, 5vw, 3rem);
		font-weight: 700;
		line-height: 1;
		letter-spacing: -0.01em;
		margin: 0 0 0.5rem 0;
		color: white;
	}
	.kb-funding-title {
		font-family: var(--font-display, var(--font-serif));
		font-size: clamp(1.5rem, 3.75vw, 2.25rem);
		font-weight: 700;
		line-height: 1.1;
		letter-spacing: -0.005em;
		margin: 0 0 0.5rem 0;
		color: white;
	}
	.kb-funding-funder {
		font-family: var(--font-serif);
		font-style: italic;
		font-size: 1rem;
		opacity: 0.9;
		margin: 0;
	}
	.kb-funding-meta-deadline {
		font-weight: 600;
		color: var(--color-flicker-700, #ca4404);
		white-space: nowrap;
	}
	.kb-funding-grid {
		display: grid;
		gap: 2rem;
		margin-top: 2rem;
	}
	@media (min-width: 1024px) {
		.kb-funding-grid {
			grid-template-columns: minmax(0, 1fr) 320px;
			gap: 2.5rem;
			align-items: start;
		}
	}
	.kb-funding-section {
		margin-bottom: 1.75rem;
	}
	.kb-funding-section-title {
		font-family: var(--font-serif);
		font-size: 1.0625rem;
		font-weight: 600;
		margin: 0 0 0.625rem 0;
		color: var(--foreground);
	}
</style>
