<script lang="ts">
	import 'temporal-polyfill/global';
	import SeoHead from '$lib/components/SeoHead.svelte';
	import KbHero from '$lib/components/organisms/KbHero.svelte';
	import {
		Pagination,
		PaginationContent,
		PaginationItem,
		PaginationLink,
		PaginationPrevious,
		PaginationNext,
		PaginationEllipsis
	} from '$lib/components/ui/pagination/index.js';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { setContext } from 'svelte';
	import type { EventItem } from '$lib/data/kb';
	import type { CalendarApp } from '@schedule-x/calendar';
	import EventCard from '$lib/components/molecules/EventCard.svelte';
	import EventListItem from '$lib/components/molecules/EventListItem.svelte';
	import EventsViewSelector from '$lib/components/molecules/EventsViewSelector.svelte';
	import EventsToolbar from '$lib/components/molecules/EventsToolbar.svelte';
	import CoilTheme from '$lib/components/organisms/CoilTheme.svelte';
	import KbSubmitBanner from '$lib/components/organisms/KbSubmitBanner.svelte';
	import MobilePeekPanel from '$lib/components/organisms/MobilePeekPanel.svelte';
	import EventsSidebar from '$lib/components/organisms/EventsSidebar.svelte';
	import EventsCalendarView from '$lib/components/organisms/EventsCalendarView.svelte';
	import EventsRightSidebar from '$lib/components/organisms/EventsRightSidebar.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert/index.js';
	import { formatDisplayDate } from '$lib/utils/display';
	import { tsToCalendarDate } from '$lib/utils/date.js';
	import {
		matchSearch,
		parseEventStart,
		formatEventTime,
		eventCalendarParts,
		eventCalendarDaysSpanned,
		isMultiDayEvent
	} from '$lib/utils/format';
	import { eventTypeTags } from '$lib/data/formSchema';
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import { useEventsFilters } from '$lib/hooks/use-events-filters.svelte';
	import { eventToSx } from '$lib/calendar/event-to-sx.js';
	import { buildOgImagePath } from '$lib/seo/metadata';

	type EventView = 'cards' | 'list' | 'calendar';
	const MOBILE_FILTER_PEEK_HEIGHT = 70;

	let { data } = $props();
	const origin = $derived((data.seoOrigin ?? data.origin ?? '') as string);
	const filters = useEventsFilters(() => data);

	let pageBinding = $state(1);
	$effect(() => {
		pageBinding = filters.currentPage;
	});
	$effect(() => {
		if (pageBinding !== filters.currentPage) filters.pageBinding = pageBinding;
	});

	const events = $derived((data.events ?? []) as EventItem[]);
	const total = $derived(events.length);
	const sierraCount = $derived(events.filter((e) => e.region === 'Sierra Nevada').length);
	type CalendarViewMode = 'week' | 'month' | 'quarter';

	let eventView = $state<EventView>('list');
	let mobileFiltersExpanded = $state(false);
	let calendarYear = $state(0);
	let calendarMonth = $state(0);
	let selectedDay = $state<number | null>(null);
	let calendarViewMode = $state<CalendarViewMode>('month');
	let condenseLongEvents = $state(false);

	/** Currently selected event from the calendar (for inline sidebar / mobile drawer). */
	let calendarSelectedId = $state<string | null>(null);
	let eventDetailsOpen = $state(false);
	const isMobile = new IsMobile();
	const publicSidebar = useSidebar();
	/** Right sidebar: show at 960px+ to match CoilLayout three-column breakpoint (not 768px). */
	const isDesktopLayout = new IsMobile(960);

	/** Schedule-X calendar app (created when calendar view is active). Lazy-loaded with calendar bundle. */
	let scheduleXApp = $state<CalendarApp | null>(null);
	let calendarLoadStarted = false;

	/** Restore view and calendar state from URL (load + replaceState). */
	$effect(() => {
		const d = data as {
			initialView?: 'cards' | 'list' | 'calendar';
			initialCalendarMode?: string;
			initialCalendarYear?: number | null;
			initialCalendarMonth?: number | null;
			initialCalendarDay?: number | null;
			todayYear: number;
			todayMonth: number;
		};
		if (d.initialView === 'cards' || d.initialView === 'list' || d.initialView === 'calendar')
			eventView = d.initialView;
		if (
			d.initialCalendarMode === 'week' ||
			d.initialCalendarMode === 'month' ||
			d.initialCalendarMode === 'quarter'
		)
			calendarViewMode = d.initialCalendarMode as CalendarViewMode;
		calendarYear = d.initialCalendarYear ?? d.todayYear;
		calendarMonth = d.initialCalendarMonth ?? d.todayMonth;
		if (d.initialCalendarDay != null) selectedDay = d.initialCalendarDay;
	});

	/** Sync URL when user changes main view (Cards / List / Calendar). Defer so tab switch paints first. */
	$effect(() => {
		const v = eventView;
		const url = new URL($page.url);
		const current = url.searchParams.get('view');
		if (current === v) return;
		url.searchParams.set('view', v);
		if (v !== 'calendar') {
			url.searchParams.delete('mode');
			url.searchParams.delete('date');
		} else {
			// Default calendar to monthly overview when switching to calendar tab
			if (!url.searchParams.has('mode')) url.searchParams.set('mode', 'month');
		}
		const pathSearch = `${url.pathname}${url.search}`;
		queueMicrotask(() => goto(url, { replaceState: true, noScroll: true }));
	});

	/** Create Schedule-X calendar when user switches to calendar view (lazy-loads calendar bundle). */
	$effect(() => {
		if (eventView !== 'calendar') return;
		if (scheduleXApp) return;
		if (calendarLoadStarted) return;
		calendarLoadStarted = true;
		const d = data as {
			initialCalendarYear?: number | null;
			initialCalendarMonth?: number | null;
			initialCalendarDay?: number | null;
		};
		// Use current client state so default is monthly overview when opening calendar tab
		const mode = calendarViewMode;
		import('$lib/calendar/calendar-loader.js').then((mod) => {
			mod
				.createScheduleXAppFromEvents(filters.filtered, {
					initialCalendarMode: mode,
					initialCalendarYear: d.initialCalendarYear ?? undefined,
					initialCalendarMonth: d.initialCalendarMonth ?? undefined,
					initialCalendarDay: d.initialCalendarDay ?? undefined,
					onEventClick(id) {
						const match = filters.filtered.find((e) => e.id === id);
						if (!match) {
							goto(new URL(`/events/${id}`, $page.url.origin));
							return;
						}
						calendarSelectedId = id;
						eventDetailsOpen = true;
					}
				})
				.then((app) => {
					scheduleXApp = app;
				});
		});
	});

	/** Provide URL-sync callback for calendar header (view + date in query). */
	$effect(() => {
		if (eventView !== 'calendar') return;
		setContext('kb-calendar-url-sync', {
			updateUrl(mode: string, dateStr: string) {
				const url = new URL($page.url);
				url.searchParams.set('view', 'calendar');
				url.searchParams.set('mode', mode);
				url.searchParams.set('date', dateStr);
				// Keep scroll position when toggling calendar modes/dates to avoid jarring jumps.
				goto(url, { replaceState: true, noScroll: true });
			}
		});
	});

	/** When leaving calendar view: clear selection and destroy calendar app so it recreates fresh when returning. */
	$effect(() => {
		if (eventView !== 'calendar') {
			calendarSelectedId = null;
			eventDetailsOpen = false;
			scheduleXApp = null;
			calendarLoadStarted = false;
		}
	});

	/** If mobile drawer is closed via swipe/close, clear the selected event. */
	$effect(() => {
		if (isMobile.current && !eventDetailsOpen) {
			calendarSelectedId = null;
		}
	});

	/** Sync filtered events into Schedule-X when calendar is visible. */
	$effect(() => {
		if (!scheduleXApp || eventView !== 'calendar') return;
		const service = (scheduleXApp as { eventsService?: { set: (events: unknown[]) => void } })
			.eventsService;
		if (!service) return;
		const sxEvents = filters.filtered
			.map(eventToSx)
			.filter((e): e is NonNullable<typeof e> => e != null);
		service.set(sxEvents);
	});

	const calendarSelectedEvent = $derived(
		calendarSelectedId
			? (filters.filtered.find((e) => (e.slug ?? e.id) === calendarSelectedId) ?? null)
			: null
	);

	/** Sidebar feeds */
	const sidebarFeatured = $derived(filters.filtered.slice(0, 3));
	const sidebarWeekUpcoming = $derived(
		(() => {
			const nowTs = filters.todayStart;
			const weekEnd = nowTs + 7 * 24 * 60 * 60 * 1000;
			return filters.filtered
				.filter((e) => {
					const t = parseEventStart(e.startDate);
					return t != null && t >= nowTs && t <= weekEnd;
				})
				.slice(0, 5);
		})()
	);
	const sidebarCalendarInView = $derived(filters.filtered.slice(0, 8));

	const sidebarCalendarValue = $derived(tsToCalendarDate(filters.rangeStart));

	const daysInMonth = $derived(new Date(calendarYear, calendarMonth + 1, 0).getDate());
	const firstDow = $derived(new Date(calendarYear, calendarMonth, 1).getDay());

	function getEventsByDayForMonth(y: number, m: number): Record<number, EventItem[]> {
		const map: Record<number, EventItem[]> = {};
		for (const e of filters.filtered) {
			const days = eventCalendarDaysSpanned(e.startDate, e.endDate);
			for (const { year, month, day } of days) {
				if (year === y && month === m) {
					if (!map[day]) map[day] = [];
					map[day].push(e);
				}
			}
		}
		return map;
	}
	const eventsByDay = $derived(getEventsByDayForMonth(calendarYear, calendarMonth));

	/** Month weeks: each week row has day numbers (null for empty cells) and spanning event segments. */
	const monthWeeks = $derived.by(() => {
		const weeks: {
			days: (number | null)[];
			segments: { event: EventItem; colStart: number; colSpan: number; row: number }[];
		}[] = [];
		// Build week rows (each row = 7 day slots)
		let dayNum = 1;
		const totalCells = firstDow + daysInMonth;
		const numWeeks = Math.ceil(totalCells / 7);
		for (let w = 0; w < numWeeks; w++) {
			const days: (number | null)[] = [];
			for (let col = 0; col < 7; col++) {
				const cellIdx = w * 7 + col;
				if (cellIdx < firstDow || dayNum > daysInMonth) {
					days.push(null);
				} else {
					days.push(dayNum++);
				}
			}
			weeks.push({ days, segments: [] });
		}
		// Precompute multi-day event metadata for this month (days spanned within this month + weeks touched)
		const multiDayEvents = filters.filtered.filter((e) => isMultiDayEvent(e.startDate, e.endDate));
		type MonthMultiMeta = {
			event: EventItem;
			inMonth: { year: number; month: number; day: number }[];
			weeksTouched: number[];
		};
		const multiMeta: MonthMultiMeta[] = multiDayEvents.map((e) => {
			const spanned = eventCalendarDaysSpanned(e.startDate, e.endDate);
			const inMonth = spanned.filter((s) => s.year === calendarYear && s.month === calendarMonth);
			if (!inMonth.length) {
				return { event: e, inMonth: [], weeksTouched: [] };
			}
			const weeksTouched = Array.from(
				new Set(
					inMonth.map((s) => {
						const cellIdx = firstDow + (s.day - 1);
						return Math.floor(cellIdx / 7);
					})
				)
			).sort((a, b) => a - b);
			return { event: e, inMonth, weeksTouched };
		});

		// Compute multi-day event segments for each week
		for (let w = 0; w < weeks.length; w++) {
			const weekDays = weeks[w].days;
			const weekSegs: { event: EventItem; colStart: number; colSpan: number }[] = [];
			for (const meta of multiMeta) {
				const { event, inMonth, weeksTouched } = meta;
				if (!inMonth.length) continue;
				// Optionally condense very long events (spanning > 7 days) to only first & last week rows
				if (condenseLongEvents && inMonth.length > 7 && weeksTouched.length > 1) {
					const firstWeekIx = weeksTouched[0];
					const lastWeekIx = weeksTouched[weeksTouched.length - 1];
					if (w !== firstWeekIx && w !== lastWeekIx) continue;
				}
				const daysInThisWeek: number[] = [];
				for (let col = 0; col < 7; col++) {
					const d = weekDays[col];
					if (d == null) continue;
					if (inMonth.some((s) => s.day === d)) {
						daysInThisWeek.push(col);
					}
				}
				if (daysInThisWeek.length > 0) {
					const colStart0 = Math.min(...daysInThisWeek);
					const colEnd0 = Math.max(...daysInThisWeek);
					const colSpan = Math.min(colEnd0 - colStart0 + 1, 7);
					weekSegs.push({ event, colStart: colStart0 + 1, colSpan });
				}
			}
			weekSegs.sort((a, b) => a.colStart - b.colStart || b.colSpan - a.colSpan);
			// Assign rows (greedy)
			const rowSlots: number[] = new Array(8).fill(0);
			weeks[w].segments = weekSegs.map((seg) => {
				let row = 0;
				for (let c = seg.colStart; c < seg.colStart + seg.colSpan; c++)
					row = Math.max(row, rowSlots[c] ?? 0);
				for (let c = seg.colStart; c < seg.colStart + seg.colSpan; c++) rowSlots[c] = row + 1;
				return { ...seg, row };
			});
		}
		return weeks;
	});

	/** For week view: events keyed by YYYY-MM-DD. Multi-day events appear on every day (for panel); use singleDayEventsByDateKey for day cells. */
	const eventsByDateKey = $derived.by(() => {
		const map: Record<string, EventItem[]> = {};
		for (const e of filters.filtered) {
			const days = eventCalendarDaysSpanned(e.startDate, e.endDate);
			for (const { year, month, day } of days) {
				const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
				if (!map[key]) map[key] = [];
				map[key].push(e);
			}
		}
		return map;
	});

	/** Same-day events only, keyed by YYYY-MM-DD (for week day cells so multi-day don't repeat). */
	const singleDayEventsByDateKey = $derived.by(() => {
		const map: Record<string, EventItem[]> = {};
		for (const e of filters.filtered) {
			if (isMultiDayEvent(e.startDate, e.endDate)) continue;
			const p = eventCalendarParts(e.startDate);
			if (!p) continue;
			const key = `${p.year}-${String(p.month + 1).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
			if (!map[key]) map[key] = [];
			map[key].push(e);
		}
		return map;
	});

	/** Multi-day events in the current week as spanning segments: { event, colStart (1-7), colSpan, row }. */
	const weekEventSegments = $derived.by(() => {
		const weekStart = weekStartDate.getTime();
		const weekEnd = weekStart + 6 * 24 * 60 * 60 * 1000;
		const segments: { event: EventItem; colStart: number; colSpan: number }[] = [];
		for (const e of filters.filtered) {
			if (!isMultiDayEvent(e.startDate, e.endDate)) continue;
			const startTs = parseEventStart(e.startDate) ?? 0;
			const endTs = parseEventStart(e.endDate) ?? startTs;
			if (endTs < weekStart || startTs > weekEnd) continue;
			const startInWeek = Math.max(startTs, weekStart);
			const endInWeek = Math.min(endTs, weekEnd);
			const startDay = new Date(startInWeek);
			startDay.setHours(0, 0, 0, 0);
			const endDay = new Date(endInWeek);
			endDay.setHours(0, 0, 0, 0);
			const colStart = Math.floor((startInWeek - weekStart) / (24 * 60 * 60 * 1000)) + 1;
			const colEnd = Math.floor((endInWeek - weekStart) / (24 * 60 * 60 * 1000)) + 1;
			const colSpan = colEnd - colStart + 1;
			segments.push({ event: e, colStart, colSpan });
		}
		segments.sort((a, b) => a.colStart - b.colStart || b.colSpan - a.colSpan);
		const rows: number[] = new Array(8).fill(0);
		const withRow = segments.map((seg) => {
			let row = 0;
			for (let c = seg.colStart; c < seg.colStart + seg.colSpan; c++)
				row = Math.max(row, rows[c] ?? 0);
			for (let c = seg.colStart; c < seg.colStart + seg.colSpan; c++) rows[c] = row + 1;
			return { ...seg, row };
		});
		return withRow;
	});

	/** Sunday 00:00 of the week containing (calendarYear, calendarMonth, selectedDay||1) */
	const weekStartDate = $derived.by(() => {
		const d = new Date(calendarYear, calendarMonth, selectedDay ?? 1);
		const dayOfWeek = d.getDay();
		const sun = new Date(d);
		sun.setDate(d.getDate() - dayOfWeek);
		sun.setHours(0, 0, 0, 0);
		return sun;
	});
	const weekDays = $derived.by(() => {
		const out: Date[] = [];
		for (let i = 0; i < 7; i++) {
			const d = new Date(weekStartDate);
			d.setDate(weekStartDate.getDate() + i);
			out.push(d);
		}
		return out;
	});

	/** For quarter view: 3 (year, month) pairs */
	const quarterMonths = $derived.by(() => {
		const out: { year: number; month: number }[] = [];
		for (let i = 0; i < 3; i++) {
			const m = calendarMonth + i;
			const y = calendarYear + Math.floor(m / 12);
			out.push({ year: y, month: m % 12 });
		}
		return out;
	});

	const monthLabel = $derived(
		formatDisplayDate(
			new Date(calendarYear, calendarMonth, 1),
			{
				month: 'long',
				year: 'numeric'
			},
			''
		)
	);
	const selectedDayEvents = $derived.by(() => {
		if (selectedDay == null || !eventsByDay[selectedDay]) return [];
		return [...eventsByDay[selectedDay]].sort(
			(a, b) => (parseEventStart(a.startDate) ?? 0) - (parseEventStart(b.startDate) ?? 0)
		);
	});
	const todayDate = $derived(data.todayDate);
	const todayMonth = $derived(data.todayMonth);
	const todayYear = $derived(data.todayYear);
	const isToday = (day: number) =>
		selectedDay === day &&
		calendarYear === todayYear &&
		calendarMonth === todayMonth &&
		day === todayDate;

	function handleClearFilters() {
		filters.clearFilters();
		selectedDay = null;
	}
	function removeType(label: string) {
		filters.typeSelect = filters.typeSelect.filter((l) => l !== label);
	}
	function formatCostLabel() {
		if (!filters.costFilter.length) return 'Any cost';
		return `${filters.costFilter.length} selected`;
	}
	const regionTriggerLabel = $derived(
		filters.regionSelect.length ? `${filters.regionSelect.length} selected` : 'Any geography'
	);
	const typeTriggerLabel = $derived(
		filters.typeSelect.length ? `${filters.typeSelect.length} selected` : 'Any type'
	);
	function calendarPrev() {
		if (calendarViewMode === 'week') {
			const d = new Date(weekStartDate);
			d.setDate(d.getDate() - 7);
			calendarYear = d.getFullYear();
			calendarMonth = d.getMonth();
			selectedDay = d.getDate();
		} else if (calendarViewMode === 'quarter') {
			calendarMonth -= 3;
			if (calendarMonth < 0) {
				calendarMonth += 12;
				calendarYear -= 1;
			}
			selectedDay = null;
		} else {
			if (calendarMonth === 0) {
				calendarMonth = 11;
				calendarYear -= 1;
			} else calendarMonth -= 1;
			selectedDay = null;
		}
	}
	function calendarNext() {
		if (calendarViewMode === 'week') {
			const d = new Date(weekStartDate);
			d.setDate(d.getDate() + 7);
			calendarYear = d.getFullYear();
			calendarMonth = d.getMonth();
			selectedDay = d.getDate();
		} else if (calendarViewMode === 'quarter') {
			calendarMonth += 3;
			if (calendarMonth > 11) {
				calendarMonth -= 12;
				calendarYear += 1;
			}
			selectedDay = null;
		} else {
			if (calendarMonth === 11) {
				calendarMonth = 0;
				calendarYear += 1;
			} else calendarMonth += 1;
			selectedDay = null;
		}
	}
	function selectDay(day: number) {
		selectedDay = selectedDay === day ? null : day;
	}
	function goToToday() {
		calendarYear = data.todayYear;
		calendarMonth = data.todayMonth;
		selectedDay = data.todayDate;
	}
	/** Canonical YYYY-MM-DD for lookups (matches singleDayEventsByDateKey keys). */
	function dateKey(d: Date): string {
		const y = d.getFullYear();
		const m = d.getMonth() + 1;
		const day = d.getDate();
		return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
	}
	function isSameDay(d: Date, y: number, m: number, day: number): boolean {
		return d.getFullYear() === y && d.getMonth() === m && d.getDate() === day;
	}
	const weekLabel = $derived(
		weekDays.length
			? `${formatDisplayDate(weekDays[0], { month: 'short' }, '')} ${weekDays[0].getDate()} – ${formatDisplayDate(weekDays[6], { month: 'short', day: 'numeric', year: 'numeric' }, '')}`
			: ''
	);
	const quarterLabel = $derived(
		quarterMonths.length
			? `${formatDisplayDate(new Date(quarterMonths[0].year, quarterMonths[0].month, 1), { month: 'long' }, '')} – ${formatDisplayDate(new Date(quarterMonths[2].year, quarterMonths[2].month, 1), { month: 'long', year: 'numeric' }, '')}`
			: ''
	);
	const calendarTitle = $derived(
		calendarViewMode === 'week'
			? weekLabel
			: calendarViewMode === 'quarter'
				? quarterLabel
				: monthLabel
	);

	/** Current focus date (selected day or today) for next/prev event and day stepping */
	const cursorDate = $derived(new Date(calendarYear, calendarMonth, selectedDay ?? todayDate));
	const cursorStartTs = $derived(cursorDate.getTime());
	const cursorEndOfDayTs = $derived(
		new Date(calendarYear, calendarMonth, selectedDay ?? todayDate, 23, 59, 59, 999).getTime()
	);

	/** Filtered events sorted by start date (for next/prev and upcoming) */
	const filteredSortedByDate = $derived.by(() =>
		[...filters.filtered].sort(
			(a, b) => (parseEventStart(a.startDate) ?? 0) - (parseEventStart(b.startDate) ?? 0)
		)
	);

	/** Next upcoming event (first after end of cursor day) */
	const nextEvent = $derived.by(() => {
		for (const e of filteredSortedByDate) {
			const t = parseEventStart(e.startDate);
			if (t != null && t > cursorEndOfDayTs) return e;
		}
		return null;
	});

	/** Previous event (last before start of cursor day) */
	const prevEvent = $derived.by(() => {
		let found: EventItem | null = null;
		for (const e of filteredSortedByDate) {
			const t = parseEventStart(e.startDate);
			if (t != null && t < cursorStartTs) found = e;
		}
		return found;
	});

	/** Next 7 upcoming events (from today when no day selected, else from selected day) */
	const upcomingEvents = $derived.by(() => {
		const fromTs =
			selectedDay != null ? cursorStartTs : new Date(todayYear, todayMonth, todayDate).getTime();
		const out: EventItem[] = [];
		for (const e of filteredSortedByDate) {
			const t = parseEventStart(e.startDate);
			if (t != null && t >= fromTs && out.length < 7) out.push(e);
		}
		return out;
	});

	function goToNextEvent() {
		if (!nextEvent) return;
		const t = parseEventStart(nextEvent.startDate);
		if (t == null) return;
		const d = new Date(t);
		calendarYear = d.getFullYear();
		calendarMonth = d.getMonth();
		selectedDay = d.getDate();
	}
	function goToPrevEvent() {
		if (!prevEvent) return;
		const t = parseEventStart(prevEvent.startDate);
		if (t == null) return;
		const d = new Date(t);
		calendarYear = d.getFullYear();
		calendarMonth = d.getMonth();
		selectedDay = d.getDate();
	}
	/** Day summary line for selected day (e.g. "3 events · 2 with times") */
	const selectedDaySummary = $derived.by(() => {
		if (selectedDay == null || selectedDayEvents.length === 0) return null;
		const withTime = selectedDayEvents.filter((e) => formatEventTime(e.startDate)).length;
		if (selectedDayEvents.length === 1) return withTime ? '1 event with time' : '1 event';
		return withTime > 0
			? `${selectedDayEvents.length} events · ${withTime} with times`
			: `${selectedDayEvents.length} events`;
	});

	const mobileActiveFilterCount = $derived(
		(filters.searchQuery.trim() ? 1 : 0) +
			filters.regionSelect.length +
			filters.typeSelect.length +
			filters.costFilter.length +
			(filters.rangeStart !== filters.todayStart || filters.rangeEnd !== filters.defaultRangeEnd
				? 1
				: 0)
	);
	const mobileSearchSuggestions = $derived.by(() => {
		const query = filters.searchQuery.trim();
		if (!query || mobileFiltersExpanded) return [];
		return events
			.filter((event) => matchSearch(event, query, ['location', 'region', 'type', 'title']))
			.slice(0, 5);
	});
	function expandMobileFilters() {
		mobileFiltersExpanded = true;
	}

	function collapseMobileFilters() {
		mobileFiltersExpanded = false;
	}

	// Collapse filter panel when the main nav sidebar opens on mobile
	$effect(() => {
		if (publicSidebar.openMobile) mobileFiltersExpanded = false;
	});
</script>

<SeoHead
	{origin}
	pathname="/events"
	title="Events | Knowledge Basket"
	description="Indigenous gatherings, trainings, and cultural events in the Sierra Nevada bioregion and California. Find and submit events."
	robotsMode={data.seoIndexable === false ? 'noindex-follow' : 'index'}
	ogImage={buildOgImagePath({
		title: 'Events',
		eyebrow: 'Knowledge Basket',
		theme: 'events',
		meta: 'Indigenous gatherings, trainings, and cultural events'
	})}
	ogImageAlt="Knowledge Basket events social preview"
	breadcrumbItems={[
		{ name: 'Knowledge Basket', pathname: '/' },
		{ name: 'Events', pathname: '/events' }
	]}
/>

{#snippet weave()}
	<defs>
		<pattern id="wv-events" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
			<rect x="0" y="0" width="10" height="4" fill="white" />
			<rect x="10" y="10" width="10" height="4" fill="white" />
			<rect x="0" y="6" width="4" height="8" fill="white" opacity=".5" />
		</pattern>
	</defs>
	<rect width="200" height="400" fill="url(#wv-events)" />
{/snippet}
{#snippet stats()}
	<div class="font-sans text-white">
		<strong class="block text-[28px] leading-none font-bold">{total}</strong><span
			class="text-xs opacity-70">Upcoming</span
		>
	</div>
	<div class="font-sans text-white">
		<strong class="block text-[28px] leading-none font-bold">{sierraCount}</strong><span
			class="text-xs opacity-70">Sierra Nevada</span
		>
	</div>
{/snippet}
{#snippet children()}
	{#if data.dataUnavailable}
		<Alert class="mb-6 border-amber-300 bg-amber-50 text-amber-950">
			<AlertTitle>Live event data is unavailable</AlertTitle>
			<AlertDescription>
				Some live event data is temporarily unavailable, so you may be seeing limited results right
				now. Please try again in a little while.
			</AlertDescription>
		</Alert>
	{/if}
	{#if (data.featuredEvents?.length ?? 0) > 0}
		<section class="mb-8" aria-labelledby="featured-heading">
			<h2 id="featured-heading" class="mb-4 text-lg font-semibold">Featured</h2>
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each (data.featuredEvents ?? []).filter((e): e is EventItem => e != null) as featuredEvent (featuredEvent.id)}
					<EventCard event={featuredEvent} />
				{/each}
			</div>
		</section>
	{/if}
	<h2 id="upcoming-events-heading" class="sr-only">Upcoming events</h2>
	<div class="mb-4 md:hidden">
		<EventsViewSelector bind:eventView />
	</div>
	<EventsToolbar filteredTotal={filters.filteredTotal} />

	{#if eventView === 'cards'}
		{#if filters.filtered.length === 0}
			<div class="px-6 py-12 text-center text-[var(--muted-foreground)]" role="status">
				<p class="m-0 mb-4 text-base">No events match your filters.</p>
				<button
					type="button"
					class="inline-block cursor-pointer rounded-[var(--radius)] border border-[var(--border)] bg-transparent px-3 py-1.5 font-sans text-xs font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--color-mugwort-300)] hover:bg-[var(--color-mugwort-300)] hover:text-white"
					onclick={handleClearFilters}>Clear filters</button
				>
			</div>
		{:else}
			<div class="grid grid-cols-[repeat(auto-fill,minmax(310px,1fr))] gap-5">
				{#each filters.paginatedList as event, i (event.slug ?? event.id)}
					<EventCard {event} index={i + (filters.currentPage - 1) * filters.EVENTS_PAGE_SIZE} />
				{/each}
			</div>
		{/if}
	{:else if eventView === 'list'}
		{#if filters.filtered.length === 0}
			<div class="px-6 py-12 text-center text-[var(--muted-foreground)]" role="status">
				<p class="m-0 mb-4 text-base">No events match your filters.</p>
				<button
					type="button"
					class="inline-block cursor-pointer rounded-[var(--radius)] border border-[var(--border)] bg-transparent px-3 py-1.5 font-sans text-xs font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--color-mugwort-300)] hover:bg-[var(--color-mugwort-300)] hover:text-white"
					onclick={handleClearFilters}>Clear filters</button
				>
			</div>
		{:else}
			<ul class="m-0 flex list-none flex-col gap-4 p-0">
				{#each filters.paginatedList as event, i (event.slug ?? event.id)}
					<li>
						<EventListItem
							{event}
							index={i + (filters.currentPage - 1) * filters.EVENTS_PAGE_SIZE}
						/>
					</li>
				{/each}
			</ul>
		{/if}
	{:else}
		<EventsCalendarView {scheduleXApp} {calendarSelectedEvent} bind:eventDetailsOpen {isMobile} />
	{/if}
	{#if (eventView === 'cards' || eventView === 'list') && filters.totalPages > 1}
		<Pagination
			class="pt-6"
			count={filters.filteredTotal}
			perPage={filters.EVENTS_PAGE_SIZE}
			bind:page={pageBinding}
		>
			{#snippet children({ pages, currentPage })}
				<PaginationContent>
					<PaginationItem>
						<PaginationPrevious />
					</PaginationItem>
					{#each pages as p (p.key)}
						{#if p.type === 'ellipsis'}
							<PaginationItem>
								<PaginationEllipsis />
							</PaginationItem>
						{:else}
							<PaginationItem>
								<PaginationLink page={p} isActive={currentPage === p.value}>
									{p.value}
								</PaginationLink>
							</PaginationItem>
						{/if}
					{/each}
					<PaginationItem>
						<PaginationNext />
					</PaginationItem>
				</PaginationContent>
			{/snippet}
		</Pagination>
	{/if}
{/snippet}
{#snippet sidebarRight()}
	{#if !isDesktopLayout.current}
		<EventsRightSidebar
			{calendarSelectedEvent}
			{eventView}
			{sidebarFeatured}
			{sidebarCalendarValue}
			{sidebarWeekUpcoming}
			{sidebarCalendarInView}
			mapboxToken={data.mapboxToken ?? undefined}
			onClose={() => {
				calendarSelectedId = null;
				eventDetailsOpen = false;
			}}
		/>
	{/if}
{/snippet}

<div>
	<KbHero
		coil="events"
		eyebrow="Knowledge Basket · Events"
		title="Events"
		description="Indigenous gatherings, trainings, and cultural events across the Sierra Nevada bioregion and California."
		{weave}
		{stats}
	/>

	<CoilTheme coil="events">
		<!-- Inline layout so left sidebar is a direct child (no snippet) – fixes interaction in filter bar -->
		<div
			class="coil-layout flex w-full flex-col flex-nowrap md:flex-row"
			style="min-height: calc(100dvh - 144px - var(--kb-submit-banner-offset, 76px))"
			role="presentation"
		>
			<div
				class="coil-layout__left order-1 hidden w-full flex-none overflow-hidden overflow-y-auto border-b border-[var(--rule)] bg-[var(--color-alpine-50,#fafaf8)] p-3 md:block md:w-[272px] md:border-r md:border-b-0 md:px-3 md:py-5"
			>
				<EventsSidebar
					{filters}
					bind:eventView
					mobileMode={false}
					{formatCostLabel}
					{regionTriggerLabel}
					activeFilterCount={mobileActiveFilterCount}
					onTypeRemove={removeType}
					onClear={handleClearFilters}
				/>
			</div>
			<aside
				class="coil-layout__right order-3 w-full shrink-0 min-[960px]:w-[320px] min-[960px]:max-w-[320px] [&:empty]:hidden"
			>
				{@render sidebarRight?.()}
			</aside>
			<section
				class="coil-layout__main order-2 min-w-0 flex-1 p-4 pb-28 md:p-6 md:pl-7"
				aria-labelledby="upcoming-events-heading"
			>
				{@render children?.()}
			</section>
		</div>

		{#if mobileFiltersExpanded && !publicSidebar.openMobile}
			<button
				type="button"
				class="events-mobile-filter-overlay md:hidden"
				onclick={collapseMobileFilters}
				aria-label="Collapse filters"
			></button>
		{/if}
		<MobilePeekPanel
			bind:expanded={mobileFiltersExpanded}
			peekHeight={MOBILE_FILTER_PEEK_HEIGHT}
			class="events-mobile-filter-panel md:hidden {publicSidebar.openMobile
				? 'peek-behind-nav'
				: ''}"
		>
			<div class="events-mobile-filter-drawer__body">
				<EventsSidebar
					{filters}
					bind:eventView
					mobileMode={true}
					{formatCostLabel}
					{regionTriggerLabel}
					activeFilterCount={mobileActiveFilterCount}
					isExpanded={mobileFiltersExpanded}
					mobileSuggestions={mobileSearchSuggestions}
					onTypeRemove={removeType}
					onClear={handleClearFilters}
				/>
			</div>
		</MobilePeekPanel>
	</CoilTheme>

	<KbSubmitBanner
		coil="events"
		heading="Know of an event we should list?"
		description="Submit Indigenous-led and Indigenous-serving events for IFS staff review."
		href="/events/submit"
		label="Submit an Event"
	/>
</div>

<style>
	:global(.events-mobile-filter-overlay) {
		position: fixed;
		inset: 0;
		z-index: 40;
		border: none;
		background: rgba(15, 23, 42, 0.18);
	}

	.events-mobile-filter-drawer__body {
		overflow-y: auto;
		padding: 0.25rem 1.25rem 0.5rem;
	}

	:global(.peek-behind-nav.mobile-peek-panel) {
		z-index: 39;
	}
</style>
