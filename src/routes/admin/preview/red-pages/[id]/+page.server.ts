import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getBusinessById } from '$lib/server/red-pages';

export const load: PageServerLoad = async ({ params }) => {
	const business = await getBusinessById(params.id);
	if (!business) throw error(404, 'Listing not found');
	return { business };
};
