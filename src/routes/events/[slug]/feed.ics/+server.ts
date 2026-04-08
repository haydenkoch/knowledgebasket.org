import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { getEventBySlugOrIcalId } from '$lib/server/events';
import { escapeIcalText, htmlToIcalText, toIcalDate } from '$lib/server/ical';

export const GET: RequestHandler = async ({ params, url }) => {
	const event = await getEventBySlugOrIcalId(params.slug);
	if (!event) throw error(404, 'Event not found');
	if (event.status != null && event.status !== 'published') throw error(404, 'Event not found');

	const start = event.startDate ? new Date(event.startDate) : null;
	const end = event.endDate ? new Date(event.endDate) : null;
	if (!start) throw error(400, 'Event has no start date');

	const lines: string[] = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Knowledge Basket//Event//EN',
		'CALSCALE:GREGORIAN',
		'BEGIN:VEVENT',
		'UID:' + event.id + '@kb',
		'DTSTAMP:' + toIcalDate(new Date()),
		'DTSTART:' + toIcalDate(start),
		'DTEND:' + (end ? toIcalDate(end) : toIcalDate(start)),
		'SUMMARY:' + escapeIcalText(event.title || '')
	];
	const desc = event.description ? htmlToIcalText(String(event.description), 500) : '';
	if (desc) lines.push('DESCRIPTION:' + desc);
	if (event.location) lines.push('LOCATION:' + escapeIcalText(event.location));
	const eventPageUrl = event.slug ? `${url.origin}/events/${event.slug}` : (event.eventUrl ?? '');
	if (eventPageUrl) lines.push('URL:' + eventPageUrl);
	lines.push('END:VEVENT', 'END:VCALENDAR');
	const body = lines.join('\r\n');

	return new Response(body, {
		headers: {
			'Content-Type': 'text/calendar; charset=utf-8',
			'Content-Disposition': 'attachment; filename="event.ics"',
			'Cache-Control': 'public, max-age=300'
		}
	});
};
