import type { PageServerLoad } from './$types';
import { getUserBookmarks } from '$lib/server/personalization';

export const load: PageServerLoad = async ({ locals }) => {
	return {
		bookmarks: await getUserBookmarks(locals.user!.id)
	};
};
