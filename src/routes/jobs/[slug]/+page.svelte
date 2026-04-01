<script lang="ts">
	import type { JobItem } from '$lib/data/kb';
	import { getPlaceholderImage } from '$lib/data/placeholders';
	import { stripHtml } from '$lib/utils/format';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';

	let { data } = $props();
	let item = $derived(data.item as JobItem | null);
	const origin = $derived(data.origin ?? '');
	const heroImage = $derived(item ? (item.imageUrl ?? getPlaceholderImage(0)) : '');

	const canonicalUrl = $derived(item?.slug ? `${origin}/jobs/${item.slug}` : `${origin}/jobs`);
	const metaDescription = $derived(
		item
			? (item.description
				? stripHtml(String(item.description)).slice(0, 160)
				: `${item.title}${item.employerName ? ` at ${item.employerName}` : ''}${item.location ? `. ${item.location}` : ''}.`)
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

	const workArrangementLabel = $derived(() => {
		if (!item?.workArrangement) return null;
		const map: Record<string, string> = {
			on_site: 'On-site',
			remote: 'Remote',
			hybrid: 'Hybrid'
		};
		return map[item.workArrangement] ?? item.workArrangement;
	});

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
			jobLocation: item.location
				? { '@type': 'Place', address: item.location }
				: undefined,
			employmentType: item.jobType?.toUpperCase().replace(/\s+/g, '_') ?? undefined,
			datePosted: item.publishedAt ?? undefined,
			validThrough: item.applicationDeadline ?? undefined,
			url: canonicalUrl,
			...(item.applyUrl ? { applicationContact: { '@type': 'ContactPoint', url: item.applyUrl } } : {})
		};
	});
</script>

