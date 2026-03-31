import type { PageServerLoad } from './$types';
import { getEventStatusCounts, getEventsForAdmin } from '$lib/server/events';

export const load: PageServerLoad = async () => {
	const [counts, { events: recentPending }] = await Promise.all([
		getEventStatusCounts(),
		getEventsForAdmin({ status: 'pending', limit: 5, page: 1 })
	]);
	return { counts, recentPending };
};
