import { getPublishedResources } from '$lib/server/toolbox';
import { withPublicDataFallback } from '$lib/server/public-load';

export async function load() {
	const { data: toolbox, unavailable } = await withPublicDataFallback(
		'toolbox collection',
		() => getPublishedResources(),
		[]
	);
	return { toolbox, dataUnavailable: unavailable };
}
