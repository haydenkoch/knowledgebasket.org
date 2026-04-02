import type { PageServerLoad } from './$types';
import { getPublishedResources } from '$lib/server/toolbox';
import { withPublicDataFallback } from '$lib/server/public-load';

export const load: PageServerLoad = async ({ url }) => {
	const { data: toolbox, unavailable } = await withPublicDataFallback(
		'toolbox collection',
		() => getPublishedResources(),
		[]
	);
	return { toolbox, dataUnavailable: unavailable, origin: url.origin };
};
