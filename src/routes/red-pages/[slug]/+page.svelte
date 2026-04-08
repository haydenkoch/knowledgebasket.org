<script lang="ts">
	import { browser } from '$app/environment';
	import { trackContentViewed, trackExternalLinkClicked } from '$lib/insights/events';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { resolveAbsoluteUrl } from '$lib/config/public-assets';
	import type { RedPagesItem } from '$lib/data/kb';
	import { resolveSeoSocialImage } from '$lib/seo/images';
	import { buildOgImagePath } from '$lib/seo/metadata';
	import { stripHtml } from '$lib/utils/format';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import CoilDetailActionRail from '$lib/components/organisms/CoilDetailActionRail.svelte';
	import CoilDetailHero from '$lib/components/organisms/CoilDetailHero.svelte';
	import LocationMap from '$lib/components/molecules/LocationMap.svelte';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import PhoneIcon from '@lucide/svelte/icons/phone';
	import MailIcon from '@lucide/svelte/icons/mail';

	let { data } = $props();
	let item = $derived(data.item as RedPagesItem | null);
	const origin = $derived((data.seoOrigin ?? data.origin ?? '') as string);
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
	const coverImageUrl = $derived(
		resolveAbsoluteUrl(item?.imageUrl, {
			origin
		})
	);
	const socialImage = $derived(
		item
			? resolveSeoSocialImage({
					imageUrl: item.imageUrl ?? item.imageUrls?.[0] ?? item.logoUrl ?? null,
					origin,
					seed: item.slug ?? item.title,
					fallbackOgImage: buildOgImagePath({
						title: item.title,
						eyebrow: 'Knowledge Basket · Red Pages',
						theme: 'redpages',
						meta:
							item.tribalAffiliation ?? item.serviceType ?? 'Native-owned businesses and services'
					})
				})
			: buildOgImagePath({
					title: 'Red Pages',
					eyebrow: 'Knowledge Basket · Red Pages',
					theme: 'redpages',
					meta: 'Native-owned businesses and services'
				})
	);
	const breadcrumbItems = $derived(
		item
			? [
					{ name: 'Knowledge Basket', pathname: '/' },
					{ name: 'Red Pages', pathname: '/red-pages' },
					{ name: item.title, pathname: item.slug ? `/red-pages/${item.slug}` : '/red-pages' }
				]
			: [
					{ name: 'Knowledge Basket', pathname: '/' },
					{ name: 'Red Pages', pathname: '/red-pages' }
				]
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

	const galleryImages = $derived(
		item
			? item.imageUrl
				? [item.imageUrl, ...(item.imageUrls ?? [])]
				: (item.imageUrls ?? [])
			: []
	);
	let selectedGalleryIndex = $state(0);
	const heroBanner = $derived(galleryImages[selectedGalleryIndex] ?? null);

	const jsonLd = $derived.by(() => {
		if (!item) return null;
		const ld: Record<string, unknown> = {
			'@context': 'https://schema.org',
			'@type': 'LocalBusiness',
			name: item.title,
			description: metaDescription,
			url: item.website ?? canonicalUrl
		};
		if (coverImageUrl) ld.image = coverImageUrl;
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
	let lastTrackedSlug = $state('');

	$effect(() => {
		const slug = item?.slug?.trim();
		if (!browser || !slug || lastTrackedSlug === slug) return;
		lastTrackedSlug = slug;
		trackContentViewed({
			contentType: 'redpage',
			slug,
			signedIn: Boolean(data.user)
		});
	});
</script>

<SeoHead
	{origin}
	pathname={item?.slug ? `/red-pages/${item.slug}` : '/red-pages'}
	title={item
		? `${item.title} | Red Pages | Knowledge Basket`
		: 'Listing not found | Knowledge Basket'}
	description={item ? metaDescription : 'This listing is no longer available.'}
	robotsMode={item ? 'index' : 'noindex-nofollow'}
	ogImage={socialImage}
	ogImageAlt={`${item?.title ?? 'Red Pages'} social preview`}
	jsonLd={jsonLd ? [jsonLd] : []}
	{breadcrumbItems}
/>

{#if !item}
	<div class="mx-auto max-w-3xl px-4 py-12 sm:px-6">
		<p class="text-[var(--muted-foreground)]">This listing is no longer available.</p>
		<Button variant="outline" href="/red-pages" class="mt-4"
			><ArrowLeft class="inline h-4 w-4" /> Back to Red Pages</Button
		>
	</div>
{:else}
	<CoilDetailHero
		title={item.title}
		subtitle={item.tribalAffiliation ?? undefined}
		bannerImages={galleryImages}
		selectedBannerIndex={selectedGalleryIndex}
		onSelectBanner={(i) => (selectedGalleryIndex = i)}
		galleryLabel="Listing gallery"
		placeholderKey={item.slug}
	>
		{#snippet badges()}
			{#if item.verified}
				<span class="kb-coil-tag kb-coil-tag--accent">Verified</span>
			{/if}
			{#each serviceTypesDisplay as st (st)}
				<span class="kb-coil-tag">{st}</span>
			{/each}
		{/snippet}
		{#snippet logo()}
			{#if item.logoUrl}
				<img src={item.logoUrl} alt="{item.title} logo" class="kb-rp-logo" />
			{:else}
				<div class="kb-rp-initials" aria-hidden="true">{initials(item.title)}</div>
			{/if}
		{/snippet}
	</CoilDetailHero>

	<div class="kb-rp-wrap">
		<CoilDetailActionRail
			isAuthed={!!data.user}
			{isBookmarked}
			{loginHref}
			contentType="redpage"
			contentSlug={item.slug}
			saveLabel="listing"
			accent="var(--red)"
			hasLogoOverhang
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
										onclick={() =>
											trackExternalLinkClicked({
												contentType: 'redpage',
												slug: item.slug,
												action: 'call',
												href: `tel:${item.phone}`,
												signedIn: Boolean(data.user)
											})}
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
										onclick={() =>
											trackExternalLinkClicked({
												contentType: 'redpage',
												slug: item.slug,
												action: 'email',
												href: `mailto:${item.email}`,
												signedIn: Boolean(data.user)
											})}
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
						<Button
							href={item.website}
							target="_blank"
							rel="noopener"
							size="sm"
							onclick={() =>
								trackExternalLinkClicked({
									contentType: 'redpage',
									slug: item.slug,
									action: 'visit_site',
									href: item.website,
									signedIn: Boolean(data.user)
								})}
						>
							<GlobeIcon class="size-[14px]" /> Visit site
						</Button>
					{/if}
				{/snippet}
		</CoilDetailActionRail>

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
						searchText={addressLine || item.title}
						token={data.mapboxToken}
						accent="var(--red)"
						eyebrow="Business location"
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
		padding: 0 1.5rem 3rem;
	}
	.kb-rp-logo {
		display: block;
		width: 112px;
		height: 112px;
		object-fit: contain;
		border-radius: 50%;
		background: white;
		padding: 10px;
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
		border: 3px solid var(--background);
	}
	.kb-rp-initials {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 112px;
		height: 112px;
		border-radius: 50%;
		background: var(--color-elderberry-950, #3f0d16);
		color: white;
		font-family: var(--font-serif);
		font-size: 2.25rem;
		font-weight: 700;
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
		border: 3px solid var(--background);
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
