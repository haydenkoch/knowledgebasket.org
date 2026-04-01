<script lang="ts">
	import type { EventItem } from '$lib/data/kb';
	import { getPlaceholderImageSrcset, DEFAULT_SIZES_HERO } from '$lib/data/placeholders';
	import { formatEventDateRange, formatEventTime, getEventTypeTags, eventDateForCalendarUrl, eventGoogleCalendarUrl, stripHtml, parseEventStart } from '$lib/utils/format';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as ButtonGroup from '$lib/components/ui/button-group/index.js';
	import EventCard from '$lib/components/molecules/EventCard.svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';

	let { data } = $props();
	let event = $derived(data.event as EventItem);
	const isIcalEvent = $derived(data.isIcalEvent ?? false);
	const galleryImages = $derived(
		event.imageUrl ? [event.imageUrl, ...(event.imageUrls ?? [])] : (event.imageUrls ?? [])
	);
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
	const singleCtaUrl = $derived(hasEventUrl ? event.eventUrl! : event.registrationUrl ?? null);
	const singleCtaLabel = $derived(
		event.cost === 'Free/Sponsored' ? 'Register' : event.cost === 'Registration Fee Required' ? 'Get tickets' : 'Learn more'
	);
	const singleCtaLabelLong = $derived(
		event.cost === 'Free/Sponsored' ? 'Register for free' : event.cost === 'Registration Fee Required' ? 'Get tickets' : 'Learn more & register'
	);
	const formatLabel = $derived(
		event.eventFormat === 'online' ? 'Online event' : event.eventFormat === 'hybrid' ? 'Hybrid' : event.eventFormat === 'in_person' ? 'In person' : null
	);
	const joinOnlineUrl = $derived(
		(event.eventFormat === 'online' || event.eventFormat === 'hybrid') && (event.virtualEventUrl ?? event.eventUrl)
			? (event.virtualEventUrl ?? event.eventUrl)!
			: null
	);
	function formatDoorsOpen(iso?: string): string | null {
		if (!iso) return null;
		const d = new Date(iso);
		if (isNaN(d.getTime())) return null;
		return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
	}
	const doorsOpenTime = $derived(formatDoorsOpen(event.doorsOpenAt));
	const eventStartTime = $derived(formatEventTime(event.startDate));

	function mapUrl(location?: string): string {
		if (!location?.trim()) return '';
		const q = encodeURIComponent(location);
		return `https://www.google.com/maps/search/?api=1&query=${q}`;
	}
	const directionsUrl = $derived(mapUrl(event.location));

	function calendarUrl(mode: 'week' | 'month'): string {
		const params = new URLSearchParams({ view: 'calendar', mode });
		if (calendarDate) params.set('date', calendarDate);
		return `/events?${params.toString()}`;
	}

	const origin = $derived(data.origin ?? '');
	const canonicalUrl = $derived(event.slug ? `${origin}/events/${event.slug}` : origin + '/events');
	const metaDescription = $derived(
		event.description ? stripHtml(String(event.description)).slice(0, 160) : `${event.title}. ${event.region ?? ''} ${formatEventDateRange(event.startDate, event.endDate)}.`
	);
	const ogImage = $derived(
		event.imageUrl
			? (event.imageUrl.startsWith('http') ? event.imageUrl : `${origin}${event.imageUrl.startsWith('/') ? '' : '/'}${event.imageUrl}`)
			: ''
	);

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
								geo: { '@type': 'GeoCoordinates' as const, latitude: event.lat, longitude: event.lng }
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
			...(ogImage && { image: ogImage }),
			url: canonicalUrl,
			...(event.hostOrg && { organizer: { '@type': 'Organization', name: event.hostOrg } }),
			...(eventUrl && eventUrl !== canonicalUrl && { offers: { '@type': 'Offer', url: eventUrl } })
		};
	});
</script>

