import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { searchEvents, isMeilisearchConfigured } from '$lib/server/meilisearch';
import { searchEventsFromDb } from '$lib/server/events';

export const GET: RequestHandler = async ({ url }) => {
	const q = (url.searchParams.get('q') as string)?.trim() ?? '';
	if (q.length < 2) {
		return json({ results: null });
	}
	const events = isMeilisearchConfigured()
		? await searchEvents(q)
		: await searchEventsFromDb(q);
	return json({ results: { events } });
};
