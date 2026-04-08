/**
 * Events filter and pagination state — v2.
 *
 * Same shape and contract as `use-events-filters.svelte.ts`, with new filter axes:
 *   - formatSelect       (in_person | online | hybrid)
 *   - audienceSelect     (free-text from event.audience, faceted)
 *   - sortBy             (sort order, replaces hard-coded ascending sort)
 *   - featuredOnly       (only event.featured === true)
 *   - hideSoldOut        (drop event.soldOut === true)
 *   - registrationOpen   (drop events whose registrationDeadline has passed)
 *   - closingThisWeek    (only events with registrationDeadline in the next 7 days)
 *
 * Call from events +page.svelte only (uses runes).
 */
import type { EventItem } from '$lib/data/kb';
import { eventTypeGroups, eventTypeTags } from '$lib/data/formSchema';
import {
	EVENT_COST_FILTERS,
	countEventsByCostBucket,
	eventMatchesCostFilters
} from '$lib/utils/event-pricing';
import {
	matchSearch,
	filterByFacets,
	facetCounts,
	parseEventStart,
	eventTypeGroupCounts,
	eventMatchesTypeGroup
} from '$lib/utils/format';
const EVENTS_PAGE_SIZE = 12;

export const EVENTS_SORT_OPTIONS = [
	{ id: 'soonest', label: 'Soonest first' },
	{ id: 'latest', label: 'Latest first' },
	{ id: 'featured', label: 'Featured first' },
	{ id: 'closing', label: 'Closing soon' },
	{ id: 'alpha', label: 'Alphabetical' }
] as const;
export type EventsSortKey = (typeof EVENTS_SORT_OPTIONS)[number]['id'];

function getDefaultRange() {
	const d = new Date();
	const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
	const end = new Date(d.getFullYear(), d.getMonth() + 13, 0, 23, 59, 59, 999).getTime();
	return { start, end };
}

function parseDeadline(value: string | undefined | null): number | null {
	if (!value) return null;
	const ts = Date.parse(value);
	return Number.isNaN(ts) ? null : ts;
}

export type EventsFiltersData = { events?: EventItem[]; initialSearchQuery?: string | null };

