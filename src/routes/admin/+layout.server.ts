import type { LayoutServerLoad } from './$types';
import { requireAdminPageAccess } from '$lib/server/access-control';

export const load: LayoutServerLoad = async (event) => {
	const user = requireAdminPageAccess(event, '/admin');
	return { user };
};
