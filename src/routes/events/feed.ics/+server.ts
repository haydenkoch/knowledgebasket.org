import type { RequestHandler } from './$types';
import { getEvents } from '$lib/server/events';
import { escapeIcalText, toIcalDate } from '$lib/server/ical';

export const GET: RequestHandler = async ({ url }) => {
	const events = await getEvents({ includeIcal: false, includeUnlisted: true });
	const listSlug = url.searchParams.get('list') ?? null;
	let filtered = events.filter((e) => e.status === 'published');

	if (listSlug) {
		const { getListBySlug, getPublicListEventIds } = await import('$lib/server/event-lists');
		const { getEventById } = await import('$lib/server/events');
		const list = await getListBySlug(listSlug);
		if (list) {
			const ids = await getPublicListEventIds(list.id);
			const listEvents = (await Promise.all(ids.map((id) => getEventById(id)))).filter(Boolean);
			filtered = listEvents as typeof events;
		}
	}

	const lines: string[] = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Knowledge Basket//Events//EN',
		'CALSCALE:GREGORIAN'
	];
	for (const e of filtered) {
		const start = e.startDate ? new Date(e.startDate) : null;
		const end = e.endDate ? new Date(e.endDate) : null;
		if (!start) continue;
		lines.push('BEGIN:VEVENT');
		lines.push('UID:' + e.id + '@kb');
		lines.push('DTSTAMP:' + toIcalDate(new Date()));
		lines.push('DTSTART:' + toIcalDate(start));
		lines.push('DTEND:' + (end ? toIcalDate(end) : toIcalDate(start)));
		lines.push('SUMMARY:' + escapeIcalText(e.title || ''));
		if (e.location) lines.push('LOCATION:' + escapeIcalText(e.location));
		if (e.eventUrl) lines.push('URL:' + e.eventUrl);
		lines.push('END:VEVENT');
	}
	lines.push('END:VCALENDAR');
	const body = lines.join('\r\n');

	return new Response(body, {
		headers: {
			'Content-Type': 'text/calendar; charset=utf-8',
			'Cache-Control': 'public, max-age=300'
		}
	});
};
