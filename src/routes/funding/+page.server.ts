import { getPublishedFunding } from '$lib/server/funding';
import { withPublicDataFallback } from '$lib/server/public-load';

export async function load() {
	const { data: funding, unavailable } = await withPublicDataFallback(
		'funding collection',
		() => getPublishedFunding(),
		[]
	);
	return { funding, dataUnavailable: unavailable };
}
