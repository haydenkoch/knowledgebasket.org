<script lang="ts">
	import type { EventItem } from '$lib/data/kb';
	import { stripHtml } from '$lib/utils/format';
	import Calendar from '@lucide/svelte/icons/calendar';
	import MapPin from '@lucide/svelte/icons/map-pin';

	let { event, index = 0 }: { event: EventItem; index?: number } = $props();

	const href = $derived(`/events/${event.slug ?? event.id}`);

	function formatDate(d?: string) {
		if (!d) return '';
		try {
			return new Date(d).toLocaleDateString('en-US', {
				weekday: 'short',
				month: 'short',
				day: 'numeric'
			});
		} catch {
			return '';
		}
	}

	const types = $derived(event.types?.length ? event.types : event.type ? [event.type] : []);
	const plainDesc = $derived(event.description ? stripHtml(event.description).slice(0, 150) : '');
</script>

<a {href} class="kb-elist-item" style="animation-delay: {index * 30}ms">
	{#if event.imageUrl}
		<div class="kb-elist-img">
			<img src={event.imageUrl} alt={event.title} loading="lazy" />
		</div>
	{:else}
		<div class="kb-elist-img kb-elist-img--placeholder" aria-hidden="true">
			<Calendar class="h-8 w-8 text-white opacity-50" />
		</div>
	{/if}

	<div class="kb-elist-body">
		<div class="kb-elist-meta">
			{#if event.startDate}
				<span class="kb-elist-date">{formatDate(event.startDate)}</span>
			{/if}
			{#if types.length}
				<span class="kb-elist-type">{types[0]}</span>
			{/if}
			{#if event.region}
				<span class="kb-elist-region">{event.region}</span>
			{/if}
		</div>
		<h3 class="kb-elist-title">{event.title}</h3>
		{#if event.location}
			<p class="kb-elist-location" title={event.location}>
				<MapPin class="inline h-3.5 w-3.5 flex-none" />
				{event.location}
			</p>
		{/if}
		{#if plainDesc}
			<p class="kb-elist-desc">{plainDesc}</p>
		{/if}
	</div>
</a>

<style>
	.kb-elist-item {
		display: flex;
		gap: 16px;
		background: #fff;
		border: 1px solid var(--rule, #e5e5e5);
		border-radius: 8px;
		padding: 14px;
		text-decoration: none;
		color: inherit;
		transition:
			box-shadow 0.15s ease,
			transform 0.15s ease;
	}
	.kb-elist-item:hover {
		box-shadow: var(--shh, 0 4px 16px rgba(0, 0, 0, 0.12));
		transform: translateY(-1px);
		text-decoration: none;
	}
	.kb-elist-item:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: -2px;
	}
	.kb-elist-img {
		width: 80px;
		height: 80px;
		flex-shrink: 0;
		border-radius: 6px;
		overflow: hidden;
		background: var(--color-lakebed-800, #1a3a4a);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.kb-elist-img img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.kb-elist-img--placeholder {
		color: white;
	}
	.kb-elist-body {
		flex: 1;
		min-width: 0;
	}
	.kb-elist-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		align-items: center;
		margin-bottom: 4px;
	}
	.kb-elist-date {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--muted-foreground, #666);
	}
	.kb-elist-type,
	.kb-elist-region {
		font-size: 11px;
		background: var(--muted);
		color: var(--muted-foreground, #666);
		border-radius: 9999px;
		padding: 1px 7px;
	}
	.kb-elist-title {
		font-size: 15px;
		font-weight: 600;
		color: var(--dark, #1c1c1c);
		margin: 0 0 3px;
		line-height: 1.3;
	}
	.kb-elist-location {
		font-size: 12px;
		color: var(--muted-foreground, #666);
		margin: 0 0 4px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.kb-elist-desc {
		font-size: 13px;
		color: var(--mid, #555);
		margin: 0;
		overflow: hidden;
		display: -webkit-box;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
	}
</style>
