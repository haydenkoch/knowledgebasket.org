import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { RATE_LIMIT_POLICIES, consumeRateLimit } from '$lib/server/rate-limit';

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	requestReset: async (event) => {
		const rateLimit = consumeRateLimit(
			event,
			RATE_LIMIT_POLICIES.authForgotPassword,
			'/auth/forgot-password'
		);
		if (!rateLimit.allowed) {
			return fail(429, {
				error: `Too many reset requests. Please wait ${rateLimit.retryAfterSeconds} seconds and try again.`,
				email: ''
			});
		}

		const formData = await event.request.formData();
		const email = formData.get('email')?.toString().trim() ?? '';

		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return fail(400, { error: 'Please enter a valid email address.', email });
		}

		try {
			// auth.api.forgetPassword exists at runtime but is not typed in the minimal import
			await (auth.api as Record<string, (args: unknown) => Promise<unknown>>)['forgetPassword']?.({
				body: { email, redirectTo: '/auth/reset-password' }
			});
		} catch {
			// Silently ignore — don't leak whether email exists
		}

		// Always return success to avoid email enumeration
		return { sent: true, email };
	}
};
