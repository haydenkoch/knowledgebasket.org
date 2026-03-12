<script lang="ts">
	import 'temporal-polyfill/global';
	import EventsViewTabs from '$lib/components/EventsViewTabs.svelte';
	import KbHero from '$lib/components/KbHero.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import SearchIcon from '@lucide/svelte/icons/search';
	import CheckIcon from '@lucide/svelte/icons/check';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as ButtonGroup from '$lib/components/ui/button-group/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Calendar } from '$lib/components/ui/calendar/index.js';
	import { CalendarDate, getLocalTimeZone } from '@internationalized/date';
	import { cn } from '$lib/utils.js';
	import Slider from '$lib/components/ui/slider/slider.svelte';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import XIcon from '@lucide/svelte/icons/x';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { setContext } from 'svelte';
	import { get } from 'svelte/store';
	import type { EventItem } from '$lib/data/kb';
	import { getPlaceholderImage } from '$lib/data/placeholders';
	import { ScheduleXCalendar } from '@schedule-x/svelte';
	import {
		createCalendar,
		createViewMonthGrid,
		createViewWeek,
		createViewDay,
		viewMonthGrid,
		viewWeek,
		viewDay
	} from '@schedule-x/calendar';
	import { createEventsServicePlugin } from '@schedule-x/events-service';
	import '@schedule-x/theme-shadcn/dist/index.css';
import ScheduleXHeader from '$lib/components/calendar/ScheduleXHeader.svelte';
	import CaliforniaMap from '$lib/components/CaliforniaMap.svelte';
import {
	stripHtml,
	matchSearch,
	filterByFacets,
	facetCounts,
	parseEventStart,
	formatEventDateShort,
	formatEventTime,
	eventCalendarParts,
	eventCalendarDaysSpanned,
	isMultiDayEvent,
	getEventTypeTags,
	eventMatchesTypeGroup,
	eventTypeGroupCounts
} from '$lib/utils/format';
import { eventTypeGroups, eventTypeTags } from '$lib/data/formSchema';
import * as Drawer from '$lib/components/ui/drawer/index.js';
import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import type { CalendarApp } from '@schedule-x/calendar';

	type EventView = 'cards' | 'list' | 'calendar';

	/** Schedule-X timezone (must match calendar config so week/day time grid is correct). */
	const CALENDAR_TZ = 'America/Los_Angeles';

	/**
	 * Convert EventItem to Schedule-X event. Uses ZonedDateTime 9:00–17:00 so week/day views
	 * show events in the time grid instead of only in the all-day row.
	 */
	function eventToSx(e: EventItem): {
		id: string;
		title: string;
		start: Temporal.ZonedDateTime;
		end: Temporal.ZonedDateTime;
		description?: string;
		location?: string;
		cost?: string;
	} | null {
		const startTs = parseEventStart(e.startDate);
		if (startTs == null) return null;
		const startD = new Date(startTs);
		let endD = new Date(startTs);
		if (e.endDate?.trim()) {
			const endTs = parseEventStart(e.endDate);
			if (endTs != null) endD = new Date(endTs);
		}
		const start = Temporal.ZonedDateTime.from({
			year: startD.getFullYear(),
			month: startD.getMonth() + 1,
			day: startD.getDate(),
			hour: 9,
			minute: 0,
			second: 0,
			timeZone: CALENDAR_TZ
		});
		const end = Temporal.ZonedDateTime.from({
			year: endD.getFullYear(),
			month: endD.getMonth() + 1,
			day: endD.getDate(),
			hour: 17,
			minute: 0,
			second: 0,
			timeZone: CALENDAR_TZ
		});
		return {
			id: e.id,
			title: e.title ?? '',
			start,
			end,
			description: e.description,
			location: e.location,
			cost: e.cost
		};
	}

	let { data } = $props();
	const events = $derived(data.events ?? []) as EventItem[];
	const total = $derived(events.length);
	const sierraCount = $derived(events.filter((e) => e.region === 'Sierra Nevada').length);

	const now = new Date();
	type CalendarViewMode = 'week' | 'month' | 'quarter';

