import type { Actions, PageServerLoad } from './$types';
import { getPersonalCalendarFeed, rotatePersonalCalendarToken } from '$lib/server/personalization';

export const load: PageServerLoad = async ({ locals, url }) => {
	const feed = await getPersonalCalendarFeed(locals.user!.id);
	return {
		feed,
		feedUrl: `${url.origin}/account/calendar/feed/${feed.token}`
	};
};

export const actions: Actions = {
	rotateToken: async ({ locals }) => {
		await rotatePersonalCalendarToken(locals.user!.id);
		return { success: true };
	}
};
