import { getFundingBySlug } from '$lib/server/funding';
import { isBookmarked, toggleBookmark } from '$lib/server/personalization';
import { error, fail } from '@sveltejs/kit';

export async function load({ params, url, locals }) {
	const item = await getFundingBySlug(params.slug);
	if (!item) throw error(404, 'Funding opportunity not found');
	return {
		item,
		origin: url.origin,
		isBookmarked: await isBookmarked(locals.user?.id, 'funding', item.id)
	};
}

export const actions = {
	toggleBookmark: async ({ locals, params }) => {
		if (!locals.user) return fail(401, { error: 'Sign in to save funding opportunities.' });
		const item = await getFundingBySlug(params.slug);
		if (!item) return fail(404, { error: 'Funding opportunity not found.' });
		await toggleBookmark(locals.user.id, 'funding', item.id);
		return { success: true };
	}
};
