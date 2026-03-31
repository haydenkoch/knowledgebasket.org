import { getEvents, getEventById } from '$lib/server/events';
import { getListBySlug, getListEventIds } from '$lib/server/event-lists';
import { env } from '$env/dynamic/private';

export async function load({ url }) {
	const mapboxToken = env.MAPBOX_ACCESS_TOKEN ?? env.MAPBOX_TOKEN ?? null;
	const [events, featuredList] = await Promise.all([getEvents(), getListBySlug('featured')]);
	let featuredEvents: Awaited<ReturnType<typeof getEventById>>[] = [];
	if (featuredList) {
		const ids = await getListEventIds(featuredList.id);
		featuredEvents = (await Promise.all(ids.map((id) => getEventById(id)))).filter(Boolean) as Awaited<ReturnType<typeof getEventById>>[];
	}

	const view = url.searchParams.get('view');
	const mode = url.searchParams.get('mode');
	const dateParam = url.searchParams.get('date');

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
		mapboxToken
	};
}
