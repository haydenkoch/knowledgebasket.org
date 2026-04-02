import type { PageServerLoad } from './$types';
import type { CoilKey } from '$lib/data/kb';
import { isMeilisearchConfigured, searchAll, type SearchDoc } from '$lib/server/meilisearch';
import { searchEventsFromDb } from '$lib/server/events';

const emptyResults: Record<CoilKey, SearchDoc[]> = {
	events: [],
	funding: [],
	redpages: [],
	jobs: [],
	toolbox: []
};

export const load: PageServerLoad = async ({ url }) => {
	const query = url.searchParams.get('q')?.trim() ?? '';
	const searchMode = isMeilisearchConfigured() ? 'all' : 'events-only';

	let results = emptyResults;
	if (query.length >= 2) {
		if (searchMode === 'all') {
			results = await searchAll(query, { limit: 12 });
		} else {
			let events: Awaited<ReturnType<typeof searchEventsFromDb>> = [];
			try {
				events = await searchEventsFromDb(query);
			} catch {
				events = [];
			}
			results = {
				...emptyResults,
				events: events.slice(0, 12).map((event) => ({
					id: event.id,
					slug: event.slug ?? event.id,
					title: event.title,
					description: event.description,
					coil: 'events'
				}))
			};
		}
	}

	return {
		query,
		results,
		searchMode,
		origin: url.origin
	};
};
