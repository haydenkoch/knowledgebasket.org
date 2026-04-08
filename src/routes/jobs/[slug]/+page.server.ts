import { getJobBySlug, toggleJobInterest } from '$lib/server/jobs';
import { isBookmarked, toggleBookmark } from '$lib/server/personalization';
import { env } from '$env/dynamic/private';
import { error, fail } from '@sveltejs/kit';

export async function load({ params, url, locals }) {
	const item = await getJobBySlug(params.slug, locals.user?.id);
	if (!item) throw error(404, 'Job not found');
	return {
		item,
		origin: url.origin,
		isBookmarked: await isBookmarked(locals.user?.id, 'job', item.id),
		mapboxToken: env.MAPBOX_ACCESS_TOKEN ?? env.MAPBOX_TOKEN ?? null
	};
}

export const actions = {
	toggleBookmark: async ({ locals, params }) => {
		if (!locals.user) return fail(401, { error: 'Sign in to save jobs.' });
		const item = await getJobBySlug(params.slug);
		if (!item) return fail(404, { error: 'Job not found.' });
		await toggleBookmark(locals.user.id, 'job', item.id);
		return { success: true };
	},
	toggleInterest: async ({ locals, params }) => {
		if (!locals.user) return fail(401, { error: 'Sign in to mark interest.' });
		const item = await getJobBySlug(params.slug, locals.user.id);
		if (!item) return fail(404, { error: 'Job not found.' });
		const interested = await toggleJobInterest(item.id, locals.user.id);
		return { success: true, interested };
	}
};
