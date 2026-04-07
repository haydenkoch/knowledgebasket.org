<script lang="ts">
	import { browser } from '$app/environment';
	import { trackContentViewed, trackExternalLinkClicked } from '$lib/analytics/events';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import { resolveAbsoluteUrl } from '$lib/config/public-assets';
	import type { EventItem } from '$lib/data/kb';
	import { getPlaceholderImageSrcset, DEFAULT_SIZES_HERO } from '$lib/data/placeholders';
	import { formatDisplayDate } from '$lib/utils/display';
	import {
		getEventPricingSummary,
		getEventRegistrationCtaLabel
	} from '$lib/utils/event-pricing';
	import { buildOgImagePath } from '$lib/seo/metadata';
	import {
		formatEventDateRange,
		formatEventTime,
		formatEventTimeRange,
		getEventTypeTags,
		eventDateForCalendarUrl,
		eventGoogleCalendarUrl,
		stripHtml,
		parseEventStart
	} from '$lib/utils/format';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import NavigationIcon from '@lucide/svelte/icons/navigation';
	import CalendarPlusIcon from '@lucide/svelte/icons/calendar-plus';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as ButtonGroup from '$lib/components/ui/button-group/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import EventCard from '$lib/components/molecules/EventCard.svelte';
	import CoilDetailActionRail from '$lib/components/organisms/CoilDetailActionRail.svelte';
	import LocationMap from '$lib/components/molecules/LocationMap.svelte';

	let { data } = $props();
	let event = $derived(data.event as EventItem);
	const isIcalEvent = $derived(data.isIcalEvent ?? false);
	const isBookmarked = $derived(Boolean(data.isBookmarked));
	const galleryImages = $derived(
		event.imageUrl ? [event.imageUrl, ...(event.imageUrls ?? [])] : (event.imageUrls ?? [])
	);
	const pricing = $derived(getEventPricingSummary(event));
	const primaryImage = $derived(galleryImages[0]);
	const heroImgAttrs = $derived(
		primaryImage
			? { src: primaryImage }
			: getPlaceholderImageSrcset(0, { sizes: DEFAULT_SIZES_HERO })
	);
	let selectedGalleryIndex = $state(0);
	const displayedHeroSrc = $derived(galleryImages[selectedGalleryIndex] ?? primaryImage ?? '');
	const calendarDate = $derived(eventDateForCalendarUrl(event.startDate));
	const googleCalendarUrl = $derived(eventGoogleCalendarUrl(event));
	const hasEventUrl = $derived(!!event.eventUrl?.trim());
	const hasRegistrationUrl = $derived(!!event.registrationUrl?.trim());
	const dualCtas = $derived(hasEventUrl && hasRegistrationUrl);
	const singleCtaUrl = $derived(hasEventUrl ? event.eventUrl! : (event.registrationUrl ?? null));
	const registrationCtaLabel = $derived(getEventRegistrationCtaLabel(event));
	const registrationCtaLabelLong = $derived(getEventRegistrationCtaLabel(event, { long: true }));
	const singleCtaLabel = $derived(
		hasEventUrl && !hasRegistrationUrl ? 'Learn more' : registrationCtaLabel
	);
	const singleCtaLabelLong = $derived(
		hasEventUrl && !hasRegistrationUrl ? 'Learn more' : registrationCtaLabelLong
	);
	const formatLabel = $derived(
		event.eventFormat === 'online'
			? 'Online event'
			: event.eventFormat === 'hybrid'
				? 'Hybrid'
				: event.eventFormat === 'in_person'
					? 'In person'
					: null
	);
	const joinOnlineUrl = $derived(
		(event.eventFormat === 'online' || event.eventFormat === 'hybrid') &&
			(event.virtualEventUrl ?? event.eventUrl)
			? (event.virtualEventUrl ?? event.eventUrl)!
			: null
	);
	function formatDoorsOpen(iso?: string): string | null {
		if (!iso) return null;
		const d = new Date(iso);
		if (isNaN(d.getTime())) return null;
		return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
	}
	function formatTierPrice(price: number): string {
		return price === 0
			? 'Free'
			: price.toLocaleString('en-US', {
					style: 'currency',
					currency: 'USD',
					maximumFractionDigits: 2
				});
	}
	const doorsOpenTime = $derived(formatDoorsOpen(event.doorsOpenAt));
	const eventStartTime = $derived(formatEventTime(event.startDate));
	const eventTimeSummary = $derived(formatEventTimeRange(event.startDate, event.endDate));
	const eventTimeLabel = $derived(
		eventTimeSummary
			? eventTimeSummary.includes('–')
				? eventTimeSummary
				: `Starts ${eventTimeSummary}`
			: eventStartTime
				? `Starts ${eventStartTime}`
				: null
	);

	function mapUrl(location?: string): string {
		if (!location?.trim()) return '';
		const q = encodeURIComponent(location);
		return `https://www.google.com/maps/search/?api=1&query=${q}`;
	}
	const directionsUrl = $derived(mapUrl(event.location));

	// Single-line location for the utility bar meta. Prefer the most descriptive
	// available value (venue name → full free-text location → region). The rail
	// CSS lets this grow to fill the space the action tail leaves behind, and
	// falls back to ellipsis only when it genuinely cannot fit.
	const shortLocation = $derived.by(() => {
		if (event.venueName?.trim()) return event.venueName.trim();
		if (event.location?.trim()) return event.location.trim();
		if (event.region?.trim()) return event.region.trim();
		return null;
	});

	function calendarUrl(mode: 'week' | 'month'): string {
		const params = new URLSearchParams({ view: 'calendar', mode });
		if (calendarDate) params.set('date', calendarDate);
		return `/events?${params.toString()}`;
	}

	const origin = $derived((data.seoOrigin ?? data.origin ?? '') as string);
	const canonicalUrl = $derived(event.slug ? `${origin}/events/${event.slug}` : origin + '/events');
	const loginHref = $derived(
		`/auth/login?redirect=${encodeURIComponent(event.slug ? `/events/${event.slug}` : '/events')}`
	);
	const metaDescription = $derived(
		event.description
			? stripHtml(String(event.description)).slice(0, 160)
			: `${event.title}. ${event.region ?? ''} ${formatEventDateRange(event.startDate, event.endDate)}.`
	);
	const coverImageUrl = $derived(
		resolveAbsoluteUrl(event.imageUrl, {
			origin
		})
	);
	const socialImage = $derived(
		buildOgImagePath({
			title: event.title,
			eyebrow: 'Knowledge Basket · Events',
			theme: 'events',
			meta: `${event.region ?? 'Indigenous events'}${event.hostOrg ? ` · ${event.hostOrg}` : ''}`
		})
	);
	const breadcrumbItems = $derived([
		{ name: 'Knowledge Basket', pathname: '/' },
		{ name: 'Events', pathname: '/events' },
		{
			name: event.title,
			pathname: event.slug ? `/events/${event.slug}` : '/events'
		}
	]);

	function toIsoDate(dateStr?: string): string | null {
		const ts = dateStr ? parseEventStart(dateStr) : null;
		return ts != null ? new Date(ts).toISOString() : null;
	}
	const jsonLd = $derived.by(() => {
		const start = toIsoDate(event.startDate);
		const end = toIsoDate(event.endDate);
		const location =
			event.location || event.address || event.lat != null
				? {
						'@type': 'Place' as const,
						...(event.location && { name: event.location }),
						...(event.address && { address: event.address }),
						...(event.lat != null &&
							event.lng != null && {
								geo: {
									'@type': 'GeoCoordinates' as const,
									latitude: event.lat,
									longitude: event.lng
								}
							})
					}
				: undefined;
		const eventUrl = event.registrationUrl ?? event.eventUrl ?? canonicalUrl;
		const attendanceMode =
			event.eventFormat === 'online'
				? 'https://schema.org/OnlineEventAttendanceMode'
				: event.eventFormat === 'hybrid'
					? 'https://schema.org/MixedEventAttendanceMode'
					: 'https://schema.org/OfflineEventAttendanceMode';
		return {
			'@context': 'https://schema.org',
			'@type': 'Event',
			name: event.title,
			...(metaDescription && { description: metaDescription }),
			...(start && { startDate: start }),
			...(end && { endDate: end }),
			eventStatus: 'https://schema.org/EventScheduled',
			eventAttendanceMode: attendanceMode,
			...(location && { location }),
			...(coverImageUrl && { image: coverImageUrl }),
			url: canonicalUrl,
			...(event.hostOrg && { organizer: { '@type': 'Organization', name: event.hostOrg } }),
			...(eventUrl && eventUrl !== canonicalUrl && { offers: { '@type': 'Offer', url: eventUrl } })
		};
	});
	let lastTrackedSlug = $state('');

	$effect(() => {
		const slug = event.slug?.trim();
		if (!browser || !slug || lastTrackedSlug === slug) return;
		lastTrackedSlug = slug;
		trackContentViewed({
			contentType: 'event',
			slug,
			signedIn: Boolean(data.user)
		});
	});
