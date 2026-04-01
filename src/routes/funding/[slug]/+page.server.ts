import { getFundingBySlug } from '$lib/server/funding';
import { error } from '@sveltejs/kit';

export async function load({ params, url }) {
	const item = await getFundingBySlug(params.slug);
	if (!item) throw error(404, 'Funding opportunity not found');
	return { item, origin: url.origin };
}
