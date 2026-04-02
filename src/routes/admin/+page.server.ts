import type { PageServerLoad } from './$types';
import { getAdminQueueSnapshot } from '$lib/server/admin-review';

export const load: PageServerLoad = async () => {
	return {
		snapshot: await getAdminQueueSnapshot(5)
	};
};
