<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import EventCard from '$lib/components/molecules/EventCard.svelte';
	import JobListItem from '$lib/components/molecules/JobListItem.svelte';
	import RedPagesListItem from '$lib/components/molecules/RedPagesListItem.svelte';
	import FundingCard from '$lib/components/molecules/FundingCard.svelte';
	import CoilDetailHero from '$lib/components/organisms/CoilDetailHero.svelte';
	import CoilDetailActionRail from '$lib/components/organisms/CoilDetailActionRail.svelte';
	import LocationMap from '$lib/components/molecules/LocationMap.svelte';
	import { resolveAbsoluteUrl } from '$lib/config/public-assets';
	import { Button } from '$lib/components/ui/button/index.js';
	import { resolveSeoSocialImage } from '$lib/seo/images';
	import { buildOgImagePath } from '$lib/seo/metadata';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import NavigationIcon from '@lucide/svelte/icons/navigation';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';

	let { data } = $props();
	const venue = $derived(data.venue);
	const organization = $derived(data.organization);
	const collections = $derived(data.collections);
	const origin = $derived((data.seoOrigin ?? '') as string);
	const canonicalUrl = $derived(`${origin}/v/${venue.slug}`);
	const metaDescription = $derived(
		venue.description ?? `Published Knowledge Basket content connected to ${venue.name}.`
	);
	const venueImageUrl = $derived(
		resolveAbsoluteUrl(venue.imageUrl, {
			origin
		})
	);
	const socialImage = $derived(
		resolveSeoSocialImage({
			imageUrl: venue.imageUrl,
			origin,
			seed: venue.slug ?? venue.name,
			fallbackOgImage: buildOgImagePath({
				title: venue.name,
				eyebrow: 'Knowledge Basket · Venue',
				theme: 'venue',
				meta:
					venue.city && venue.state
						? `${venue.city}, ${venue.state}`
						: (venue.venueType ?? 'Venue hub')
			})
		})
	);
	const breadcrumbItems = $derived([
		{ name: 'Knowledge Basket', pathname: '/' },
		{ name: 'Venues', pathname: '/v' },
		{ name: venue.name, pathname: `/v/${venue.slug}` }
	]);

	const addressLine = $derived(
		[venue.address, venue.city, venue.state, venue.zip].filter(Boolean).join(', ')
	);
	const shortLocation = $derived([venue.city, venue.state].filter(Boolean).join(', '));
	const mapUrl = $derived(
		addressLine
			? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}`
			: venue.lat != null && venue.lng != null
				? `https://www.google.com/maps?q=${venue.lat},${venue.lng}`
				: ''
	);
	const bannerImages = $derived(venue.imageUrl ? [venue.imageUrl] : []);
	const linkedOrgContentCount = $derived(
		collections.funding.length +
			collections.jobs.length +
			collections.redpages.length +
			collections.toolbox.length
	);
	const venueJsonLd = $derived.by(() => {
		const schema: Record<string, unknown> = {
			'@context': 'https://schema.org',
			'@type': 'Place',
			name: venue.name,
			description: metaDescription,
			url: canonicalUrl
		};
		if (venueImageUrl) schema.image = venueImageUrl;
		if (venue.website) schema.sameAs = [venue.website];
		if (addressLine) {
			schema.address = {
				'@type': 'PostalAddress',
				streetAddress: venue.address,
				addressLocality: venue.city,
				addressRegion: venue.state,
				postalCode: venue.zip
			};
		}
		if (venue.lat != null && venue.lng != null) {
			schema.geo = {
				'@type': 'GeoCoordinates',
				latitude: venue.lat,
				longitude: venue.lng
			};
		}
		return schema;
	});
</script>

<SeoHead
	{origin}
	pathname={`/v/${venue.slug}`}
	title={`${venue.name} | Venue | Knowledge Basket`}
	description={metaDescription}
	ogImage={socialImage}
	ogImageAlt={`${venue.name} venue social preview`}
	jsonLd={[venueJsonLd]}
	{breadcrumbItems}
/>

<CoilDetailHero
	title={venue.name}
	subtitle={organization ? `Managed by ${organization.name}` : undefined}
	{bannerImages}
	placeholderKey={venue.slug}
