import type { PageServerLoad } from './$types';
import { requireAuthenticatedUser } from '$lib/server/access-control';
import { getFollowedOrganizations } from '$lib/server/personalization';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireAuthenticatedUser(locals);
	return {
		follows: await getFollowedOrganizations(user.id)
	};
};
