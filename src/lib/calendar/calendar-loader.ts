/**
 * Lazy-loaded Schedule-X calendar factory. Import this dynamically from the events page
 * so the calendar bundle (and theme CSS) only load when the user switches to calendar view.
 */
import type { EventItem } from '$lib/data/kb';
import { eventToSx, CALENDAR_TZ } from './event-to-sx.js';
import {
	createCalendar,
	createViewMonthAgenda,
	createViewMonthGrid,
	createViewWeek,
	createViewDay,
	viewMonthGrid,
	viewWeek,
	viewDay
} from '@schedule-x/calendar';
import { createEventsServicePlugin } from '@schedule-x/events-service';
import type { CalendarApp } from '@schedule-x/calendar';
import '@schedule-x/theme-shadcn/dist/index.css';

export {
	createCalendar,
	createViewMonthGrid,
	createViewWeek,
	createViewDay,
	viewMonthGrid,
	viewWeek,
	viewDay
};
export { createEventsServicePlugin };
export { eventToSx, CALENDAR_TZ } from './event-to-sx.js';

export type CreateScheduleXOptions = {
	initialCalendarMode?: string;
	initialCalendarYear?: number | null;
	initialCalendarMonth?: number | null;
	initialCalendarDay?: number | null;
	onEventClick: (id: string) => void;
};

/** Create Schedule-X app with events and options. Call from events page when calendar view is active. */
export async function createScheduleXAppFromEvents(
	events: EventItem[],
	options: CreateScheduleXOptions
): Promise<CalendarApp> {
	const {
		initialCalendarMode = 'month',
		initialCalendarYear,
		initialCalendarMonth,
		initialCalendarDay,
		onEventClick
	} = options;
	// Month = month grid on large screens; Schedule-X will use month agenda on small (<700px) when we list it first
	const defaultView =
		initialCalendarMode === 'week'
			? viewWeek.name
			: initialCalendarMode === 'day'
				? viewDay.name
				: viewMonthGrid.name;
	const selected =
		initialCalendarYear != null && initialCalendarMonth != null && initialCalendarDay != null
			? Temporal.PlainDate.from({
					year: initialCalendarYear,
					month: initialCalendarMonth + 1,
					day: initialCalendarDay
				})
			: Temporal.PlainDate.from(new Date().toISOString().slice(0, 10));
	const sxEvents = events.map(eventToSx).filter((e): e is NonNullable<typeof e> => e != null);
	const app = createCalendar(
		{
			// Month agenda first so small screens get month overview (agenda) instead of day view
			views: [createViewMonthAgenda(), createViewMonthGrid(), createViewWeek(), createViewDay()],
			events: sxEvents,
			theme: 'shadcn',
			timezone: CALENDAR_TZ,
			firstDayOfWeek: 7,
			defaultView,
			selectedDate: selected,
			callbacks: {
				onEventClick(calEvent: { id: string | number }) {
					onEventClick(String(calEvent.id));
				}
			}
		},
		[createEventsServicePlugin()]
	);
	return app as CalendarApp;
}