>
	{#snippet badges()}
		<span class="kb-coil-tag">Venue</span>
		{#if venue.venueType}
			<span class="kb-coil-tag">{venue.venueType}</span>
		{/if}
		{#if organization}
			<span class="kb-coil-tag kb-coil-tag--accent">Linked organization</span>
		{/if}
	{/snippet}
	{#snippet extras()}
		{#if shortLocation}
			<span class="inline-flex items-center gap-1.5">
				<MapPinIcon class="size-[14px] shrink-0" />
				{shortLocation}
			</span>
		{/if}
	{/snippet}
</CoilDetailHero>

<div class="kb-venue-wrap">
	<CoilDetailActionRail accent="var(--teal)">
		{#snippet meta()}
			{#if addressLine}
				<span class="inline-flex items-center gap-1.5">
					<MapPinIcon class="size-[13px] shrink-0" />
					<span class="truncate">{addressLine}</span>
				</span>
			{/if}
		{/snippet}
		{#snippet actions()}
			{#if mapUrl}
				<Button
					href={mapUrl}
					target="_blank"
					rel="noopener"
					variant="ghost"
					size="icon-sm"
					aria-label="Directions"
				>
					<NavigationIcon class="size-4" />
				</Button>
			{/if}
		{/snippet}
		{#snippet primary()}
			{#if venue.website}
				<Button href={venue.website} target="_blank" rel="noopener" size="sm">
					<GlobeIcon class="size-[14px]" /> Visit site
				</Button>
			{/if}
		{/snippet}
	</CoilDetailActionRail>

	<div class="kb-venue-grid">
		<div class="min-w-0">
			{#if venue.description}
				<section class="kb-venue-section">
					<h2 class="kb-venue-section-title">About this venue</h2>
					<p class="text-sm leading-7 whitespace-pre-line text-[var(--muted-foreground)]">
						{venue.description}
					</p>
				</section>
			{/if}

			<section class="kb-venue-section">
				<h2 class="kb-venue-section-title">Upcoming events here</h2>
				{#if collections.events.length > 0}
					<ul class="grid list-none gap-4 p-0 md:grid-cols-2">
						{#each collections.events as event, index (event.id)}
							<li><EventCard {event} {index} /></li>
						{/each}
					</ul>
				{:else}
					<div
						class="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-10 text-center"
					>
						<p class="font-serif text-lg font-semibold text-[var(--foreground)]">
							No upcoming events linked to this venue
						</p>
						<p class="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
							Check back soon or explore the linked organization.
						</p>
					</div>
				{/if}
			</section>

			{#if organization && linkedOrgContentCount > 0}
				<section class="kb-venue-section">
					<h2 class="kb-venue-section-title">More from {organization.name}</h2>

					{#if collections.funding.length > 0}
						<h3 class="kb-venue-subtitle">Funding</h3>
						<div class="grid gap-4 md:grid-cols-2">
							{#each collections.funding as item, index (item.id)}
								<FundingCard {item} {index} />
							{/each}
						</div>
					{/if}

					{#if collections.jobs.length > 0}
						<h3 class="kb-venue-subtitle">Jobs</h3>
						<div class="flex flex-col gap-3">
							{#each collections.jobs as job, index (job.id)}
								<JobListItem {job} {index} />
							{/each}
						</div>
					{/if}

					{#if collections.redpages.length > 0}
						<h3 class="kb-venue-subtitle">Red Pages</h3>
						<div class="flex flex-col gap-3">
							{#each collections.redpages as vendor, index (vendor.id)}
								<RedPagesListItem {vendor} {index} />
							{/each}
						</div>
					{/if}

					{#if collections.toolbox.length > 0}
						<h3 class="kb-venue-subtitle">Toolbox</h3>
						<div class="grid gap-3 md:grid-cols-2">
							{#each collections.toolbox as resource (resource.id)}
								<a
									href={`/toolbox/${resource.slug ?? resource.id}`}
									class="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-inherit no-underline shadow-[var(--sh)] transition-transform hover:-translate-y-0.5"
								>
									<div class="flex flex-wrap gap-2">
										{#if resource.mediaType}
											<span
												class="rounded-full bg-[var(--muted)] px-2.5 py-1 text-[11px] font-bold tracking-[0.08em] text-[var(--muted-foreground)] uppercase"
											>
												{resource.mediaType}
											</span>
										{/if}
										{#if resource.category}
											<span
												class="rounded-full bg-[var(--muted)] px-2.5 py-1 text-[11px] font-bold tracking-[0.08em] text-[var(--muted-foreground)] uppercase"
											>
												{resource.category}
											</span>
										{/if}
									</div>
									<h4 class="mt-3 font-serif text-lg font-semibold text-[var(--foreground)]">
										{resource.title}
									</h4>
									{#if resource.description}
										<p class="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted-foreground)]">
											{resource.description}
										</p>
									{/if}
								</a>
							{/each}
						</div>
					{/if}
				</section>
			{/if}
		</div>

		<aside class="flex flex-col gap-4">
			{#if venue.lat != null && venue.lng != null}
				<LocationMap
					lat={venue.lat}
					lng={venue.lng}
					label={venue.name}
					address={addressLine || undefined}
					searchText={addressLine || venue.name}
					token={data.mapboxToken}
					accent="var(--teal)"
					eyebrow="Venue location"
					height={260}
				/>
			{/if}

			<div class="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
				<h3
					class="mb-3 font-sans text-xs font-bold tracking-wider text-[var(--muted-foreground)] uppercase"
				>
					Details
				</h3>
				<dl class="flex flex-col gap-3 text-sm">
					{#if venue.venueType}
						<div>
							<dt
								class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
							>
								Type
							</dt>
							<dd class="mt-0.5 text-[var(--foreground)]">{venue.venueType}</dd>
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
								{addressLine}
								{#if mapUrl}
									<a
										href={mapUrl}
										target="_blank"
										rel="noopener"
										class="mt-0.5 block text-xs text-[var(--teal)]">Get directions</a
									>
								{/if}
							</dd>
						</div>
					{/if}
					<div>
						<dt
							class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
						>
							Events here
						</dt>
						<dd class="mt-0.5 text-[var(--foreground)]">{collections.events.length}</dd>
					</div>
					{#if organization}
						<div>
							<dt
								class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
							>
								Linked content
							</dt>
							<dd class="mt-0.5 text-[var(--foreground)]">{linkedOrgContentCount}</dd>
						</div>
					{/if}
				</dl>
			</div>

			{#if organization}
				<div class="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
					<h3
						class="mb-2 font-sans text-xs font-bold tracking-wider text-[var(--muted-foreground)] uppercase"
					>
						Managed by
					</h3>
					<p class="font-serif text-lg font-semibold text-[var(--foreground)]">
						{organization.name}
					</p>
					{#if organization.description}
						<p class="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted-foreground)]">
							{organization.description}
						</p>
					{/if}
					<Button variant="outline" href={`/o/${organization.slug}`} class="mt-3 w-full">
						View organization <ArrowRight class="size-4" />
					</Button>
				</div>
			{/if}

			<Button variant="outline" href="/v" class="w-full">
				<ArrowLeft class="inline h-4 w-4" /> Back to venues
			</Button>
		</aside>
	</div>
</div>

<style>
	.kb-venue-wrap {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1.5rem 3rem;
	}
	.kb-venue-grid {
		display: grid;
		gap: 2rem;
		margin-top: 2rem;
	}
	@media (min-width: 1024px) {
		.kb-venue-grid {
			grid-template-columns: minmax(0, 1fr) 340px;
			gap: 2.5rem;
			align-items: start;
		}
	}
	.kb-venue-section {
		margin-bottom: 2rem;
	}
	.kb-venue-section-title {
		font-family: var(--font-serif);
		font-size: 1.0625rem;
		font-weight: 600;
		margin: 0 0 0.75rem 0;
		color: var(--foreground);
	}
	.kb-venue-subtitle {
		font-family: var(--font-serif);
		font-size: 0.9375rem;
		font-weight: 600;
		margin: 1.25rem 0 0.625rem 0;
		color: var(--foreground);
	}
</style>
