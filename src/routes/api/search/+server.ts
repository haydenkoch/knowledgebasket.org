import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	RATE_LIMIT_POLICIES,
	buildRateLimitHeaders,
	consumeRateLimit
} from '$lib/server/rate-limit';
import type { CoilKey } from '$lib/data/kb';
import { runPublicSearch } from '$lib/server/search-ops';
import { logServerEvent } from '$lib/server/observability';

const emptyResults: Record<CoilKey, { title: string; slug?: string; id?: string }[]> = {
	events: [],
	funding: [],
	redpages: [],
	jobs: [],
	toolbox: []
};

export const GET: RequestHandler = async ({ url, request, locals, getClientAddress }) => {
	const q = (url.searchParams.get('q') as string)?.trim() ?? '';
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '3', 10) || 3, 20);
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
				queryLength: q.length
			},
			'warn'
		);

		return json(
			{
				query: q,
				results: emptyResults,
				mode: 'offline',
				error: 'Too many search requests'
			},
			{
				status: 429,
				headers: buildRateLimitHeaders(rateLimit)
			}
		);
	}

	if (q.length < 2) {
		return json(
			{ query: q, results: emptyResults, mode: 'empty' },
			{ headers: buildRateLimitHeaders(rateLimit) }
		);
	}

	const search = await runPublicSearch(q, limit);
	if (search.resultSource === 'database' && q.length >= 2) {
		logServerEvent(
			'search.compatibility_mode',
			{
				path: '/api/search',
				query: q,
				readiness: search.readiness.state
			},
			search.readiness.state === 'partial' ? 'warn' : 'info'
		);
	}

	return json(
		{
			query: q,
			results: search.results,
			mode: search.readiness.state,
			readiness: search.readiness,
			resultSource: search.resultSource
		},
		{ headers: buildRateLimitHeaders(rateLimit) }
	);
};
