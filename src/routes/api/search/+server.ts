import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { searchEvents } from '$lib/server/meilisearch';

export const GET: RequestHandler = async ({ url }) => {
	const q = (url.searchParams.get('q') as string)?.trim() ?? '';
	if (q.length < 2) {
		return json({ results: null });
	}
	const events = await searchEvents(q);
	return json({ results: { events } });
};
