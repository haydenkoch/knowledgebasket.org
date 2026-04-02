import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	requestReset: async (event) => {
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