</script>

<SeoHead
	{origin}
	pathname={event.slug ? `/events/${event.slug}` : '/events'}
	title={`${event.title} | Events | Knowledge Basket`}
	description={metaDescription}
	ogImage={socialImage}
	ogImageAlt={`${event.title} event social preview`}
	jsonLd={[jsonLd]}
	{breadcrumbItems}
/>

<div class="kb-event-detail" style="--kb-accent: var(--teal)">
	<!-- Hero (full-bleed, image-forward; gallery filmstrip docked inside) -->
	<header class="kb-event-hero">
		<img
			src={galleryImages.length > 0 ? displayedHeroSrc : heroImgAttrs.src}
			srcset={galleryImages.length > 0 ? undefined : heroImgAttrs.srcSet}
			sizes={heroImgAttrs.sizes}
			alt=""
			class="kb-event-hero-img"
			fetchpriority="high"
			decoding="async"
		/>
		<div class="kb-event-hero-overlay"></div>
		<div class="kb-event-hero-content">
			<div class="kb-event-hero-copy">
				<div class="kb-event-hero-tags">
					{#if formatLabel}<span class="kb-event-hero-tag">{formatLabel}</span>{/if}
					{#if event.region}<span class="kb-event-hero-tag">{event.region}</span>{/if}
					{#if pricing.badgeLabel}
						<span
							class="kb-event-hero-tag"
							class:kb-event-hero-tag--free={pricing.badgeTone === 'free'}
						>
							{pricing.badgeLabel}
						</span>
					{/if}
					{#each getEventTypeTags(event) as tag (tag)}
						<span class="kb-event-hero-tag">{tag}</span>
					{/each}
				</div>
				<h1 class="kb-event-hero-title">{event.title}</h1>
				{#if event.hostOrg}
					<p class="kb-event-hero-host">Presented by {event.hostOrg}</p>
				{/if}
			</div>
			{#if galleryImages.length > 1}
				<div class="kb-event-hero-filmstrip" role="tablist" aria-label="Event gallery">
					{#each galleryImages as url, i (url + i)}
						<button
							type="button"
							class="kb-event-hero-thumb"
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
		</div>
	</header>

	<!-- Unified utility bar: breadcrumb + date/venue + heart + quick actions + primary CTA -->
	<div class="kb-event-rail-wrap kb-event-rail-sticky">
		<CoilDetailActionRail
			isAuthed={!!data.user}
			{isBookmarked}
			{loginHref}
			contentType="event"
			contentSlug={event.slug}
			saveLabel="event"
			accent="var(--teal)"
		>
			{#snippet meta()}
				<span class="kb-event-meta-date"
					>{formatEventDateRange(event.startDate, event.endDate)}</span
				>
				{#if shortLocation}
					<span class="kb-event-meta-dot" aria-hidden="true">·</span>
					<span class="kb-event-meta-venue">
						<MapPinIcon class="size-[13px] shrink-0" />
						<span>{shortLocation}</span>
					</span>
				{/if}
			{/snippet}
			{#snippet actions()}
				{#if directionsUrl}
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#snippet child({ props })}
								<Button
									{...props}
									href={directionsUrl}
									target="_blank"
									rel="noopener"
									variant="ghost"
									size="icon-sm"
									aria-label="Directions"
									onclick={() =>
										trackExternalLinkClicked({
											contentType: 'event',
											slug: event.slug,
											action: 'directions',
											href: directionsUrl,
											signedIn: Boolean(data.user)
										})}
								>
									<NavigationIcon class="size-4" />
								</Button>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content>Directions</Tooltip.Content>
					</Tooltip.Root>
				{/if}
				{#if googleCalendarUrl}
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#snippet child({ props })}
								<Button
									{...props}
									href={googleCalendarUrl}
									target="_blank"
									rel="noopener"
									variant="ghost"
									size="icon-sm"
									aria-label="Add to calendar"
									onclick={() =>
										trackExternalLinkClicked({
											contentType: 'event',
											slug: event.slug,
											action: 'calendar_google',
											href: googleCalendarUrl,
											signedIn: Boolean(data.user)
										})}
								>
									<CalendarPlusIcon class="size-4" />
								</Button>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content>Add to calendar</Tooltip.Content>
					</Tooltip.Root>
				{/if}
			{/snippet}
			{#snippet primary()}
				{#if dualCtas}
					<Button
						href={event.registrationUrl!}
						target="_blank"
						rel="noopener"
						size="sm"
						onclick={() =>
							trackExternalLinkClicked({
								contentType: 'event',
								slug: event.slug,
								action: 'register',
								href: event.registrationUrl,
								signedIn: Boolean(data.user)
							})}
					>
						{registrationCtaLabel}
						<ArrowRight class="size-4" />
					</Button>
				{:else if singleCtaUrl}
					<Button
						href={singleCtaUrl}
						target="_blank"
						rel="noopener"
						size="sm"
						onclick={() =>
							trackExternalLinkClicked({
								contentType: 'event',
								slug: event.slug,
								action: 'primary_cta',
								href: singleCtaUrl,
								signedIn: Boolean(data.user)
							})}
					>
						{singleCtaLabel}
						<ArrowRight class="size-4" />
					</Button>
				{/if}
			{/snippet}
		</CoilDetailActionRail>
	</div>

	<div class="kb-event-detail-grid">
		<main class="kb-event-detail-main">
			<section class="kb-event-about">
				<h2>About this event</h2>
				{#if event.description}
					<div class="kb-detail-description kb-detail-description--rich">
						{@html event.description}
					</div>
				{:else}
					<p class="kb-event-no-desc kb-detail-description">No description available.</p>
				{/if}
			</section>
			{#if data.relatedEvents?.length > 0}
				<section class="kb-event-related">
					<h2>
						{#if event.organizationId && event.venueId}
							Related events
						{:else if event.organizationId}
							More from this organizer
						{:else}
							More at this venue
						{/if}
					</h2>
					<ul class="kb-event-related-grid">
						{#each data.relatedEvents as relatedEvent, i}
							<li><EventCard event={relatedEvent} index={i} /></li>
						{/each}
					</ul>
				</section>
			{/if}
		</main>
		<aside class="kb-event-sidebar">
			<div class="kb-event-info-card">
				<h3>Date & time</h3>
				<p class="kb-event-info-value">{formatEventDateRange(event.startDate, event.endDate)}</p>
				{#if doorsOpenTime && eventTimeLabel}
					<p class="kb-event-info-note">Doors open {doorsOpenTime} · {eventTimeLabel}</p>
				{:else if doorsOpenTime}
					<p class="kb-event-info-note">Doors open {doorsOpenTime}</p>
				{:else if eventTimeLabel}
					<p class="kb-event-info-note">{eventTimeLabel}</p>
				{:else if isIcalEvent}
					<p class="kb-event-info-note">See event link for exact times.</p>
				{/if}
			</div>
			{#if event.registrationDeadline}
				<div class="kb-event-info-card">
					<h3>Registration deadline</h3>
					<p class="kb-event-info-value">
						{formatDisplayDate(
							event.registrationDeadline,
							{
								weekday: 'long',
								month: 'long',
								day: 'numeric',
								year: 'numeric'
							},
							'Deadline not listed'
						)}
					</p>
				</div>
			{/if}
			{#if event.capacity != null || event.soldOut}
				<div class="kb-event-info-card">
					<h3>Capacity</h3>
					<p class="kb-event-info-value">
						{event.soldOut
							? 'Sold out'
							: event.capacity != null
								? `Limited to ${event.capacity}`
								: ''}
					</p>
				</div>
			{/if}
			{#if event.ageRestriction}
				<div class="kb-event-info-card">
					<h3>Age</h3>
					<p class="kb-event-info-value">{event.ageRestriction}</p>
				</div>
			{/if}
			{#if event.address || event.location || (event.lat != null && event.lng != null)}
				<LocationMap
					lat={event.lat}
					lng={event.lng}
					label={event.venueName ?? event.location ?? 'Event location'}
					address={event.address ?? event.location ?? undefined}
					searchText={event.address ?? event.location ?? event.venueName ?? undefined}
					token={data.mapboxToken}
					accent="var(--teal)"
					eyebrow="Event location"
					secondaryActionHref={event.venueSlug ? `/v/${event.venueSlug}` : undefined}
					secondaryActionLabel={event.venueSlug ? 'Venue page' : undefined}
					height={220}
				/>
			{:else if event.venueSlug}
				<div class="kb-event-info-card">
					<h3>Location</h3>
					<p class="kb-event-info-value">
						<a href="/v/{event.venueSlug}" class="kb-event-info-link-inline"
							>{event.venueName ?? event.location ?? 'Venue'}</a
						>
					</p>
				</div>
			{:else if (event.location || event.venueSlug) && directionsUrl}
				<div class="kb-event-info-card">
					<h3>Location</h3>
					<a href={directionsUrl} target="_blank" rel="noopener" class="kb-event-info-link"
						>Get directions <ArrowRight class="inline h-4 w-4" /></a
					>
				</div>
			{/if}
			{#if pricing.summaryLabel || pricing.detailNote || pricing.pricingTiers.length > 0}
				<div class="kb-event-info-card">
					<h3>Cost</h3>
					<div class="kb-event-cost-stack">
						{#if pricing.isFree || (pricing.minPrice != null && pricing.minPrice === pricing.maxPrice)}
							<span
								class="kb-event-cost-badge"
								class:kb-event-cost-badge--free={pricing.badgeTone === 'free'}
							>
								{pricing.isFree ? 'Free' : formatTierPrice(pricing.minPrice as number)}
							</span>
						{/if}
						{#if pricing.detailNote}
							<p class="kb-event-info-note">{pricing.detailNote}</p>
						{/if}
						{#if pricing.pricingTiers.length > 0}
							<ul class="kb-event-cost-tiers">
								{#each pricing.pricingTiers as tier, index (tier.label + index)}
									<li>
										<span>{tier.label || `Tier ${index + 1}`}</span>
										<span>{formatTierPrice(tier.price)}</span>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				</div>
			{/if}
			{#if event.audience}
				<div class="kb-event-info-card">
					<h3>Audience</h3>
					<p class="kb-event-info-value">{event.audience}</p>
				</div>
			{/if}
			{#if joinOnlineUrl}
				<div class="kb-event-info-card">
					<a href={joinOnlineUrl} target="_blank" rel="noopener" class="kb-event-info-link"
						>Join online <ArrowRight class="inline h-4 w-4" /></a
					>
				</div>
			{/if}
			{#if event.hostOrg}
				<div class="kb-event-info-card">
					<h3>{isIcalEvent ? 'Source' : 'Host'}</h3>
					{#if !isIcalEvent && event.organizationSlug}
						<p class="kb-event-info-value">
							<a href="/o/{event.organizationSlug}" class="kb-event-info-link-inline"
								>{event.hostOrg}</a
							>
						</p>
					{:else}
						<p class="kb-event-info-value">{event.hostOrg}</p>
					{/if}
				</div>
			{/if}
			<!-- Contact info intentionally hidden on the public events detail page for now. -->

			{#if event.soldOut && event.waitlistUrl}
				<div class="kb-event-info-card">
					<a href={event.waitlistUrl} target="_blank" rel="noopener" class="kb-event-primary-cta"
						>Join waitlist</a
					>
				</div>
			{/if}
			{#if event.accessibilityNotes}
				<div class="kb-event-info-card">
					<h3>Accessibility</h3>
					<p class="kb-event-info-value">{event.accessibilityNotes}</p>
				</div>
			{/if}
			{#if dualCtas}
				<div class="kb-event-cta-group">
					<a href={event.eventUrl!} target="_blank" rel="noopener" class="kb-event-primary-cta"
						>Event page</a
					>
					<a
						href={event.registrationUrl!}
						target="_blank"
						rel="noopener"
						class="kb-event-primary-cta kb-event-cta-secondary"
					>
						{registrationCtaLabelLong}
					</a>
				</div>
			{:else if singleCtaUrl}
				<a href={singleCtaUrl} target="_blank" rel="noopener" class="kb-event-primary-cta"
					>{singleCtaLabelLong}</a
				>
			{/if}
			{#if event.startDate}
				<div class="kb-event-info-card kb-event-add-to-calendar">
					<h3>Add to calendar</h3>
					<p class="kb-event-info-note">Download or add to your calendar.</p>
					<div class="kb-event-calendar-add-links">
						{#if event.slug}
							<a
								href="/events/{event.slug}/feed.ics"
								class="kb-event-calendar-add-link"
								download="event.ics">Download .ics</a
							>
						{/if}
						{#if googleCalendarUrl}
							<a
								href={googleCalendarUrl}
								target="_blank"
								rel="noopener"
								class="kb-event-calendar-add-link">Google Calendar</a
							>
						{/if}
						{#if event.slug}
							<a href="/events/{event.slug}/feed.ics" class="kb-event-calendar-add-link"
								>Apple Calendar / Outlook</a
							>
						{/if}
					</div>
				</div>
			{/if}
			{#if calendarDate}
				<div class="kb-event-info-card kb-event-calendar-links">
					<h3>See on calendar</h3>
					<p class="kb-event-info-note">View this event in week or month view.</p>
					<ButtonGroup.Root aria-label="Calendar view" class="kb-event-calendar-btns">
						<Button variant="outline" size="sm" href={calendarUrl('week')}>Week</Button>
						<Button variant="outline" size="sm" href={calendarUrl('month')}>Month</Button>
					</ButtonGroup.Root>
				</div>
			{/if}
			<a href="/events" class="kb-event-back"
				><ArrowLeft class="inline h-4 w-4" /> Back to all events</a
			>
		</aside>
	</div>
</div>

<style>
	/* ── Content containers ───────────────────────────────── */
	.kb-event-rail-wrap,
	.kb-event-detail-grid {
		max-width: 1200px;
		margin-left: auto;
		margin-right: auto;
		padding-left: 1.5rem;
		padding-right: 1.5rem;
	}

	/* ── Hero: full-bleed image with overlay ──────────────── */
	.kb-event-hero {
		position: relative;
		width: 100%;
		height: 320px;
		overflow: hidden;
		background: var(--color-lakebed-950);
	}
	@media (min-width: 640px) {
		.kb-event-hero {
			height: 400px;
		}
	}
	@media (min-width: 1024px) {
		.kb-event-hero {
			height: 500px;
		}
	}
	.kb-event-hero-img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.kb-event-hero-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to top,
			rgba(0, 0, 0, 0.85) 0%,
			rgba(0, 0, 0, 0.45) 45%,
			rgba(0, 0, 0, 0.05) 100%
		);
	}
	.kb-event-hero-content {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 1.5rem;
		color: white;
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1.5rem;
	}
	@media (min-width: 1024px) {
		.kb-event-hero-content {
			max-width: 1200px;
			margin: 0 auto;
			padding: 2rem 1.5rem;
		}
	}
	.kb-event-hero-copy {
		min-width: 0;
		flex: 1 1 auto;
	}

	/* ── Hero-docked filmstrip (replaces standalone gallery) ─ */
	.kb-event-hero-filmstrip {
		display: none;
		flex-shrink: 0;
		gap: 0.5rem;
		padding: 0.5rem;
		border-radius: 10px;
		background: rgba(0, 0, 0, 0.35);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}
	@media (min-width: 640px) {
		.kb-event-hero-filmstrip {
			display: flex;
		}
	}
	.kb-event-hero-thumb {
		width: 64px;
		height: 64px;
		padding: 0;
		border: 2px solid transparent;
		border-radius: 6px;
		overflow: hidden;
		background: rgba(255, 255, 255, 0.06);
		cursor: pointer;
		transition:
			border-color 0.15s,
			transform 0.15s;
	}
	.kb-event-hero-thumb:hover {
		transform: translateY(-1px);
	}
	.kb-event-hero-thumb.selected {
		border-color: white;
	}
	.kb-event-hero-thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.kb-event-hero-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin-bottom: 0.625rem;
	}
	.kb-event-hero-tag {
		display: inline-block;
		padding: 0.2rem 0.5rem;
		background: rgba(255, 255, 255, 0.18);
		border-radius: 4px;
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
	}
	.kb-event-hero-tag--free {
		background: rgba(16, 185, 129, 0.22);
	}
	.kb-event-hero-title {
		font-family: var(--font-display, var(--font-serif));
		font-size: clamp(1.75rem, 5vw, 3.25rem);
		font-weight: 700;
		line-height: 1.05;
		letter-spacing: -0.01em;
		margin: 0 0 0.5rem 0;
		color: white;
		text-shadow: 0 2px 20px rgba(0, 0, 0, 0.45);
	}
	.kb-event-hero-host {
		font-family: var(--font-serif);
		font-size: 1rem;
		font-style: italic;
		opacity: 0.9;
		margin: 0;
	}

	/* ── Unified sticky utility bar ──────────────────────── */
	.kb-event-rail-sticky {
		position: sticky;
		top: 60px;
		z-index: 40;
	}
	.kb-event-rail-sticky :global(.coil-rail) {
		padding-left: 1.5rem;
		padding-right: 1.5rem;
	}
	.kb-event-meta-date {
		font-weight: 600;
		color: var(--foreground);
		white-space: nowrap;
	}
	.kb-event-meta-dot {
		opacity: 0.4;
	}
	.kb-event-meta-venue {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		min-width: 0;
		flex: 0 1 auto;
	}
	.kb-event-meta-venue > span:last-child {
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	/* ── Main content grid ───────────────────────────────── */
	.kb-event-detail-grid {
		display: grid;
		gap: 2rem;
		margin-top: 1.5rem;
		margin-bottom: 3rem;
	}
	@media (min-width: 1024px) {
		.kb-event-detail-grid {
			grid-template-columns: minmax(0, 1fr) 360px;
			gap: 2.5rem;
			align-items: start;
		}
	}
	.kb-event-detail-main {
		min-width: 0;
	}
	.kb-event-about {
		margin-bottom: 1.5rem;
	}
	.kb-event-about h2 {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0 0 0.75rem 0;
		color: var(--muted-foreground);
	}
	.kb-detail-description {
		max-width: 65ch;
		line-height: 1.6;
		color: var(--foreground);
		font: inherit;
	}
	.kb-detail-description :global(:first-child) {
		margin-top: 0;
	}
	.kb-detail-description--rich :global(p) {
		margin: 0 0 1rem 0;
		font: inherit;
		line-height: 1.75;
		color: inherit;
	}
	.kb-detail-description--rich :global(h3) {
		margin: 1.5rem 0 0.5rem 0;
		font: inherit;
		font-size: 1rem;
		font-weight: 600;
		line-height: 1.45;
		color: inherit;
	}
	.kb-detail-description--rich :global(ul),
	.kb-detail-description--rich :global(ol) {
		margin: 0 0 1rem 0;
		padding-left: 1.25rem;
	}
	.kb-detail-description--rich :global(ul) {
		list-style: disc;
	}
	.kb-detail-description--rich :global(ol) {
		list-style: decimal;
	}
	.kb-detail-description--rich :global(li) {
		margin: 0.35rem 0;
		padding-left: 0.15rem;
		font: inherit;
		line-height: 1.7;
		color: inherit;
	}
	.kb-detail-description--rich :global(li::marker) {
		color: var(--muted-foreground);
	}
	.kb-detail-description--rich :global(a) {
		color: var(--teal);
		font: inherit;
		font-weight: 600;
		text-decoration: none;
		text-underline-offset: 0.18em;
	}
	.kb-detail-description--rich :global(a:hover) {
		text-decoration: underline;
	}
	.kb-event-no-desc {
		color: var(--muted-foreground);
		margin: 0;
	}

	/* ── Sidebar info cards ──────────────────────────────── */
	.kb-event-sidebar {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.kb-event-info-card {
		padding: 1rem 1.25rem;
		border-radius: 8px;
		background: var(--card);
		border: 1px solid var(--border);
	}
	.kb-event-info-card h3 {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted-foreground);
		margin: 0 0 0.35rem 0;
	}
	.kb-event-info-value {
		margin: 0;
		font-size: 0.9375rem;
	}
	.kb-event-info-note {
		margin: 0.35rem 0 0 0;
		font-size: 0.8125rem;
		color: var(--muted-foreground);
	}
	.kb-event-cost-stack {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.kb-event-cost-badge {
		display: inline-flex;
		width: fit-content;
		align-items: center;
		border-radius: 9999px;
		background: rgba(15, 23, 42, 0.08);
		padding: 0.2rem 0.55rem;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		color: var(--foreground);
	}
	.kb-event-cost-badge--free {
		background: rgba(16, 185, 129, 0.14);
		color: #0f766e;
	}
	.kb-event-cost-tiers {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.kb-event-cost-tiers li {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		font-size: 0.875rem;
		color: var(--muted-foreground);
	}
	.kb-event-cost-tiers li span:last-child {
		font-weight: 600;
		color: var(--foreground);
	}

	/* Link styles: no permanent underline — hover only (matches global default) */
	.kb-event-info-link {
		display: inline-block;
		margin-top: 0.5rem;
		font-size: 0.875rem;
	}
	.kb-event-info-link-inline {
		color: var(--teal);
	}
	.kb-event-info-link-inline:hover {
		text-decoration: underline;
	}

	/* ── CTAs ────────────────────────────────────────────── */
	.kb-event-primary-cta {
		display: block;
		text-align: center;
		padding: 0.625rem 1rem;
		border-radius: 6px;
		background: var(--kb-accent, var(--teal));
		color: white;
		font-weight: 500;
		text-decoration: none;
		margin-top: 0.5rem;
		transition: opacity 0.15s;
	}
	.kb-event-primary-cta:hover {
		opacity: 0.9;
		text-decoration: none;
	}
	.kb-event-cta-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.kb-event-cta-group .kb-event-cta-secondary {
		background: transparent;
		border: 1px solid var(--kb-accent, var(--teal));
		color: var(--kb-accent, var(--teal));
	}

	/* Back link: navigation style, no underline */
	.kb-event-back {
		display: inline-block;
		margin-top: 1rem;
		font-size: 0.875rem;
		color: var(--muted-foreground);
		text-decoration: none;
	}
	.kb-event-back:hover {
		color: var(--foreground);
		text-decoration: none;
	}

	/* ── Calendar links ──────────────────────────────────── */
	.kb-event-calendar-add-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}
	.kb-event-calendar-add-link {
		font-size: 0.875rem;
		color: var(--teal);
	}

	/* ── Related events ──────────────────────────────────── */
	.kb-event-related {
		margin-top: 2rem;
	}
	.kb-event-related h2 {
		font-size: 1.25rem;
		margin-bottom: 1rem;
	}
	.kb-event-related-grid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 1rem;
	}
</style>
