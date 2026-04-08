<script lang="ts">
	import { browser } from '$app/environment';
	import { trackContentViewed, trackExternalLinkClicked } from '$lib/insights/events';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { resolveAbsoluteUrl } from '$lib/config/public-assets';
	import type { FundingItem } from '$lib/data/kb';
	import { resolveSeoSocialImage } from '$lib/seo/images';
	import { buildOgImagePath } from '$lib/seo/metadata';
	import { formatDisplayValue } from '$lib/utils/display.js';
	import { stripHtml } from '$lib/utils/format';
	import { Button } from '$lib/components/ui/button/index.js';
	import CoilDetailActionRail from '$lib/components/organisms/CoilDetailActionRail.svelte';
	import CoilDetailHero from '$lib/components/organisms/CoilDetailHero.svelte';
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
	const origin = $derived((data.seoOrigin ?? data.origin ?? '') as string);
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
	const coverImageUrl = $derived(
		resolveAbsoluteUrl(item?.imageUrl, {
			origin
		})
	);
	const socialImage = $derived(
		item
			? resolveSeoSocialImage({
					imageUrl: item.imageUrl ?? item.imageUrls?.[0] ?? null,
					origin,
					seed: item.slug ?? item.title,
					fallbackOgImage: buildOgImagePath({
						title: item.title,
						eyebrow: 'Knowledge Basket · Funding',
						theme: 'funding',
						meta: item.funderName ?? item.amountDescription ?? 'Funding opportunities'
					})
				})
			: buildOgImagePath({
					title: 'Funding',
					eyebrow: 'Knowledge Basket · Funding',
					theme: 'funding',
					meta: 'Funding opportunities'
				})
	);
	const breadcrumbItems = $derived(
		item
			? [
					{ name: 'Knowledge Basket', pathname: '/' },
					{ name: 'Funding', pathname: '/funding' },
					{ name: item.title, pathname: item.slug ? `/funding/${item.slug}` : '/funding' }
				]
			: [
					{ name: 'Knowledge Basket', pathname: '/' },
					{ name: 'Funding', pathname: '/funding' }
				]
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
		if (coverImageUrl) ld.image = coverImageUrl;
		return ld;
	});

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

<SeoHead
	{origin}
	pathname={item?.slug ? `/funding/${item.slug}` : '/funding'}
	title={item
		? `${item.title} | Funding | Knowledge Basket`
		: 'Opportunity not found | Knowledge Basket'}
	description={item ? metaDescription : 'This funding opportunity is no longer available.'}
	robotsMode={item ? 'index' : 'noindex-nofollow'}
	ogImage={socialImage}
	ogImageAlt={`${item?.title ?? 'Funding'} social preview`}
	jsonLd={jsonLd ? [jsonLd] : []}
	{breadcrumbItems}
/>

{#if !item}
	<div class="mx-auto max-w-3xl px-4 py-12 sm:px-6">
		<p class="text-[var(--muted-foreground)]">This opportunity is no longer available.</p>
		<Button variant="outline" href="/funding" class="mt-4"
			><ArrowLeft class="inline h-4 w-4" /> Back to Funding</Button
		>
	</div>
{:else}
	<CoilDetailHero
		title={item.title}
		subtitle={item.funderName ? `Funded by ${item.funderName}` : undefined}
		bannerImages={galleryImages}
		selectedBannerIndex={selectedGalleryIndex}
		onSelectBanner={(i) => (selectedGalleryIndex = i)}
		galleryLabel="Funder gallery"
		imageFit="logo-on-cover"
		placeholderKey={item.slug}
	>
		{#snippet badges()}
			{#if applicationStatusLabel}
				<span class="kb-coil-tag kb-coil-tag--accent">{applicationStatusLabel}</span>
			{/if}
			{#each fundingTypesDisplay as ft (ft)}
				<span class="kb-coil-tag">{ft}</span>
			{/each}
			{#if deadlineCountdown}
				<span
					class="kb-coil-tag"
					class:kb-coil-tag--urgent={deadlineCountdown.urgent}
					class:kb-coil-tag--closed={deadlineCountdown.closed}
				>
					{deadlineCountdown.label}
				</span>
			{/if}
		{/snippet}
	</CoilDetailHero>

	<div class="kb-funding-wrap">
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
		padding: 0 1.5rem 3rem;
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
