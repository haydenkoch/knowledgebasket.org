import { getPublishedBusinesses } from '$lib/server/red-pages';

export async function load() {
	const redpages = await getPublishedBusinesses();
	return { redpages };
}
