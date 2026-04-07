<script lang="ts">
	import type { EventItem } from '$lib/data/kb';
	import EventCard from '$lib/components/molecules/EventCard.svelte';
	import { formatDisplayDate } from '$lib/utils/display';
	import { formatEventTimeRange } from '$lib/utils/format';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import MapPin from '@lucide/svelte/icons/map-pin';

	interface Props {
		calendarSelectedEvent: EventItem | null | undefined;
		eventView: string;
		sidebarFeatured: EventItem[];
		sidebarCalendarValue: unknown;
		sidebarWeekUpcoming: EventItem[];
		sidebarCalendarInView: EventItem[];
		mapboxToken?: string;
		onClose: () => void;
	}

	let {
		calendarSelectedEvent,
		eventView,
		sidebarFeatured,
		sidebarCalendarValue,
		sidebarWeekUpcoming,
		sidebarCalendarInView,
		mapboxToken,
		onClose
	}: Props = $props();
</script>

<div class="kb-right-sidebar">
	{#if calendarSelectedEvent}
		<!-- Event detail panel -->
		<div class="kb-rsidebar-panel">
			<div class="kb-rsidebar-header">
				<h2 class="kb-rsidebar-title">Event Details</h2>
				<button type="button" onclick={onClose} class="kb-rsidebar-close" aria-label="Close panel"
					>×</button
				>
			</div>
			<div class="kb-rsidebar-body">
				<h3 class="mb-1 text-base font-semibold">{calendarSelectedEvent.title}</h3>
				{#if calendarSelectedEvent.startDate}
					{@const eventTime = formatEventTimeRange(
						calendarSelectedEvent.startDate,
						calendarSelectedEvent.endDate
					)}
					<p class="mb-1 text-sm text-muted-foreground">
						{formatDisplayDate(
							calendarSelectedEvent.startDate,
							{
								weekday: 'long',
								month: 'long',
								day: 'numeric'
							},
							''
						)}
						{#if eventTime}
							· {eventTime}
						{/if}
					</p>
				{/if}
				{#if calendarSelectedEvent.location}
					<p class="mb-3 flex items-center gap-1 text-sm text-muted-foreground">
						<MapPin class="inline h-3.5 w-3.5 flex-none" />
						{calendarSelectedEvent.location}
					</p>
				{/if}
				{#if calendarSelectedEvent.slug}
					<a href="/events/{calendarSelectedEvent.slug}" class="kb-rsidebar-cta"
						>View event <ArrowRight class="inline h-4 w-4" /></a
					>
				{/if}
			</div>
		</div>
	{:else if eventView === 'cards' || eventView === 'list'}
		<!-- Upcoming this week -->
		{#if sidebarWeekUpcoming.length > 0}
			{@const weekVisible = sidebarWeekUpcoming.slice(0, 8)}
			{@const weekRemaining = sidebarWeekUpcoming.length - weekVisible.length}
			<div class="kb-rsidebar-panel">
				<div class="kb-rsidebar-header">
					<h2 class="kb-rsidebar-title">This Week</h2>
					<span class="kb-rsidebar-count">{sidebarWeekUpcoming.length}</span>
				</div>
				<ul class="kb-rsidebar-list">
					{#each weekVisible as event}
						<li>
							<a href="/events/{event.slug}" class="kb-rsidebar-item">
								<span class="kb-rsidebar-item-title">{event.title}</span>
								{#if event.startDate}
									<span class="kb-rsidebar-item-date"
										>{formatDisplayDate(
											event.startDate,
											{
												month: 'short',
												day: 'numeric'
											},
											''
										)}</span
									>
								{/if}
							</a>
						</li>
					{/each}
				</ul>
				{#if weekRemaining > 0}
					<p class="kb-rsidebar-more">+{weekRemaining} more this week</p>
				{/if}
			</div>
		{/if}
	{:else if eventView === 'calendar'}
		{#if sidebarCalendarInView.length > 0}
			{@const calVisible = sidebarCalendarInView.slice(0, 8)}
			{@const calRemaining = sidebarCalendarInView.length - calVisible.length}
			<div class="kb-rsidebar-panel">
				<div class="kb-rsidebar-header">
					<h2 class="kb-rsidebar-title">In View</h2>
					<span class="kb-rsidebar-count">{sidebarCalendarInView.length}</span>
				</div>
				<ul class="kb-rsidebar-list">
					{#each calVisible as event}
						<li>
							<a href="/events/{event.slug}" class="kb-rsidebar-item">
								<span class="kb-rsidebar-item-title">{event.title}</span>
								{#if event.startDate}
									<span class="kb-rsidebar-item-date"
										>{formatDisplayDate(
											event.startDate,
											{
												month: 'short',
												day: 'numeric'
											},
											''
										)}</span
									>
								{/if}
							</a>
						</li>
					{/each}
				</ul>
				{#if calRemaining > 0}
					<p class="kb-rsidebar-more">+{calRemaining} more in view</p>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<style>
	.kb-right-sidebar {
		padding: 16px 14px;
	}
	.kb-rsidebar-panel {
		margin-bottom: 20px;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 12px 12px 10px;
	}
	.kb-rsidebar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin-bottom: 8px;
		padding-bottom: 8px;
		border-bottom: 1px solid var(--border);
	}
	.kb-rsidebar-title {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted-foreground);
		margin: 0;
	}
	.kb-rsidebar-count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 22px;
		height: 18px;
		padding: 0 6px;
		border-radius: 4px;
		background: var(--muted);
		color: var(--muted-foreground);
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.04em;
	}
	.kb-rsidebar-close {
		font-size: 18px;
		border: none;
		background: transparent;
		cursor: pointer;
		color: var(--muted-foreground);
		line-height: 1;
	}
	.kb-rsidebar-body {
		padding: 12px;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 8px;
	}
	.kb-rsidebar-cta {
		font-size: 13px;
		font-weight: 600;
		color: var(--primary);
		text-decoration: none;
	}
	.kb-rsidebar-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}
	.kb-rsidebar-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 7px 8px;
		border-radius: 5px;
		text-decoration: none;
		color: var(--foreground);
		gap: 8px;
		transition:
			background-color 0.12s ease,
			color 0.12s ease;
	}
	.kb-rsidebar-item:hover,
	.kb-rsidebar-item:focus-visible {
		background: color-mix(in srgb, var(--foreground) 6%, transparent);
		color: var(--foreground);
		text-decoration: none;
	}
	.kb-rsidebar-item:hover .kb-rsidebar-item-title,
	.kb-rsidebar-item:hover .kb-rsidebar-item-date {
		text-decoration: none;
	}
	.kb-rsidebar-item-title {
		font-size: 13px;
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.kb-rsidebar-item-date {
		font-size: 11px;
		color: var(--muted-foreground);
		flex-shrink: 0;
	}
	.kb-rsidebar-more {
		margin: 8px 0 0;
		padding-top: 8px;
		border-top: 1px dashed var(--border);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.02em;
		color: var(--muted-foreground);
		text-align: center;
	}
</style>
