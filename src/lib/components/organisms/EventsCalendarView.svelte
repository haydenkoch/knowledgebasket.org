<script lang="ts">
	import type { CalendarApp } from '@schedule-x/calendar';
	import type { EventItem } from '$lib/data/kb';
	import { ScheduleXCalendar } from '@schedule-x/svelte';
	import { formatDisplayDate } from '$lib/utils/display';
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
						{formatDisplayDate(
							calendarSelectedEvent.startDate,
							{
								weekday: 'long',
								month: 'long',
								day: 'numeric'
							},
							''
						)}
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

		/* Map Schedule-X (Material) tokens onto KB brand palette so the
		   calendar inherits the same Lakebed/Alpine Snow/Obsidian look as
		   the rest of the site. Variables cascade into the Schedule-X tree. */
		--sx-color-primary: var(--color-lakebed-700);
		--sx-color-on-primary: var(--color-alpine-snow-50);
		--sx-color-primary-container: var(--color-lakebed-100);
		--sx-color-on-primary-container: var(--color-lakebed-950);
		--sx-color-secondary: var(--color-pinyon-700);
		--sx-color-on-secondary: var(--color-alpine-snow-50);
		--sx-color-secondary-container: var(--color-pinyon-100);
		--sx-color-on-secondary-container: var(--color-pinyon-950);
		--sx-color-tertiary: var(--color-flicker-800);
		--sx-color-on-tertiary: var(--color-alpine-snow-50);
		--sx-color-tertiary-container: var(--color-flicker-100);
		--sx-color-on-tertiary-container: var(--color-flicker-950);

		--sx-color-surface: var(--color-alpine-snow-50);
		--sx-color-surface-dim: var(--color-alpine-snow-200);
		--sx-color-surface-bright: var(--color-alpine-snow-50);
		--sx-color-on-surface: var(--color-obsidian-950);
		--sx-color-surface-container: var(--color-alpine-snow-100);
		--sx-color-surface-container-low: var(--color-alpine-snow-50);
		--sx-color-surface-container-high: var(--color-alpine-snow-200);
		--sx-color-background: var(--color-alpine-snow-50);
		--sx-color-on-background: var(--color-obsidian-950);

		--sx-color-outline: var(--color-granite-400);
		--sx-color-outline-variant: var(--color-granite-200);
		--sx-color-neutral: var(--color-obsidian-700);
		--sx-color-neutral-variant: var(--color-granite-500);
		--sx-color-surface-tint: var(--color-lakebed-700);

		--sx-internal-color-text: var(--color-obsidian-950);
		--sx-internal-color-light-gray: var(--color-alpine-snow-100);
		--sx-internal-color-gray-ripple-background: var(--color-alpine-snow-200);

		--sx-border: 1px solid var(--color-granite-200);
		--sx-color-popup-border: var(--color-granite-200);

		/* Match shadcn radius scale (--radius is 6px in theme.css) */
		--sx-rounding-extra-small: 6px;
		--sx-rounding-small: 8px;
		--sx-rounding-extra-large: 12px;
		--sx-event-border-radius: 6px;

		font-family: var(--font-sans);
		color: var(--color-obsidian-950);
	}

	/* Fonts and weights: shadcn-svelte uses semibold headings + regular body.
	   Schedule-X defaults pump some areas too bold; tame them. */
	.kb-calendar-view :global(.sx__range-heading),
	.kb-calendar-view :global(.sx__calendar-header__week-number) {
		font-family: var(--font-sans);
		font-weight: 600;
		letter-spacing: -0.01em;
	}
	.kb-calendar-view :global(.sx__week-grid__day-name),
	.kb-calendar-view :global(.sx__week-grid__date-number),
	.kb-calendar-view :global(.sx__month-grid-day__header-day-name) {
		font-family: var(--font-sans);
		font-weight: 500;
		color: var(--color-obsidian-700);
	}

	/* Event chips: clearer hover/affordance and tighter typography */
	.kb-calendar-view :global(.sx__month-grid-event),
	.kb-calendar-view :global(.sx__time-grid-event),
	.kb-calendar-view :global(.sx__date-grid-event),
	.kb-calendar-view :global(.sx__month-agenda-event) {
		cursor: pointer;
		font-family: var(--font-sans);
		font-size: 0.75rem;
		font-weight: 500;
		transition:
			background-color 120ms ease,
			box-shadow 120ms ease,
			transform 120ms ease;
	}
	.kb-calendar-view :global(.sx__month-grid-event:hover),
	.kb-calendar-view :global(.sx__time-grid-event:hover),
	.kb-calendar-view :global(.sx__date-grid-event:hover),
	.kb-calendar-view :global(.sx__month-agenda-event:hover) {
		box-shadow: var(--sh);
	}

	/* "Today" highlight: use lakebed tint instead of default purple */
	.kb-calendar-view :global(.sx__date-picker__day--today) {
		background-color: var(--color-lakebed-100);
		color: var(--color-lakebed-950);
	}

	/* Dark mode: when .dark is on a parent (site theme) OR Schedule-X
	   itself flips to .is-dark, swap the palette tokens. */
	:global(.dark) .kb-calendar-view,
	.kb-calendar-view :global(.is-dark) {
		--sx-color-primary: var(--color-lakebed-300);
		--sx-color-on-primary: var(--color-lakebed-950);
		--sx-color-primary-container: var(--color-lakebed-800);
		--sx-color-on-primary-container: var(--color-lakebed-100);
		--sx-color-secondary: var(--color-pinyon-300);
		--sx-color-on-secondary: var(--color-pinyon-950);
		--sx-color-secondary-container: var(--color-pinyon-800);
		--sx-color-on-secondary-container: var(--color-pinyon-100);
		--sx-color-tertiary: var(--color-flicker-300);
		--sx-color-on-tertiary: var(--color-flicker-950);
		--sx-color-tertiary-container: var(--color-flicker-800);
		--sx-color-on-tertiary-container: var(--color-flicker-100);

		--sx-color-surface: var(--color-obsidian-950);
		--sx-color-surface-dim: var(--color-obsidian-950);
		--sx-color-surface-bright: var(--color-obsidian-800);
		--sx-color-on-surface: var(--color-alpine-snow-100);
		--sx-color-surface-container: var(--color-obsidian-900);
		--sx-color-surface-container-low: var(--color-obsidian-950);
		--sx-color-surface-container-high: var(--color-obsidian-800);
		--sx-color-background: var(--color-lakebed-950);
		--sx-color-on-background: var(--color-alpine-snow-100);

		--sx-color-outline: var(--color-granite-600);
		--sx-color-outline-variant: var(--color-granite-800);
		--sx-color-neutral: var(--color-granite-300);
		--sx-color-neutral-variant: var(--color-granite-500);
		--sx-color-surface-tint: var(--color-lakebed-300);

		--sx-internal-color-text: var(--color-alpine-snow-100);
		--sx-internal-color-light-gray: var(--color-obsidian-900);
		--sx-internal-color-gray-ripple-background: var(--color-obsidian-800);

		--sx-border: 1px solid var(--color-granite-800);
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