export function useEventsFiltersV2(data: EventsFiltersData | (() => EventsFiltersData)) {
	const events = $derived(
		((typeof data === 'function' ? data() : data).events ?? []) as EventItem[]
	);
	const initialSearchQuery = $derived(
		((typeof data === 'function' ? data() : data).initialSearchQuery ?? '').trim()
	);

	let searchQuery = $state('');
	let regionSelect = $state<string[]>([]);
	let typeSelect = $state<string[]>([]);
	let costFilter = $state<string[]>([]);
	let formatSelect = $state<string[]>([]);
	let audienceSelect = $state<string[]>([]);
	let sortBy = $state<EventsSortKey>('soonest');
	let featuredOnly = $state(false);
	let hideSoldOut = $state(false);
	let registrationOpen = $state(false);
	let closingThisWeek = $state(false);
	let rangeStart = $state(getDefaultRange().start);
	let rangeEnd = $state(getDefaultRange().end);
	let sliderIndices = $state<[number, number] | null>(null);
	let pageBinding = $state(1);

	$effect(() => {
		searchQuery = initialSearchQuery;
	});

	const todayStart = $derived(new Date(new Date().setHours(0, 0, 0, 0)).getTime());
	const defaultRangeEnd = $derived(
		new Date(new Date().getFullYear(), new Date().getMonth() + 13, 0, 23, 59, 59, 999).getTime()
	);
	const oneWeekFromNow = $derived(todayStart + 7 * 24 * 60 * 60 * 1000);

	const dateBuckets = $derived.by(() => {
		const now = new Date();
		const buckets: { label: string; start: number; end: number; count: number }[] = [];
		const eventRanges = events
			.map((e) => {
				const startTs = parseEventStart(e.startDate);
				if (startTs == null) return null;
				const endTs = e.endDate?.trim() ? (parseEventStart(e.endDate) ?? startTs) : startTs;
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

	const sliderMinIx = $derived(sliderIndices?.[0] ?? dateRangeMinIx);
	const sliderMaxIx = $derived(sliderIndices?.[1] ?? dateRangeMaxIx);

	const regionCounts = $derived(facetCounts(events, 'region'));
	const audienceCounts = $derived(facetCounts(events, 'audience'));
	const typeGroupCounts = $derived(eventTypeGroupCounts(events, eventTypeGroups));
	const costCounts = $derived(countEventsByCostBucket(events));
	const regionValues = $derived(Object.keys(regionCounts).sort());
	const audienceValues = $derived(Object.keys(audienceCounts).sort());
	const costValues = $derived(
		EVENT_COST_FILTERS.map((option) => option.id).filter((id) => (costCounts[id] ?? 0) > 0)
	);

	// ── Filter chain ──────────────────────────────────────────────────────────
	const searchFiltered = $derived(
		events.filter((e) => matchSearch(e, searchQuery, ['location', 'region', 'type', 'title']))
	);
	const costFiltered = $derived(
		searchFiltered.filter((e) => eventMatchesCostFilters(e, costFilter))
	);
	const regionFiltered = $derived(filterByFacets(costFiltered, { region: regionSelect }));
	const audienceFiltered = $derived(filterByFacets(regionFiltered, { audience: audienceSelect }));
	const formatFiltered = $derived(
		formatSelect.length === 0
			? audienceFiltered
			: audienceFiltered.filter((e) => !!e.eventFormat && formatSelect.includes(e.eventFormat))
	);
	const typeGroupsForFilter = $derived(
		eventTypeGroups.filter((g) => g.tags.some((tag) => typeSelect.includes(tag)))
	);
	const facetFiltered = $derived(
		typeSelect.length === 0
			? formatFiltered
			: formatFiltered.filter((e) =>
					typeGroupsForFilter.some((g) => eventMatchesTypeGroup(e, g.tags))
				)
	);
	const dateFiltered = $derived(
		facetFiltered.filter((e) => {
			const t = parseEventStart(e.startDate);
			return t != null && t >= rangeStart && t <= rangeEnd;
		})
	);
	const statusFiltered = $derived(
		dateFiltered.filter((e) => {
			if (featuredOnly && !e.featured) return false;
			if (hideSoldOut && e.soldOut) return false;
			if (registrationOpen) {
				const dl = parseDeadline(e.registrationDeadline);
				if (dl != null && dl < todayStart) return false;
				if (e.soldOut) return false;
			}
			if (closingThisWeek) {
				const dl = parseDeadline(e.registrationDeadline);
				if (dl == null || dl < todayStart || dl > oneWeekFromNow) return false;
			}
			return true;
		})
	);

	// ── Derived counts (against current date range) ──────────────────────────
	const eventsInDateRange = $derived(
		searchFiltered.filter((e) => {
			const t = parseEventStart(e.startDate);
			return t != null && t >= rangeStart && t <= rangeEnd;
		})
	);
	const costCountsInRange = $derived(countEventsByCostBucket(eventsInDateRange));
	const regionCountsInRange = $derived(facetCounts(eventsInDateRange, 'region'));
	const audienceCountsInRange = $derived(facetCounts(eventsInDateRange, 'audience'));
	const typeGroupCountsInRange = $derived(eventTypeGroupCounts(eventsInDateRange, eventTypeGroups));
	const formatCountsInRange = $derived.by(() => {
		const out: Record<string, number> = {};
		for (const e of eventsInDateRange) {
			if (!e.eventFormat) continue;
			out[e.eventFormat] = (out[e.eventFormat] ?? 0) + 1;
		}
		return out;
	});
	const costValuesVisible = $derived(
		EVENT_COST_FILTERS.map((option) => option.id).filter(
			(id) => (costCountsInRange[id] ?? 0) > 0 || costFilter.includes(id)
		)
	);
	const regionValuesVisible = $derived(
		regionValues.filter((r) => (regionCountsInRange[r] ?? 0) > 0 || regionSelect.includes(r))
	);
	const audienceValuesVisible = $derived(
		audienceValues.filter((a) => (audienceCountsInRange[a] ?? 0) > 0 || audienceSelect.includes(a))
	);
	const typeTagsVisible = $derived.by(() => {
		return eventTypeTags.filter((tag) => {
			const group = eventTypeGroups.find((g) => (g.tags as readonly string[]).includes(tag));
			const count = group ? (typeGroupCountsInRange[group.label] ?? 0) : 0;
			return count > 0 || typeSelect.includes(tag);
		});
	});

	// ── Sort ──────────────────────────────────────────────────────────────────
	const filtered = $derived.by(() => {
		const list = [...statusFiltered];
		switch (sortBy) {
			case 'latest':
				return list.sort(
					(a, b) =>
						(parseEventStart(b.startDate) ?? -Infinity) -
						(parseEventStart(a.startDate) ?? -Infinity)
				);
			case 'featured':
				return list.sort((a, b) => {
					const fa = a.featured ? 0 : 1;
					const fb = b.featured ? 0 : 1;
					if (fa !== fb) return fa - fb;
					return (
						(parseEventStart(a.startDate) ?? Infinity) - (parseEventStart(b.startDate) ?? Infinity)
					);
				});
			case 'closing':
				return list.sort((a, b) => {
					const da = parseDeadline(a.registrationDeadline) ?? Infinity;
					const db = parseDeadline(b.registrationDeadline) ?? Infinity;
					if (da !== db) return da - db;
					return (
						(parseEventStart(a.startDate) ?? Infinity) - (parseEventStart(b.startDate) ?? Infinity)
					);
				});
			case 'alpha':
				return list.sort((a, b) => a.title.localeCompare(b.title));
			case 'soonest':
			default:
				return list.sort(
					(a, b) =>
						(parseEventStart(a.startDate) ?? Infinity) - (parseEventStart(b.startDate) ?? Infinity)
				);
		}
	});
	const filteredTotal = $derived(filtered.length);
	const totalPages = $derived(Math.max(1, Math.ceil(filteredTotal / EVENTS_PAGE_SIZE)));
	const currentPage = $derived(Math.min(Math.max(1, pageBinding), totalPages));
	const paginatedList = $derived(
		filtered.slice((currentPage - 1) * EVENTS_PAGE_SIZE, currentPage * EVENTS_PAGE_SIZE)
	);

	$effect(() => {
		if (pageBinding > totalPages) pageBinding = Math.max(1, totalPages);
	});

	function setRangeFromIndices(minIx: number, maxIx: number) {
		const buckets = dateBuckets.buckets;
		if (!buckets.length) return;
		const min = Math.max(0, Math.min(minIx, buckets.length - 1));
		const max = Math.max(min, Math.min(maxIx, buckets.length - 1));
		rangeStart = buckets[min].start;
		rangeEnd = buckets[max].end;
	}

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

	function clearFilters() {
		searchQuery = '';
		regionSelect = [];
		typeSelect = [];
		costFilter = [];
		formatSelect = [];
		audienceSelect = [];
		featuredOnly = false;
		hideSoldOut = false;
		registrationOpen = false;
		closingThisWeek = false;
		sortBy = 'soonest';
		rangeStart = todayStart;
		rangeEnd = defaultRangeEnd;
	}

	function toggleMulti(arr: string[], value: string): string[] {
		return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
	}

	return {
		get searchQuery() {
			return searchQuery;
		},
		set searchQuery(v: string) {
			searchQuery = v;
		},
		get regionSelect() {
			return regionSelect;
		},
		set regionSelect(v: string[]) {
			regionSelect = v;
		},
		get typeSelect() {
			return typeSelect;
		},
		set typeSelect(v: string[]) {
			typeSelect = v;
		},
		get costFilter() {
			return costFilter;
		},
		set costFilter(v: string[]) {
			costFilter = v;
		},
		get formatSelect() {
			return formatSelect;
		},
		set formatSelect(v: string[]) {
			formatSelect = v;
		},
		get audienceSelect() {
			return audienceSelect;
		},
		set audienceSelect(v: string[]) {
			audienceSelect = v;
		},
		get sortBy() {
			return sortBy;
		},
		set sortBy(v: EventsSortKey) {
			sortBy = v;
		},
		get featuredOnly() {
			return featuredOnly;
		},
		set featuredOnly(v: boolean) {
			featuredOnly = v;
		},
		get hideSoldOut() {
			return hideSoldOut;
		},
		set hideSoldOut(v: boolean) {
			hideSoldOut = v;
		},
		get registrationOpen() {
			return registrationOpen;
		},
		set registrationOpen(v: boolean) {
			registrationOpen = v;
		},
		get closingThisWeek() {
			return closingThisWeek;
		},
		set closingThisWeek(v: boolean) {
			closingThisWeek = v;
		},
		get rangeStart() {
			return rangeStart;
		},
		set rangeStart(v: number) {
			rangeStart = v;
		},
		get rangeEnd() {
			return rangeEnd;
		},
		set rangeEnd(v: number) {
			rangeEnd = v;
		},
		get pageBinding() {
			return pageBinding;
		},
		set pageBinding(v: number) {
			pageBinding = v;
		},
		get todayStart() {
			return todayStart;
		},
		get defaultRangeEnd() {
			return defaultRangeEnd;
		},
		get dateBuckets() {
			return dateBuckets;
		},
		get numBuckets() {
			return numBuckets;
		},
		get dateRangeMinIx() {
			return dateRangeMinIx;
		},
		get dateRangeMaxIx() {
			return dateRangeMaxIx;
		},
		get sliderMinIx() {
			return sliderMinIx;
		},
		get sliderMaxIx() {
			return sliderMaxIx;
		},
		get regionCounts() {
			return regionCounts;
		},
		get audienceCounts() {
			return audienceCounts;
		},
		get typeGroupCounts() {
			return typeGroupCounts;
		},
		get costCounts() {
			return costCounts;
		},
		get regionValues() {
			return regionValues;
		},
		get audienceValues() {
			return audienceValues;
		},
		get costValues() {
			return costValues;
		},
		get searchFiltered() {
			return searchFiltered;
		},
		get costFiltered() {
			return costFiltered;
		},
		get regionFiltered() {
			return regionFiltered;
		},
		get audienceFiltered() {
			return audienceFiltered;
		},
		get formatFiltered() {
			return formatFiltered;
		},
		get facetFiltered() {
			return facetFiltered;
		},
		get dateFiltered() {
			return dateFiltered;
		},
		get statusFiltered() {
			return statusFiltered;
		},
		get eventsInDateRange() {
			return eventsInDateRange;
		},
		get costCountsInRange() {
			return costCountsInRange;
		},
		get regionCountsInRange() {
			return regionCountsInRange;
		},
		get audienceCountsInRange() {
			return audienceCountsInRange;
		},
		get typeGroupCountsInRange() {
			return typeGroupCountsInRange;
		},
		get formatCountsInRange() {
			return formatCountsInRange;
		},
		get costValuesVisible() {
			return costValuesVisible;
		},
		get regionValuesVisible() {
			return regionValuesVisible;
		},
		get audienceValuesVisible() {
			return audienceValuesVisible;
		},
		get typeTagsVisible() {
			return typeTagsVisible;
		},
		get filtered() {
			return filtered;
		},
		get filteredTotal() {
			return filteredTotal;
		},
		get totalPages() {
			return totalPages;
		},
		get currentPage() {
			return currentPage;
		},
		get paginatedList() {
			return paginatedList;
		},
		setRangeFromIndices,
		handleSliderChange,
		handleSliderCommit,
		clearFilters,
		toggleMulti,
		EVENTS_PAGE_SIZE,
		eventTypeGroups
	};
}
