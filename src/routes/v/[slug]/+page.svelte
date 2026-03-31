<script lang="ts">
	import EventCard from '$lib/components/molecules/EventCard.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';

	let { data } = $props();
	const venue = $derived(data.venue);
	const events = $derived(data.events);

	const addressLine = $derived(
		[venue.address, venue.city, venue.state, venue.zip].filter(Boolean).join(', ')
	);
	const mapUrl = $derived(
		addressLine
			? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}`
			: venue.lat != null && venue.lng != null
				? `https://www.google.com/maps?q=${venue.lat},${venue.lng}`
				: ''
	);
</script>

<svelte:head>
	<title>{venue.name} | Venue | Knowledge Basket</title>
	<meta name="description" content={venue.description ?? `Upcoming events at ${venue.name}.`} />
</svelte:head>

<div class="kb-event-detail" style="--kb-accent: var(--teal)">
	<nav class="kb-breadcrumb" aria-label="Breadcrumb">
		<ol class="kb-breadcrumb-list">
			<li><a href="/events">Events</a></li>
			<li><span>{venue.name}</span></li>
		</ol>
	</nav>

	<header class="kb-venue-header">
		<h1 class="kb-venue-title">{venue.name}</h1>
		{#if venue.description}
			<p class="kb-venue-description">{venue.description}</p>
		{/if}
		{#if addressLine}
			<p class="kb-venue-address">
				<MapPinIcon class="kb-location-icon" style="vertical-align: middle; width: 1rem; height: 1rem;" />
				{addressLine}
			</p>
			{#if mapUrl}
				<a href={mapUrl} target="_blank" rel="noopener" class="kb-venue-map-link">Get directions →</a>
			{/if}
		{/if}
		{#if venue.website}
			<a href={venue.website} target="_blank" rel="noopener" class="kb-venue-website">Visit website →</a>
		{/if}
	</header>

	<section class="kb-venue-events">
		<h2>Upcoming events</h2>
		{#if events.length > 0}
			<ul class="kb-venue-event-grid">
				{#each events as event, i}
					<li><EventCard event={event} index={i} /></li>
				{/each}
			</ul>
		{:else}
			<p class="kb-venue-no-events">No upcoming events at this venue.</p>
		{/if}
	</section>

	<p class="kb-venue-back">
		<Button variant="outline" href="/events">← Back to all events</Button>
	</p>
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
	.kb-venue-header {
		margin-bottom: 2rem;
	}
	.kb-venue-title {
		font-size: 1.75rem;
		font-weight: 700;
		margin: 0 0 0.5rem 0;
	}
	.kb-venue-description {
		color: var(--muted-foreground);
		max-width: 60ch;
		margin: 0 0 0.5rem 0;
	}
	.kb-venue-address {
		margin: 0.5rem 0;
	}
	.kb-venue-map-link,
	.kb-venue-website {
		display: inline-block;
		font-size: 0.875rem;
		text-decoration: underline;
		margin-right: 1rem;
	}
	.kb-venue-events h2 {
		font-size: 1.25rem;
		margin-bottom: 1rem;
	}
	.kb-venue-event-grid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
	}
	.kb-venue-no-events {
		color: var(--muted-foreground);
	}
	.kb-venue-back {
		margin-top: 2rem;
	}
</style>