<svelte:head>
	<title>{item ? `${item.title}${item.employerName ? ` | ${item.employerName}` : ''} | Jobs | Knowledge Basket` : 'Job not found | Knowledge Basket'}</title>
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
		{#if jsonLd}{@html `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/<\/script>/g, '<\\/script>')}</script>`}{/if}
	{/if}
</svelte:head>

{#if !item}
	<div class="mx-auto max-w-3xl px-4 py-12 sm:px-6">
		<p class="text-[var(--muted-foreground)]">This listing is no longer available.</p>
		<Button variant="outline" href="/jobs" class="mt-4">← Back to Job Board</Button>
	</div>
{:else}
<div class="mx-auto max-w-3xl px-4 py-6 sm:px-6">

	<Breadcrumb.Root class="mb-5">
		<Breadcrumb.List>
			<Breadcrumb.Item>
				<Breadcrumb.Link href="/jobs">Job Board</Breadcrumb.Link>
			</Breadcrumb.Item>
			<Breadcrumb.Separator />
			<Breadcrumb.Item>
				<Breadcrumb.Page>{item.title}</Breadcrumb.Page>
			</Breadcrumb.Item>
		</Breadcrumb.List>
	</Breadcrumb.Root>

	<!-- Hero header -->
	<div class="kb-job-hero">
		<img src={heroImage} alt="" class="kb-job-hero-img" />
		<div class="kb-job-hero-overlay"></div>
		<div class="kb-job-hero-content">
			<div class="kb-job-hero-badges">
				{#if item.indigenousPriority}
					<span class="kb-job-badge kb-job-badge--priority">Indigenous Priority</span>
				{/if}
				{#if item.jobType}
					<span class="kb-job-badge">{item.jobType}</span>
				{/if}
				{#if workArrangementLabel()}
					<span class="kb-job-badge">{workArrangementLabel()}</span>
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
	</div>

	<div class="mt-8 grid gap-8 lg:grid-cols-[1fr_280px]">
		<!-- Main content -->
		<div class="min-w-0">
			{#if item.description}
				<section class="kb-job-section">
					<h2 class="kb-job-section-title">Position overview</h2>
					<div class="prose prose-sm text-[var(--muted-foreground)] [&_a]:text-[var(--teal)] [&_a]:no-underline [&_a:hover]:underline">{@html item.description}</div>
				</section>
			{/if}

			{#if item.qualifications}
				<section class="kb-job-section">
					<h2 class="kb-job-section-title">Qualifications</h2>
					<div class="prose prose-sm text-[var(--muted-foreground)] [&_a]:text-[var(--teal)] [&_a]:no-underline [&_a:hover]:underline">{@html item.qualifications}</div>
				</section>
			{/if}

			{#if item.applicationInstructions}
				<section class="kb-job-section">
					<h2 class="kb-job-section-title">How to apply</h2>
					<div class="prose prose-sm text-[var(--muted-foreground)] [&_a]:text-[var(--teal)] [&_a]:no-underline [&_a:hover]:underline">{@html item.applicationInstructions}</div>
				</section>
			{/if}

			{#if item.benefits}
				<section class="kb-job-section">
					<h2 class="kb-job-section-title">Benefits</h2>
					<div class="prose prose-sm text-[var(--muted-foreground)] [&_a]:text-[var(--teal)] [&_a]:no-underline [&_a:hover]:underline">{@html item.benefits}</div>
				</section>
			{/if}
		</div>

		<!-- Sidebar -->
		<aside class="flex flex-col gap-4">
			{#if item.applyUrl}
				<Button href={item.applyUrl} target="_blank" rel="noopener" class="w-full">
					Apply Now →
				</Button>
			{/if}

			<div class="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
				<h3 class="font-sans text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-3">Details</h3>
				<dl class="flex flex-col gap-3 text-sm">
					{#if compensationLabel()}
						<div>
							<dt class="font-semibold text-[var(--muted-foreground)] text-[11px] uppercase tracking-[0.06em]">Compensation</dt>
							<dd class="text-[var(--foreground)] mt-0.5 font-medium">{compensationLabel()}</dd>
						</div>
					{/if}
					{#if item.employerName}
						<div>
							<dt class="font-semibold text-[var(--muted-foreground)] text-[11px] uppercase tracking-[0.06em]">Employer</dt>
							<dd class="text-[var(--foreground)] mt-0.5">{item.employerName}</dd>
						</div>
					{/if}
					{#if item.location}
						<div>
							<dt class="font-semibold text-[var(--muted-foreground)] text-[11px] uppercase tracking-[0.06em]">Location</dt>
							<dd class="text-[var(--foreground)] mt-0.5">{item.location}</dd>
						</div>
					{/if}
					{#if item.jobType}
						<div>
							<dt class="font-semibold text-[var(--muted-foreground)] text-[11px] uppercase tracking-[0.06em]">Job type</dt>
							<dd class="text-[var(--foreground)] mt-0.5">{item.jobType}</dd>
						</div>
					{/if}
					{#if workArrangementLabel()}
						<div>
							<dt class="font-semibold text-[var(--muted-foreground)] text-[11px] uppercase tracking-[0.06em]">Work arrangement</dt>
							<dd class="text-[var(--foreground)] mt-0.5">{workArrangementLabel()}</dd>
						</div>
					{/if}
					{#if item.seniority}
						<div>
							<dt class="font-semibold text-[var(--muted-foreground)] text-[11px] uppercase tracking-[0.06em]">Level</dt>
							<dd class="text-[var(--foreground)] mt-0.5">{item.seniority}</dd>
						</div>
					{/if}
					{#if item.sector}
						<div>
							<dt class="font-semibold text-[var(--muted-foreground)] text-[11px] uppercase tracking-[0.06em]">Sector</dt>
							<dd class="text-[var(--foreground)] mt-0.5">{item.sector}</dd>
						</div>
					{/if}
					{#if item.applicationDeadline}
						<div>
							<dt class="font-semibold text-[var(--muted-foreground)] text-[11px] uppercase tracking-[0.06em]">Apply by</dt>
							<dd class="text-[var(--foreground)] mt-0.5">{item.applicationDeadline}</dd>
						</div>
					{/if}
					{#if item.tribalPreference}
						<div>
							<dt class="font-semibold text-[var(--muted-foreground)] text-[11px] uppercase tracking-[0.06em]">Tribal preference</dt>
							<dd class="text-[var(--foreground)] mt-0.5">{item.tribalPreference}</dd>
						</div>
					{/if}
				</dl>
			</div>

			<Button variant="outline" href="/jobs" class="w-full">← Back to Job Board</Button>
		</aside>
	</div>
</div>
{/if}

<style>
	.kb-job-hero {
		position: relative;
		overflow: hidden;
		border-radius: 12px;
		height: 220px;
		background: linear-gradient(135deg, var(--forest), var(--color-pinyon-950, #13201a));
	}
	@media (min-width: 640px) {
		.kb-job-hero {
			height: 260px;
		}
	}
	.kb-job-hero-img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0.35;
	}
	.kb-job-hero-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.15) 100%);
	}
	.kb-job-hero-content {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 1.25rem 1.5rem;
		color: white;
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
		background: rgba(255,255,255,0.15);
		border-radius: 4px;
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.kb-job-badge--priority {
		background: var(--color-flicker-400);
		color: rgba(0,0,0,0.85);
	}
	.kb-job-hero-title {
		font-family: var(--font-serif);
		font-size: clamp(1.25rem, 3.5vw, 1.75rem);
		font-weight: 700;
		line-height: 1.2;
		margin: 0 0 0.375rem 0;
		color: white;
	}
	.kb-job-hero-employer {
		font-size: 0.9rem;
		opacity: 0.9;
		margin: 0 0 0.25rem 0;
	}
	.kb-job-hero-location {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.875rem;
		opacity: 0.8;
		margin: 0;
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
