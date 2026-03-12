import { getEventBySlug } from '$lib/server/events';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	const event = await getEventBySlug(params.slug);
	if (!event) throw error(404, 'Event not found');
	return { event };
}
