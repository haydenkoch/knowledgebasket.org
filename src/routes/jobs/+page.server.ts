import { getPublishedJobs } from '$lib/server/jobs';
import { withPublicDataFallback } from '$lib/server/public-load';

export async function load() {
	const { data: jobs, unavailable } = await withPublicDataFallback(
		'jobs collection',
		() => getPublishedJobs(),
		[]
	);
	return { jobs, dataUnavailable: unavailable };
}
