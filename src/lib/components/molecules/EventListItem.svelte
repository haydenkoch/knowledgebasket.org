<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import type { EventItem } from '$lib/data/kb';
	import {
		getPlaceholderImageSrcset,
		DEFAULT_SIZES_CARD
	} from '$lib/data/placeholders';
	import { stripHtml, formatEventDateShort, getEventTypeTags } from '$lib/utils/format';

	type Props = {
		event: EventItem;
		index?: number;
		class?: string;
	};

	let { event, index = 0, class: className = '' }: Props = $props();

	const href = $derived(`/events/${event.slug ?? event.id}`);
	const imgAttrs = $derived(
		event.imageUrl
			? { src: event.imageUrl }
			: getPlaceholderImageSrcset(index, { sizes: DEFAULT_SIZES_CARD })
	);
</script>

<a href={href} class="kb-elist-item kb-elist-item-eb {className}">
	<div
		class="kb-elist-photo"
		style="background: linear-gradient(135deg, var(--color-lakebed-950), var(--color-lakebed-800))"
	>
		<img
			src={imgAttrs.src}
			srcset={imgAttrs.srcSet}
			sizes={imgAttrs.sizes}
			alt=""
			class="kb-elist-photo-img"
			loading={index < 2 ? 'eager' : 'lazy'}
			decoding="async"
		/>
	</div>
	<div class="kb-elist-body">
		<div class="kb-elist-tags">
			{#if event.region}<Badge class="kb-badge-tag">{event.region}</Badge>{/if}
			{#each getEventTypeTags(event) as tag (tag)}
				<Badge class="kb-badge-tag kb-badge-tag--type">{tag}</Badge>
			{/each}
		</div>
		<div class="kb-elist-title">{event.title}</div>
		{#if event.location}<div class="kb-elist-venue"><MapPinIcon class="kb-location-icon" /> {event.location}</div>{/if}
		<div class="kb-elist-meta-row">
			<span class="kb-elist-date">{formatEventDateShort(event.startDate, event.endDate)}</span>
			{#if event.cost}<Badge class="kb-badge-cost">{event.cost}</Badge>{/if}
		</div>
		{#if event.description}<div class="kb-elist-desc">{stripHtml(String(event.description))}</div>{/if}
		<span class="kb-elist-cta">View event</span>
	</div>
</a>

<style>
	.kb-elist-item {
		display: flex;
		align-items: stretch;
		gap: 0;
		min-height: 100px;
		border-radius: 8px;
		border: 1px solid var(--rule);
		background: #ffffff;
		text-decoration: none;
		color: inherit;
		overflow: hidden;
		transition: border-color 0.12s ease, transform 0.12s ease;
	}
	.kb-elist-item:hover {
		text-decoration: none;
		border-color: var(--teal);
		transform: translateX(2px);
	}
	.kb-elist-photo {
		width: 220px;
		min-width: 220px;
		flex-shrink: 0;
		position: relative;
		overflow: hidden;
	}
	.kb-elist-photo-img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.kb-elist-body {
		flex: 1;
		min-width: 0;
		padding: 10px 14px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		justify-content: center;
	}
	.kb-elist-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		align-items: center;
	}
	.kb-elist-title {
		font-family: var(--font-serif);
		font-size: 15px;
		font-weight: 600;
		color: var(--dark);
		line-height: 1.3;
	}
	.kb-elist-venue {
		font-family: var(--font-sans);
		font-size: 12px;
		color: var(--muted-foreground);
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.kb-location-icon {
		width: 14px;
		height: 14px;
		flex-shrink: 0;
		color: inherit;
	}
	.kb-elist-meta-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
	}
	.kb-elist-date {
		font-family: var(--font-sans);
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--muted-foreground);
	}
	.kb-elist-desc {
		font-size: 12px;
		line-height: 1.45;
		color: var(--mid);
		max-height: calc(1.45em * 2);
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		overflow: hidden;
	}
	.kb-elist-cta {
		font-family: var(--font-sans);
		font-size: 12px;
		font-weight: 600;
		color: var(--teal-dk);
	}
	:global(.kb-badge-cost) {
		font-family: var(--font-sans) !important;
		font-size: 11px !important;
		font-weight: 600 !important;
		background: var(--color-pinyon-600) !important;
		color: #ffffff !important;
		border: none !important;
	}
	:global(.kb-badge-tag) {
		font-family: var(--font-sans) !important;
		font-size: 11px !important;
		font-weight: 600 !important;
		background: var(--color-lakebed-100) !important;
		color: var(--color-lakebed-900) !important;
		border: 1px solid var(--color-lakebed-200) !important;
	}
	:global(.kb-badge-tag--type) {
		background: var(--color-granite-100) !important;
		color: var(--color-obsidian-800) !important;
		border-color: var(--color-granite-200) !important;
	}

	@media (max-width: 640px) {
		.kb-elist-item {
			flex-direction: column;
			min-height: 0;
		}
		.kb-elist-photo {
			width: 100%;
			min-width: 0;
			height: 140px;
		}
		.kb-elist-body {
			padding: 12px 14px;
		}
	}
</style>
