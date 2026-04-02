import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	return {
		user: user ? { name: user.name, email: user.email, role: user.role, image: user.image } : null
	};
};
