import type { PageServerLoad } from './$types';
import { getPublishedFunding } from '$lib/server/funding';
import { parseSearchRequestFromUrl, runUnifiedSearch } from '$lib/server/search-service';
import { withPublicDataFallback } from '$lib/server/public-load';

export const load: PageServerLoad = async ({ url }) => {
	const { data: allFunding, unavailable } = await withPublicDataFallback(
		'funding collection',
		() => getPublishedFunding(),
		[]
	);
	const searchRequest = parseSearchRequestFromUrl(url, {
		surface: 'browse',
		scope: 'funding',
		limit: 6,
		sort: 'date'
	});
	const hasExplicitStatus = (searchRequest.filters.status?.length ?? 0) > 0;
	const futureOnly = !hasExplicitStatus && url.searchParams.get('future') !== '0';
	const search = await runUnifiedSearch({
		...searchRequest,
		filters: {
			...searchRequest.filters,
			...(futureOnly ? { status: ['open', 'rolling'] } : {})
		}
	});
	return {
		search,
		fundingCount: allFunding.length,
		openCount: allFunding.filter(
			(item) => item.applicationStatus === 'open' || item.applicationStatus === 'rolling'
		).length,
		rollingCount: allFunding.filter((item) => item.applicationStatus === 'rolling').length,
		dataUnavailable: unavailable,
		origin: url.origin,
		futureOnly,
		hasExplicitStatus
	};
};
