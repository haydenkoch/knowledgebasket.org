<script lang="ts">
	import EventCard from '$lib/components/molecules/EventCard.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';

	let { data } = $props();
	const organization = $derived(data.organization);
	const events = $derived(data.events);
</script>

<svelte:head>
	<title>{organization.name} | Organizer | Knowledge Basket</title>
	<meta
		name="description"
		content={organization.description ?? `Upcoming events from ${organization.name}.`}
	/>
	<meta property="og:title" content="{organization.name} | Organizer" />
	<meta
		property="og:description"
		content={organization.description ?? `Upcoming events from ${organization.name}.`}
	/>
	{#if organization.logoUrl}<meta property="og:image" content={organization.logoUrl} />{/if}
	<meta property="og:type" content="website" />
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
					<Breadcrumb.Page>{organization.name}</Breadcrumb.Page>
				</Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>
	</div>

	<header class="kb-org-header">
		{#if organization.logoUrl}
			<img src={organization.logoUrl} alt="" class="kb-org-logo" />
		{/if}
		<h1 class="kb-org-title">{organization.name}</h1>
		{#if organization.description}
			<p class="kb-org-description">{organization.description}</p>
		{/if}
		{#if organization.website}
			<a href={organization.website} target="_blank" rel="noopener" class="kb-org-website"
				>Visit website →</a
			>
		{/if}
	</header>

	<section class="kb-org-events">
		<h2>Upcoming events</h2>
		{#if events.length > 0}
			<ul class="kb-org-event-grid">
				{#each events as event, i}
					<li><EventCard {event} index={i} /></li>
				{/each}
			</ul>
		{:else}
			<p class="kb-org-no-events">No upcoming events at the moment.</p>
		{/if}
	</section>

	<p class="kb-org-back">
		<Button variant="outline" href="/events">← Back to all events</Button>
	</p>
</div>

<style>
	.kb-event-header-wrap {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem 1.5rem 0;
	}
	.kb-org-header {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1.5rem 1.5rem 0;
	}
	.kb-org-logo {
		width: 80px;
		height: 80px;
		object-fit: contain;
		margin-bottom: 0.5rem;
	}
	.kb-org-title {
		font-size: 1.75rem;
		font-weight: 700;
		margin: 0 0 0.5rem 0;
	}
	.kb-org-description {
		color: var(--muted-foreground);
		max-width: 60ch;
		margin: 0 0 0.5rem 0;
	}
	.kb-org-website {
		font-size: 0.875rem;
	}
	.kb-org-website:hover {
		text-decoration: underline;
	}
	.kb-org-events {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1.5rem;
	}
	.kb-org-events h2 {
		font-size: 1.25rem;
		margin-bottom: 1rem;
	}
	.kb-org-event-grid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
	}
	.kb-org-no-events {
		color: var(--muted-foreground);
	}
	.kb-org-back {
		max-width: 1200px;
		margin: 1.5rem auto 2rem;
		padding: 0 1.5rem;
	}
</style>
