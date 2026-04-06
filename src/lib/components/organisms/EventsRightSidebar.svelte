<script lang="ts">
	import type { EventItem } from '$lib/data/kb';
	import EventCard from '$lib/components/molecules/EventCard.svelte';
	import { formatDisplayDate } from '$lib/utils/display';
	import { formatEventTime } from '$lib/utils/format';
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
						{#if calendarSelectedEvent.startDate}
							· {formatEventTime(calendarSelectedEvent.startDate)}
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
			<div class="kb-rsidebar-panel">
				<div class="kb-rsidebar-header">
					<h2 class="kb-rsidebar-title">This Week</h2>
				</div>
				<ul class="kb-rsidebar-list">
					{#each sidebarWeekUpcoming as event}
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
			</div>
		{/if}
	{:else if eventView === 'calendar'}
		{#if sidebarCalendarInView.length > 0}
			<div class="kb-rsidebar-panel">
				<div class="kb-rsidebar-header">
					<h2 class="kb-rsidebar-title">In View</h2>
				</div>
				<ul class="kb-rsidebar-list">
					{#each sidebarCalendarInView.slice(0, 6) as event}
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
	}
	.kb-rsidebar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 10px;
	}
	.kb-rsidebar-title {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted-foreground);
		margin: 0;
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
		padding: 6px 8px;
		border-radius: 5px;
		text-decoration: none;
		color: var(--foreground);
		gap: 8px;
	}
	.kb-rsidebar-item:hover {
		background: var(--accent);
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
</style>
