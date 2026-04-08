import type { PageServerLoad } from './$types';
import { requireAuthenticatedUser } from '$lib/server/access-control';
import { listUserOrganizationClaims, listUserOrganizations } from '$lib/server/organization-access';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireAuthenticatedUser(locals);
	const [organizations, claims] = await Promise.all([
		listUserOrganizations(user.id),
		listUserOrganizationClaims(user.id)
	]);

	return { organizations, claims };
};
