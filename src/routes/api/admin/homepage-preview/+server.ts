import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requirePrivilegedApiUser } from '$lib/server/access-control';
import {
	RATE_LIMIT_POLICIES,
	buildRateLimitHeaders,
	consumeRateLimit
} from '$lib/server/rate-limit';
import {
	fetchHomepageSectionPreview,
	type HomepageSectionConfig,
	normalizeLayoutPreset,
	type SectionSource,
	type SortDir,
	type SortField
} from '$lib/server/homepage';

const VALID_SOURCES: SectionSource[] = [
	'featured',
	'richtext',
	'events',
	'funding',
	'jobs',
	'redpages',
	'toolbox'
];
const VALID_SORT_FIELDS: SortField[] = [
	'date',
	'deadline',
	'published',
	'created',
	'title',
	'name'
];
const VALID_SORT_DIRS: SortDir[] = ['asc', 'desc'];

function normalizeSectionConfig(payload: Record<string, unknown>): HomepageSectionConfig {
	const source = payload.source;
	if (typeof source !== 'string' || !VALID_SOURCES.includes(source as SectionSource)) {
		throw error(400, 'Invalid section source');
	}

	const sortBy = payload.sortBy;
	const sortDir = payload.sortDir;

	return {
		id: typeof payload.id === 'string' ? payload.id : 'preview',
		source: source as SectionSource,
		visible: payload.visible !== false,
		limit: Math.min(Math.max(Number(payload.limit) || 3, 1), 12),
		sortBy:
			typeof sortBy === 'string' && VALID_SORT_FIELDS.includes(sortBy as SortField)
				? (sortBy as SortField)
				: 'published',
		sortDir:
			typeof sortDir === 'string' && VALID_SORT_DIRS.includes(sortDir as SortDir)
				? (sortDir as SortDir)
				: 'desc',
		futureOnly: payload.futureOnly === true,
		heading: typeof payload.heading === 'string' ? payload.heading : '',
		excludedIds: Array.isArray(payload.excludedIds)
			? payload.excludedIds.filter(
					(item): item is string => typeof item === 'string' && item.length > 0
				)
			: undefined,
		searchQuery:
			typeof payload.searchQuery === 'string' && payload.searchQuery.trim().length > 0
				? payload.searchQuery.trim()
				: undefined,
		layoutPreset: normalizeLayoutPreset(
			source as SectionSource,
			typeof payload.layoutPreset === 'string' ? payload.layoutPreset : null
		),
		content: typeof payload.content === 'string' ? payload.content : undefined
	};
}

export const POST: RequestHandler = async ({ locals, request, getClientAddress, url }) => {
	const rateLimit = consumeRateLimit(
		{ request, locals, getClientAddress, url },
		RATE_LIMIT_POLICIES.privilegedOps,
		'/api/admin/homepage-preview'
	);
	if (!rateLimit.allowed) {
		return json(
			{ error: 'Too many homepage preview requests' },
			{ status: 429, headers: buildRateLimitHeaders(rateLimit) }
		);
	}

	requirePrivilegedApiUser(locals);

	const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	if (!body || typeof body !== 'object') {
		throw error(400, 'Invalid request body');
	}

	const section = normalizeSectionConfig(body);
	const items = await fetchHomepageSectionPreview(section);
	return json({ items }, { headers: buildRateLimitHeaders(rateLimit) });
};
