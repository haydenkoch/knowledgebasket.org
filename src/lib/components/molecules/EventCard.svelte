<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import type { EventItem } from '$lib/data/kb';
	import { getPlaceholderImageSrcset, DEFAULT_SIZES_CARD } from '$lib/data/placeholders';
	import { stripHtml, formatEventDateShort, getEventTypeTags } from '$lib/utils/format';

	type Props = {
		event: EventItem;
		index?: number;
		href?: string;
		class?: string;
	};

	let { event, index = 0, href, class: className = '' }: Props = $props();

	const link = $derived(href ?? `/events/${event.slug ?? event.id}`);
	const imgAttrs = $derived(
		event.imageUrl
			? { src: event.imageUrl }
			: getPlaceholderImageSrcset(index, { sizes: DEFAULT_SIZES_CARD })
	);
</script>

<a href={link} class="kb-card kb-event-card {className}">
	<div
		class="kb-cimg"
		style="background: linear-gradient(135deg, var(--color-lakebed-950), var(--color-lakebed-800))"
	>
		<img
			src={imgAttrs.src}
			srcset={imgAttrs.srcSet}
			sizes={imgAttrs.sizes}
			alt=""
			class="kb-cimg-photo"
			loading={index < 2 ? 'eager' : 'lazy'}
			decoding="async"
		/>
		<span class="kb-event-card-date">{formatEventDateShort(event.startDate, event.endDate)}</span>
		{#if event.cost}
			<span class="kb-event-card-cost"><Badge class="kb-badge-cost">{event.cost}</Badge></span>
		{/if}
	</div>
	<div class="kb-cbody">
		<div class="kb-ctags">
			{#if event.region}<Badge class="kb-badge-tag">{event.region}</Badge>{/if}
			{#each getEventTypeTags(event) as tag (tag)}
				<Badge class="kb-badge-tag kb-badge-tag--type">{tag}</Badge>
			{/each}
		</div>
		<div class="kb-ctit">{event.title}</div>
		{#if event.location}<div class="kb-cmeta"><MapPinIcon class="kb-location-icon" /> {event.location}</div>{/if}
		{#if event.description}<div class="kb-cdesc">{stripHtml(String(event.description))}</div>{/if}
		<span class="kb-ccta">View event</span>
	</div>
</a>

<style>
	.kb-card {
		background: #ffffff;
		border-radius: 8px;
		box-shadow: var(--sh);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		transition: transform 0.15s ease, box-shadow 0.15s ease;
		cursor: pointer;
		border: 1px solid var(--rule);
		text-decoration: none;
	}
	.kb-card:hover {
		transform: translateY(-3px);
		box-shadow: var(--shh);
		text-decoration: none;
	}
	.kb-cimg {
		height: 148px;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		overflow: hidden;
	}
	.kb-cimg-photo {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.kb-event-card-date {
		position: absolute;
		left: 12px;
		bottom: 10px;
		font-family: var(--font-sans);
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.8);
	}
	.kb-event-card-cost {
		position: absolute;
		right: 10px;
		bottom: 10px;
	}
	.kb-cbody {
		padding: 16px 18px;
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}
	.kb-ctags {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
		margin-bottom: 8px;
	}
	.kb-ctit {
		font-family: var(--font-serif);
		font-size: 16px;
		font-weight: 600;
		color: var(--dark);
		line-height: 1.35;
		margin-bottom: 5px;
	}
	.kb-cmeta {
		font-family: var(--font-sans);
		font-size: 12px;
		color: var(--muted-foreground);
		margin-bottom: 6px;
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
	.kb-cdesc {
		font-size: 13px;
		line-height: 1.5;
		color: var(--mid);
		margin-bottom: 14px;
		flex: 1 1 auto;
		min-height: 0;
		max-height: calc(1.5em * 3);
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		overflow: hidden;
	}
	.kb-ccta {
		display: block;
		flex-shrink: 0;
		text-align: center;
		background: var(--teal);
		color: #ffffff;
		font-family: var(--font-sans);
		font-size: 13px;
		font-weight: 700;
		padding: 9px;
		border-radius: var(--radius);
		text-decoration: none;
		letter-spacing: 0.03em;
		transition: filter 0.15s ease;
		margin-top: auto;
	}
	.kb-ccta:hover {
		filter: brightness(1.1);
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
</style>
