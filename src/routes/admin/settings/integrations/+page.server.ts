import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

export const load: PageServerLoad = async () => {
	const mapboxConfigured = !!(env.MAPBOX_ACCESS_TOKEN ?? env.MAPBOX_TOKEN);
	const meilisearchConfigured = !!(env.MEILISEARCH_HOST && env.MEILISEARCH_API_KEY);
	const posthogConfigured = !!publicEnv.PUBLIC_POSTHOG_KEY?.trim();
	const posthogHost = publicEnv.PUBLIC_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com';

	return {
		mapboxConfigured,
		meilisearchConfigured,
		posthogConfigured,
		posthogHost
	};
};
