import { getBusinessBySlug } from '$lib/server/red-pages';
import { error } from '@sveltejs/kit';

export async function load({ params, url }) {
	const item = await getBusinessBySlug(params.slug);
	if (!item) throw error(404, 'Business not found');
	return { item, origin: url.origin };
}
