import type { PageServerLoad } from './$types';
import type { CoilKey } from '$lib/data/kb';
import type { SearchDoc } from '$lib/server/meilisearch';
import { runPublicSearch } from '$lib/server/search-ops';

const emptyResults: Record<CoilKey, SearchDoc[]> = {
	events: [],
	funding: [],
	redpages: [],
	jobs: [],
	toolbox: []
};

export const load: PageServerLoad = async ({ url }) => {
	const query = url.searchParams.get('q')?.trim() ?? '';
	const activeCoil = (url.searchParams.get('coil')?.trim() ?? 'all') as CoilKey | 'all';

	let results = emptyResults;
	let searchMode: 'offline' | 'partial' | 'ready' = 'offline';
	let resultSource: 'meilisearch' | 'database' = 'database';
	if (query.length >= 2) {
		const search = await runPublicSearch(query, 12);
		searchMode = search.readiness.state;
		resultSource = search.resultSource;
		results = search.results;

		if (activeCoil !== 'all') {
			results = {
				...emptyResults,
				[activeCoil]: results[activeCoil]
			};
		}
	}

	return {
		query,
		activeCoil,
		results,
		searchMode,
		resultSource,
		origin: url.origin
	};
};
