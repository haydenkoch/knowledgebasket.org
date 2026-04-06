import type { LayoutServerLoad } from './$types';
import { getOrganizationWorkspaceContext } from '$lib/server/organization-access';

export const load: LayoutServerLoad = async ({ locals, params }) => {
	const { organization, membership } = await getOrganizationWorkspaceContext(
		params.slug,
		locals.user?.id
	);

	return {
		organization,
		membership
	};
};
