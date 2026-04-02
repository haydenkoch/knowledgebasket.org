import type { PageServerLoad } from './$types';
import { getPublishedJobs } from '$lib/server/jobs';
import { withPublicDataFallback } from '$lib/server/public-load';

export const load: PageServerLoad = async ({ url }) => {
	const { data: jobs, unavailable } = await withPublicDataFallback(
		'jobs collection',
		() => getPublishedJobs(),
		[]
	);
	return { jobs, dataUnavailable: unavailable, origin: url.origin };
};
