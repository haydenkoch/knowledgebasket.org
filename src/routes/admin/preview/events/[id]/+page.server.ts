import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getEventById } from '$lib/server/events';

export const load: PageServerLoad = async ({ params }) => {
	const event = await getEventById(params.id);
	if (!event) throw error(404, 'Event not found');
	return { event };
};
