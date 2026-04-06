import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';
import { RATE_LIMIT_POLICIES, consumeRateLimit } from '$lib/server/rate-limit';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(302, '/');
	return {};
};

export const actions: Actions = {
	signUp: async (event) => {
		const rateLimit = consumeRateLimit(event, RATE_LIMIT_POLICIES.authRegister, '/auth/register');
		if (!rateLimit.allowed) {
			return fail(429, {
				message: `Too many registration attempts. Please wait ${rateLimit.retryAfterSeconds} seconds and try again.`,
				fields: { name: '', email: '' }
			});
		}

		const formData = await event.request.formData();
		const name = formData.get('name')?.toString().trim() ?? '';
		const email = formData.get('email')?.toString().trim() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const confirmPassword = formData.get('confirmPassword')?.toString() ?? '';

		const errors: Record<string, string> = {};

		if (!name) errors.name = 'Your name is required.';
		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			errors.email = 'Please enter a valid email address.';
		}
		if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
		if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';

		if (Object.keys(errors).length > 0) {
			return fail(400, { errors: errors as Record<string, string>, fields: { name, email } });
		}

		try {
			await auth.api.signUpEmail({
				body: {
					email,
					password,
					name,
					callbackURL: '/auth/login?message=verified'
				}
			});
		} catch (error) {
			if (error instanceof APIError) {
				const msg = error.message || 'Registration failed.';
				if (msg.toLowerCase().includes('email')) {
					return fail(400, {
						errors: { email: 'An account with this email already exists.' } as Record<
							string,
							string
						>,
						fields: { name, email }
					});
				}
				return fail(400, { message: msg, fields: { name, email } });
			}
			return fail(500, {
				message: 'Something went wrong. Please try again.',
				fields: { name, email }
			});
		}

		throw redirect(302, `/auth/verify-email?email=${encodeURIComponent(email)}`);
	}
};
