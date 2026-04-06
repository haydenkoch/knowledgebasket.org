import type { PageServerLoad } from './$types';
import { getPublishedBusinesses } from '$lib/server/red-pages';
import { parseSearchRequestFromUrl, runUnifiedSearch } from '$lib/server/search-service';
import { withPublicDataFallback } from '$lib/server/public-load';

export const load: PageServerLoad = async ({ url }) => {
	const { data: redpages, unavailable } = await withPublicDataFallback(
		'red pages collection',
		() => getPublishedBusinesses(),
		[]
	);
	const search = await runUnifiedSearch(
		parseSearchRequestFromUrl(url, {
			surface: 'browse',
			scope: 'redpages',
			limit: 6,
			sort: 'title'
		})
	);
	return {
		search,
		listingCount: redpages.length,
		serviceTypeCount: new Set(redpages.map((item) => item.serviceType).filter(Boolean)).size,
		dataUnavailable: unavailable,
		origin: url.origin
	};
};
