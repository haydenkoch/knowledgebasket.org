<script lang="ts">
	import type { FundingItem } from '$lib/data/kb';
	import { stripHtml } from '$lib/utils/format';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import SourceProvenanceCard from '$lib/components/public/source-provenance-card.svelte';

	let { data } = $props();
	let item = $derived(data.item as FundingItem | null);
	const origin = $derived(data.origin ?? '');

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
		item?.fundingTypes?.length ? item.fundingTypes : item?.fundingType ? [item.fundingType] : []
	);
	const eligibilityDisplay = $derived(
		item?.eligibilityTypes?.length
			? item.eligibilityTypes
			: item?.eligibilityType
				? [item.eligibilityType]
				: []
	);

	const cycleLabel = $derived(() => {
		if (!item?.isRecurring) return null;
		return item.recurringSchedule ? `Recurring — ${item.recurringSchedule}` : 'Recurring';
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
	{/if}
</svelte:head>

{#if !item}
	<div class="mx-auto max-w-3xl px-4 py-12 sm:px-6">
		<p class="text-[var(--muted-foreground)]">This opportunity is no longer available.</p>
		<Button variant="outline" href="/funding" class="mt-4">← Back to Funding</Button>
	</div>
{:else}
	<div class="mx-auto max-w-3xl px-4 py-6 sm:px-6">
		<Breadcrumb.Root class="mb-5">
			<Breadcrumb.List>
				<Breadcrumb.Item>
					<Breadcrumb.Link href="/funding">Funding</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Item>
					<Breadcrumb.Page>{item.title}</Breadcrumb.Page>
				</Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>

		<!-- Hero header -->
		<div class="kb-funding-hero">
			<div class="kb-funding-hero-badges">
				{#if item.applicationStatus}
					<span class="kb-funding-badge kb-funding-badge--status">{item.applicationStatus}</span>
				{/if}
				{#each fundingTypesDisplay as ft}
					<span class="kb-funding-badge">{ft}</span>
				{/each}
			</div>
			{#if item.amountDescription}
				<p class="kb-funding-amount">{item.amountDescription}</p>
			{/if}
			<h1 class="kb-funding-title">{item.title}</h1>
			{#if item.funderName}
				<p class="kb-funding-funder">{item.funderName}</p>
			{/if}
		</div>

		<div class="mt-8 grid gap-8 lg:grid-cols-[1fr_280px]">
			<!-- Main content -->
			<div class="min-w-0">
				{#if item.description}
					<section class="kb-funding-section">
						<h2 class="kb-funding-section-title">About this opportunity</h2>
						<div
							class="prose prose-sm text-[var(--muted-foreground)] [&_a]:text-[var(--teal)] [&_a]:no-underline [&_a:hover]:underline"
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
				{#if item.applyUrl}
					<Button href={item.applyUrl} target="_blank" rel="noopener" class="w-full">
						Apply Now →
					</Button>
				{/if}

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
						{#if item.applicationStatus}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Status
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)] capitalize">{item.applicationStatus}</dd>
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
						{#if item.openDate}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Opens
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{item.openDate}</dd>
							</div>
						{/if}
						{#if item.deadline}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Deadline
								</dt>
								<dd class="mt-0.5 font-medium text-[var(--foreground)]">{item.deadline}</dd>
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
				<SourceProvenanceCard provenance={item.provenance} />

				<Button variant="outline" href="/funding" class="w-full">← Back to Funding</Button>
			</aside>
		</div>
	</div>
{/if}

<style>
	.kb-funding-hero {
		border-radius: 12px;
		background: linear-gradient(
			135deg,
			var(--color-flicker-900, #461404),
			var(--color-flicker-700, #ca4404)
		);
		padding: 1.5rem;
		color: white;
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
	.kb-funding-amount {
		font-family: var(--font-serif);
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0 0 0.25rem 0;
	}
	.kb-funding-title {
		font-family: var(--font-serif);
		font-size: clamp(1.25rem, 3.5vw, 1.75rem);
		font-weight: 700;
		line-height: 1.2;
		margin: 0 0 0.375rem 0;
		color: white;
	}
	.kb-funding-funder {
		font-size: 0.9rem;
		opacity: 0.85;
		margin: 0;
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
