import type { PageServerLoad } from './$types';
import { parseSearchRequestFromUrl, runUnifiedSearch } from '$lib/server/search-service';

export const load: PageServerLoad = async ({ url }) => {
	const searchRequest = parseSearchRequestFromUrl(url, {
		surface: 'global',
		scope: 'all',
		limit: 12,
		sort: 'relevance'
	});
	const search = await runUnifiedSearch(searchRequest);

	return {
		search,
		origin: url.origin
	};
};
