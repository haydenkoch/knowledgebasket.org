import { getPublishedBusinesses } from '$lib/server/red-pages';
import { withPublicDataFallback } from '$lib/server/public-load';

export async function load() {
	const { data: redpages, unavailable } = await withPublicDataFallback(
		'red pages collection',
		() => getPublishedBusinesses(),
		[]
	);
	return { redpages, dataUnavailable: unavailable };
}
