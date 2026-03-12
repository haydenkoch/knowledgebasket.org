/**
 * Lazy-loaded Schedule-X calendar factory. Import this dynamically from the events page
 * so the calendar bundle (and theme CSS) only load when the user switches to calendar view.
 */
export {
	createCalendar,
	createViewMonthGrid,
	createViewWeek,
	createViewDay,
	viewMonthGrid,
	viewWeek,
	viewDay
} from '@schedule-x/calendar';
export { createEventsServicePlugin } from '@schedule-x/events-service';
import '@schedule-x/theme-shadcn/dist/index.css';
