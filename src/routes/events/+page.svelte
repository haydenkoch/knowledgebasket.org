<script lang="ts">
	import 'temporal-polyfill/global';
	import EventsViewTabs from '$lib/components/organisms/EventsViewTabs.svelte';
	import KbHero from '$lib/components/organisms/KbHero.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import SearchIcon from '@lucide/svelte/icons/search';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { CalendarDate } from '@internationalized/date';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { setContext } from 'svelte';
	import { get } from 'svelte/store';
	import type { EventItem } from '$lib/data/kb';
	import type { CalendarApp } from '@schedule-x/calendar';
	import EventsFilterBar from '$lib/components/organisms/EventsFilterBar.svelte';
	import EventCard from '$lib/components/molecules/EventCard.svelte';
	import EventListItem from '$lib/components/molecules/EventListItem.svelte';
	import EventsToolbar from '$lib/components/molecules/EventsToolbar.svelte';
	import EventsDateRangeFilter from '$lib/components/organisms/EventsDateRangeFilter.svelte';
	import EventsSidebar from '$lib/components/organisms/EventsSidebar.svelte';
	import EventsCalendarView from '$lib/components/organisms/EventsCalendarView.svelte';
	import EventsRightSidebar from '$lib/components/organisms/EventsRightSidebar.svelte';
	import { tsToDateStr, dateStrToTs, tsToCalendarDate } from '$lib/utils/date.js';
