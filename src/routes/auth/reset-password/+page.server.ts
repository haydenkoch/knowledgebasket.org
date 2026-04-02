import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token');
	if (!token) throw redirect(302, '/auth/forgot-password');
	return { token };
};

export const actions: Actions = {
	resetPassword: async (event) => {
		const formData = await event.request.formData();
		const newPassword = formData.get('newPassword')?.toString() ?? '';
		const confirmPassword = formData.get('confirmPassword')?.toString() ?? '';
		const token = formData.get('token')?.toString() ?? '';

		if (!token) {
			return fail(400, { message: 'Reset token is missing. Please request a new reset link.' });
		}

		if (newPassword.length < 8) {
			return fail(400, { message: 'Password must be at least 8 characters.', token });
		}

		if (newPassword !== confirmPassword) {
			return fail(400, { message: 'Passwords do not match.', token });
		}

		try {
			await auth.api.resetPassword({
				body: { newPassword, token }
			});
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, {
					message: error.message || 'This reset link has expired or is invalid.',
					token,
					expired: true
				});
			}
			return fail(500, { message: 'Something went wrong. Please try again.', token });
		}

		throw redirect(302, '/auth/login?message=password-reset');
	}
};
