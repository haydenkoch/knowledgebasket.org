import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backfillGoogleProfile } from '$lib/server/google-profile';
import { safeRedirectPath } from '$lib/server/social-auth';

export const GET: RequestHandler = async ({ locals, request, url }) => {
	const next = safeRedirectPath(url.searchParams.get('next'), '/');

	if (!locals.user) {
		throw redirect(303, `/auth/login?redirect=${encodeURIComponent(next)}`);
	}

	try {
		await backfillGoogleProfile(locals.user.id, request.headers);
	} catch (error) {
		console.error('Failed to backfill Google profile data', error);
	}

	throw redirect(303, next);
};
