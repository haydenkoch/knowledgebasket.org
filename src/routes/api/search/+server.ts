import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { searchAll, isMeilisearchConfigured } from '$lib/server/meilisearch';
import { searchEventsFromDb } from '$lib/server/events';
import type { CoilKey } from '$lib/data/kb';

const emptyResults: Record<CoilKey, { title: string; slug?: string }[]> = {
	events: [],
	funding: [],
	redpages: [],
	jobs: [],
	toolbox: []
};

export const GET: RequestHandler = async ({ url }) => {
	const q = (url.searchParams.get('q') as string)?.trim() ?? '';
	if (q.length < 2) {
		return json({ query: q, results: emptyResults });
	}

	if (isMeilisearchConfigured()) {
		const results = await searchAll(q, { limit: 3 });
		return json({ query: q, results });
	}

	const events = await searchEventsFromDb(q);
	return json({
		query: q,
		results: {
			...emptyResults,
			events: events.slice(0, 3)
		}
	});
};
