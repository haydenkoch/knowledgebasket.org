import { getPublishedFunding } from '$lib/server/funding';

export async function load() {
	const funding = await getPublishedFunding();
	return { funding };
}
