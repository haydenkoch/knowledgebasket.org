import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	RATE_LIMIT_POLICIES,
	buildRateLimitHeaders,
	consumeRateLimit
} from '$lib/server/rate-limit';
import { parseSearchRequestFromUrl, runUnifiedSearch } from '$lib/server/search-service';
import { logServerEvent } from '$lib/server/observability';

export const GET: RequestHandler = async ({ url, request, locals, getClientAddress }) => {
	const searchRequest = parseSearchRequestFromUrl(url, {
		surface: 'autocomplete',
		scope: 'all',
		limit: 5,
		sort: 'relevance'
	});
	const rateLimit = consumeRateLimit(
		{ request, url, locals, getClientAddress },
		RATE_LIMIT_POLICIES.searchApi,
		'/api/search'
	);

	if (!rateLimit.allowed) {
		logServerEvent(
			'search.rate_limited',
			{
				path: '/api/search',
				queryLength: searchRequest.q.length
			},
			'warn'
		);

		return json(
			{ error: 'Too many search requests' },
			{
				status: 429,
				headers: buildRateLimitHeaders(rateLimit)
			}
		);
	}

	const search = await runUnifiedSearch(searchRequest);
	if (search.resultSource === 'database' && search.query.length >= 2) {
		logServerEvent(
			'search.compatibility_mode',
			{
				path: '/api/search',
				query: search.query,
				readiness: search.readiness.state
			},
			search.readiness.state === 'partial' ? 'warn' : 'info'
		);
	}

	return json(search, { headers: buildRateLimitHeaders(rateLimit) });
};
