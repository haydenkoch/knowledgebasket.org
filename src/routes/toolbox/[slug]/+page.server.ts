import { getResourceBySlug } from '$lib/server/toolbox';
import { isBookmarked, toggleBookmark } from '$lib/server/personalization';
import { error, fail } from '@sveltejs/kit';

export async function load({ params, url, locals }) {
	const item = await getResourceBySlug(params.slug);
	if (!item) throw error(404, 'Resource not found');
	return {
		item,
		origin: url.origin,
		isBookmarked: await isBookmarked(locals.user?.id, 'toolbox', item.id)
	};
}

export const actions = {
	toggleBookmark: async ({ locals, params }) => {
		if (!locals.user) return fail(401, { error: 'Sign in to save resources.' });
		const item = await getResourceBySlug(params.slug);
		if (!item) return fail(404, { error: 'Resource not found.' });
		await toggleBookmark(locals.user.id, 'toolbox', item.id);
		return { success: true };
	}
};
