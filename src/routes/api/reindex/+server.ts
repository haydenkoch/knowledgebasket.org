import { env } from '$env/dynamic/private';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requirePrivilegedApiUser } from '$lib/server/access-control';
import {
	RATE_LIMIT_POLICIES,
	buildRateLimitHeaders,
	consumeRateLimit
} from '$lib/server/rate-limit';
import { captureServerError, logServerEvent } from '$lib/server/observability';
import { reindexAllPublishedContent, reindexSearchScope } from '$lib/server/search-ops';
import { SEARCH_INDEX_SCOPES, type SearchIndexScope } from '$lib/server/search-contracts';

/**
 * Reindex all events from DB into Meilisearch. Call after db:seed or when search is out of sync.
 * In production, require an admin session or a configured secret header.
 */
export const POST: RequestHandler = async ({ locals, request, getClientAddress, url }) => {
	const rateLimit = consumeRateLimit(
		{ request, locals, getClientAddress, url },
		RATE_LIMIT_POLICIES.privilegedOps,
		'/api/reindex'
	);
	if (!rateLimit.allowed) {
		logServerEvent('search.reindex_rate_limited', { path: '/api/reindex' }, 'warn');
		return json(
			{ ok: false, error: 'Too many reindex requests' },
			{ status: 429, headers: buildRateLimitHeaders(rateLimit) }
		);
	}

	const reindexSecret = env.REINDEX_SECRET?.trim();
	const headerSecret = request.headers.get('x-reindex-secret')?.trim();
	const hasValidSecret = !!reindexSecret && headerSecret === reindexSecret;

	if (!hasValidSecret) {
		requirePrivilegedApiUser(locals);
	}

	const requestUrl = new URL(request.url);
	const scope = requestUrl.searchParams.get('scope')?.trim() as SearchIndexScope | 'all' | null;

	if (scope && scope !== 'all' && !SEARCH_INDEX_SCOPES.includes(scope)) {
		throw error(400, 'Invalid scope');
	}

	try {
		if (scope && scope !== 'all') {
			const count = await reindexSearchScope(scope);
			logServerEvent('search.reindexed', {
				scope,
				indexed: count,
				triggeredBy: locals.user?.id ?? 'secret'
			});
			return json(
				{ ok: true, scope, indexed: count },
				{ headers: buildRateLimitHeaders(rateLimit) }
			);
		}

		const summary = await reindexAllPublishedContent();
		const indexed = Object.values(summary).reduce((sum, count) => sum + count, 0);
		logServerEvent('search.reindexed', {
			scope: 'all',
			indexed,
			summary,
			triggeredBy: locals.user?.id ?? 'secret'
		});
		return json(
			{ ok: true, scope: 'all', indexed, summary },
			{ headers: buildRateLimitHeaders(rateLimit) }
		);
	} catch (cause) {
		await captureServerError('search.reindex_failed', cause, {
			scope: scope ?? 'all',
			triggeredBy: locals.user?.id ?? 'secret'
		});
		throw cause;
	}
};
