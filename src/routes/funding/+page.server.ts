import type { PageServerLoad } from './$types';
import { getPublishedFunding } from '$lib/server/funding';
import { withPublicDataFallback } from '$lib/server/public-load';

export const load: PageServerLoad = async ({ url }) => {
	const { data: funding, unavailable } = await withPublicDataFallback(
		'funding collection',
		() => getPublishedFunding(),
		[]
	);
	return { funding, dataUnavailable: unavailable, origin: url.origin };
};