let searchQuery = $state('');
let regionSelect = $state<string[]>([]);
let typeSelect = $state<string[]>([]);
let costFilter = $state<string[]>([]);
	let costOpen = $state(false);
	let regionOpen = $state(false);
	let typeOpen = $state(false);
	let startDateOpen = $state(false);
	let endDateOpen = $state(false);
	let eventView = $state<EventView>('list');
	let calendarYear = $state(now.getFullYear());
	let calendarMonth = $state(now.getMonth());
	let selectedDay = $state<number | null>(null);
	let calendarViewMode = $state<CalendarViewMode>('month');
	let condenseLongEvents = $state(false);

	/** Currently selected event from the calendar (for inline sidebar / mobile drawer). */
	let calendarSelectedId = $state<string | null>(null);
	const calendarSelectedEvent = $derived(
		calendarSelectedId ? filtered.find((e) => e.id === calendarSelectedId) ?? null : null
	);
	let eventDetailsOpen = $state(false);
	const isMobile = new IsMobile();

	/** Schedule-X calendar app (created when calendar view is active). */
	let scheduleXApp = $state<CalendarApp | null>(null);

	$effect(() => {
		const d = data as {
			initialCalendarView?: string;
			initialCalendarMode?: string;
			initialCalendarYear?: number | null;
			initialCalendarMonth?: number | null;
			initialCalendarDay?: number | null;
		};
		if (d.initialCalendarView === 'calendar') eventView = 'calendar';
		if (d.initialCalendarMode === 'week' || d.initialCalendarMode === 'month' || d.initialCalendarMode === 'quarter')
			calendarViewMode = d.initialCalendarMode as CalendarViewMode;
		if (d.initialCalendarYear != null) calendarYear = d.initialCalendarYear;
		if (d.initialCalendarMonth != null) calendarMonth = d.initialCalendarMonth;
		if (d.initialCalendarDay != null) selectedDay = d.initialCalendarDay;
	});

	/** Create Schedule-X calendar when user switches to calendar view. Use URL params for initial view and date. */
	$effect(() => {
		if (eventView !== 'calendar') return;
		if (scheduleXApp) return;
		const d = data as {
			initialCalendarMode?: string;
			initialCalendarYear?: number | null;
			initialCalendarMonth?: number | null;
			initialCalendarDay?: number | null;
		};
		const mode = d.initialCalendarMode ?? 'month';
		const defaultView =
			mode === 'week' ? viewWeek.name : mode === 'day' ? viewDay.name : viewMonthGrid.name;
		const selected =
			d.initialCalendarYear != null &&
			d.initialCalendarMonth != null &&
			d.initialCalendarDay != null
				? Temporal.PlainDate.from({
						year: d.initialCalendarYear,
						month: d.initialCalendarMonth + 1,
						day: d.initialCalendarDay
					})
				: Temporal.PlainDate.from(new Date().toISOString().slice(0, 10));
		scheduleXApp = createCalendar(
			{
				views: [createViewMonthGrid(), createViewWeek(), createViewDay()],
				events: [],
				theme: 'shadcn',
				timezone: CALENDAR_TZ,
				firstDayOfWeek: 7,
				defaultView,
				selectedDate: selected,
				callbacks: {
					onEventClick(calEvent: { id: string | number }) {
						const id = String(calEvent.id);
						const match = filtered.find((e) => e.id === id);
						if (!match) {
							goto(`/events/${id}`);
							return;
						}
						calendarSelectedId = id;
						eventDetailsOpen = true;
					}
				}
			},
			[createEventsServicePlugin()]
		);
	});

	/** Provide URL-sync callback for calendar header (view + date in query). */
	$effect(() => {
		if (eventView !== 'calendar') return;
		setContext('kb-calendar-url-sync', {
			updateUrl(mode: string, dateStr: string) {
				const p = get(page);
				const url = new URL(p.url);
				url.searchParams.set('view', 'calendar');
				url.searchParams.set('mode', mode);
				url.searchParams.set('date', dateStr);
				// Keep scroll position when toggling calendar modes/dates to avoid jarring jumps.
				goto(`${url.pathname}${url.search}`, { replaceState: true, noScroll: true });
			}
		});
	});

	/** Close calendar modal if user leaves calendar view. */
	$effect(() => {
		if (eventView !== 'calendar') {
			calendarSelectedId = null;
			eventDetailsOpen = false;
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
		const service = (scheduleXApp as { eventsService?: { set: (events: unknown[]) => void } }).eventsService;
		if (!service) return;
		const sxEvents = filtered.map(eventToSx).filter((e): e is NonNullable<typeof e> => e != null);
		service.set(sxEvents);
	});

	// Helpers for date range (YYYY-MM-DD for inputs; CalendarDate for shadcn Calendar)
	function tsToDateStr(ts: number): string {
		const d = new Date(ts);
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	}
	function dateStrToTs(str: string): number {
		if (!str) return 0;
		const [y, m, d] = str.split('-').map(Number);
		if (isNaN(y) || isNaN(m) || isNaN(d)) return 0;
		return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
	}
	function endOfDayTs(str: string): number {
		if (!str) return 0;
		const [y, m, d] = str.split('-').map(Number);
		if (isNaN(y) || isNaN(m) || isNaN(d)) return 0;
		return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
	}
	function tsToCalendarDate(ts: number): CalendarDate {
		const d = new Date(ts);
		return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
	}
	function calendarDateToStartTs(d: CalendarDate): number {
		const js = d.toDate(getLocalTimeZone());
		return new Date(js.getFullYear(), js.getMonth(), js.getDate(), 0, 0, 0, 0).getTime();
	}
	function calendarDateToEndTs(d: CalendarDate): number {
		const js = d.toDate(getLocalTimeZone());
		return new Date(js.getFullYear(), js.getMonth(), js.getDate(), 23, 59, 59, 999).getTime();
	}

	// Single source of truth: range as timestamps. Default: today → today + 12 months
	function getDefaultRange() {
		const d = new Date();
		const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
		const end = new Date(d.getFullYear(), d.getMonth() + 13, 0, 23, 59, 59, 999).getTime();
		return { start, end };
	}
	const todayStart = $derived(new Date(new Date().setHours(0, 0, 0, 0)).getTime());
	const defaultRangeEnd = $derived(
		new Date(
			new Date().getFullYear(),
			new Date().getMonth() + 13,
			0,
			23,
			59,
			59,
			999
		).getTime()
	);
	const initialRange = getDefaultRange();
	let rangeStart = $state(initialRange.start);
	let rangeEnd = $state(initialRange.end);
	let startDateDisplay = $state<CalendarDate>(tsToCalendarDate(initialRange.start));
	let endDateDisplay = $state<CalendarDate>(tsToCalendarDate(initialRange.end));

	// Keep calendar display in sync with range (slider, clear filters, etc.)
	$effect(() => {
		startDateDisplay = tsToCalendarDate(rangeStart);
	});
	$effect(() => {
		endDateDisplay = tsToCalendarDate(rangeEnd);
	});

	// Fixed 24 month buckets: 12 months back + 12 months forward from today
	const dateBuckets = $derived.by(() => {
		const now = new Date();
		const buckets: { label: string; start: number; end: number; count: number }[] = [];
		const withDate = events.filter((e) => parseEventStart(e.startDate) != null);
		// 12 months back + 12 months forward = 24 bars
		for (let i = -12; i < 12; i++) {
			const y = now.getFullYear();
			const m = now.getMonth() + i;
			const start = new Date(y, m, 1).getTime();
			const end = new Date(y, m + 1, 0, 23, 59, 59, 999).getTime();
			const count = withDate.filter((e) => {
				const t = parseEventStart(e.startDate)!;
				return t >= start && t <= end;
			}).length;
			buckets.push({
				label: new Date(y, m).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
				start,
				end,
				count
			});
		}
		const maxCount = Math.max(1, ...buckets.map((b) => b.count));
		return { buckets, maxCount };
	});
	const numBuckets = $derived(dateBuckets.buckets.length);

	// Map range (timestamps) to bucket indices for slider
	const dateRangeMinIx = $derived.by(() => {
		if (numBuckets === 0) return 0;
		const buckets = dateBuckets.buckets;
		for (let i = 0; i < buckets.length; i++) {
			if (rangeStart <= buckets[i].end) return i;
		}
		return numBuckets - 1;
	});
	const dateRangeMaxIx = $derived.by(() => {
		if (numBuckets === 0) return 0;
		const buckets = dateBuckets.buckets;
		for (let i = buckets.length - 1; i >= 0; i--) {
			if (rangeEnd >= buckets[i].start) return i;
		}
		return 0;
	});

	function setRangeFromIndices(minIx: number, maxIx: number) {
		const buckets = dateBuckets.buckets;
		if (!buckets.length) return;
		const min = Math.max(0, Math.min(minIx, buckets.length - 1));
		const max = Math.max(min, Math.min(maxIx, buckets.length - 1));
		rangeStart = buckets[min].start;
		rangeEnd = buckets[max].end;
	}

	// During drag, store indices here so thumb moves without recalculating filters; commit on release.
	let sliderIndices = $state<[number, number] | null>(null);

	function handleSliderChange(vals: number[]) {
		if (!vals || vals.length === 0) return;
		sliderIndices = [vals[0] ?? 0, vals.length > 1 ? vals[1] : vals[0]];
	}

	function handleSliderCommit(vals: number[]) {
		if (!vals || vals.length === 0) return;
		const minIx = vals[0] ?? 0;
		const maxIx = vals.length > 1 ? vals[1] : minIx;
		setRangeFromIndices(minIx, maxIx);
		sliderIndices = null;
	}

	const sliderMinIx = $derived(sliderIndices?.[0] ?? dateRangeMinIx);
	const sliderMaxIx = $derived(sliderIndices?.[1] ?? dateRangeMaxIx);

	const regionCounts = $derived(facetCounts(events, 'region'));
	const typeGroupCounts = $derived(eventTypeGroupCounts(events, eventTypeGroups));
	const costCounts = $derived(facetCounts(events, 'cost'));
	const regionValues = $derived(Object.keys(regionCounts).sort());
	const costValues = $derived(Object.keys(costCounts).sort());

	const searchFiltered = $derived(
		events.filter((e) =>
			matchSearch(e, searchQuery, ['location', 'region', 'type', 'title'])
		)
	);
	const costFiltered = $derived(
		searchFiltered.filter((e) => {
			const cost = (e.cost ?? '').trim();
			return !costFilter.length || (cost && costFilter.includes(cost));
		})
	);
	const regionFiltered = $derived(
		filterByFacets(costFiltered, { region: regionSelect })
	);
	/* typeSelect = selected tags (e.g. Conference, Big Time). Filter by groups that contain any selected tag. */
	const typeGroupsForFilter = $derived(
		eventTypeGroups.filter((g) => g.tags.some((tag) => typeSelect.includes(tag)))
	);
	const facetFiltered = $derived(
		typeSelect.length === 0
			? regionFiltered
			: regionFiltered.filter((e) =>
					typeGroupsForFilter.some((g) => eventMatchesTypeGroup(e, g.tags))
			  )
	);
	const dateFiltered = $derived(
		facetFiltered.filter((e) => {
			const t = parseEventStart(e.startDate);
			return t != null && t >= rangeStart && t <= rangeEnd;
		})
	);

	/* Events in selected date range (search only) – for facet counts in dropdowns */
	const eventsInDateRange = $derived(
		searchFiltered.filter((e) => {
			const t = parseEventStart(e.startDate);
			return t != null && t >= rangeStart && t <= rangeEnd;
		})
	);
	const costCountsInRange = $derived(facetCounts(eventsInDateRange, 'cost'));
	const regionCountsInRange = $derived(facetCounts(eventsInDateRange, 'region'));
	const typeGroupCountsInRange = $derived(eventTypeGroupCounts(eventsInDateRange, eventTypeGroups));
	/* Show option if count > 0 in range OR user has it selected (keep selected even when 0) */
	const costValuesVisible = $derived(
		costValues.filter((c) => (costCountsInRange[c] ?? 0) > 0 || costFilter.includes(c))
	);
	const regionValuesVisible = $derived(
		regionValues.filter((r) => (regionCountsInRange[r] ?? 0) > 0 || regionSelect.includes(r))
	);
	const typeTagsVisible = $derived.by(() => {
		return eventTypeTags.filter((tag) => {
			const group = eventTypeGroups.find((g) => (g.tags as readonly string[]).includes(tag));
			const count = group ? (typeGroupCountsInRange[group.label] ?? 0) : 0;
			return count > 0 || typeSelect.includes(tag);
		});
	});

	const filtered = $derived(
		[...dateFiltered].sort((a, b) => {
			const ta = parseEventStart(a.startDate) ?? Infinity;
			const tb = parseEventStart(b.startDate) ?? Infinity;
			return ta - tb;
		})
	);
	const filteredTotal = $derived(filtered.length);

	/** Sidebar feeds */
	const sidebarFeatured = $derived(filtered.slice(0, 3));
	const sidebarWeekUpcoming = $derived(() => {
		const nowTs = todayStart;
		const weekEnd = nowTs + 7 * 24 * 60 * 60 * 1000;
		return filtered.filter((e) => {
			const t = parseEventStart(e.startDate);
			return t != null && t >= nowTs && t <= weekEnd;
		}).slice(0, 5);
	});
	const sidebarCalendarInView = $derived(() => {
		// For now, just reuse filtered when in calendar view; can be tightened to current grid range later.
		return filtered.slice(0, 8);
	});

	const sidebarCalendarValue = $derived(tsToCalendarDate(rangeStart));

	const daysInMonth = $derived(new Date(calendarYear, calendarMonth + 1, 0).getDate());
	const firstDow = $derived(new Date(calendarYear, calendarMonth, 1).getDay());

	function getEventsByDayForMonth(y: number, m: number): Record<number, EventItem[]> {
		const map: Record<number, EventItem[]> = {};
		for (const e of filtered) {
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
		const multiDayEvents = filtered.filter((e) => isMultiDayEvent(e.startDate, e.endDate));
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
			weeks[w].segments = weekSegs.map(seg => {
				let row = 0;
				for (let c = seg.colStart; c < seg.colStart + seg.colSpan; c++) row = Math.max(row, rowSlots[c] ?? 0);
				for (let c = seg.colStart; c < seg.colStart + seg.colSpan; c++) rowSlots[c] = row + 1;
				return { ...seg, row };
			});
		}
		return weeks;
	});

	/** For week view: events keyed by YYYY-MM-DD. Multi-day events appear on every day (for panel); use singleDayEventsByDateKey for day cells. */
	const eventsByDateKey = $derived.by(() => {
		const map: Record<string, EventItem[]> = {};
		for (const e of filtered) {
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
		for (const e of filtered) {
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
		for (const e of filtered) {
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
			for (let c = seg.colStart; c < seg.colStart + seg.colSpan; c++) row = Math.max(row, rows[c] ?? 0);
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
		new Date(calendarYear, calendarMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
	);
	const selectedDayEvents = $derived.by(() => {
		if (selectedDay == null || !eventsByDay[selectedDay]) return [];
		return [...eventsByDay[selectedDay]].sort(
			(a, b) => (parseEventStart(a.startDate) ?? 0) - (parseEventStart(b.startDate) ?? 0)
		);
	});
	const todayDate = $derived(new Date().getDate());
	const todayMonth = $derived(new Date().getMonth());
	const todayYear = $derived(new Date().getFullYear());
	const isToday = (day: number) =>
		selectedDay === day &&
		calendarYear === todayYear &&
		calendarMonth === todayMonth &&
		day === todayDate;

	function clearFilters() {
		searchQuery = '';
		regionSelect = [];
		typeSelect = [];
		costFilter = [];
		rangeStart = todayStart;
		rangeEnd = defaultRangeEnd;
		selectedDay = null;
	}
	function toggleMulti(arr: string[], value: string): string[] {
		return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
	}
	function removeType(label: string) {
		typeSelect = typeSelect.filter((l) => l !== label);
	}
	function formatCostLabel() {
		if (!costFilter.length) return 'Any cost';
		return `${costFilter.length} selected`;
	}
	const regionTriggerLabel = $derived(
		regionSelect.length ? `${regionSelect.length} selected` : 'Any geography'
	);
	const typeTriggerLabel = $derived(
		typeSelect.length ? `${typeSelect.length} selected` : 'Any type'
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
		const now = new Date();
		calendarYear = now.getFullYear();
		calendarMonth = now.getMonth();
		selectedDay = now.getDate();
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
			? `${weekDays[0].toLocaleDateString('en-US', { month: 'short' })} ${weekDays[0].getDate()} – ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
			: ''
	);
	const quarterLabel = $derived(
		quarterMonths.length
			? `${new Date(quarterMonths[0].year, quarterMonths[0].month).toLocaleDateString('en-US', { month: 'long' })} – ${new Date(quarterMonths[2].year, quarterMonths[2].month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
			: ''
	);
	const calendarTitle = $derived(
		calendarViewMode === 'week' ? weekLabel : calendarViewMode === 'quarter' ? quarterLabel : monthLabel
	);

	/** Current focus date (selected day or today) for next/prev event and day stepping */
	const cursorDate = $derived(new Date(calendarYear, calendarMonth, selectedDay ?? todayDate));
	const cursorStartTs = $derived(cursorDate.getTime());
	const cursorEndOfDayTs = $derived(new Date(calendarYear, calendarMonth, selectedDay ?? todayDate, 23, 59, 59, 999).getTime());

	/** Filtered events sorted by start date (for next/prev and upcoming) */
	const filteredSortedByDate = $derived.by(() =>
		[...filtered].sort((a, b) => (parseEventStart(a.startDate) ?? 0) - (parseEventStart(b.startDate) ?? 0))
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
			selectedDay != null
				? cursorStartTs
				: new Date(todayYear, todayMonth, todayDate).getTime();
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
		if (selectedDayEvents.length === 1)
			return withTime ? '1 event with time' : '1 event';
		return withTime > 0
			? `${selectedDayEvents.length} events · ${withTime} with times`
			: `${selectedDayEvents.length} events`;
	});
	</script>

<div class="kb-coil kb-coil--events">
	<KbHero
		heroClass="kb-hero--events"
		eyebrow="Knowledge Basket · Coil 1"
		title="Events"
		description="Indigenous gatherings, trainings, and cultural events across the Sierra Nevada bioregion and California."
	>
		<svelte:fragment slot="weave">
			<defs>
				<pattern id="wv-events" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
					<rect x="0" y="0" width="10" height="4" fill="white" />
					<rect x="10" y="10" width="10" height="4" fill="white" />
					<rect x="0" y="6" width="4" height="8" fill="white" opacity=".5" />
				</pattern>
			</defs>
			<rect width="200" height="400" fill="url(#wv-events)" />
		</svelte:fragment>
		<svelte:fragment slot="stats">
			<div class="kb-hstat"><strong>{total}</strong><span>Upcoming</span></div>
			<div class="kb-hstat"><strong>{sierraCount}</strong><span>Sierra Nevada</span></div>
		</svelte:fragment>
	</KbHero>

	<div class="kb-layout">
		<aside class="kb-sidebar kb-refine-sidebar">
			<div class="kb-search-wrap">
				<span class="kb-search-icon" aria-hidden="true">
					<SearchIcon size={16} strokeWidth={1.8} aria-hidden="true" />
				</span>
				<Input
					type="search"
					placeholder="Search events…"
					class="kb-search-input"
					bind:value={searchQuery}
				/>
			</div>
			<div class="kb-fg">
				<div class="kb-flbl">View</div>
				<EventsViewTabs bind:value={eventView} />
			</div>

			<!-- Date distribution graph + slider -->
			<div class="kb-refine-block kb-refine-date-graph" role="group" aria-label="Filter by date">

				{#if dateBuckets.buckets.length > 0}
					<div class="kb-date-graph">
						<p class="kb-date-graph__label">Date range</p>
						<div class="kb-date-graph__chart" role="img" aria-label="Event count by month">
							{#each dateBuckets.buckets as bucket, i}
								{@const pct = dateBuckets.maxCount > 0 ? (bucket.count / dateBuckets.maxCount) * 100 : 0}
								<span
									class="kb-date-graph__bar"
									class:kb-date-graph__bar--in-range={i >= sliderMinIx && i <= Math.min(sliderMaxIx, numBuckets - 1)}
									style="height: {pct}%"
									data-min={bucket.start}
									data-max={bucket.end}
									data-count={bucket.count}
									aria-label="Month {bucket.label}. Events: {bucket.count}."
								></span>
							{/each}
						</div>
						<div class="kb-date-graph__controls">
							<Slider
								min={0}
								max={Math.max(0, numBuckets - 1)}
								step={1}
								value={[sliderMinIx, sliderMaxIx]}
								onValueChange={handleSliderChange}
								onValueCommit={handleSliderCommit}
								type="multiple"
								class="kb-date-slider"
								aria-label="Date range"
							/>
							<div class="kb-date-graph__labels">
								<div class="kb-date-input-wrap">
									<span class="kb-date-input-label">From</span>
									<Popover.Root bind:open={startDateOpen}>
										<Popover.Trigger>
											{#snippet child({ props })}
												<input
													{...props}
													type="date"
													class="kb-date-input kb-date-input--calendar-trigger"
													aria-label="Start date"
													value={tsToDateStr(rangeStart)}
													oninput={(e) => {
														const v = (e.currentTarget as HTMLInputElement).value;
														const ts = dateStrToTs(v);
														if (ts) {
															rangeStart = ts;
															if (rangeStart > rangeEnd) rangeEnd = rangeStart;
														}
													}}
													onclick={(e) => {
														e.preventDefault();
														startDateOpen = true;
													}}
													min={tsToDateStr(dateBuckets.buckets[0]?.start ?? rangeStart)}
													max={tsToDateStr(rangeEnd)}
												/>
											{/snippet}
										</Popover.Trigger>
										<Popover.Content class="w-auto overflow-hidden p-0" align="start">
											<Calendar
												type="single"
												bind:value={startDateDisplay}
												onValueChange={() => {
													rangeStart = calendarDateToStartTs(startDateDisplay);
													if (rangeStart > rangeEnd) rangeEnd = rangeStart;
													startDateOpen = false;
												}}
												captionLayout="dropdown"
												minValue={tsToCalendarDate(dateBuckets.buckets[0]?.start ?? rangeStart)}
												maxValue={tsToCalendarDate(rangeEnd)}
											/>
										</Popover.Content>
									</Popover.Root>
								</div>
								<div class="kb-date-input-wrap">
									<span class="kb-date-input-label">To</span>
									<Popover.Root bind:open={endDateOpen}>
										<Popover.Trigger>
											{#snippet child({ props })}
												<input
													{...props}
													type="date"
													class="kb-date-input kb-date-input--calendar-trigger"
													aria-label="End date"
													value={tsToDateStr(rangeEnd)}
													oninput={(e) => {
														const v = (e.currentTarget as HTMLInputElement).value;
														const ts = endOfDayTs(v);
														if (ts) {
															rangeEnd = ts;
															if (rangeEnd < rangeStart) rangeStart = dateStrToTs(v);
														}
													}}
													onclick={(e) => {
														e.preventDefault();
														endDateOpen = true;
													}}
													min={tsToDateStr(rangeStart)}
													max={tsToDateStr(dateBuckets.buckets[dateBuckets.buckets.length - 1]?.end ?? rangeEnd)}
												/>
											{/snippet}
										</Popover.Trigger>
										<Popover.Content class="w-auto overflow-hidden p-0" align="start">
											<Calendar
												type="single"
												bind:value={endDateDisplay}
												onValueChange={() => {
													rangeEnd = calendarDateToEndTs(endDateDisplay);
													if (rangeEnd < rangeStart) rangeStart = calendarDateToStartTs(endDateDisplay);
													endDateOpen = false;
												}}
												captionLayout="dropdown"
												minValue={tsToCalendarDate(rangeStart)}
												maxValue={tsToCalendarDate(dateBuckets.buckets[dateBuckets.buckets.length - 1]?.end ?? rangeEnd)}
											/>
										</Popover.Content>
									</Popover.Root>
								</div>
							</div>
						</div>
					</div>
				{:else}
					<p class="kb-date-graph__hint">No events in range.</p>
				{/if}
			</div>

			<!-- Facet filters -->
			<div class="kb-fg kb-fg--filters">
				<div class="kb-flbl">Filter</div>
				<div class="kb-filter-bar" aria-label="Filter events">
					<div class="kb-filter-row">
						<!-- Cost combobox -->
						<Popover.Root bind:open={costOpen}>
							<Popover.Trigger>
								{#snippet child({ props })}
									<Button
										{...props}
										variant="outline"
										class="kb-refine-select w-full justify-between"
										role="combobox"
										aria-expanded={costOpen}
									>
										{formatCostLabel()}
										<ChevronDownIcon class="size-4 shrink-0 opacity-50" />
									</Button>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="kb-filter-popover-content p-0" align="start">
								<Command.Root>
									<Command.Input placeholder="Search cost…" />
									<Command.List>
										<Command.Empty>No cost found.</Command.Empty>
										<Command.Group>
											{#each costValuesVisible as c (c)}
												<Command.Item
													value={c}
													onSelect={() => (costFilter = toggleMulti(costFilter, c))}
													class={cn('kb-filter-item', costFilter.includes(c) && 'kb-filter-item--checked')}
												>
													<CheckIcon class={cn('size-4', !costFilter.includes(c) && 'text-transparent')} />
													<span class="kb-filter-item__label">{c}</span>
													<Badge variant="secondary" class="kb-filter-item__badge">{costCountsInRange[c] ?? 0}</Badge>
												</Command.Item>
											{/each}
										</Command.Group>
									</Command.List>
								</Command.Root>
							</Popover.Content>
						</Popover.Root>

						<!-- Region combobox -->
						<Popover.Root bind:open={regionOpen}>
							<Popover.Trigger>
								{#snippet child({ props })}
									<Button
										{...props}
										variant="outline"
										class="kb-refine-select w-full justify-between"
										role="combobox"
										aria-expanded={regionOpen}
									>
										{regionTriggerLabel}
										<ChevronDownIcon class="size-4 shrink-0 opacity-50" />
									</Button>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="kb-filter-popover-content p-0" align="start">
								<Command.Root>
									<Command.Input placeholder="Search geography…" />
									<Command.List>
										<Command.Empty>No geography found.</Command.Empty>
										<Command.Group>
											{#each regionValuesVisible as r (r)}
												<Command.Item
													value={r}
													onSelect={() => (regionSelect = toggleMulti(regionSelect, r))}
													class={cn('kb-filter-item', regionSelect.includes(r) && 'kb-filter-item--checked')}
												>
													<CheckIcon class={cn('size-4', !regionSelect.includes(r) && 'text-transparent')} />
													<span class="kb-filter-item__label">{r}</span>
													<Badge variant="secondary" class="kb-filter-item__badge">{regionCountsInRange[r] ?? 0}</Badge>
												</Command.Item>
											{/each}
										</Command.Group>
									</Command.List>
								</Command.Root>
							</Popover.Content>
						</Popover.Root>

						<!-- Type: same as events submit form (trigger with chips + popover Command) -->
						<div class="kb-refine-type-row">
							<div class="kb-flbl">Type</div>
							<Popover.Root bind:open={typeOpen}>
								<Popover.Trigger class="kb-form-type-trigger-wrap" aria-label="Filter by event type">
									<div class="kb-form-type-trigger" class:empty={typeSelect.length === 0}>
										{#if typeSelect.length > 0}
											<span class="kb-form-type-chips">
												{#each typeSelect as label (label)}
													<span class="kb-form-type-chip">
														{label}
														<button
															type="button"
															class="kb-form-type-chip-remove"
															aria-label="Remove {label}"
															onclick={(e) => {
																e.preventDefault();
																e.stopPropagation();
																removeType(label);
															}}
														>
															<XIcon class="size-3" />
														</button>
													</span>
												{/each}
											</span>
										{/if}
										<span class="kb-form-type-placeholder">{typeSelect.length ? 'Add another…' : 'Search to add types…'}</span>
									</div>
								</Popover.Trigger>
								<Popover.Content class="kb-filter-popover-content p-0" align="start">
									<Command.Root>
										<Command.Input placeholder="Search types…" />
										<Command.List>
											<Command.Empty>No type found.</Command.Empty>
											<Command.Group>
												{#each typeTagsVisible as tag (tag)}
													{@const groupForTag = eventTypeGroups.find((g) => (g.tags as readonly string[]).includes(tag))}
													<Command.Item
														value={tag}
														onSelect={() => (typeSelect = toggleMulti(typeSelect as string[], tag as string))}
														class={cn('kb-filter-item', typeSelect.includes(tag) && 'kb-filter-item--checked')}
													>
														<CheckIcon class={cn('size-4', !typeSelect.includes(tag) && 'text-transparent')} />
														<span class="kb-filter-item__label">{tag}</span>
														<Badge variant="secondary" class="kb-filter-item__badge">{groupForTag ? (typeGroupCountsInRange[groupForTag.label] ?? 0) : 0}</Badge>
													</Command.Item>
												{/each}
											</Command.Group>
										</Command.List>
									</Command.Root>
								</Popover.Content>
							</Popover.Root>
						</div>
					</div>
					<button
						type="button"
						class="kb-filter-clear"
						onclick={clearFilters}
					>
						Clear filters &amp; search
					</button>
				</div>
			</div>
		</aside>
		<main class="kb-main">
			<div class="kb-toolbar kb-events-toolbar" aria-live="polite" aria-atomic="true">
				<div class="kb-rcount">Showing <strong>{filteredTotal}</strong> events</div>
			</div>

			{#if eventView === 'cards'}
				<div class="kb-grid kb-event-cards">
					{#each filtered as event, i (event.id)}
						<a href="/events/{event.id}" class="kb-card kb-event-card">
							<div class="kb-cimg" style="background: linear-gradient(135deg, var(--color-lakebed-950), var(--color-lakebed-800))">
								<img src={event.imageUrl ?? getPlaceholderImage(i)} alt="" class="kb-cimg-photo" />
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
					{/each}
				</div>
			{:else if eventView === 'list'}
				<ul class="kb-elist kb-elist-eb">
					{#each filtered as event, i (event.id)}
						<li>
							<a href="/events/{event.id}" class="kb-elist-item kb-elist-item-eb">
								<div class="kb-elist-photo" style="background: linear-gradient(135deg, var(--color-lakebed-950), var(--color-lakebed-800))">
									<img src={event.imageUrl ?? getPlaceholderImage(i)} alt="" class="kb-elist-photo-img" />
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
						</li>
					{/each}
				</ul>
			{:else}
				<div class="kb-ecal-wrap kb-ecal-wrap--schedulex">
					<div class="kb-schedulex-wrapper">
						{#if scheduleXApp}
							<ScheduleXCalendar calendarApp={scheduleXApp} headerContent={ScheduleXHeader} />
						{:else}
							<p class="kb-ecal-loading">Loading calendar…</p>
						{/if}
					</div>

					{#if calendarSelectedEvent && isMobile.current}
						<Drawer.Root bind:open={eventDetailsOpen}>
							<Drawer.Portal>
								<Drawer.Overlay class="kb-event-drawer__overlay" />
								<Drawer.Content class="kb-event-drawer">
										<Drawer.Header class="kb-event-drawer__header">
											<Drawer.Title class="kb-event-drawer__title">
												{calendarSelectedEvent.title}
											</Drawer.Title>
										</Drawer.Header>
										<div class="kb-event-drawer__body">
											<a
												href="/events/{calendarSelectedEvent.id}"
												class="kb-card kb-event-card"
											>
												<div
													class="kb-cimg"
													style="background: linear-gradient(135deg, var(--color-lakebed-950), var(--color-lakebed-800))"
												>
													<img
														src={calendarSelectedEvent.imageUrl ?? getPlaceholderImage(0)}
														alt=""
														class="kb-cimg-photo"
													/>
													<span class="kb-event-card-date">
														{formatEventDateShort(
															calendarSelectedEvent.startDate,
															calendarSelectedEvent.endDate
														)}
													</span>
													{#if calendarSelectedEvent.cost}
														<span class="kb-event-card-cost">
															<Badge class="kb-badge-cost">
																{calendarSelectedEvent.cost}
															</Badge>
														</span>
													{/if}
												</div>
												<div class="kb-cbody">
													<div class="kb-ctags">
														{#if calendarSelectedEvent.region}
															<Badge class="kb-badge-tag">
																{calendarSelectedEvent.region}
															</Badge>
														{/if}
														{#each getEventTypeTags(calendarSelectedEvent) as tag (tag)}
															<Badge class="kb-badge-tag kb-badge-tag--type">
																{tag}
															</Badge>
														{/each}
													</div>
													<div class="kb-ctit">{calendarSelectedEvent.title}</div>
													{#if calendarSelectedEvent.location}
														<div class="kb-cmeta">
															<MapPinIcon class="kb-location-icon" />
															{calendarSelectedEvent.location}
														</div>
													{/if}
													{#if calendarSelectedEvent.description}
														<div class="kb-cdesc">
															{stripHtml(String(calendarSelectedEvent.description))}
														</div>
													{/if}
													<span class="kb-ccta">View event</span>
												</div>
											</a>
										</div>
									</Drawer.Content>
								</Drawer.Portal>
							</Drawer.Root>
						{/if}
				</div>
			{/if}
			{#if eventView === 'cards' && filteredTotal > 6}
				<nav class="kb-pagi" aria-label="Pagination">
					<button type="button" class="kb-pbtn active">1</button>
					<button type="button" class="kb-pbtn">2</button>
				</nav>
			{/if}
		</main>

		{#if !isMobile.current}
			<aside class="kb-sidebar kb-refine-sidebar kb-event-sidebar">
				<button
					type="button"
					class="kb-clr kb-event-sidebar__close"
					onclick={() => {
						calendarSelectedId = null;
						eventDetailsOpen = false;
					}}
				>
					{#if calendarSelectedEvent}
						Close
					{/if}
				</button>

				{#if calendarSelectedEvent}
					<a
						href="/events/{calendarSelectedEvent.id}"
						class="kb-card kb-event-card kb-event-sidebar__card"
					>
						<div
							class="kb-cimg"
							style="background: linear-gradient(135deg, var(--color-lakebed-950), var(--color-lakebed-800))"
						>
							<img
								src={calendarSelectedEvent.imageUrl ?? getPlaceholderImage(0)}
								alt=""
								class="kb-cimg-photo"
							/>
							<span class="kb-event-card-date">
								{formatEventDateShort(
									calendarSelectedEvent.startDate,
									calendarSelectedEvent.endDate
								)}
							</span>
							{#if calendarSelectedEvent.cost}
								<span class="kb-event-card-cost">
									<Badge class="kb-badge-cost">{calendarSelectedEvent.cost}</Badge>
								</span>
							{/if}
						</div>
						<div class="kb-cbody">
							<div class="kb-ctags">
								{#if calendarSelectedEvent.region}
									<Badge class="kb-badge-tag">{calendarSelectedEvent.region}</Badge>
								{/if}
								{#each getEventTypeTags(calendarSelectedEvent) as tag (tag)}
									<Badge class="kb-badge-tag kb-badge-tag--type">{tag}</Badge>
								{/each}
							</div>
							<div class="kb-ctit">{calendarSelectedEvent.title}</div>
							{#if calendarSelectedEvent.location}
								<div class="kb-cmeta">
									<MapPinIcon class="kb-location-icon" />
									{calendarSelectedEvent.location}
								</div>
							{/if}
							{#if calendarSelectedEvent.description}
								<div class="kb-cdesc">
									{stripHtml(String(calendarSelectedEvent.description))}
								</div>
							{/if}
							<span class="kb-ccta">View event</span>
						</div>
					</a>
				{:else}
					{#if eventView === 'cards'}
						<p class="kb-date-graph__label">Featured events</p>
						{#each sidebarFeatured as ev, i (ev.id)}
							<a href="/events/{ev.id}" class="kb-card kb-event-card kb-event-sidebar__card">
								<div
									class="kb-cimg"
									style="background: linear-gradient(135deg, var(--color-lakebed-950), var(--color-lakebed-800))"
								>
									<img
										src={ev.imageUrl ?? getPlaceholderImage(i)}
										alt=""
										class="kb-cimg-photo"
									/>
									<span class="kb-event-card-date">
										{formatEventDateShort(ev.startDate, ev.endDate)}
									</span>
									{#if ev.cost}
										<span class="kb-event-card-cost">
											<Badge class="kb-badge-cost">{ev.cost}</Badge>
										</span>
									{/if}
								</div>
								<div class="kb-cbody">
									<div class="kb-ctags">
										{#if ev.region}
											<Badge class="kb-badge-tag">{ev.region}</Badge>
										{/if}
										{#each getEventTypeTags(ev) as tag (tag)}
											<Badge class="kb-badge-tag kb-badge-tag--type">{tag}</Badge>
										{/each}
									</div>
									<div class="kb-ctit">{ev.title}</div>
									{#if ev.location}
										<div class="kb-cmeta">
											<MapPinIcon class="kb-location-icon" />
											{ev.location}
										</div>
									{/if}
								</div>
							</a>
						{/each}
					{:else if eventView === 'list'}
						<p class="kb-date-graph__label">This week</p>
						<Calendar
							type="single"
							value={sidebarCalendarValue}
							class="kb-event-sidebar__calendar rounded-md border shadow-sm"
							numberOfMonths={1}
						/>
						<ul class="kb-elist kb-elist-eb">
							{#each sidebarWeekUpcoming as ev (ev.id)}
								<li>
									<a href="/events/{ev.id}" class="kb-elist-item kb-elist-item-eb">
										<div class="kb-elist-body">
											<div class="kb-elist-title">{ev.title}</div>
											<div class="kb-elist-meta-row">
												<span class="kb-elist-date">
													{formatEventDateShort(ev.startDate, ev.endDate)}
												</span>
												{#if ev.cost}
													<Badge class="kb-badge-cost">{ev.cost}</Badge>
												{/if}
											</div>
										</div>
									</a>
								</li>
							{/each}
						</ul>
						<div class="kb-event-sidebar__map">
						<CaliforniaMap token={data.mapboxToken ?? undefined} />
					</div>
					{:else}
						<p class="kb-date-graph__label">This calendar</p>
						<Calendar
							type="single"
							value={sidebarCalendarValue}
							class="kb-event-sidebar__calendar rounded-md border shadow-sm"
							numberOfMonths={1}
						/>
						<ul class="kb-elist kb-elist-eb">
							{#each sidebarCalendarInView as ev (ev.id)}
								<li>
									<a href="/events/{ev.id}" class="kb-elist-item kb-elist-item-eb">
										<div class="kb-elist-body">
											<div class="kb-elist-title">{ev.title}</div>
											<div class="kb-elist-meta-row">
												<span class="kb-elist-date">
													{formatEventDateShort(ev.startDate, ev.endDate)}
												</span>
											</div>
										</div>
									</a>
								</li>
							{/each}
						</ul>
					{/if}
				{/if}
			</aside>
		{/if}
	</div>

	<div class="kb-subbanner">
		<div>
			<h3>Know of an event we should list?</h3>
			<p>Submit Indigenous-led and Indigenous-serving events for IFS staff review.</p>
		</div>
		<a href="/events/submit" class="kb-subbtn">Submit an Event</a>
	</div>
</div>
