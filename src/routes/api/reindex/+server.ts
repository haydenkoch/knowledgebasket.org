import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getEvents } from '$lib/server/events';
import { reindexAllEvents } from '$lib/server/meilisearch';

/**
 * Reindex all events from DB into Meilisearch. Call after db:seed or when search is out of sync.
 * In production, require an admin session or a configured secret header.
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	const reindexSecret = env.REINDEX_SECRET?.trim();
	const headerSecret = request.headers.get('x-reindex-secret')?.trim();
	const hasAdminSession = locals.user?.role === 'admin' || locals.user?.role === 'moderator';
	const hasValidSecret = !!reindexSecret && headerSecret === reindexSecret;

	if (!dev && !hasAdminSession && !hasValidSecret) {
		throw error(403, 'Forbidden');
	}

	const events = await getEvents({ includeIcal: false });
	await reindexAllEvents(events);
	return json({ ok: true, indexed: events.length });
};
