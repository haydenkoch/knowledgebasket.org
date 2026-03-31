import { getEventBySlugOrIcalId, getRelatedEvents, getRedirectToSlug } from '$lib/server/events';
import { error, redirect } from '@sveltejs/kit';

export async function load({ params, url }) {
	let event = await getEventBySlugOrIcalId(params.slug);
	if (!event) {
		const toSlug = await getRedirectToSlug(params.slug);
		if (toSlug) redirect(301, `/events/${toSlug}`);
		throw error(404, 'Event not found');
	}
	const isIcalEvent = event.id.startsWith('ical-');
	const relatedEvents = isIcalEvent
		? []
		: await getRelatedEvents(
				event.id,
				event.organizationId ?? null,
				event.venueId ?? null
			);
	return { event, relatedEvents, origin: url.origin, isIcalEvent };
}
