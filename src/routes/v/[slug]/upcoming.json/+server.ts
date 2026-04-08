import { error, json } from '@sveltejs/kit';
import { getVenueBySlug } from '$lib/server/venues';
import { getUpcomingEventsByVenueId } from '$lib/server/events';

/**
 * Lightweight JSON feed of a venue's upcoming events, used by the
 * map side panel to populate the "upcoming events" section on demand.
 */
export async function GET({ params, setHeaders }) {
	const slug = params.slug;
	if (!slug) error(404, 'Venue not found');

	const venue = await getVenueBySlug(slug);
	if (!venue) error(404, 'Venue not found');

	const events = await getUpcomingEventsByVenueId(venue.id);

	setHeaders({ 'cache-control': 'public, max-age=30' });

	return json({
		venueId: venue.id,
		events: events.slice(0, 6).map((e) => ({
			id: e.id,
			slug: e.slug ?? null,
			title: e.title,
			startDate: e.startDate ?? null,
			endDate: e.endDate ?? null
		}))
	});
}
