<script lang="ts">
	import { enhance } from '$app/forms';
	import { browser } from '$app/environment';
	import {
		trackContentViewed,
		trackExternalLinkClicked,
		trackJobInterestChanged
	} from '$lib/insights/events';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import LogoBadge from '$lib/components/molecules/LogoBadge.svelte';
	import { resolveAbsoluteUrl } from '$lib/config/public-assets';
	import type { JobItem } from '$lib/data/kb';
	import { resolveSeoSocialImage } from '$lib/seo/images';
	import { buildOgImagePath } from '$lib/seo/metadata';
	import { formatDisplayValue } from '$lib/utils/display.js';
	import { stripHtml } from '$lib/utils/format';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import { Button } from '$lib/components/ui/button/index.js';
	import CoilDetailActionRail from '$lib/components/organisms/CoilDetailActionRail.svelte';
	import CoilDetailHero from '$lib/components/organisms/CoilDetailHero.svelte';
	import LocationMap from '$lib/components/molecules/LocationMap.svelte';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';

	let { data } = $props();
	let item = $derived(data.item as JobItem | null);
	const origin = $derived((data.seoOrigin ?? data.origin ?? '') as string);
	const isBookmarked = $derived(Boolean(data.isBookmarked));
	const logoUrl = $derived(
		resolveAbsoluteUrl(item?.imageUrl, {
			origin
		})
	);
	const galleryImages = $derived.by(() =>
		item
			? (item.imageUrls ?? []).flatMap((url) => {
					const resolved = resolveAbsoluteUrl(url, { origin }) ?? url;
					return resolved ? [resolved] : [];
				})
			: []
	);
	let selectedGalleryIndex = $state(0);
	const loginHref = $derived(
		item?.slug
			? `/auth/login?redirect=${encodeURIComponent(`/jobs/${item.slug}`)}`
			: '/auth/login?redirect=%2Fjobs'
	);

	const canonicalUrl = $derived(item?.slug ? `${origin}/jobs/${item.slug}` : `${origin}/jobs`);
	const metaDescription = $derived(
		item
			? item.description
				? stripHtml(String(item.description)).slice(0, 160)
				: `${item.title}${item.employerName ? ` at ${item.employerName}` : ''}${item.location ? `. ${item.location}` : ''}.`
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
						eyebrow: 'Knowledge Basket · Jobs',
						theme: 'jobs',
						meta: item.employerName ?? item.location ?? 'Career opportunities'
					})
				})
			: buildOgImagePath({
					title: 'Job Board',
					eyebrow: 'Knowledge Basket · Jobs',
					theme: 'jobs',
					meta: 'Career opportunities'
				})
	);
	const breadcrumbItems = $derived(
		item
			? [
					{ name: 'Knowledge Basket', pathname: '/' },
					{ name: 'Jobs', pathname: '/jobs' },
					{ name: item.title, pathname: item.slug ? `/jobs/${item.slug}` : '/jobs' }
				]
			: [
					{ name: 'Knowledge Basket', pathname: '/' },
					{ name: 'Jobs', pathname: '/jobs' }
				]
	);

	const compensationLabel = $derived(() => {
		if (!item) return null;
		if (item.compensationDescription) return item.compensationDescription;
		if (item.compensationMin != null && item.compensationMax != null) {
			return `$${item.compensationMin.toLocaleString()} – $${item.compensationMax.toLocaleString()}`;
		}
		if (item.compensationMin != null) return `From $${item.compensationMin.toLocaleString()}`;
		if (item.compensationMax != null) return `Up to $${item.compensationMax.toLocaleString()}`;
		return null;
	});

	const workArrangementLabel = $derived(
		item?.workArrangement
			? formatDisplayValue(item.workArrangement, { key: 'workArrangement' })
			: null
	);
	const jobTypeLabel = $derived(
		item?.jobType ? formatDisplayValue(item.jobType, { key: 'jobType' }) : null
	);
	const seniorityLabel = $derived(
		item?.seniority ? formatDisplayValue(item.seniority, { key: 'seniority' }) : null
	);
	const sectorLabel = $derived(
		item?.sector ? formatDisplayValue(item.sector, { key: 'sector' }) : null
	);
	const applicationDeadlineLabel = $derived(
		item?.applicationDeadline
			? formatDisplayValue(item.applicationDeadline, { key: 'applicationDeadline' })
			: null
	);
	const fallbackInitials = $derived.by(
		() =>
			(item?.employerName ?? item?.title ?? '?')
				.split(/\s+/)
				.filter(Boolean)
				.slice(0, 2)
				.map((word) => word[0])
				.join('')
				.toUpperCase() || '?'
	);

	const jsonLd = $derived.by(() => {
		if (!item) return null;
		return {
			'@context': 'https://schema.org',
			'@type': 'JobPosting',
			title: item.title,
			description: metaDescription,
			hiringOrganization: item.employerName
				? {
						'@type': 'Organization',
						name: item.employerName,
						...(logoUrl ? { logo: logoUrl } : {})
					}
				: undefined,
			jobLocation: item.location ? { '@type': 'Place', address: item.location } : undefined,
			employmentType: item.jobType?.toUpperCase().replace(/\s+/g, '_') ?? undefined,
			datePosted: item.publishedAt ?? undefined,
			validThrough: item.applicationDeadline ?? undefined,
			url: canonicalUrl,
			...(coverImageUrl ? { image: coverImageUrl } : {}),
			...(item.applyUrl
				? { applicationContact: { '@type': 'ContactPoint', url: item.applyUrl } }
				: {})
		};
	});
	let lastTrackedSlug = $state('');

	$effect(() => {
		const slug = item?.slug?.trim();
		if (!browser || !slug || lastTrackedSlug === slug) return;
		lastTrackedSlug = slug;
		trackContentViewed({
			contentType: 'job',
			slug,
			signedIn: Boolean(data.user)
		});
	});
