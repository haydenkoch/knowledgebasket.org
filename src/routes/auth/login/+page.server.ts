import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';

function safeRedirect(redirectTo: string | null): string {
	if (!redirectTo) return '/';
	if (redirectTo.startsWith('/') && !redirectTo.startsWith('//')) return redirectTo;
	return '/';
}

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) {
		const role = locals.user.role;
		if (role === 'moderator' || role === 'admin') throw redirect(302, '/admin');
		throw redirect(302, '/');
	}
	return {
		redirect: url.searchParams.get('redirect') ?? null,
		message: url.searchParams.get('message') ?? null
	};
};

export const actions: Actions = {
	signIn: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString().trim() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const redirectTo = safeRedirect(formData.get('redirect')?.toString() ?? null);

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
	}
};