<svelte:head>
	<title>{event.title} | Events | Knowledge Basket</title>
	<meta name="description" content={metaDescription} />
	{#if canonicalUrl}
		<link rel="canonical" href={canonicalUrl} />
	{/if}
	<!-- Open Graph -->
	<meta property="og:title" content={event.title} />
	<meta property="og:description" content={metaDescription} />
	{#if ogImage}<meta property="og:image" content={ogImage} />{/if}
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:type" content="website" />
	<!-- Twitter -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={event.title} />
	<meta name="twitter:description" content={metaDescription} />
	{#if ogImage}<meta name="twitter:image" content={ogImage} />{/if}
	<!-- JSON-LD Event -->
	{@html `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/<\/script>/g, '<\\/script>')}</script>`}
</svelte:head>

<div class="kb-event-detail" style="--kb-accent: var(--teal)">
	<div class="kb-event-header-wrap">
		<Breadcrumb.Root>
			<Breadcrumb.List>
				<Breadcrumb.Item>
					<Breadcrumb.Link href="/events">Events</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Item>
					<Breadcrumb.Page>{event.title}</Breadcrumb.Page>
				</Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>
	</div>

	<!-- Hero (Ticketmaster-style: full-width, tall) -->
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
			<div class="kb-event-hero-tags">
				{#if formatLabel}<span class="kb-event-hero-tag">{formatLabel}</span>{/if}
				{#if event.region}<span class="kb-event-hero-tag">{event.region}</span>{/if}
				{#each getEventTypeTags(event) as tag (tag)}
					<span class="kb-event-hero-tag">{tag}</span>
				{/each}
			</div>
			<h1 class="kb-event-hero-title">{event.title}</h1>
			{#if event.hostOrg}
				<p class="kb-event-hero-host">Presented by {event.hostOrg}</p>
			{/if}
		</div>
	</header>

	<!-- Sticky CTA bar (when eventUrl and/or registrationUrl) -->
	{#if singleCtaUrl || dualCtas}
		<div class="kb-event-cta-bar">
			<div class="kb-event-cta-bar-inner">
				<div class="kb-event-cta-bar-info">
					<span class="kb-event-cta-date">{formatEventDateRange(event.startDate, event.endDate)}</span>
					{#if event.location}<span class="kb-event-cta-venue"><MapPinIcon class="size-[14px] shrink-0" /> {event.location}</span>{/if}
				</div>
				<div class="kb-event-cta-btns">
					{#if dualCtas}
						<a href={event.eventUrl!} target="_blank" rel="noopener" class="kb-event-cta-btn">Event page</a>
						<a href={event.registrationUrl!} target="_blank" rel="noopener" class="kb-event-cta-btn kb-event-cta-btn-secondary">
							{event.cost === 'Free/Sponsored' ? 'Register' : event.cost === 'Registration Fee Required' ? 'Get tickets' : 'Register'}
						</a>
					{:else if singleCtaUrl}
						<a href={singleCtaUrl} target="_blank" rel="noopener" class="kb-event-cta-btn">{singleCtaLabel}</a>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	{#if galleryImages.length > 1}
		<div class="kb-event-gallery-thumbs">
			{#each galleryImages as url, i}
				<button
					type="button"
					class="kb-event-gallery-thumb"
					class:selected={i === selectedGalleryIndex}
					aria-label="View image {i + 1}"
					onclick={() => (selectedGalleryIndex = i)}
				>
					<img src={url} alt="" />
				</button>
			{/each}
		</div>
	{/if}

	<div class="kb-event-detail-grid">
		<main class="kb-event-detail-main">
			<section class="kb-event-about">
				<h2>About this event</h2>
				{#if event.description}
					<div class="kb-detail-description">{@html event.description}</div>
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
				{#if doorsOpenTime && eventStartTime}
					<p class="kb-event-info-note">Doors open {doorsOpenTime} · Event {eventStartTime}</p>
				{:else if isIcalEvent}
					<p class="kb-event-info-note">See event link for exact times.</p>
				{:else}
					<p class="kb-event-info-note">All times are local. Check event page for details.</p>
				{/if}
				{#if event.timezone}
					<p class="kb-event-info-note">Time zone: {event.timezone}</p>
				{/if}
			</div>
			{#if event.capacity != null || event.soldOut}
				<div class="kb-event-info-card">
					<h3>Capacity</h3>
					<p class="kb-event-info-value">{event.soldOut ? 'Sold out' : event.capacity != null ? `Limited to ${event.capacity}` : ''}</p>
				</div>
			{/if}
			{#if event.ageRestriction}
				<div class="kb-event-info-card">
					<h3>Age</h3>
					<p class="kb-event-info-value">{event.ageRestriction}</p>
				</div>
			{/if}
			{#if event.location || event.venueSlug}
				<div class="kb-event-info-card">
					<h3>Location</h3>
					{#if event.venueSlug}
						<p class="kb-event-info-value"><a href="/v/{event.venueSlug}" class="kb-event-info-link-inline">{event.venueName ?? event.location ?? 'Venue'}</a></p>
					{/if}
					{#if event.location && (!event.venueName || event.location !== event.venueName)}
						<p class="kb-event-info-value">{event.location}</p>
					{/if}
					{#if directionsUrl}
						<a href={directionsUrl} target="_blank" rel="noopener" class="kb-event-info-link">Get directions →</a>
					{/if}
				</div>
			{/if}
			{#if event.cost}
				<div class="kb-event-info-card">
					<h3>Cost</h3>
					<p class="kb-event-info-value">{event.cost}</p>
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
					<a href={joinOnlineUrl} target="_blank" rel="noopener" class="kb-event-info-link">Join online →</a>
				</div>
			{/if}
			{#if event.hostOrg}
				<div class="kb-event-info-card">
					<h3>{isIcalEvent ? 'Source' : 'Host'}</h3>
					{#if !isIcalEvent && event.organizationSlug}
						<p class="kb-event-info-value"><a href="/o/{event.organizationSlug}" class="kb-event-info-link-inline">{event.hostOrg}</a></p>
					{:else}
						<p class="kb-event-info-value">{event.hostOrg}</p>
					{/if}
				</div>
			{/if}
			{#if event.soldOut && event.waitlistUrl}
				<div class="kb-event-info-card">
					<a href={event.waitlistUrl} target="_blank" rel="noopener" class="kb-event-primary-cta">Join waitlist</a>
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
					<a href={event.eventUrl!} target="_blank" rel="noopener" class="kb-event-primary-cta">Event page</a>
					<a href={event.registrationUrl!} target="_blank" rel="noopener" class="kb-event-primary-cta kb-event-cta-secondary">
						{event.cost === 'Free/Sponsored' ? 'Register for free' : event.cost === 'Registration Fee Required' ? 'Get tickets' : 'Register'}
					</a>
				</div>
			{:else if singleCtaUrl}
				<a href={singleCtaUrl} target="_blank" rel="noopener" class="kb-event-primary-cta">{singleCtaLabelLong}</a>
			{/if}
			{#if event.startDate}
				<div class="kb-event-info-card kb-event-add-to-calendar">
					<h3>Add to calendar</h3>
					<p class="kb-event-info-note">Download or add to your calendar.</p>
					<div class="kb-event-calendar-add-links">
						{#if event.slug}
							<a href="/events/{event.slug}/feed.ics" class="kb-event-calendar-add-link" download="event.ics">Download .ics</a>
						{/if}
						{#if googleCalendarUrl}
							<a href={googleCalendarUrl} target="_blank" rel="noopener" class="kb-event-calendar-add-link">Google Calendar</a>
						{/if}
						{#if event.slug}
							<a href="/events/{event.slug}/feed.ics" class="kb-event-calendar-add-link">Apple Calendar / Outlook</a>
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
			<a href="/events" class="kb-event-back">← Back to all events</a>
		</aside>
	</div>
</div>

<style>
	/* ── Content containers ───────────────────────────────── */
	.kb-event-header-wrap,
	.kb-event-gallery-thumbs,
	.kb-event-detail-grid {
		max-width: 1200px;
		margin-left: auto;
		margin-right: auto;
		padding-left: 1.5rem;
		padding-right: 1.5rem;
	}
	.kb-event-header-wrap {
		padding-top: 1rem;
		padding-bottom: 0;
	}

	/* ── Hero: full-bleed image with overlay ──────────────── */
	.kb-event-hero {
		position: relative;
		width: 100%;
		height: 280px;
		overflow: hidden;
		background: var(--color-lakebed-950);
		margin-top: 0.75rem;
	}
	@media (min-width: 640px) {
		.kb-event-hero {
			height: 360px;
		}
	}
	@media (min-width: 1024px) {
		.kb-event-hero {
			height: 440px;
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
			rgba(0, 0, 0, 0.78) 0%,
			rgba(0, 0, 0, 0.35) 50%,
			rgba(0, 0, 0, 0.08) 100%
		);
	}
	.kb-event-hero-content {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 1.5rem;
		color: white;
	}
	@media (min-width: 1024px) {
		.kb-event-hero-content {
			max-width: 1200px;
			margin: 0 auto;
			padding: 2rem 1.5rem;
		}
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
	.kb-event-hero-title {
		font-family: var(--font-serif);
		font-size: clamp(1.375rem, 4vw, 2.25rem);
		font-weight: 700;
		line-height: 1.15;
		margin: 0 0 0.375rem 0;
		color: white;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
	}
	.kb-event-hero-host {
		font-size: 0.9rem;
		opacity: 0.85;
		margin: 0;
	}

	/* ── Sticky CTA bar ──────────────────────────────────── */
	.kb-event-cta-bar {
		position: sticky;
		top: 60px;
		z-index: 40;
		background: var(--background);
		border-bottom: 1px solid var(--border);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
	}
	.kb-event-cta-bar-inner {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0.625rem 1.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}
	.kb-event-cta-bar-info {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		flex-wrap: wrap;
		min-width: 0;
	}
	.kb-event-cta-date {
		font-weight: 600;
		font-size: 0.9rem;
		white-space: nowrap;
	}
	.kb-event-cta-venue {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.875rem;
		color: var(--muted-foreground);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 240px;
	}
	.kb-event-cta-btns {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}
	.kb-event-cta-btn {
		display: inline-flex;
		align-items: center;
		padding: 0.5rem 1.25rem;
		background: var(--kb-accent, var(--teal));
		color: white;
		font-weight: 600;
		font-size: 0.875rem;
		border-radius: 6px;
		text-decoration: none;
		white-space: nowrap;
		transition: opacity 0.15s;
	}
	.kb-event-cta-btn:hover {
		opacity: 0.9;
		text-decoration: none;
	}
	.kb-event-cta-btn-secondary {
		background: transparent;
		border: 1.5px solid var(--kb-accent, var(--teal));
		color: var(--kb-accent, var(--teal));
	}
	.kb-event-cta-btn-secondary:hover {
		background: var(--kb-accent, var(--teal));
		color: white;
	}

	/* ── Gallery thumbnails ──────────────────────────────── */
	.kb-event-gallery-thumbs {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding-top: 0.75rem;
		padding-bottom: 0;
	}
	.kb-event-gallery-thumb {
		width: 64px;
		height: 64px;
		padding: 0;
		border: 2px solid transparent;
		border-radius: 4px;
		overflow: hidden;
		background: var(--muted);
		cursor: pointer;
	}
	.kb-event-gallery-thumb.selected {
		border-color: var(--kb-accent, var(--teal));
	}
	.kb-event-gallery-thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/* ── Main content grid ───────────────────────────────── */
	.kb-event-detail-grid {
		display: grid;
		gap: 1.5rem;
		margin-top: 1.25rem;
		margin-bottom: 2rem;
	}
	@media (min-width: 1024px) {
		.kb-event-detail-grid {
			grid-template-columns: 1fr minmax(280px, 340px);
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
