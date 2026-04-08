import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { escapeIcalText, htmlToIcalText, toIcalDate } from '$lib/server/ical';
import {
	getPersonalCalendarFeedByToken,
	getPersonalCalendarFeedEvents
} from '$lib/server/personalization';

export const GET: RequestHandler = async ({ params, url }) => {
	const feed = await getPersonalCalendarFeedByToken(params.token);
	if (!feed) throw error(404, 'Calendar feed not found');

	const events = await getPersonalCalendarFeedEvents(feed.userId);
	const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Knowledge Basket//Personal Feed//EN'];

	for (const eventItem of events) {
		if (!eventItem.startDate) continue;
		const start = new Date(eventItem.startDate);
		const end = eventItem.endDate ? new Date(eventItem.endDate) : start;
		lines.push('BEGIN:VEVENT');
		lines.push(`UID:${eventItem.id}@kb-personal`);
		lines.push(`DTSTAMP:${toIcalDate(new Date())}`);
		lines.push(`DTSTART:${toIcalDate(start)}`);
		lines.push(`DTEND:${toIcalDate(end)}`);
		lines.push(`SUMMARY:${escapeIcalText(eventItem.title || '')}`);
		if (eventItem.description) {
			lines.push(`DESCRIPTION:${htmlToIcalText(String(eventItem.description))}`);
		}
		if (eventItem.location) {
			lines.push(`LOCATION:${escapeIcalText(eventItem.location)}`);
		}
		if (eventItem.slug) {
			lines.push(`URL:${url.origin}/events/${eventItem.slug}`);
		}
		lines.push('END:VEVENT');
	}

	lines.push('END:VCALENDAR');

	return new Response(lines.join('\r\n'), {
		headers: {
			'Content-Type': 'text/calendar; charset=utf-8',
			'Content-Disposition': 'attachment; filename="knowledge-basket-personal.ics"',
			'Cache-Control': 'private, max-age=300'
		}
	});
};
