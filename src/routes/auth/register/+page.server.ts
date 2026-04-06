import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth, googleAuthEnabled } from '$lib/server/auth';
import { APIError } from 'better-auth/api';
import { RATE_LIMIT_POLICIES, consumeRateLimit } from '$lib/server/rate-limit';
import {
	GOOGLE_PROVIDER_ID,
	buildGoogleSignInTargets,
	getGoogleAuthErrorMessage
} from '$lib/server/social-auth';

function authActionErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof APIError) {
		const code =
			(error.body as { code?: string; error?: string; message?: string } | undefined)?.code ??
			(error.body as { code?: string; error?: string; message?: string } | undefined)?.error ??
			error.message;

		return code ? getGoogleAuthErrorMessage(code) : fallback;
	}

	if (error instanceof Error) return error.message || fallback;
	return fallback;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) throw redirect(302, '/');
	return {
		googleEnabled: googleAuthEnabled,
		googleError:
			url.searchParams.get('google') === 'error'
				? getGoogleAuthErrorMessage(url.searchParams.get('error'))
				: null
	};
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
	},

	signUpWithGoogle: async (event) => {
		const rateLimit = consumeRateLimit(event, RATE_LIMIT_POLICIES.authRegister, '/auth/register');
		if (!rateLimit.allowed) {
			return fail(429, {
				message: `Too many registration attempts. Please wait ${rateLimit.retryAfterSeconds} seconds and try again.`,
				fields: { name: '', email: '' }
			});
		}

		if (!googleAuthEnabled) {
			return fail(500, {
				message: 'Google sign-in is not configured for this environment.',
				fields: { name: '', email: '' }
			});
		}

		let result: Awaited<ReturnType<typeof auth.api.signInSocial>>;

		try {
			result = await auth.api.signInSocial({
				body: {
					provider: GOOGLE_PROVIDER_ID,
					disableRedirect: true,
					...buildGoogleSignInTargets({
						next: '/',
						newUserNext: '/account',
						errorPath: '/auth/register'
					})
				}
			});
		} catch (error) {
			return fail(400, {
				message: authActionErrorMessage(error, 'We could not start Google sign-in.'),
				fields: { name: '', email: '' }
			});
		}

		if (!result.url) {
			return fail(500, {
				message: 'We could not start Google sign-in. Please try again.',
				fields: { name: '', email: '' }
			});
		}

		throw redirect(302, result.url);
	}
};
