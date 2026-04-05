import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { CoilKey } from '$lib/data/kb';
import { reindexAllPublishedContent, reindexPublishedContentCoil } from '$lib/server/search-ops';

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

	const url = new URL(request.url);
	const scope = url.searchParams.get('scope')?.trim() as CoilKey | 'all' | null;

	if (
		scope &&
		scope !== 'all' &&
		!['events', 'funding', 'redpages', 'jobs', 'toolbox'].includes(scope)
	) {
		throw error(400, 'Invalid scope');
	}

	if (scope && scope !== 'all') {
		const count = await reindexPublishedContentCoil(scope);
		return json({ ok: true, scope, indexed: count });
	}

	const summary = await reindexAllPublishedContent();
	const indexed = Object.values(summary).reduce((sum, count) => sum + count, 0);
	return json({ ok: true, scope: 'all', indexed, summary });
};
