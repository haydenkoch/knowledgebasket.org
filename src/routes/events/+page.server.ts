import { kbData } from '$lib/data/kb';
import { readSubmissions } from '$lib/server/submissions';
import { fetchEventsFromIcalFeed } from '$lib/server/ical-feed';
import type { EventItem } from '$lib/data/kb';
import { env } from '$env/dynamic/private';

export async function load({ url }) {
	const mapboxToken = env.MAPBOX_ACCESS_TOKEN ?? env.MAPBOX_TOKEN ?? null;
	const [submissions, icalEvents] = await Promise.all([
		readSubmissions('events') as Promise<EventItem[]>,
		fetchEventsFromIcalFeed()
	]);
	const events: EventItem[] = [...kbData.events, ...submissions, ...icalEvents];

	const view = url.searchParams.get('view');
	const mode = url.searchParams.get('mode');
	const dateParam = url.searchParams.get('date');

	let initialCalendarView: 'cards' | 'list' | 'calendar' = 'list';
	if (view === 'calendar') initialCalendarView = 'calendar';

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
		initialCalendarView,
		initialCalendarMode,
		initialCalendarYear,
		initialCalendarMonth,
		initialCalendarDay,
		mapboxToken
	};
}
