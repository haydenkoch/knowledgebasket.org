import { fail, redirect, type Actions } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import type { PageServerLoad } from './$types';
import { requireAuthenticatedUser } from '$lib/server/access-control';
import { auth, googleAuthEnabled } from '$lib/server/auth';
import { findLinkedGoogleAccount } from '$lib/server/google-profile';
import {
	GOOGLE_PROVIDER_ID,
	buildGoogleLinkTargets,
	buildGoogleLinkedURL,
	getGoogleAuthErrorMessage
} from '$lib/server/social-auth';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireAuthenticatedUser(locals);
	const linkedGoogleAccount = await findLinkedGoogleAccount(user.id);

	return {
		email: user.email,
		emailVerified: Boolean((user as { emailVerified?: boolean }).emailVerified),
		googleEnabled: googleAuthEnabled,
		googleConnected: Boolean(linkedGoogleAccount),
		googleSuccess:
			url.searchParams.get('google') === 'linked' ? 'Google is now linked to this account.' : null,
		googleError:
			url.searchParams.get('google') === 'error'
				? getGoogleAuthErrorMessage(url.searchParams.get('error'))
				: null
	};
};

function apiErrorMessage(err: unknown, fallback: string): string {
	if (err instanceof APIError) {
		const message = (err.body as { message?: string } | undefined)?.message;
		return message ?? fallback;
	}
	if (err instanceof Error) return err.message;
	return fallback;
}

export const actions: Actions = {
	changeEmail: async ({ request }) => {
		const formData = await request.formData();
		const newEmail = String(formData.get('newEmail') ?? '').trim();

		if (!newEmail) {
			return fail(400, { emailError: 'New email is required' });
		}

		try {
			await auth.api.changeEmail({
				body: { newEmail, callbackURL: '/account/settings' },
				headers: request.headers
			});
		} catch (err) {
			return fail(400, { emailError: apiErrorMessage(err, 'Could not change email') });
		}

		return { emailSuccess: `Check ${newEmail} for a confirmation link.` };
	},

	changePassword: async ({ request }) => {
		const formData = await request.formData();
		const currentPassword = String(formData.get('currentPassword') ?? '');
		const newPassword = String(formData.get('newPassword') ?? '');
		const confirmPassword = String(formData.get('confirmPassword') ?? '');
		const revokeOtherSessions = formData.get('revokeOtherSessions') === 'on';

		if (!currentPassword || !newPassword) {
			return fail(400, { passwordError: 'Current and new password are required' });
		}
		if (newPassword.length < 8) {
			return fail(400, { passwordError: 'New password must be at least 8 characters' });
		}
		if (newPassword !== confirmPassword) {
			return fail(400, { passwordError: 'New passwords do not match' });
		}

		try {
			await auth.api.changePassword({
				body: { currentPassword, newPassword, revokeOtherSessions },
				headers: request.headers
			});
		} catch (err) {
			return fail(400, { passwordError: apiErrorMessage(err, 'Could not change password') });
		}

		return {
			passwordSuccess: revokeOtherSessions
				? 'Password updated and other sessions signed out.'
				: 'Password updated.'
		};
	},

	revokeOtherSessions: async ({ request }) => {
		try {
			await auth.api.revokeOtherSessions({ headers: request.headers });
		} catch (err) {
			return fail(400, {
				sessionsError: apiErrorMessage(err, 'Could not sign out other sessions')
			});
		}
		return { sessionsSuccess: 'Signed out of all other sessions.' };
	},

	linkGoogle: async ({ locals, request }) => {
		const user = requireAuthenticatedUser(locals);
		if (!googleAuthEnabled) {
			return fail(400, { googleError: 'Google sign-in is not configured for this environment.' });
		}

		const linkedGoogleAccount = await findLinkedGoogleAccount(user.id);
		if (linkedGoogleAccount) {
			return { googleSuccess: 'Google is already linked to this account.' };
		}

		let result: Awaited<ReturnType<typeof auth.api.linkSocialAccount>>;

		try {
			result = await auth.api.linkSocialAccount({
				body: {
					provider: GOOGLE_PROVIDER_ID,
					disableRedirect: true,
					...buildGoogleLinkTargets({
						next: buildGoogleLinkedURL('/account/settings'),
						errorPath: '/account/settings'
					})
				},
				headers: request.headers
			});
		} catch (err) {
			return fail(400, { googleError: apiErrorMessage(err, 'Could not link Google account') });
		}

		if (!result.url) {
			return fail(500, { googleError: 'Could not start Google account linking.' });
		}

		throw redirect(302, result.url);
	}
};