import {
	matchSearch,
	filterByFacets,
	facetCounts,
	parseEventStart,
	formatEventTime,
	eventCalendarParts,
	eventCalendarDaysSpanned,
	isMultiDayEvent,
	eventMatchesTypeGroup,
	eventTypeGroupCounts
} from '$lib/utils/format';
import { eventTypeGroups, eventTypeTags } from '$lib/data/formSchema';
import { IsMobile } from '$lib/hooks/is-mobile.svelte';

	type EventView = 'cards' | 'list' | 'calendar';

	const EVENTS_PAGE_SIZE = 12;

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
	let eventDetailsOpen = $state(false);
	const isMobile = new IsMobile();

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
		};
		if (d.initialView === 'cards' || d.initialView === 'list' || d.initialView === 'calendar')
			eventView = d.initialView;
		if (d.initialCalendarMode === 'week' || d.initialCalendarMode === 'month' || d.initialCalendarMode === 'quarter')
			calendarViewMode = d.initialCalendarMode as CalendarViewMode;
		if (d.initialCalendarYear != null) calendarYear = d.initialCalendarYear;
		if (d.initialCalendarMonth != null) calendarMonth = d.initialCalendarMonth;
		if (d.initialCalendarDay != null) selectedDay = d.initialCalendarDay;
	});

	/** Sync URL when user changes main view (Cards / List / Calendar). Defer so tab switch paints first. */
	$effect(() => {
		const v = eventView;
		const p = get(page);
		const url = new URL(p.url);
		const current = url.searchParams.get('view');
		if (current === v) return;
		url.searchParams.set('view', v);
		if (v !== 'calendar') {
			url.searchParams.delete('mode');
			url.searchParams.delete('date');
		}
		const pathSearch = `${url.pathname}${url.search}`;
		queueMicrotask(() => goto(pathSearch, { replaceState: true, noScroll: true }));
	});

	/** Create Schedule-X calendar when user switches to calendar view (lazy-loads calendar bundle). */
	$effect(() => {
		if (eventView !== 'calendar') return;
		if (scheduleXApp) return;
		if (calendarLoadStarted) return;
		calendarLoadStarted = true;
		const d = data as {
			initialCalendarMode?: string;
			initialCalendarYear?: number | null;
			initialCalendarMonth?: number | null;
			initialCalendarDay?: number | null;
		};
		import('$lib/calendar/calendar-loader.js').then((mod) => {
			const mode = d.initialCalendarMode ?? 'month';
			const defaultView =
				mode === 'week' ? mod.viewWeek.name : mode === 'day' ? mod.viewDay.name : mod.viewMonthGrid.name;
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
			scheduleXApp = mod.createCalendar(
				{
					views: [mod.createViewMonthGrid(), mod.createViewWeek(), mod.createViewDay()],
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
				[mod.createEventsServicePlugin()]
			);
		});
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
		const service = (scheduleXApp as { eventsService?: { set: (events: unknown[]) => void } }).eventsService;
		if (!service) return;
		const sxEvents = filtered.map(eventToSx).filter((e): e is NonNullable<typeof e> => e != null);
		service.set(sxEvents);
	});

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

	// Fixed 24 month buckets from real events: 12 months back + 12 months forward from today.
	// Each bar = count of events that overlap that month (start in or span into it).
	const dateBuckets = $derived.by(() => {
		const now = new Date();
		const buckets: { label: string; start: number; end: number; count: number }[] = [];
		const eventRanges = events
			.map((e) => {
				const startTs = parseEventStart(e.startDate);
				if (startTs == null) return null;
				const endTs = e.endDate?.trim() ? parseEventStart(e.endDate) ?? startTs : startTs;
				const end = endTs >= startTs ? endTs : startTs;
				return { start: startTs, end };
			})
			.filter((r): r is { start: number; end: number } => r != null);
		for (let i = -12; i < 12; i++) {
			const y = now.getFullYear();
			const m = now.getMonth() + i;
			const monthStart = new Date(y, m, 1).getTime();
			const monthEnd = new Date(y, m + 1, 0, 23, 59, 59, 999).getTime();
			const count = eventRanges.filter(
				({ start, end }) => start <= monthEnd && end >= monthStart
			).length;
			buckets.push({
				label: new Date(y, m).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
				start: monthStart,
				end: monthEnd,
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

	const totalPages = $derived(Math.max(1, Math.ceil(filteredTotal / EVENTS_PAGE_SIZE)));
	const currentPageFromUrl = $derived.by(() => {
		const p = get(page).url.searchParams.get('page');
		const n = parseInt(p ?? '1', 10);
		return Number.isFinite(n) && n >= 1 ? n : 1;
	});
	const currentPage = $derived(Math.min(currentPageFromUrl, totalPages));
	const paginatedList = $derived(
		filtered.slice((currentPage - 1) * EVENTS_PAGE_SIZE, currentPage * EVENTS_PAGE_SIZE)
	);

	function goToPage(num: number) {
		const url = new URL(get(page).url);
		url.searchParams.set('page', String(num));
		goto(url.pathname + url.search);
	}


	const calendarSelectedEvent = $derived(
		calendarSelectedId ? filtered.find((e) => (e.slug ?? e.id) === calendarSelectedId) ?? null : null
	);

	/** Sidebar feeds */
	const sidebarFeatured = $derived(filtered.slice(0, 3));
	const sidebarWeekUpcoming = $derived(
		(() => {
			const nowTs = todayStart;
			const weekEnd = nowTs + 7 * 24 * 60 * 60 * 1000;
			return filtered.filter((e) => {
				const t = parseEventStart(e.startDate);
				return t != null && t >= nowTs && t <= weekEnd;
			}).slice(0, 5);
		})()
	);
	const sidebarCalendarInView = $derived(filtered.slice(0, 8));

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

<svelte:head>
	<title>Events | Knowledge Basket</title>
	<meta name="description" content="Indigenous gatherings, trainings, and cultural events in the Sierra Nevada bioregion and California. Find and submit events." />
</svelte:head>

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
		<EventsSidebar>
			<div class="kb-search-wrap" role="search" aria-label="Search events">
				<span class="kb-search-icon" aria-hidden="true">
					<SearchIcon size={16} strokeWidth={1.8} aria-hidden="true" />
				</span>
				<Input
					type="search"
					placeholder="Search events…"
					class="kb-search-input"
					bind:value={searchQuery}
					aria-label="Search events"
				/>
			</div>
			<div class="kb-fg">
				<div class="kb-flbl">View</div>
				<EventsViewTabs bind:value={eventView} />
			</div>

			<EventsDateRangeFilter
				{dateBuckets}
				{numBuckets}
				{sliderMinIx}
				{sliderMaxIx}
				{rangeStart}
				{rangeEnd}
				bind:startDateOpen
				bind:endDateOpen
				bind:startDateDisplay
				bind:endDateDisplay
				onSliderChange={handleSliderChange}
				onSliderCommit={handleSliderCommit}
				onRangeStartChange={(ts) => {
					rangeStart = ts;
					if (rangeStart > rangeEnd) rangeEnd = rangeStart;
				}}
				onRangeEndChange={(ts) => {
					rangeEnd = ts;
					if (rangeEnd < rangeStart) rangeStart = dateStrToTs(tsToDateStr(ts));
				}}
				onStartDateOpenChange={(open) => (startDateOpen = open)}
				onEndDateOpenChange={(open) => (endDateOpen = open)}
			/>

			<!-- Facet filters -->
			<EventsFilterBar
				bind:costOpen
				bind:regionOpen
				bind:typeOpen
				{costFilter}
				{regionSelect}
				{typeSelect}
				{costValuesVisible}
				{regionValuesVisible}
				{typeTagsVisible}
				{costCountsInRange}
				{regionCountsInRange}
				{typeGroupCountsInRange}
				{eventTypeGroups}
				{formatCostLabel}
				{regionTriggerLabel}
				onCostChange={(c: string) => (costFilter = toggleMulti(costFilter, c))}
				onRegionChange={(r: string) => (regionSelect = toggleMulti(regionSelect, r))}
				onTypeChange={(t: string) => (typeSelect = toggleMulti(typeSelect as string[], t))}
				onTypeRemove={removeType}
				onClear={clearFilters}
			/>
		</EventsSidebar>
		<main class="kb-main">
			<h2 class="sr-only">Upcoming events</h2>
			<EventsToolbar filteredTotal={filteredTotal} />

			{#if eventView === 'cards'}
				{#if filtered.length === 0}
					<div class="kb-empty-state" role="status">
						<p class="kb-empty-state__message">No events match your filters.</p>
						<button type="button" class="kb-empty-state__cta" onclick={clearFilters}>Clear filters</button>
					</div>
				{:else}
					<div class="kb-grid kb-event-cards">
						{#each paginatedList as event, i (event.slug ?? event.id)}
							<EventCard {event} index={i + (currentPage - 1) * EVENTS_PAGE_SIZE} />
						{/each}
					</div>
				{/if}
			{:else if eventView === 'list'}
				{#if filtered.length === 0}
					<div class="kb-empty-state" role="status">
						<p class="kb-empty-state__message">No events match your filters.</p>
						<button type="button" class="kb-empty-state__cta" onclick={clearFilters}>Clear filters</button>
					</div>
				{:else}
					<ul class="kb-elist kb-elist-eb">
						{#each paginatedList as event, i (event.slug ?? event.id)}
							<li>
								<EventListItem {event} index={i + (currentPage - 1) * EVENTS_PAGE_SIZE} />
							</li>
						{/each}
					</ul>
				{/if}
			{:else}
				<EventsCalendarView
					scheduleXApp={scheduleXApp}
					calendarSelectedEvent={calendarSelectedEvent}
					bind:eventDetailsOpen
					isMobile={isMobile}
				/>
			{/if}
			{#if (eventView === 'cards' || eventView === 'list') && totalPages > 1}
				<nav class="kb-pagi" aria-label="Events pagination">
					<button
						type="button"
						class="kb-pbtn"
						disabled={currentPage <= 1}
						onclick={() => goToPage(currentPage - 1)}
						aria-label="Previous page"
					>
						<ChevronLeftIcon class="size-4" aria-hidden="true" />
					</button>
					{#each Array.from({ length: totalPages }, (_, i) => i + 1) as pageNum}
						<button
							type="button"
							class="kb-pbtn"
							class:active={pageNum === currentPage}
							aria-current={pageNum === currentPage ? 'page' : undefined}
							onclick={() => goToPage(pageNum)}
						>
							{pageNum}
						</button>
					{/each}
					<button
						type="button"
						class="kb-pbtn"
						disabled={currentPage >= totalPages}
						onclick={() => goToPage(currentPage + 1)}
						aria-label="Next page"
					>
						<ChevronRightIcon class="size-4" aria-hidden="true" />
					</button>
				</nav>
			{/if}
		</main>

		{#if !isMobile.current}
			<EventsRightSidebar
				calendarSelectedEvent={calendarSelectedEvent}
				{eventView}
				sidebarFeatured={sidebarFeatured}
				sidebarCalendarValue={sidebarCalendarValue}
				sidebarWeekUpcoming={sidebarWeekUpcoming}
				sidebarCalendarInView={sidebarCalendarInView}
				mapboxToken={data.mapboxToken ?? undefined}
				onClose={() => {
					calendarSelectedId = null;
					eventDetailsOpen = false;
				}}
			/>
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
