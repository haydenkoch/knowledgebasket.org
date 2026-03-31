import type { RequestHandler } from './$types';
import { getEventsForAdmin } from '$lib/server/events';

function escapeCsv(s: string): string {
	if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
	return s;
}

function toIcalDate(d: Date): string {
	return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'moderator')) {
		return new Response('Forbidden', { status: 403 });
	}
	const format = url.searchParams.get('format') || 'csv';
	const status = url.searchParams.get('status') ?? 'all';
	const search = url.searchParams.get('search') ?? '';
	const { events } = await getEventsForAdmin({
		status: status === 'all' ? undefined : status,
		search: search || undefined,
		page: 1,
		limit: 2000
	});

	if (format === 'csv') {
		const headers = [
			'id',
			'slug',
			'title',
			'status',
			'startDate',
			'endDate',
			'location',
			'address',
			'region',
			'type',
			'audience',
			'cost',
			'eventUrl',
			'contactEmail'
		];
		const rows = events.map((e) =>
			headers
				.map((h) => escapeCsv(String((e as Record<string, unknown>)[h] ?? '')))
				.join(',')
		);
		const body = [headers.join(','), ...rows].join('\n');
		return new Response(body, {
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': 'attachment; filename="events.csv"'
			}
		});
	}

	if (format === 'ical') {
		const lines: string[] = [
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//KB Admin//Events Export//EN',
			'CALSCALE:GREGORIAN'
		];
		for (const e of events) {
			const start = e.startDate ? new Date(e.startDate) : null;
			const end = e.endDate ? new Date(e.endDate) : null;
			if (!start) continue;
			lines.push('BEGIN:VEVENT');
			lines.push('UID:' + e.id + '@kb');
			lines.push('DTSTAMP:' + toIcalDate(new Date()));
			lines.push('DTSTART:' + toIcalDate(start));
			lines.push('DTEND:' + (end ? toIcalDate(end) : toIcalDate(start)));
			lines.push('SUMMARY:' + (e.title || '').replace(/\n/g, ' '));
			if (e.location) lines.push('LOCATION:' + e.location.replace(/\n/g, ' '));
			if (e.eventUrl) lines.push('URL:' + e.eventUrl);
			lines.push('END:VEVENT');
		}
		lines.push('END:VCALENDAR');
		const body = lines.join('\r\n');
		return new Response(body, {
			headers: {
				'Content-Type': 'text/calendar; charset=utf-8',
				'Content-Disposition': 'attachment; filename="events.ics"'
			}
		});
	}

	return new Response('Invalid format', { status: 400 });
};
