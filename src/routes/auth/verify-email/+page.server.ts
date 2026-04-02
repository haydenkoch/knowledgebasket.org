import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';

export const load: PageServerLoad = async ({ url }) => {
	return {
		email: url.searchParams.get('email') ?? null
	};
};

export const actions: Actions = {
	resend: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString().trim() ?? '';

		if (!email) {
			return fail(400, { message: 'Email address is required.' });
		}

		try {
			await auth.api.sendVerificationEmail({
				body: { email, callbackURL: '/auth/login?message=verified' }
			});
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { message: error.message || 'Could not send verification email.' });
			}
			return fail(500, { message: 'Something went wrong. Please try again.' });
		}

		return { resent: true };
	}
};
