<script lang="ts">
	import { Calendar } from '$lib/components/ui/calendar/index.js';
	import EventCard from '$lib/components/molecules/EventCard.svelte';
	import CaliforniaMap from '$lib/components/organisms/CaliforniaMap.svelte';
	import { formatEventDateShort } from '$lib/utils/format';
	import type { EventItem } from '$lib/data/kb';
	import type { CalendarDate } from '@internationalized/date';

	type EventView = 'cards' | 'list' | 'calendar';

	type Props = {
		calendarSelectedEvent: EventItem | null;
		eventView: EventView;
		sidebarFeatured: EventItem[];
		sidebarCalendarValue: CalendarDate;
		sidebarWeekUpcoming: EventItem[];
		sidebarCalendarInView: EventItem[];
		mapboxToken?: string | null;
		onClose: () => void;
	};

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

<aside class="kb-sidebar kb-refine-sidebar kb-event-sidebar" aria-label="Event details and featured events">
	{#if calendarSelectedEvent}
		<button
			type="button"
			class="kb-event-sidebar__close"
			onclick={onClose}
			aria-label="Close event details"
		>
			Close
		</button>
	{/if}

	{#if calendarSelectedEvent}
		<div class="kb-event-sidebar__cards kb-event-sidebar__cards--vertical">
			<EventCard event={calendarSelectedEvent} index={0} class="kb-event-sidebar__card" />
		</div>
	{:else}
		{#if eventView === 'cards'}
			<p class="kb-date-graph__label">Featured events</p>
			{#if sidebarFeatured.length > 0}
				<ul class="kb-event-sidebar__list">
					{#each sidebarFeatured as ev (ev.id)}
						<li>
							<a href="/events/{ev.slug ?? ev.id}" class="kb-event-sidebar__list-item">
								<span class="kb-event-sidebar__list-title">{ev.title}</span>
								<span class="kb-event-sidebar__list-date">{formatEventDateShort(ev.startDate, ev.endDate)}</span>
							</a>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="kb-event-sidebar__empty">No events in this range.</p>
			{/if}
		{:else if eventView === 'list'}
			<p class="kb-date-graph__label">This week</p>
			<Calendar
				type="single"
				value={sidebarCalendarValue}
				class="kb-event-sidebar__calendar rounded-md border shadow-sm"
				numberOfMonths={1}
			/>
			{#if sidebarWeekUpcoming.length > 0}
				<div class="kb-event-sidebar__cards kb-event-sidebar__cards--vertical">
					{#each sidebarWeekUpcoming as ev, i (ev.slug ?? ev.id)}
						<EventCard event={ev} index={i} class="kb-event-sidebar__card" />
					{/each}
				</div>
			{:else}
				<p class="kb-event-sidebar__empty">No events in this range.</p>
			{/if}
			<div class="kb-event-sidebar__map">
				<CaliforniaMap token={mapboxToken ?? undefined} />
			</div>
		{:else}
			<p class="kb-date-graph__label">This calendar</p>
			<Calendar
				type="single"
				value={sidebarCalendarValue}
				class="kb-event-sidebar__calendar rounded-md border shadow-sm"
				numberOfMonths={1}
			/>
			{#if sidebarCalendarInView.length > 0}
				<div class="kb-event-sidebar__cards kb-event-sidebar__cards--vertical">
					{#each sidebarCalendarInView as ev, i (ev.slug ?? ev.id)}
						<EventCard event={ev} index={i} class="kb-event-sidebar__card" />
					{/each}
				</div>
			{:else}
				<p class="kb-event-sidebar__empty">No events in this range.</p>
			{/if}
		{/if}
	{/if}
</aside>
