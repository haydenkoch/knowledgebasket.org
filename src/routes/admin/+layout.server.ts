import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/demo/better-auth/login');
	const role = locals.user.role;
	if (role !== 'moderator' && role !== 'admin') throw redirect(303, '/');
	return { user: locals.user };
};
