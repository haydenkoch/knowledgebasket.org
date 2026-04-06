import type { Actions, PageServerLoad } from './$types';
import { getAdminQueueSnapshot } from '$lib/server/admin-review';
import { _createInboxActions } from '$lib/server/admin-work-queue';

export const load: PageServerLoad = async ({ url }) => {
	return {
		tab: url.searchParams.get('tab') ?? 'all',
		snapshot: await getAdminQueueSnapshot(10)
	};
};

export const actions: Actions = _createInboxActions();
