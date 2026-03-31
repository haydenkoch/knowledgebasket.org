import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async () => {
	const mapboxConfigured = !!(env.MAPBOX_ACCESS_TOKEN ?? env.MAPBOX_TOKEN);
	const meilisearchConfigured = !!(env.MEILISEARCH_HOST && env.MEILISEARCH_API_KEY);
	return {
		mapboxConfigured,
		meilisearchConfigured
	};
};
