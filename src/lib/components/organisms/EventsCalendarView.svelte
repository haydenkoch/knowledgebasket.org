<script lang="ts">
	import { ScheduleXCalendar } from '@schedule-x/svelte';
	import ScheduleXHeader from '$lib/components/calendar/ScheduleXHeader.svelte';
	import EventCard from '$lib/components/molecules/EventCard.svelte';
	import EventsCalendarSkeleton from '$lib/components/organisms/EventsCalendarSkeleton.svelte';
	import * as Drawer from '$lib/components/ui/drawer/index.js';
	import type { CalendarApp } from '@schedule-x/calendar';
	import type { EventItem } from '$lib/data/kb';

	type Props = {
		scheduleXApp: CalendarApp | null;
		calendarSelectedEvent: EventItem | null;
		eventDetailsOpen?: boolean;
		isMobile: { current: boolean };
	};

	let { scheduleXApp, calendarSelectedEvent, eventDetailsOpen = $bindable(false), isMobile }: Props = $props();
</script>

<div class="kb-ecal-wrap kb-ecal-wrap--schedulex">
	<div class="kb-schedulex-wrapper">
		{#if scheduleXApp}
			<ScheduleXCalendar calendarApp={scheduleXApp} headerContent={ScheduleXHeader} />
		{:else}
			<EventsCalendarSkeleton />
		{/if}
	</div>

	{#if calendarSelectedEvent && isMobile.current}
		<Drawer.Root bind:open={eventDetailsOpen}>
			<Drawer.Portal>
				<Drawer.Overlay class="kb-event-drawer__overlay" />
				<Drawer.Content class="kb-event-drawer" aria-modal="true">
					<Drawer.Header class="kb-event-drawer__header">
						<Drawer.Title class="kb-event-drawer__title">
							{calendarSelectedEvent.title}
						</Drawer.Title>
					</Drawer.Header>
					<div class="kb-event-drawer__body">
						<EventCard event={calendarSelectedEvent} index={0} />
					</div>
				</Drawer.Content>
			</Drawer.Portal>
		</Drawer.Root>
	{/if}
</div>

<style>
	.kb-ecal-wrap {
		position: relative;
		min-height: 400px;
	}
	.kb-schedulex-wrapper {
		width: 100%;
		min-height: 400px;
	}
	.kb-event-drawer__header {
		padding-bottom: 0.5rem;
	}
	.kb-event-drawer__title {
		font-size: 1.125rem;
		font-weight: 600;
	}
	.kb-event-drawer__body {
		padding: 0 0 1.5rem;
	}
</style>