</script>

<SeoHead
	{origin}
	pathname={item?.slug ? `/jobs/${item.slug}` : '/jobs'}
	title={item
		? `${item.title}${item.employerName ? ` | ${item.employerName}` : ''} | Jobs | Knowledge Basket`
		: 'Job not found | Knowledge Basket'}
	description={item ? metaDescription : 'This job listing is no longer available.'}
	robotsMode={item ? 'index' : 'noindex-nofollow'}
	ogImage={socialImage}
	ogImageAlt={`${item?.title ?? 'Jobs'} social preview`}
	jsonLd={jsonLd ? [jsonLd] : []}
	{breadcrumbItems}
/>

{#if !item}
	<div class="mx-auto max-w-3xl px-4 py-12 sm:px-6">
		<p class="text-[var(--muted-foreground)]">This listing is no longer available.</p>
		<Button variant="outline" href="/jobs" class="mt-4"
			><ArrowLeft class="inline h-4 w-4" /> Back to Job Board</Button
		>
	</div>
{:else}
	<CoilDetailHero
		title={item.title}
		subtitle={item.employerName ?? undefined}
		bannerImages={galleryImages}
		selectedBannerIndex={selectedGalleryIndex}
		onSelectBanner={(i) => (selectedGalleryIndex = i)}
		galleryLabel="Job gallery"
		placeholderKey={item.slug}
	>
		{#snippet badges()}
			{#if item.indigenousPriority}
				<span class="kb-coil-tag kb-coil-tag--accent">Indigenous Priority</span>
			{/if}
			{#if jobTypeLabel}
				<span class="kb-coil-tag">{jobTypeLabel}</span>
			{/if}
			{#if workArrangementLabel}
				<span class="kb-coil-tag">{workArrangementLabel}</span>
			{/if}
		{/snippet}
		{#snippet logo()}
			<LogoBadge
				src={logoUrl}
				alt={item.employerName ? `${item.employerName} logo` : `${item.title} logo`}
				fallbackText={fallbackInitials}
				size="hero"
			/>
		{/snippet}
		{#snippet extras()}
			{#if item.location}
				<span class="kb-job-hero-location">
					<MapPinIcon class="size-[14px] shrink-0" />
					{item.location}
				</span>
			{/if}
		{/snippet}
	</CoilDetailHero>

	<div class="kb-job-wrap">
		<CoilDetailActionRail
			isAuthed={!!data.user}
			{isBookmarked}
			{loginHref}
			contentType="job"
			contentSlug={item.slug}
			saveLabel="job"
			accent="var(--forest)"
			hasLogoOverhang
		>
			{#snippet meta()}
				{#if applicationDeadlineLabel}
					<span class="kb-job-meta-deadline">Apply by · {applicationDeadlineLabel}</span>
				{/if}
			{/snippet}
			{#snippet actions()}
				{#if data.user}
					<form
						method="POST"
						action="?/toggleInterest"
						use:enhance={() => {
							const nextInterested = !item.userInterested;
							return async ({ result, update }) => {
								if (result.type === 'success') {
									trackJobInterestChanged({
										slug: item.slug,
										interested:
											typeof result.data?.interested === 'boolean'
												? result.data.interested
												: nextInterested,
										signedIn: true
									});
								}
								await update();
							};
						}}
					>
						<Button type="submit" size="sm" variant={item.userInterested ? 'outline' : 'secondary'}>
							{item.userInterested ? 'Interested' : "I'm interested"}
							{#if item.interestCount}
								<span class="ml-1 text-xs opacity-80">({item.interestCount})</span>
							{/if}
						</Button>
					</form>
				{:else}
					<Button href={loginHref} size="sm" variant="outline">Sign in for interest alerts</Button>
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
								contentType: 'job',
								slug: item.slug,
								action: 'apply',
								href: item.applyUrl,
								signedIn: Boolean(data.user)
							})}
					>
						Apply now <ExternalLinkIcon class="size-[14px]" />
					</Button>
				{/if}
			{/snippet}
		</CoilDetailActionRail>

		<div class="kb-job-grid">
			<!-- Main content -->
			<div class="min-w-0">
				{#if item.description}
					<section class="kb-job-section">
						<h2 class="kb-job-section-title">Position overview</h2>
						<div
							class="prose prose-sm text-[var(--muted-foreground)] [&_a]:text-[var(--teal)] [&_a]:no-underline [&_a:hover]:underline"
						>
							{@html item.description}
						</div>
					</section>
				{/if}

				{#if item.qualifications}
					<section class="kb-job-section">
						<h2 class="kb-job-section-title">Qualifications</h2>
						<div
							class="prose prose-sm text-[var(--muted-foreground)] [&_a]:text-[var(--teal)] [&_a]:no-underline [&_a:hover]:underline"
						>
							{@html item.qualifications}
						</div>
					</section>
				{/if}

				{#if item.applicationInstructions}
					<section class="kb-job-section">
						<h2 class="kb-job-section-title">How to apply</h2>
						<div
							class="prose prose-sm text-[var(--muted-foreground)] [&_a]:text-[var(--teal)] [&_a]:no-underline [&_a:hover]:underline"
						>
							{@html item.applicationInstructions}
						</div>
					</section>
				{/if}

				{#if item.benefits}
					<section class="kb-job-section">
						<h2 class="kb-job-section-title">Benefits</h2>
						<div
							class="prose prose-sm text-[var(--muted-foreground)] [&_a]:text-[var(--teal)] [&_a]:no-underline [&_a:hover]:underline"
						>
							{@html item.benefits}
						</div>
					</section>
				{/if}
			</div>

			<!-- Sidebar -->
			<aside class="flex flex-col gap-4">
				{#if item.lat != null && item.lng != null}
					<LocationMap
						lat={item.lat}
						lng={item.lng}
						label={item.employerName ?? 'Job location'}
						address={item.location ?? undefined}
						searchText={item.location ?? item.employerName ?? undefined}
						token={data.mapboxToken}
						accent="var(--forest)"
						eyebrow="Job location"
						height={240}
					/>
				{/if}

				<div class="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
					<h3
						class="mb-3 font-sans text-xs font-bold tracking-wider text-[var(--muted-foreground)] uppercase"
					>
						Details
					</h3>
					<dl class="flex flex-col gap-3 text-sm">
						{#if item.interestCount}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Interest
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">
									{item.interestCount}
									{item.interestCount === 1 ? 'person is' : 'people are'}
									interested
								</dd>
							</div>
						{/if}
						{#if compensationLabel()}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Compensation
								</dt>
								<dd class="mt-0.5 font-medium text-[var(--foreground)]">{compensationLabel()}</dd>
							</div>
						{/if}
						{#if item.employerName}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Employer
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{item.employerName}</dd>
							</div>
						{/if}
						{#if item.location}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Location
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{item.location}</dd>
							</div>
						{/if}
						{#if jobTypeLabel}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Job type
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{jobTypeLabel}</dd>
							</div>
						{/if}
						{#if workArrangementLabel}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Work arrangement
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{workArrangementLabel}</dd>
							</div>
						{/if}
						{#if seniorityLabel}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Level
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{seniorityLabel}</dd>
							</div>
						{/if}
						{#if sectorLabel}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Sector
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{sectorLabel}</dd>
							</div>
						{/if}
						{#if applicationDeadlineLabel}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Apply by
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{applicationDeadlineLabel}</dd>
							</div>
						{/if}
						{#if item.tribalPreference}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Tribal preference
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{item.tribalPreference}</dd>
							</div>
						{/if}
					</dl>
				</div>

				<Button variant="outline" href="/jobs" class="w-full"
					><ArrowLeft class="inline h-4 w-4" /> Back to Job Board</Button
				>
			</aside>
		</div>
	</div>
{/if}

<style>
	.kb-job-wrap {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1.5rem 3rem;
	}
	/* Location row inside the hero extras snippet. */
	.kb-job-hero-location {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}
	.kb-job-meta-deadline {
		font-weight: 600;
		color: var(--forest);
		white-space: nowrap;
	}
	.kb-job-grid {
		display: grid;
		gap: 2rem;
		margin-top: 2rem;
	}
	@media (min-width: 1024px) {
		.kb-job-grid {
			grid-template-columns: minmax(0, 1fr) 340px;
			gap: 2.5rem;
			align-items: start;
		}
	}
	.kb-job-section {
		margin-bottom: 1.75rem;
	}
	.kb-job-section-title {
		font-family: var(--font-serif);
		font-size: 1.0625rem;
		font-weight: 600;
		margin: 0 0 0.625rem 0;
		color: var(--foreground);
	}
</style>
