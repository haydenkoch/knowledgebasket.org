<script lang="ts">
	import { browser } from '$app/environment';
	import { trackContentViewed, trackExternalLinkClicked } from '$lib/analytics/events';
	import type { JobItem } from '$lib/data/kb';
	import { getPlaceholderImage } from '$lib/data/placeholders';
	import { formatDisplayValue } from '$lib/utils/display.js';
	import { stripHtml } from '$lib/utils/format';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import { Button } from '$lib/components/ui/button/index.js';
	import CoilDetailActionRail from '$lib/components/organisms/CoilDetailActionRail.svelte';
	import LocationMap from '$lib/components/molecules/LocationMap.svelte';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';

	let { data } = $props();
	let item = $derived(data.item as JobItem | null);
	const origin = $derived(data.origin ?? '');
	const isBookmarked = $derived(Boolean(data.isBookmarked));
	const heroImage = $derived(item ? (item.imageUrl ?? getPlaceholderImage(0)) : '');
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

	const jsonLd = $derived.by(() => {
		if (!item) return null;
		return {
			'@context': 'https://schema.org',
			'@type': 'JobPosting',
			title: item.title,
			description: metaDescription,
			hiringOrganization: item.employerName
				? { '@type': 'Organization', name: item.employerName }
				: undefined,
			jobLocation: item.location ? { '@type': 'Place', address: item.location } : undefined,
			employmentType: item.jobType?.toUpperCase().replace(/\s+/g, '_') ?? undefined,
			datePosted: item.publishedAt ?? undefined,
			validThrough: item.applicationDeadline ?? undefined,
			url: canonicalUrl,
			...(item.applyUrl
				? { applicationContact: { '@type': 'ContactPoint', url: item.applyUrl } }
				: {})
		};
	});
	const jsonLdScript = $derived.by(() =>
		jsonLd
			? [
					'<script type="application/ld+json">',
					JSON.stringify(jsonLd).replaceAll('<', '\\u003c'),
					'</scr' + 'ipt>'
				].join('')
			: ''
	);
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

<svelte:head>
	<title
		>{item
			? `${item.title}${item.employerName ? ` | ${item.employerName}` : ''} | Jobs | Knowledge Basket`
			: 'Job not found | Knowledge Basket'}</title
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
		{#if jsonLd}{@html jsonLdScript}{/if}
	{/if}
</svelte:head>

{#if !item}
	<div class="mx-auto max-w-3xl px-4 py-12 sm:px-6">
		<p class="text-[var(--muted-foreground)]">This listing is no longer available.</p>
		<Button variant="outline" href="/jobs" class="mt-4"
			><ArrowLeft class="inline h-4 w-4" /> Back to Job Board</Button
		>
	</div>
{:else}
	<div class="kb-job-wrap">
		<!-- Hero header -->
		<div class="kb-job-hero">
			<img src={heroImage} alt="" class="kb-job-hero-img" />
			<div class="kb-job-hero-overlay"></div>
			<div class="kb-job-hero-content">
				<div class="kb-job-hero-copy">
					<div class="kb-job-hero-badges">
						{#if item.indigenousPriority}
							<span class="kb-job-badge kb-job-badge--priority">Indigenous Priority</span>
						{/if}
						{#if jobTypeLabel}
							<span class="kb-job-badge">{jobTypeLabel}</span>
						{/if}
						{#if workArrangementLabel}
							<span class="kb-job-badge">{workArrangementLabel}</span>
						{/if}
					</div>
					<h1 class="kb-job-hero-title">{item.title}</h1>
					{#if item.employerName}
						<p class="kb-job-hero-employer">{item.employerName}</p>
					{/if}
					{#if item.location}
						<p class="kb-job-hero-location">
							<MapPinIcon class="size-[14px] shrink-0" />
							{item.location}
						</p>
					{/if}
				</div>
				{#if compensationLabel()}
					<div class="kb-job-hero-comp">
						<span class="kb-job-hero-comp-label">Compensation</span>
						<span class="kb-job-hero-comp-value">{compensationLabel()}</span>
					</div>
				{/if}
			</div>
		</div>

		<CoilDetailActionRail
			isAuthed={!!data.user}
			{isBookmarked}
			{loginHref}
			contentType="job"
			contentSlug={item.slug}
			saveLabel="job"
			accent="var(--forest)"
		>
			{#snippet meta()}
				{#if applicationDeadlineLabel}
					<span class="kb-job-meta-deadline">Apply by · {applicationDeadlineLabel}</span>
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
						token={data.mapboxToken}
						accent="var(--forest)"
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
		padding: 1.5rem 1.5rem 3rem;
	}
	.kb-job-hero {
		position: relative;
		overflow: hidden;
		border-radius: 18px 18px 0 0;
		height: 300px;
		background: linear-gradient(135deg, var(--forest), var(--color-pinyon-950, #13201a));
	}
	@media (min-width: 640px) {
		.kb-job-hero {
			height: 380px;
		}
	}
	@media (min-width: 1024px) {
		.kb-job-hero {
			height: 440px;
		}
	}
	.kb-job-hero-img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.kb-job-hero-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to top,
			rgba(0, 0, 0, 0.88) 0%,
			rgba(0, 0, 0, 0.4) 55%,
			rgba(0, 0, 0, 0.05) 100%
		);
	}
	.kb-job-hero-content {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 1.5rem 1.75rem 1.75rem;
		color: white;
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1.5rem;
	}
	@media (min-width: 1024px) {
		.kb-job-hero-content {
			padding: 2rem 2.5rem;
		}
	}
	.kb-job-hero-copy {
		min-width: 0;
		flex: 1 1 auto;
	}
	.kb-job-hero-comp {
		display: none;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.2rem;
		flex-shrink: 0;
		padding: 1rem 1.25rem;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border: 1px solid rgba(255, 255, 255, 0.18);
	}
	@media (min-width: 768px) {
		.kb-job-hero-comp {
			display: flex;
		}
	}
	.kb-job-hero-comp-label {
		font-family: var(--font-sans);
		font-size: 0.625rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		opacity: 0.75;
	}
	.kb-job-hero-comp-value {
		font-family: var(--font-display, var(--font-serif));
		font-size: 1.5rem;
		font-weight: 700;
		line-height: 1.1;
		color: white;
		white-space: nowrap;
	}
	.kb-job-hero-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin-bottom: 0.5rem;
	}
	.kb-job-badge {
		display: inline-block;
		padding: 0.2rem 0.5rem;
		background: rgba(255, 255, 255, 0.15);
		border-radius: 4px;
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.kb-job-badge--priority {
		background: var(--color-flicker-400);
		color: rgba(0, 0, 0, 0.85);
	}
	.kb-job-hero-title {
		font-family: var(--font-display, var(--font-serif));
		font-size: clamp(1.625rem, 4.25vw, 2.75rem);
		font-weight: 700;
		line-height: 1.05;
		letter-spacing: -0.01em;
		margin: 0 0 0.5rem 0;
		color: white;
		text-shadow: 0 2px 20px rgba(0, 0, 0, 0.45);
	}
	.kb-job-hero-employer {
		font-family: var(--font-serif);
		font-size: 1rem;
		font-style: italic;
		opacity: 0.92;
		margin: 0 0 0.35rem 0;
	}
	.kb-job-hero-location {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.875rem;
		opacity: 0.85;
		margin: 0;
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
