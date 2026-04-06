<script lang="ts">
	import type { CalendarApp } from '@schedule-x/calendar';
	import type { EventItem } from '$lib/data/kb';
	import { ScheduleXCalendar } from '@schedule-x/svelte';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import MapPin from '@lucide/svelte/icons/map-pin';

	interface Props {
		scheduleXApp: CalendarApp | null;
		calendarSelectedEvent: EventItem | null | undefined;
		eventDetailsOpen: boolean;
		isMobile: { current: boolean } | boolean;
	}

	let {
		scheduleXApp,
		calendarSelectedEvent,
		eventDetailsOpen = $bindable(false),
		isMobile
	}: Props = $props();

	const isMobileVal = $derived(typeof isMobile === 'boolean' ? isMobile : isMobile.current);
</script>

<div class="kb-calendar-view">
	{#if scheduleXApp}
		<ScheduleXCalendar calendarApp={scheduleXApp} />
	{:else}
		<div class="kb-calendar-loading" role="status" aria-live="polite">
			<div class="kb-calendar-spinner"></div>
			<p>Loading calendar…</p>
		</div>
	{/if}

	{#if calendarSelectedEvent && eventDetailsOpen && isMobileVal}
		<div class="kb-event-mobile-drawer" role="dialog" aria-label="Event details" aria-modal="true">
			<div class="kb-event-mobile-drawer-content">
				<button
					type="button"
					class="kb-drawer-close"
					onclick={() => (eventDetailsOpen = false)}
					aria-label="Close">×</button
				>
				<h2 class="kb-drawer-title">{calendarSelectedEvent.title}</h2>
				{#if calendarSelectedEvent.startDate}
					<p class="kb-drawer-date">
						{new Date(calendarSelectedEvent.startDate).toLocaleDateString('en-US', {
							weekday: 'long',
							month: 'long',
							day: 'numeric'
						})}
					</p>
				{/if}
				{#if calendarSelectedEvent.location}
					<p class="kb-drawer-loc">
						<MapPin class="inline h-3.5 w-3.5" />
						{calendarSelectedEvent.location}
					</p>
				{/if}
				{#if calendarSelectedEvent.slug}
					<a href="/events/{calendarSelectedEvent.slug}" class="kb-drawer-link"
						>View event <ArrowRight class="inline h-4 w-4" /></a
					>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.kb-calendar-view {
		width: 100%;
		min-height: 400px;
	}
	.kb-calendar-loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 60px 20px;
		color: var(--muted-foreground);
		font-size: 14px;
	}
	.kb-calendar-spinner {
		width: 28px;
		height: 28px;
		border: 3px solid var(--border);
		border-top-color: var(--primary);
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	.kb-event-mobile-drawer {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 900;
		background: var(--background);
		border-top: 1px solid var(--border);
		border-radius: 12px 12px 0 0;
		box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
	}
	.kb-event-mobile-drawer-content {
		padding: 20px;
		max-height: 60vh;
		overflow-y: auto;
	}
	.kb-drawer-close {
		position: absolute;
		top: 12px;
		right: 16px;
		font-size: 20px;
		border: none;
		background: transparent;
		cursor: pointer;
		color: var(--muted-foreground);
	}
	.kb-drawer-title {
		font-size: 18px;
		font-weight: 600;
		margin: 0 0 8px;
		padding-right: 32px;
	}
	.kb-drawer-date,
	.kb-drawer-loc {
		font-size: 14px;
		color: var(--muted-foreground);
		margin: 4px 0;
	}
	.kb-drawer-link {
		display: inline-block;
		margin-top: 12px;
		font-size: 14px;
		font-weight: 600;
		color: var(--primary);
		text-decoration: none;
	}
</style>
