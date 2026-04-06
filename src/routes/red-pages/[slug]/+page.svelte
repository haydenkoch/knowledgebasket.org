<script lang="ts">
	import type { RedPagesItem } from '$lib/data/kb';
	import { stripHtml } from '$lib/utils/format';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import CoilDetailActionRail from '$lib/components/organisms/CoilDetailActionRail.svelte';
	import LocationMap from '$lib/components/molecules/LocationMap.svelte';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import PhoneIcon from '@lucide/svelte/icons/phone';
	import MailIcon from '@lucide/svelte/icons/mail';

	let { data } = $props();
	let item = $derived(data.item as RedPagesItem | null);
	const origin = $derived(data.origin ?? '');
	const isBookmarked = $derived(Boolean(data.isBookmarked));
	const loginHref = $derived(
		item?.slug
			? `/auth/login?redirect=${encodeURIComponent(`/red-pages/${item.slug}`)}`
			: '/auth/login?redirect=%2Fred-pages'
	);

	function initials(title: string): string {
		return (
			title
				.split(/\s+/)
				.filter(Boolean)
				.slice(0, 2)
				.map((w) => w[0])
				.join('')
				.toUpperCase() || '?'
		);
	}

	const canonicalUrl = $derived(
		item?.slug ? `${origin}/red-pages/${item.slug}` : `${origin}/red-pages`
	);
	const metaDescription = $derived(
		item
			? item.description
				? stripHtml(String(item.description)).slice(0, 160)
				: `${item.title}${item.tribalAffiliation ? `, ${item.tribalAffiliation}` : ''}${item.serviceType ? `. ${item.serviceType}` : ''}.`
			: ''
	);

	const addressLine = $derived(
		item ? [item.address, item.city, item.state, item.zip].filter(Boolean).join(', ') : ''
	);
	const mapsUrl = $derived(
		addressLine
			? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}`
			: item?.lat != null && item?.lng != null
				? `https://www.google.com/maps?q=${item.lat},${item.lng}`
				: ''
	);

	const serviceTypesDisplay = $derived(
		item?.serviceTypes?.length ? item.serviceTypes : item?.serviceType ? [item.serviceType] : []
	);

	const heroBanner = $derived(item?.imageUrl ?? item?.imageUrls?.[0] ?? null);

	const jsonLd = $derived.by(() => {
		if (!item) return null;
		const ld: Record<string, unknown> = {
			'@context': 'https://schema.org',
			'@type': 'LocalBusiness',
			name: item.title,
			description: metaDescription,
			url: item.website ?? canonicalUrl
		};
		if (item.phone) ld.telephone = item.phone;
		if (item.email) ld.email = item.email;
		if (addressLine) {
			ld.address = {
				'@type': 'PostalAddress',
				streetAddress: item.address,
				addressLocality: item.city,
				addressRegion: item.state,
				postalCode: item.zip
			};
		}
		return ld;
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
</script>

<svelte:head>
	<title
		>{item
			? `${item.title} | Red Pages | Knowledge Basket`
			: 'Listing not found | Knowledge Basket'}</title
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
		<Button variant="outline" href="/red-pages" class="mt-4"
			><ArrowLeft class="inline h-4 w-4" /> Back to Red Pages</Button
		>
	</div>
{:else}
	<div class="kb-rp-wrap">
		<!-- Hero header: optional banner image behind gradient scrim, logo overlaps rail below -->
		<div class="kb-rp-hero" class:has-banner={!!heroBanner}>
			{#if heroBanner}
				<img src={heroBanner} alt="" class="kb-rp-hero-banner" loading="lazy" />
			{/if}
			<div class="kb-rp-hero-scrim"></div>
			<div class="kb-rp-hero-body">
				<div class="kb-rp-badges">
					{#if item.verified}
						<span class="kb-rp-badge kb-rp-badge--verified">Verified</span>
					{/if}
					{#each serviceTypesDisplay as st (st)}
						<span class="kb-rp-badge">{st}</span>
					{/each}
				</div>
				<h1 class="kb-rp-title">{item.title}</h1>
				{#if item.tribalAffiliation}
					<p class="kb-rp-affiliation">{item.tribalAffiliation}</p>
				{/if}
			</div>
			<div class="kb-rp-logo-wrap">
				{#if item.logoUrl}
					<img src={item.logoUrl} alt="{item.title} logo" class="kb-rp-logo" />
				{:else}
					<div class="kb-rp-initials" aria-hidden="true">{initials(item.title)}</div>
				{/if}
			</div>
		</div>

		<div class="kb-rp-rail">
			<CoilDetailActionRail
				isAuthed={!!data.user}
				{isBookmarked}
				{loginHref}
				saveLabel="listing"
				accent="var(--red)"
			>
				{#snippet actions()}
					{#if item.phone}
						<Tooltip.Root>
							<Tooltip.Trigger>
								{#snippet child({ props })}
									<Button
										{...props}
										href="tel:{item.phone}"
										variant="ghost"
										size="icon-sm"
										aria-label="Call {item.phone}"
									>
										<PhoneIcon class="size-4" />
									</Button>
								{/snippet}
							</Tooltip.Trigger>
							<Tooltip.Content>Call</Tooltip.Content>
						</Tooltip.Root>
					{/if}
					{#if item.email}
						<Tooltip.Root>
							<Tooltip.Trigger>
								{#snippet child({ props })}
									<Button
										{...props}
										href="mailto:{item.email}"
										variant="ghost"
										size="icon-sm"
										aria-label="Email {item.email}"
									>
										<MailIcon class="size-4" />
									</Button>
								{/snippet}
							</Tooltip.Trigger>
							<Tooltip.Content>Email</Tooltip.Content>
						</Tooltip.Root>
					{/if}
				{/snippet}
				{#snippet primary()}
					{#if item.website}
						<Button href={item.website} target="_blank" rel="noopener" size="sm">
							<GlobeIcon class="size-[14px]" /> Visit site
						</Button>
					{/if}
				{/snippet}
			</CoilDetailActionRail>
		</div>

		<div class="kb-rp-grid">
			<!-- Main content -->
			<div class="min-w-0">
				{#if item.description}
					<section class="kb-rp-section">
						<h2 class="kb-rp-section-title">About</h2>
						<div
							class="prose prose-sm text-[var(--muted-foreground)] [&_a]:text-[var(--teal)] [&_a]:no-underline [&_a:hover]:underline"
						>
							{@html item.description}
						</div>
					</section>
				{/if}
			</div>

			<!-- Sidebar -->
			<aside class="flex flex-col gap-4">
				<!-- Prominent locator: red-pages is a directory, the map IS the value -->
				{#if item.lat != null && item.lng != null}
					<LocationMap
						lat={item.lat}
						lng={item.lng}
						label={item.title}
						address={addressLine || undefined}
						token={data.mapboxToken}
						accent="var(--red)"
						height={300}
					/>
				{/if}

				<!-- Contact actions -->
				{#if item.phone || item.email}
					<div class="flex flex-col gap-2">
						{#if item.phone}
							<Button variant="outline" href="tel:{item.phone}" class="w-full">
								<PhoneIcon class="mr-1.5 size-4" />
								{item.phone}
							</Button>
						{/if}
						{#if item.email}
							<Button variant="outline" href="mailto:{item.email}" class="w-full">
								<MailIcon class="mr-1.5 size-4" /> Email
							</Button>
						{/if}
					</div>
				{/if}

				<div class="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
					<h3
						class="mb-3 font-sans text-xs font-bold tracking-wider text-[var(--muted-foreground)] uppercase"
					>
						Details
					</h3>
					<dl class="flex flex-col gap-3 text-sm">
						{#if item.tribalAffiliation}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Tribal affiliation
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{item.tribalAffiliation}</dd>
							</div>
						{/if}
						{#if serviceTypesDisplay.length}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Service type
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{serviceTypesDisplay.join(', ')}</dd>
							</div>
						{/if}
						{#if item.region}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Service area
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{item.region}</dd>
							</div>
						{/if}
						{#if addressLine}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Address
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">
									<span class="flex items-start gap-1.5">
										<MapPinIcon class="mt-0.5 size-3.5 shrink-0 text-[var(--muted-foreground)]" />
										<span>
											{addressLine}
											{#if mapsUrl}
												<a
													href={mapsUrl}
													target="_blank"
													rel="noopener"
													class="mt-0.5 block text-xs text-[var(--teal)]">Get directions</a
												>
											{/if}
										</span>
									</span>
								</dd>
							</div>
						{/if}
						{#if item.certifications?.length}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Certifications
								</dt>
								<dd class="mt-1 flex flex-wrap gap-1">
									{#each item.certifications as cert}
										<span
											class="inline-block rounded bg-[var(--muted)] px-2 py-0.5 text-[11px] text-[var(--muted-foreground)]"
											>{cert}</span
										>
									{/each}
								</dd>
							</div>
						{/if}
						{#if item.ownerName}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Owner
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{item.ownerName}</dd>
							</div>
						{/if}
					</dl>
				</div>

				{#if item.socialLinks && Object.keys(item.socialLinks).length > 0}
					<div class="rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4">
						<h3
							class="mb-2 font-sans text-xs font-bold tracking-wider text-[var(--muted-foreground)] uppercase"
						>
							Social
						</h3>
						<div class="flex flex-wrap gap-2">
							{#each Object.entries(item.socialLinks) as [platform, url]}
								<a
									href={url}
									target="_blank"
									rel="noopener"
									class="text-xs font-medium text-[var(--teal)] capitalize">{platform}</a
								>
							{/each}
						</div>
					</div>
				{/if}

				<Button variant="outline" href="/red-pages" class="w-full"
					><ArrowLeft class="inline h-4 w-4" /> Back to Red Pages</Button
				>
			</aside>
		</div>
	</div>
{/if}

<style>
	.kb-rp-wrap {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1.5rem 1.5rem 3rem;
	}
	.kb-rp-hero {
		position: relative;
		overflow: visible;
		border-radius: 18px 18px 0 0;
		background: linear-gradient(135deg, var(--red), var(--color-elderberry-950, #3f0d16));
		min-height: 260px;
		padding: 2rem 2rem 2rem;
		color: white;
		isolation: isolate;
	}
	@media (min-width: 640px) {
		.kb-rp-hero {
			min-height: 320px;
			padding: 2.5rem 2.25rem 2.25rem;
		}
	}
	@media (min-width: 1024px) {
		.kb-rp-hero {
			min-height: 360px;
			padding: 3rem 2.75rem 2.75rem;
		}
	}
	.kb-rp-hero-banner {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		z-index: 0;
		border-radius: 14px 14px 0 0;
	}
	.kb-rp-hero-scrim {
		position: absolute;
		inset: 0;
		z-index: 1;
		border-radius: 14px 14px 0 0;
		background: linear-gradient(135deg, rgba(140, 20, 25, 0.92) 0%, rgba(63, 13, 22, 0.82) 100%);
	}
	.kb-rp-hero.has-banner .kb-rp-hero-scrim {
		background: linear-gradient(135deg, rgba(140, 20, 25, 0.7) 0%, rgba(63, 13, 22, 0.85) 100%);
	}
	.kb-rp-hero-body {
		position: relative;
		z-index: 2;
		min-width: 0;
	}
	.kb-rp-logo-wrap {
		position: absolute;
		z-index: 3;
		left: 1.75rem;
		bottom: -36px;
	}
	@media (min-width: 640px) {
		.kb-rp-logo-wrap {
			left: 2rem;
		}
	}
	.kb-rp-logo {
		display: block;
		width: 72px;
		height: 72px;
		object-fit: contain;
		border-radius: 12px;
		background: white;
		padding: 6px;
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
		border: 3px solid var(--background);
	}
	.kb-rp-initials {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 72px;
		height: 72px;
		border-radius: 50%;
		background: var(--color-elderberry-950, #3f0d16);
		color: white;
		font-family: var(--font-serif);
		font-size: 1.6rem;
		font-weight: 700;
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
		border: 3px solid var(--background);
	}
	/* Rail override: clear the overlapping logo circle on desktop. */
	.kb-rp-rail :global(.coil-rail) {
		padding-left: 104px;
	}
	@media (max-width: 640px) {
		.kb-rp-rail :global(.coil-rail) {
			padding-left: 92px;
			padding-top: 1.25rem;
		}
	}
	.kb-rp-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin-bottom: 0.5rem;
	}
	.kb-rp-badge {
		display: inline-block;
		padding: 0.2rem 0.5rem;
		background: rgba(255, 255, 255, 0.15);
		border-radius: 4px;
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.kb-rp-badge--verified {
		background: var(--color-flicker-400);
		color: rgba(0, 0, 0, 0.85);
	}
	.kb-rp-title {
		font-family: var(--font-display, var(--font-serif));
		font-size: clamp(1.75rem, 4.75vw, 3rem);
		font-weight: 700;
		line-height: 1.05;
		letter-spacing: -0.01em;
		margin: 0 0 0.5rem 0;
		color: white;
		text-shadow: 0 2px 20px rgba(0, 0, 0, 0.35);
	}
	.kb-rp-affiliation {
		font-family: var(--font-serif);
		font-size: 1rem;
		opacity: 0.88;
		font-style: italic;
		margin: 0;
	}
	.kb-rp-grid {
		display: grid;
		gap: 2rem;
		margin-top: 2rem;
	}
	@media (min-width: 1024px) {
		.kb-rp-grid {
			grid-template-columns: minmax(0, 1fr) 340px;
			gap: 2.5rem;
			align-items: start;
		}
	}
	.kb-rp-section {
		margin-bottom: 1.75rem;
	}
	.kb-rp-section-title {
		font-family: var(--font-serif);
		font-size: 1.0625rem;
		font-weight: 600;
		margin: 0 0 0.625rem 0;
		color: var(--foreground);
	}
</style>
