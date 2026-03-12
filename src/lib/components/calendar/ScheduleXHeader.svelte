<script lang="ts">
	import { getContext } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import CalendarDaysIcon from '@lucide/svelte/icons/calendar-days';
	import CalendarRangeIcon from '@lucide/svelte/icons/calendar-range';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import { Calendar } from '$lib/components/ui/calendar/index.js';
	import { onMount } from 'svelte';
	import { CalendarDate } from '@internationalized/date';

	type UrlSync = { updateUrl: (mode: string, dateStr: string) => void };

	/** Schedule-X app singleton passed by the calendar (signals + methods). */
	interface SxApp {
		calendarState: {
			view: { value: string };
			range: { value: { start: Temporal.ZonedDateTime; end: Temporal.ZonedDateTime } | null };
			setView: (view: string, date: Temporal.PlainDate) => void;
			setRange: (date: Temporal.PlainDate) => void;
		};
		datePickerState: {
			selectedDate: { value: Temporal.PlainDate };
		};
	}

	/** Schedule-X passes { $app }; Svelte reserves $ so we read from props object */
	const scheduleXProps = $props() as Record<string, unknown>;
	const app = $derived((scheduleXProps['$app'] as SxApp | undefined) ?? undefined);
	const urlSync = getContext<UrlSync>('kb-calendar-url-sync');

	const VIEW_OPTIONS = [
		{ id: 'month-grid', icon: CalendarDaysIcon, label: 'Month' },
		{ id: 'week', icon: CalendarRangeIcon, label: 'Week' },
		{ id: 'day', icon: CalendarIcon, label: 'Day' }
	] as const;

	// Local state; synced from app on mount, then updated by our button handlers
	let displayDate = $state(Temporal.PlainDate.from(new Date().toISOString().slice(0, 10)));
	let currentView = $state('month-grid');
	let datePickerOpen = $state(false);
	onMount(() => {
		const a = scheduleXProps['$app'] as SxApp | undefined;
		if (a?.datePickerState?.selectedDate?.value) displayDate = a.datePickerState.selectedDate.value;
		if (a?.calendarState?.view?.value) currentView = a.calendarState.view.value;
	});

	function viewToMode(viewId: string): string {
		return viewId === 'month-grid' ? 'month' : viewId === 'week' ? 'week' : 'day';
	}
	function toDateStr(d: Temporal.PlainDate): string {
		return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
	}
	function syncUrl() {
		urlSync?.updateUrl(viewToMode(currentView), toDateStr(displayDate));
	}

	/** Apply navigation: set both range (via setView) and selectedDate. Week view builds the grid from selectedDate. */
	function applyDate(next: Temporal.PlainDate) {
		if (!app) return;
		app.datePickerState.selectedDate.value = next;
		app.calendarState.setView(currentView, next);
		displayDate = next;
		syncUrl();
	}

	function goPrev() {
		if (!app) return;
		const d = displayDate;
		let next: Temporal.PlainDate;
		if (currentView === 'month-grid') {
			next = d.month === 1 ? Temporal.PlainDate.from({ year: d.year - 1, month: 12, day: 1 }) : Temporal.PlainDate.from({ year: d.year, month: d.month - 1, day: 1 });
		} else if (currentView === 'week') {
			next = d.subtract({ days: 7 });
		} else {
			next = d.subtract({ days: 1 });
		}
		applyDate(next);
	}

	function goNext() {
		if (!app) return;
		const d = displayDate;
		let next: Temporal.PlainDate;
		if (currentView === 'month-grid') {
			next = d.month === 12 ? Temporal.PlainDate.from({ year: d.year + 1, month: 1, day: 1 }) : Temporal.PlainDate.from({ year: d.year, month: d.month + 1, day: 1 });
		} else if (currentView === 'week') {
			next = d.add({ days: 7 });
		} else {
			next = d.add({ days: 1 });
		}
		applyDate(next);
	}

	function goToday() {
		if (!app) return;
		const today = Temporal.PlainDate.from(new Date().toISOString().slice(0, 10));
		applyDate(today);
	}

	function setView(viewId: string) {
		if (!app) return;
		app.calendarState.setView(viewId, displayDate);
		currentView = viewId;
		syncUrl();
	}

	function onDateSelect(value: CalendarDate | undefined) {
		if (!value || !app) return;
		const plain = Temporal.PlainDate.from({ year: value.year, month: value.month, day: value.day });
		app.datePickerState.selectedDate.value = plain;
		app.calendarState.setView(currentView, plain);
		displayDate = plain;
		datePickerOpen = false;
		syncUrl();
	}

	/** Week view title: use calendar's actual range when available so title matches grid. Format: "Week 12 · March 15–21, 2026" */
	function formatWeekTitle(weekStart: Temporal.PlainDate, weekEnd: Temporal.PlainDate): string {
		const thursday = weekStart.add({ days: 4 });
		const jan1 = Temporal.PlainDate.from({ year: thursday.year, month: 1, day: 1 });
		const ordinal = jan1.until(thursday, { largestUnit: 'day' }).days + 1;
		const weekNum = Math.floor((ordinal + 6) / 7);
		const monthName = weekStart.toLocaleString('en-US', { month: 'long' });
		const year = weekStart.year;
		if (weekStart.month === weekEnd.month) {
			return `Week ${weekNum} · ${monthName} ${weekStart.day}–${weekEnd.day}, ${year}`;
		}
		const endMonth = weekEnd.toLocaleString('en-US', { month: 'long' });
		return `Week ${weekNum} · ${monthName} ${weekStart.day} – ${endMonth} ${weekEnd.day}, ${year}`;
	}

	const titleLabel = $derived.by(() => {
		if (currentView === 'month-grid') {
			return new Date(displayDate.year, displayDate.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
		}
		if (currentView === 'week') {
			const range = app?.calendarState?.range?.value;
			if (range?.start != null && range?.end != null) {
				const startPlain = range.start.toPlainDate();
				const endPlain = range.end.toPlainDate();
				return formatWeekTitle(startPlain, endPlain);
			}
			// Fallback: compute from displayDate (Sunday–Saturday, firstDayOfWeek 7)
			const daysToSunday = displayDate.dayOfWeek === 7 ? 0 : displayDate.dayOfWeek;
			const weekStart = displayDate.subtract({ days: daysToSunday });
			const weekEnd = weekStart.add({ days: 6 });
			return formatWeekTitle(weekStart, weekEnd);
		}
		return displayDate.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
	});

	const calendarDateValue = $derived(new CalendarDate(displayDate.year, displayDate.month, displayDate.day));
</script>

<div class="kb-sx-header">
	<div class="kb-sx-header__row kb-sx-header__row--left">
		<div class="kb-sx-header__nav">
			<Button variant="outline" size="icon-sm" onclick={goPrev} aria-label="Previous">
				<ChevronLeftIcon class="size-4" />
			</Button>
			<Button variant="outline" size="icon-sm" onclick={goNext} aria-label="Next">
				<ChevronRightIcon class="size-4" />
			</Button>
		</div>
		<h2 class="kb-sx-header__title">{titleLabel}</h2>
	</div>
	<div class="kb-sx-header__row kb-sx-header__row--right">
		<Popover.Root bind:open={datePickerOpen}>
			<Popover.Trigger>
				<Button variant="outline" size="sm" class="kb-sx-header__date-btn">
					<CalendarIcon class="size-4" aria-hidden="true" />
					{displayDate.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
				</Button>
			</Popover.Trigger>
			<Popover.Content class="w-auto p-0" align="end">
				<Calendar
					type="single"
					value={calendarDateValue}
					onValueChange={(v) => onDateSelect(v as CalendarDate | undefined)}
					initialFocus
				/>
			</Popover.Content>
		</Popover.Root>

		<Button variant="outline" size="sm" onclick={goToday} class="kb-sx-header__btn">Today</Button>

		<Tabs.Root bind:value={currentView} onValueChange={(v) => v && setView(v)} class="kb-sx-header__tabs">
			<Tabs.List class="kb-sx-header__tabs-list">
				{#each VIEW_OPTIONS as v}
					{@const Icon = v.icon}
					<Tabs.Trigger value={v.id} class="kb-sx-header__tab" aria-label={v.label} title={v.label}>
						<Icon class="kb-sx-header__tab-icon" aria-hidden="true" />
					</Tabs.Trigger>
				{/each}
			</Tabs.List>
		</Tabs.Root>
	</div>
</div>
