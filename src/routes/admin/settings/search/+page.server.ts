import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	getSearchOperationsSnapshot,
	reindexAllPublishedContent,
	reindexSearchScope
} from '$lib/server/search-ops';
import { SEARCH_INDEX_SCOPES, type SearchIndexScope } from '$lib/server/search-contracts';

export const load: PageServerLoad = async ({ url }) => {
	const query = url.searchParams.get('q')?.trim() ?? '';
	return {
		query,
		snapshot: await getSearchOperationsSnapshot(query)
	};
};

export const actions: Actions = {
	reindexAll: async () => {
		try {
			const summary = await reindexAllPublishedContent();
			return { success: true, scope: 'all', summary };
		} catch (error) {
			return fail(400, {
				error: error instanceof Error ? error.message : 'Unable to rebuild search indexes'
			});
		}
	},
	reindexCoil: async ({ request }) => {
		const formData = await request.formData();
		const coil = String(formData.get('coil') ?? '').trim() as SearchIndexScope;
		if (!SEARCH_INDEX_SCOPES.includes(coil)) {
			return fail(400, { error: 'Choose a content area to rebuild' });
		}

		try {
			const count = await reindexSearchScope(coil);
			return { success: true, scope: coil, count };
		} catch (error) {
			return fail(400, {
				error: error instanceof Error ? error.message : 'Unable to rebuild that search index'
			});
		}
	}
};
