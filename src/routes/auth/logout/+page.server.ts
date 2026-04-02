import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';

export const load: PageServerLoad = async () => {
	throw redirect(302, '/');
};

export const actions: Actions = {
	default: async (event) => {
		await auth.api.signOut({ headers: event.request.headers });
		throw redirect(303, '/auth/login');
	}
};
