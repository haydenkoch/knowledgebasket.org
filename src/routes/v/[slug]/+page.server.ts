import { getVenueBySlug } from '$lib/server/venues';
import { getUpcomingEventsByVenueId } from '$lib/server/events';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	const venue = await getVenueBySlug(params.slug);
	if (!venue) throw error(404, 'Venue not found');
	const events = await getUpcomingEventsByVenueId(venue.id);
	return { venue, events };
}
