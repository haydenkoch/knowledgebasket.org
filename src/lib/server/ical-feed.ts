/**
 * Fetch and parse an iCal/ICS feed (e.g. News from Native California) and return
 * future events in KB EventItem shape. Used to merge external calendar events
 * into the events list.
 */
import type { EventItem } from '$lib/data/kb';
import { parseIcalEvents } from '$lib/server/ingestion/adapters/ical-shared';

const ICS_FEED_URL = 'https://newsfromnativecalifornia.com/events/list/?ical=1';

/** Format Date as MM/DD/YYYY for EventItem.startDate/endDate */
function toMMDDYYYY(d: Date): string {
	const m = d.getMonth() + 1;
	const day = d.getDate();
	return `${String(m).padStart(2, '0')}/${String(day).padStart(2, '0')}/${d.getFullYear()}`;
}

/** Source label for imported events */
const SOURCE_LABEL = 'News from Native California';

/**
 * Fetch the ICS feed, parse it, and return EventItem[] for events that start
 * on or after today. Recurring events are expanded (next 2 years).
 */
export async function fetchEventsFromIcalFeed(
	url: string = ICS_FEED_URL,
	options?: { signal?: AbortSignal; from?: Date; to?: Date }
): Promise<EventItem[]> {
	const from = options?.from ?? new Date();
	const to = options?.to ?? new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000);

	try {
		const response = await fetch(url, {
			signal: options?.signal,
			headers: {
				'User-Agent': 'KB-Events-Importer/1.0',
				Accept: 'text/calendar, text/plain;q=0.9,*/*;q=0.5'
			}
		});
		if (!response.ok) {
			throw new Error(`HTTP ${response.status} while fetching ICS feed`);
		}

		const rawContent = await response.text();
		const data = parseIcalEvents(rawContent);
		const items: EventItem[] = [];
		const seenIds = new Set<string>();

		for (const ev of data) {
			const start = ev.start;
			const end = ev.end ?? start;
			if (start < from || start > to) continue;

			const uid = ev.uid.replace(/[^a-zA-Z0-9-_]/g, '_');
			const id = `ical-${uid}`;
			if (seenIds.has(id)) continue;
			seenIds.add(id);

			items.push({
				id,
				slug: id,
				title: ev.summary,
				coil: 'events',
				description: ev.description ?? '',
				location: ev.location ?? undefined,
				region: SOURCE_LABEL,
				startDate: toMMDDYYYY(start),
				endDate: end.getTime() !== start.getTime() ? toMMDDYYYY(end) : undefined,
				eventUrl: ev.url ?? 'https://newsfromnativecalifornia.com/events/',
				hostOrg: SOURCE_LABEL
			});
		}

		// Sort by start date
		items.sort((a, b) => {
			const aStart = a.startDate ? new Date(a.startDate).getTime() : 0;
			const bStart = b.startDate ? new Date(b.startDate).getTime() : 0;
			return aStart - bStart;
		});

		return items;
	} catch (err) {
		console.error('[ical-feed] Failed to fetch or parse ICS:', err);
		return [];
	}
}
