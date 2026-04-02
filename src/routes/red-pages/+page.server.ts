import type { PageServerLoad } from './$types';
import { getPublishedBusinesses } from '$lib/server/red-pages';
import { withPublicDataFallback } from '$lib/server/public-load';

export const load: PageServerLoad = async ({ url }) => {
	const { data: redpages, unavailable } = await withPublicDataFallback(
		'red pages collection',
		() => getPublishedBusinesses(),
		[]
	);
	return { redpages, dataUnavailable: unavailable, origin: url.origin };
};
