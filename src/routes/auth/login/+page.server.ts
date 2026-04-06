import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth, googleAuthEnabled } from '$lib/server/auth';
import { APIError } from 'better-auth/api';
import { RATE_LIMIT_POLICIES, consumeRateLimit } from '$lib/server/rate-limit';
import {
	GOOGLE_PROVIDER_ID,
	buildGoogleSignInTargets,
	getGoogleAuthErrorMessage,
	safeRedirectPath
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
	if (locals.user) {
		const role = locals.user.role;
		if (role === 'moderator' || role === 'admin') throw redirect(302, '/admin');
		throw redirect(302, '/');
	}
	return {
		redirect: url.searchParams.get('redirect') ?? null,
		message: url.searchParams.get('message') ?? null,
		googleEnabled: googleAuthEnabled,
		googleError:
			url.searchParams.get('google') === 'error'
				? getGoogleAuthErrorMessage(url.searchParams.get('error'))
				: null
	};
};

export const actions: Actions = {
	signIn: async (event) => {
		const rateLimit = consumeRateLimit(event, RATE_LIMIT_POLICIES.authLogin, '/auth/login');
		if (!rateLimit.allowed) {
			return fail(429, {
				message: `Too many sign-in attempts. Please wait ${rateLimit.retryAfterSeconds} seconds and try again.`,
				email: ''
			});
		}

		const formData = await event.request.formData();
		const email = formData.get('email')?.toString().trim() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const redirectTo = safeRedirectPath(formData.get('redirect')?.toString() ?? null);

		if (!email || !password) {
			return fail(400, { message: 'Email and password are required.', email });
		}

		try {
			await auth.api.signInEmail({
				body: { email, password }
			});
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { message: error.message || 'Invalid email or password.', email });
			}
			return fail(500, { message: 'Something went wrong. Please try again.', email });
		}

		// After sign in, check role to determine redirect destination
		const session = await auth.api.getSession({ headers: event.request.headers });
		const role = (session?.user as { role?: string } | null)?.role;
		if (role === 'moderator' || role === 'admin') {
			throw redirect(302, redirectTo.startsWith('/admin') ? redirectTo : '/admin');
		}
		throw redirect(302, redirectTo);
	},

	signInGoogle: async (event) => {
		const rateLimit = consumeRateLimit(event, RATE_LIMIT_POLICIES.authLogin, '/auth/login');
		if (!rateLimit.allowed) {
			return fail(429, {
				message: `Too many sign-in attempts. Please wait ${rateLimit.retryAfterSeconds} seconds and try again.`,
				email: ''
			});
		}

		if (!googleAuthEnabled) {
			return fail(500, {
				message: 'Google sign-in is not configured for this environment.',
				email: ''
			});
		}

		const formData = await event.request.formData();
		const redirectTo = safeRedirectPath(formData.get('redirect')?.toString() ?? null);

		let result: Awaited<ReturnType<typeof auth.api.signInSocial>>;

		try {
			result = await auth.api.signInSocial({
				body: {
					provider: GOOGLE_PROVIDER_ID,
					disableRedirect: true,
					...buildGoogleSignInTargets({
						next: redirectTo,
						newUserNext: '/account',
						errorPath: '/auth/login'
					})
				}
			});
		} catch (error) {
			return fail(400, {
				message: authActionErrorMessage(error, 'We could not start Google sign-in.'),
				email: ''
			});
		}

		if (!result.url) {
			return fail(500, {
				message: 'We could not start Google sign-in. Please try again.',
				email: ''
			});
		}

		throw redirect(302, result.url);
	}
};
