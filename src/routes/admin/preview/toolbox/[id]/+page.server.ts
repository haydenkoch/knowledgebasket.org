import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getResourceById } from '$lib/server/toolbox';

export const load: PageServerLoad = async ({ params }) => {
	const resource = await getResourceById(params.id);
	if (!resource) throw error(404, 'Resource not found');
	return { resource };
};
