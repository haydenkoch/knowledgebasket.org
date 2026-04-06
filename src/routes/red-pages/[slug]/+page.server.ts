import { getBusinessBySlug } from '$lib/server/red-pages';
import { isBookmarked, toggleBookmark } from '$lib/server/personalization';
import { env } from '$env/dynamic/private';
import { error, fail } from '@sveltejs/kit';

export async function load({ params, url, locals }) {
	const item = await getBusinessBySlug(params.slug);
	if (!item) throw error(404, 'Business not found');
	return {
		item,
		origin: url.origin,
		isBookmarked: await isBookmarked(locals.user?.id, 'redpage', item.id),
		mapboxToken: env.MAPBOX_ACCESS_TOKEN ?? env.MAPBOX_TOKEN ?? null
	};
}

export const actions = {
	toggleBookmark: async ({ locals, params }) => {
		if (!locals.user) return fail(401, { error: 'Sign in to save listings.' });
		const item = await getBusinessBySlug(params.slug);
		if (!item) return fail(404, { error: 'Business not found.' });
		await toggleBookmark(locals.user.id, 'redpage', item.id);
		return { success: true };
	}
};
