import type { Actions, PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getEvents } from '$lib/server/events';
import { reindexAllEvents } from '$lib/server/meilisearch';

export const load: PageServerLoad = async ({ url }) => {
	const meilisearchConfigured = !!(env.MEILISEARCH_HOST && env.MEILISEARCH_API_KEY);
	const reindexed = url.searchParams.get('reindexed');
	return { meilisearchConfigured, reindexed: reindexed ? parseInt(reindexed, 10) : null };
};

export const actions: Actions = {
	reindex: async () => {
		const events = await getEvents({ includeIcal: false });
		await reindexAllEvents(events);
		throw redirect(303, '/admin/settings/search?reindexed=' + events.length);
	}
};
