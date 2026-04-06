import { getEventBySlugOrIcalId, getRelatedEvents, getRedirectToSlug } from '$lib/server/events';
import { isBookmarked, toggleBookmark } from '$lib/server/personalization';
import { env } from '$env/dynamic/private';
import { error, fail, redirect } from '@sveltejs/kit';

export async function load({ params, url, locals }) {
	const event = await getEventBySlugOrIcalId(params.slug);
	if (!event) {
		const toSlug = await getRedirectToSlug(params.slug);
		if (toSlug) redirect(301, `/events/${toSlug}`);
		throw error(404, 'Event not found');
	}
	const isIcalEvent = event.id.startsWith('ical-');
	const relatedEvents = isIcalEvent
		? []
		: await getRelatedEvents(event.id, event.organizationId ?? null, event.venueId ?? null);
	return {
		event,
		relatedEvents,
		origin: url.origin,
		isIcalEvent,
		isBookmarked: await isBookmarked(locals.user?.id, 'event', event.id),
		mapboxToken: env.MAPBOX_ACCESS_TOKEN ?? env.MAPBOX_TOKEN ?? null
	};
}

export const actions = {
	toggleBookmark: async ({ locals, params }) => {
		if (!locals.user) return fail(401, { error: 'Sign in to save events.' });
		const event = await getEventBySlugOrIcalId(params.slug);
		if (!event) return fail(404, { error: 'Event not found.' });
		await toggleBookmark(locals.user.id, 'event', event.id);
		return { success: true };
	}
};
