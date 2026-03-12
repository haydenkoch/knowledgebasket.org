<script lang="ts">
	import type { EventItem } from '$lib/data/kb';
	import { getPlaceholderImageSrcset, DEFAULT_SIZES_HERO } from '$lib/data/placeholders';
	import { formatEventDateRange, getEventTypeTags, eventDateForCalendarUrl, stripHtml } from '$lib/utils/format';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as ButtonGroup from '$lib/components/ui/button-group/index.js';

	let { data } = $props();
	let event = $derived(data.event as EventItem);
	const heroImgAttrs = $derived(
		event.imageUrl
			? { src: event.imageUrl }
			: getPlaceholderImageSrcset(0, { sizes: DEFAULT_SIZES_HERO })
	);
	const calendarDate = $derived(eventDateForCalendarUrl(event.startDate));

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
</script>

<svelte:head>
	<title>{event.title} | Events | Knowledge Basket</title>
	<meta name="description" content={event.description ? stripHtml(String(event.description)).slice(0, 160) : `${event.title}. ${event.region ?? ''} ${formatEventDateRange(event.startDate, event.endDate)}.`} />
</svelte:head>

<div class="kb-event-detail" style="--kb-accent: var(--teal)">
	<nav class="kb-breadcrumb" aria-label="Breadcrumb">
		<ol class="kb-breadcrumb-list">
			<li><a href="/events">Events</a></li>
			<li><span>{event.title}</span></li>
		</ol>
	</nav>

	<!-- Hero (Ticketmaster-style: full-width, tall) -->
	<header class="kb-event-hero">
		<img
			src={heroImgAttrs.src}
			srcset={heroImgAttrs.srcSet}
			sizes={heroImgAttrs.sizes}
			alt=""
			class="kb-event-hero-img"
			fetchpriority="high"
			decoding="async"
		/>
		<div class="kb-event-hero-overlay"></div>
		<div class="kb-event-hero-content">
			<div class="kb-event-hero-tags">
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

	<!-- Sticky CTA bar (optional: only if eventUrl) -->
	{#if event.eventUrl}
		<div class="kb-event-cta-bar">
			<div class="kb-event-cta-bar-inner">
				<div class="kb-event-cta-bar-info">
					<span class="kb-event-cta-date">{formatEventDateRange(event.startDate, event.endDate)}</span>
					{#if event.location}<span class="kb-event-cta-venue"><MapPinIcon class="kb-location-icon" /> {event.location}</span>{/if}
				</div>
				<a href={event.eventUrl} target="_blank" rel="noopener" class="kb-event-cta-btn">
					{event.cost === 'Free/Sponsored' ? 'Register' : event.cost === 'Registration Fee Required' ? 'Get tickets' : 'Learn more'}
				</a>
			</div>
		</div>
	{/if}

	<div class="kb-event-detail-grid">
		<main class="kb-event-detail-main">
			<section class="kb-event-about">
				<h2>About this event</h2>
				{#if event.description}
					<div class="kb-detail-description">{@html event.description}</div>
				{:else}
					<p class="kb-event-no-desc">No description available.</p>
				{/if}
			</section>
		</main>
		<aside class="kb-event-sidebar">
			<div class="kb-event-info-card">
				<h3>Date & time</h3>
				<p class="kb-event-info-value">{formatEventDateRange(event.startDate, event.endDate)}</p>
				<p class="kb-event-info-note">All times are local. Check event page for details.</p>
			</div>
			{#if event.location}
				<div class="kb-event-info-card">
					<h3>Location</h3>
					<p class="kb-event-info-value">{event.location}</p>
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
			{#if event.hostOrg}
				<div class="kb-event-info-card">
					<h3>Host</h3>
					<p class="kb-event-info-value">{event.hostOrg}</p>
				</div>
			{/if}
			{#if event.eventUrl}
				<a href={event.eventUrl} target="_blank" rel="noopener" class="kb-event-primary-cta">
					{event.cost === 'Free/Sponsored' ? 'Register for free' : event.cost === 'Registration Fee Required' ? 'Get tickets' : 'Learn more & register'}
				</a>
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
	.kb-breadcrumb-list {
		display: flex;
		flex-wrap: wrap;
		list-style: none;
		margin: 0;
		padding: 0;
		gap: 0.25rem;
	}
	.kb-breadcrumb li:not(:last-child)::after {
		content: ' › ';
	}
</style>
