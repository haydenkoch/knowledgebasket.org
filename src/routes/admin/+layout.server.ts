import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/auth/login?redirect=/admin');
	const role = locals.user.role;
	if (role !== 'moderator' && role !== 'admin') throw redirect(303, '/auth/unauthorized');
	return { user: locals.user };
};
