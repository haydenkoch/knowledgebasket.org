import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { searchAll, isMeilisearchAvailable } from '$lib/server/meilisearch';
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
	const mode = (await isMeilisearchAvailable()) ? 'all' : 'events-only';
	if (q.length < 2) {
		return json({ query: q, results: emptyResults, mode });
	}

	if (mode === 'all') {
		const results = await searchAll(q, { limit: 3 });
		return json({ query: q, results, mode });
	}

	let events: Awaited<ReturnType<typeof searchEventsFromDb>> = [];
	try {
		events = await searchEventsFromDb(q);
	} catch {
		events = [];
	}
	return json({
		query: q,
		mode,
		results: {
			...emptyResults,
			events: events.slice(0, 3)
		}
	});
};
