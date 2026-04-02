import type { PageServerLoad } from './$types';
import { getRecentFailures, getFetchLogSummary } from '$lib/server/source-fetch-log';
import { getSourceHealthSummary, getSourcesForAdmin } from '$lib/server/sources';

export const load: PageServerLoad = async () => {
	const [summary, fetchSummary, stale, broken, authRequired, degraded, recentFailures] =
		await Promise.all([
			getSourceHealthSummary(),
			getFetchLogSummary(),
			getSourcesForAdmin({ healthStatus: 'stale', limit: 10, sort: 'checked' }),
			getSourcesForAdmin({ healthStatus: 'broken', limit: 10, sort: 'checked' }),
			getSourcesForAdmin({ healthStatus: 'auth_required', limit: 10, sort: 'checked' }),
			getSourcesForAdmin({ healthStatus: 'degraded', limit: 10, sort: 'checked' }),
			getRecentFailures(15)
		]);

	return {
		summary,
		fetchSummary,
		stale: stale.items,
		broken: broken.items,
		authRequired: authRequired.items,
		degraded: degraded.items,
		recentFailures
	};
};
