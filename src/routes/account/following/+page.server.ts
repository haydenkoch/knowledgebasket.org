import type { PageServerLoad } from './$types';
import { getFollowedOrganizations } from '$lib/server/personalization';

export const load: PageServerLoad = async ({ locals }) => {
	return {
		follows: await getFollowedOrganizations(locals.user!.id)
	};
};
