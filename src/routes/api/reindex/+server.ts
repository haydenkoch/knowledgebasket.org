import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getEvents } from '$lib/server/events';
import { reindexAllEvents } from '$lib/server/meilisearch';

/**
 * Reindex all events from DB into Meilisearch. Call after db:seed or when search is out of sync.
 * In production, protect this route (e.g. require auth or secret).
 */
export const POST: RequestHandler = async () => {
	const events = await getEvents({ includeIcal: false });
	await reindexAllEvents(events);
	return json({ ok: true, indexed: events.length });
};
