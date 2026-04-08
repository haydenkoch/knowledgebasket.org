import type { Actions, PageServerLoad } from './$types';
import { requireAuthenticatedUser } from '$lib/server/access-control';
import { getPersonalCalendarFeed, rotatePersonalCalendarToken } from '$lib/server/personalization';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireAuthenticatedUser(locals);
	const feed = await getPersonalCalendarFeed(user.id);
	return {
		feed,
		feedUrl: `${url.origin}/account/calendar/feed/${feed.token}`
	};
};

export const actions: Actions = {
	rotateToken: async ({ locals }) => {
		const user = requireAuthenticatedUser(locals);
		await rotatePersonalCalendarToken(user.id);
		return { success: true };
	}
};
