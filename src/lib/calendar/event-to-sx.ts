/**
 * Convert EventItem to Schedule-X calendar event shape.
 * Uses ZonedDateTime 9:00–17:00 so week/day views show events in the time grid.
 */
import type { EventItem } from '$lib/data/kb';
import { parseEventStart } from '$lib/utils/format';

export const CALENDAR_TZ = 'America/Los_Angeles';

export function eventToSx(e: EventItem): {
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
