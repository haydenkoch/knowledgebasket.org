import type { PageServerLoad } from './$types';
import { getPublishedJobs } from '$lib/server/jobs';
import { parseSearchRequestFromUrl, runUnifiedSearch } from '$lib/server/search-service';
import { withPublicDataFallback } from '$lib/server/public-load';

export const load: PageServerLoad = async ({ url }) => {
	const { data: jobs, unavailable } = await withPublicDataFallback(
		'jobs collection',
		() => getPublishedJobs(),
		[]
	);
	const search = await runUnifiedSearch(
		parseSearchRequestFromUrl(url, {
			surface: 'browse',
			scope: 'jobs',
			limit: 6,
			sort: 'recent'
		})
	);
	return {
		search,
		jobCount: jobs.length,
		dataUnavailable: unavailable,
		origin: url.origin
	};
};
