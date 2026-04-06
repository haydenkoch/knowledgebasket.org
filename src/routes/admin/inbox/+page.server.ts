import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { _createInboxActions } from '$lib/server/admin-work-queue';

export { _createInboxActions } from '$lib/server/admin-work-queue';

export const load: PageServerLoad = async ({ url }) => {
	throw redirect(307, `/admin${url.search}`);
};

export const actions: Actions = _createInboxActions();
