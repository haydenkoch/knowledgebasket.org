import type { PageServerLoad } from './$types';
import { listUserOrganizationClaims, listUserOrganizations } from '$lib/server/organization-access';

export const load: PageServerLoad = async ({ locals }) => {
	const [organizations, claims] = await Promise.all([
		listUserOrganizations(locals.user!.id),
		listUserOrganizationClaims(locals.user!.id)
	]);

	return { organizations, claims };
};
