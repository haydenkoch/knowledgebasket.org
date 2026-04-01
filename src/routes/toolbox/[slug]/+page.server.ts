import { getResourceBySlug } from '$lib/server/toolbox';
import { error } from '@sveltejs/kit';

export async function load({ params, url }) {
	const item = await getResourceBySlug(params.slug);
	if (!item) throw error(404, 'Resource not found');
	return { item, origin: url.origin };
}
