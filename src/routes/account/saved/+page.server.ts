import type { PageServerLoad } from './$types';
import { requireAuthenticatedUser } from '$lib/server/access-control';
import { getUserBookmarks } from '$lib/server/personalization';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireAuthenticatedUser(locals);
	return {
		bookmarks: await getUserBookmarks(user.id)
	};
};
