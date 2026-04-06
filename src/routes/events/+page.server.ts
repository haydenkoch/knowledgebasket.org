import { getEvents, getEventById } from '$lib/server/events';
import { getListBySlug, getListEventIds } from '$lib/server/event-lists';
import { env } from '$env/dynamic/private';
import { withPublicDataFallback } from '$lib/server/public-load';
import { parseEventStart } from '$lib/utils/format';

export async function load({ url }) {
	const futureOnly = url.searchParams.get('future') === '1';
	const mapboxToken = env.MAPBOX_ACCESS_TOKEN ?? env.MAPBOX_TOKEN ?? null;
	const [
		{ data: allEvents, unavailable: eventsUnavailable },
		{ data: featuredList, unavailable: featuredListUnavailable }
	] = await Promise.all([
		withPublicDataFallback('events collection', () => getEvents(), []),
		withPublicDataFallback('featured event list', () => getListBySlug('featured'), null)
	]);
	let featuredEvents: Awaited<ReturnType<typeof getEventById>>[] = [];
	let dataUnavailable = eventsUnavailable || featuredListUnavailable;
	if (featuredList) {
		const { data: ids, unavailable: idsUnavailable } = await withPublicDataFallback(
			'featured event ids',
			() => getListEventIds(featuredList.id),
			[]
		);
		dataUnavailable = dataUnavailable || idsUnavailable;
		if (ids.length > 0) {
			const { data: featured, unavailable: featuredEventsUnavailable } =
				await withPublicDataFallback(
					'featured events',
					async () =>
						(await Promise.all(ids.map((id) => getEventById(id)))).filter(Boolean) as Awaited<
							ReturnType<typeof getEventById>
						>[],
					[]
				);
			featuredEvents = featured;
			dataUnavailable = dataUnavailable || featuredEventsUnavailable;
		}
	}

	const events = futureOnly
		? allEvents.filter((event) => {
				const startTs = parseEventStart(event.startDate);
				if (startTs == null) return false;
				return startTs >= new Date(new Date().setHours(0, 0, 0, 0)).getTime();
			})
		: allEvents;

	const view = url.searchParams.get('view');
	const mode = url.searchParams.get('mode');
	const dateParam = url.searchParams.get('date');
	const initialSearchQuery = url.searchParams.get('q')?.trim() ?? '';

	let initialView: 'cards' | 'list' | 'calendar' = 'list';
	if (view === 'cards' || view === 'list' || view === 'calendar') initialView = view;

	let initialCalendarMode: 'week' | 'month' | 'quarter' = 'month';
	if (mode === 'week' || mode === 'month' || mode === 'quarter') initialCalendarMode = mode;

	let initialCalendarYear: number | null = null;
	let initialCalendarMonth: number | null = null;
	let initialCalendarDay: number | null = null;
	if (dateParam) {
		const match = dateParam.match(/^(\d{4})-(\d{2})-(\d{2})$/);
		if (match) {
			initialCalendarYear = parseInt(match[1], 10);
			initialCalendarMonth = parseInt(match[2], 10) - 1;
			initialCalendarDay = parseInt(match[3], 10);
		}
	}

	return {
		events,
		featuredEvents,
		initialView,
		initialCalendarMode,
		initialCalendarYear,
		initialCalendarMonth,
		initialCalendarDay,
		initialSearchQuery,
		mapboxToken,
		dataUnavailable,
		origin: url.origin
	};
}
