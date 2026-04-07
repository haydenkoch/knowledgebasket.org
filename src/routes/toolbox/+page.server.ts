import type { PageServerLoad } from './$types';
import { getPublishedResources } from '$lib/server/toolbox';
import { parseSearchRequestFromUrl, runUnifiedSearch } from '$lib/server/search-service';
import { withPublicDataFallback } from '$lib/server/public-load';
import { isIndexableBrowseRequest } from '$lib/server/seo';

export const load: PageServerLoad = async ({ url }) => {
	const { data: toolbox, unavailable } = await withPublicDataFallback(
		'toolbox collection',
		() => getPublishedResources(),
		[]
	);
	const search = await runUnifiedSearch(
		parseSearchRequestFromUrl(url, {
			surface: 'browse',
			scope: 'toolbox',
			limit: 18,
			sort: 'recent'
		})
	);
	return {
		search,
		resourceCount: toolbox.length,
		mediaTypeCount: new Set(toolbox.map((item) => item.mediaType).filter(Boolean)).size,
		dataUnavailable: unavailable,
		seoIndexable: isIndexableBrowseRequest(url),
		origin: url.origin
	};
};
