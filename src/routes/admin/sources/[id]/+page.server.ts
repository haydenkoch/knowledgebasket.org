import type { Actions, PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import {
	loadSourceOpsDetail,
	_createSourceConfigActions,
	_createSourceDetailActions
} from '$lib/server/admin-source-pages';

export { _createSourceDetailActions } from '$lib/server/admin-source-pages';

export const load: PageServerLoad = async ({ params }) => {
	const detail = await loadSourceOpsDetail(params.id);
	if (!detail) throw error(404, 'Source not found');
	return detail;
};

export const actions: Actions = _createSourceConfigActions();
