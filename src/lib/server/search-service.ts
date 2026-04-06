import type {
	CoilKey,
	EventItem,
	FundingItem,
	JobItem,
	RedPagesItem,
	ToolboxItem
} from '$lib/data/kb';
import { coilLabels } from '$lib/data/kb';
import { getEvents } from '$lib/server/events';
import { getPublishedFunding } from '$lib/server/funding';
import { getPublishedJobs } from '$lib/server/jobs';
import {
	getSearchReadiness,
	searchIndex,
	searchScopesWithStatus,
	type SearchDoc
} from '$lib/server/meilisearch';
import { getOrganizations } from '$lib/server/organizations';
import { getPublishedBusinesses } from '$lib/server/red-pages';
import { semanticSearchAdapter } from '$lib/server/search-semantic';
import { getSourcesForAdmin } from '$lib/server/sources';
import { getPublishedResources } from '$lib/server/toolbox';
import { getVenues } from '$lib/server/venues';
import {
	PUBLIC_SEARCH_SCOPES,
	SEARCH_SCOPE_LABELS,
	type SearchExperience,
	type SearchFacetBucket,
	type SearchFacetGroup,
	type SearchFilters,
	type SearchIndexScope,
	type SearchPagination,
	type SearchRequest,
	type SearchResultAction,
	type SearchResultIcon,
	type SearchResponse,
	type SearchResult,
	type SearchScope,
	type SearchSort,
	type SearchSurface,
	type SearchReadiness,
	type SearchFallbackReason
} from '$lib/server/search-contracts';
import { eventTypeGroups } from '$lib/data/formSchema';
import { formatDisplayValue } from '$lib/utils/display.js';
import { matchSearch, parseEventStart, stripHtml } from '$lib/utils/format';

type ContentItem = EventItem | FundingItem | JobItem | RedPagesItem | ToolboxItem;
type AnyScopeConfig =
	| ScopeConfig<EventItem>
	| ScopeConfig<FundingItem>
	| ScopeConfig<JobItem>
	| ScopeConfig<RedPagesItem>
	| ScopeConfig<ToolboxItem>;

type ScopeConfig<T> = {
	label: string;
	searchFields: string[];
	facets: Array<{ key: keyof SearchFilters; label: string; field: keyof T | string }>;
	getItems: () => Promise<T[]>;
	toResult: (item: T) => SearchResult;
	meiliSort: (sort: SearchSort) => string[] | undefined;
	meiliFacetFields: string[];
	meiliFilterFields: Partial<Record<keyof SearchFilters, string>>;
};

const contentScopePaths: Record<CoilKey, string> = {
	events: '/events',
	funding: '/funding',
	redpages: '/red-pages',
	jobs: '/jobs',
	toolbox: '/toolbox'
};

function unknownRecord(value: unknown): Record<string, unknown> {
	return value as Record<string, unknown>;
}

function normalizeQuery(value: string | null | undefined): string {
	return (value ?? '').trim().replace(/\s+/g, ' ');
}

function normalizeDateInput(value: string | null | undefined): string | undefined {
	const raw = (value ?? '').trim();
	if (!raw) return undefined;
	const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (!match) return undefined;
	return `${match[1]}-${match[2]}-${match[3]}`;
}

function clampPage(value: string | null | undefined): number {
	return Math.max(1, Number.parseInt(value ?? '1', 10) || 1);
}

function clampLimit(value: string | null | undefined, fallback: number): number {
	return Math.min(24, Math.max(1, Number.parseInt(value ?? String(fallback), 10) || fallback));
}

function parseSort(
	value: string | null | undefined,
	fallback: SearchSort = 'relevance'
): SearchSort {
	return value === 'recent' || value === 'title' || value === 'date' ? value : fallback;
}

function parseScope(value: string | null | undefined, fallback: SearchScope = 'all'): SearchScope {
	if (
		value === 'events' ||
		value === 'funding' ||
		value === 'redpages' ||
		value === 'jobs' ||
		value === 'toolbox' ||
		value === 'organizations' ||
		value === 'venues' ||
		value === 'sources'
	) {
		return value;
	}
	return fallback;
}

const FILTER_KEYS = [
	'region',
	'type',
	'status',
	'sector',
	'level',
	'workArrangement',
	'mediaType',
	'category',
	'serviceType',
	'tribalAffiliation',
	'eligibilityType',
	'fundingType',
	'cost',
	'subsection'
] as const satisfies (keyof SearchFilters)[];

function parseFilters(params: URLSearchParams): SearchFilters {
	return Object.fromEntries(
		FILTER_KEYS.map((key) => [key, params.getAll(key).filter(Boolean)])
	) as SearchFilters;
}

export function parseSearchRequestFromUrl(
	url: URL,
	defaults?: Partial<Pick<SearchRequest, 'surface' | 'scope' | 'limit' | 'sort'>>
): SearchRequest {
	return {
		q: normalizeQuery(url.searchParams.get('q')),
		surface:
			defaults?.surface ?? (url.searchParams.get('surface') as SearchSurface | null) ?? 'global',
		scope: parseScope(
			url.searchParams.get('scope') ?? url.searchParams.get('coil'),
			defaults?.scope ?? 'all'
		),
		page: clampPage(url.searchParams.get('page')),
		limit: clampLimit(url.searchParams.get('limit'), defaults?.limit ?? 12),
		sort: parseSort(url.searchParams.get('sort'), defaults?.sort ?? 'relevance'),
		dateFrom: normalizeDateInput(url.searchParams.get('from')),
		dateTo: normalizeDateInput(url.searchParams.get('to')),
		filters: parseFilters(url.searchParams)
	};
}

function scopeFromDoc(doc: SearchDoc): SearchIndexScope {
	if (doc.scope) return doc.scope;
	if (doc.coil) return doc.coil;
	return 'events';
}

function docMeta(doc: SearchDoc): string[] {
	const values = [
		doc.organizationName,
		doc.region,
		doc.serviceType,
		doc.funderName,
		doc.applicationStatus,
		doc.employerName,
		doc.location,
		doc.mediaType,
		doc.category,
		doc.type
	]
		.map((value) => (typeof value === 'string' ? value.trim() : ''))
		.filter(Boolean);
	return Array.from(new Set(values));
}

function compactMeta(values: Array<string | undefined | null>, fallback?: string): string {
	const parts = values.map((value) => value?.trim()).filter(Boolean) as string[];
	return parts.join(' · ') || fallback || '';
}

function scopeIcon(scope: SearchIndexScope): SearchResultIcon {
	switch (scope) {
		case 'events':
			return 'calendar';
		case 'funding':
			return 'funding';
		case 'redpages':
			return 'business';
		case 'jobs':
			return 'job';
		case 'toolbox':
			return 'resource';
		case 'organizations':
			return 'organization';
		case 'venues':
			return 'venue';
		case 'sources':
			return 'source';
	}
}

function destinationLabel(scope: SearchIndexScope): string {
	switch (scope) {
		case 'organizations':
		case 'venues':
		case 'sources':
			return 'Admin details';
		default:
			return 'Open result';
	}
}

function actionForScope(scope: SearchIndexScope, href: string): SearchResultAction {
	if (scope === 'sources') {
		return { id: 'review', label: 'Review source', href, intent: 'navigate' };
	}
	if (scope === 'organizations' || scope === 'venues') {
		return { id: 'manage', label: 'Manage record', href, intent: 'navigate' };
	}
	return {
		id:
			scope === 'events' ||
			scope === 'funding' ||
			scope === 'jobs' ||
			scope === 'redpages' ||
			scope === 'toolbox'
				? 'open'
				: 'edit',
		label: 'Open result',
		href,
		intent: 'navigate'
	};
}

function presentResult(base: Omit<SearchResult, 'presentation'>): SearchResult {
	return {
		...base,
		presentation: {
			badge: SEARCH_SCOPE_LABELS[base.scope],
			subtitle: compactMeta(base.meta, SEARCH_SCOPE_LABELS[base.scope]),
			icon: scopeIcon(base.scope),
			destinationLabel: destinationLabel(base.scope),
			intent:
				base.scope === 'sources'
					? 'review'
					: base.scope === 'organizations' || base.scope === 'venues'
						? 'manage'
						: 'open',
			actions: [actionForScope(base.scope, base.href)]
		}
	};
}

function adminContentHref(scope: CoilKey, id: string): string {
	switch (scope) {
		case 'events':
			return `/admin/events/${id}`;
		case 'funding':
			return `/admin/funding/${id}`;
		case 'redpages':
			return `/admin/red-pages/${id}`;
		case 'jobs':
			return `/admin/jobs/${id}`;
		case 'toolbox':
			return `/admin/toolbox/${id}`;
	}
}

function adaptResultForSurface(result: SearchResult, surface: SearchSurface): SearchResult {
	if (
		surface !== 'admin' ||
		(result.scope !== 'events' &&
			result.scope !== 'funding' &&
			result.scope !== 'redpages' &&
			result.scope !== 'jobs' &&
			result.scope !== 'toolbox')
	) {
		return result;
	}

	const href = adminContentHref(result.scope, result.id);
	return {
		...result,
		href,
		presentation: {
			...result.presentation,
			destinationLabel: 'Admin edit',
			intent: 'edit',
			actions: [{ id: 'edit', label: 'Edit record', href, intent: 'navigate' }]
		}
	};
}

function fallbackReasonFromReadiness(
	readiness: SearchReadiness,
	queryLength: number
): SearchFallbackReason {
	if (queryLength < 2) return 'query-too-short';
	if (readiness.detail === 'settings-mismatch') return 'settings-mismatch';
	if (readiness.detail === 'missing-indexes') return 'missing-index';
	return 'search-offline';
}

function degradedLabel(
	readiness: SearchReadiness,
	resultSource: SearchResponse['resultSource']
): string | undefined {
	if (resultSource === 'meilisearch' && readiness.state === 'ready') return undefined;
	if (readiness.detail === 'missing-indexes')
		return 'Indexed search is still rebuilding across some areas.';
	if (readiness.detail === 'settings-mismatch')
		return 'Indexed search settings need a refresh before results are fully trustworthy.';
	if (readiness.detail === 'host-unavailable')
		return 'Search is using the compatibility fallback while Meilisearch is offline.';
	if (readiness.detail === 'not-configured')
		return 'Search is running in compatibility mode because indexed search is not configured.';
	return 'Search is running in a degraded mode.';
}

function buildExperience(
	request: SearchRequest,
	readiness: SearchReadiness,
	resultSource: SearchResponse['resultSource']
): SearchExperience {
	return {
		degraded: resultSource === 'database' || readiness.state !== 'ready',
		degradedLabel: degradedLabel(readiness, resultSource),
		canUseFastResults: resultSource === 'meilisearch',
		canUseAdvancedFilters: request.scope !== 'all',
		canUseFacets: request.scope !== 'all'
	};
}

function resultFromDoc(doc: SearchDoc): SearchResult {
	const scope = scopeFromDoc(doc);
	return presentResult({
		id: doc.id,
		slug: doc.slug,
		title: doc.title,
		summary: doc.summary ?? doc.description,
		scope,
		coil: doc.coil,
		kind:
			doc.kind ??
			(scope === 'organizations'
				? 'organization'
				: scope === 'venues'
					? 'venue'
					: scope === 'sources'
						? 'source'
						: 'content'),
		href:
			doc.href ??
			(scope in contentScopePaths
				? `${contentScopePaths[scope as CoilKey]}/${doc.slug ?? doc.id}`
				: scope === 'organizations'
					? `/admin/organizations/${doc.id}`
					: scope === 'venues'
						? `/admin/venues/${doc.id}`
						: `/admin/sources/${doc.id}`),
		meta: docMeta(doc),
		imageUrl: typeof doc.imageUrl === 'string' ? doc.imageUrl : undefined,
		fields: doc
	});
}

function buildPagination(page: number, limit: number, total: number): SearchPagination {
	return {
		page,
		limit,
		total,
		totalPages: Math.max(1, Math.ceil(total / limit))
	};
}

function buildSuggestions(request: SearchRequest): SearchResponse['suggestions'] {
	if (request.q.length < 2) {
		return PUBLIC_SEARCH_SCOPES.map((scope) => ({
			label: `Browse ${coilLabels[scope]}`,
			href: `/${scope === 'redpages' ? 'red-pages' : scope}`,
			kind: 'scope' as const
		}));
	}

	return request.scope === 'all'
		? PUBLIC_SEARCH_SCOPES.map((scope) => ({
				label: `Search ${coilLabels[scope]} for "${request.q}"`,
				href: `/search?q=${encodeURIComponent(request.q)}&coil=${scope}`,
				kind: 'scope' as const
			}))
		: [
				{
					label: `Search all results for "${request.q}"`,
					href: `/search?q=${encodeURIComponent(request.q)}`,
					kind: 'scope'
				}
			];
}

function facetGroup(
	key: keyof SearchFilters,
	label: string,
	distribution: Record<string, number> | undefined,
	activeValues: string[] | undefined,
	fieldKey?: string
): SearchFacetGroup {
	const activeSet = new Set(activeValues ?? []);
	const buckets: SearchFacetBucket[] = Object.entries(distribution ?? {})
		.filter(([value]) => value)
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
		.map(([value, count]) => ({
			value,
			label: formatDisplayValue(value, fieldKey ? { key: fieldKey } : {}),
			count,
			active: activeSet.has(value)
		}));
	return { key, label, multi: true, buckets };
}

function buildFilterExpression(
	requestFilters: SearchFilters,
	scopeConfig: Pick<AnyScopeConfig, 'meiliFilterFields'>
): string[] {
	const expressions: string[] = [];
	for (const [filterKey, field] of Object.entries(scopeConfig.meiliFilterFields) as Array<
		[keyof SearchFilters, string]
	>) {
		const values = requestFilters[filterKey] ?? [];
		if (!values.length) continue;
		const clauses = values.map((value) => `${field} = "${String(value).replace(/"/g, '\\"')}"`);
		expressions.push(clauses.length === 1 ? clauses[0] : `(${clauses.join(' OR ')})`);
	}
	return expressions;
}

function toStartOfDayIso(dateInput: string): string {
	return `${dateInput}T00:00:00.000Z`;
}

function toEndOfDayIso(dateInput: string): string {
	return `${dateInput}T23:59:59.999Z`;
}

function buildDateExpressions(request: SearchRequest): string[] {
	const expressions: string[] = [];
	if (request.dateFrom) expressions.push(`sortDate >= "${toStartOfDayIso(request.dateFrom)}"`);
	if (request.dateTo) expressions.push(`sortDate <= "${toEndOfDayIso(request.dateTo)}"`);
	return expressions;
}

function itemSortTimestamp(item: ContentItem, scope: CoilKey): number | null {
	if (scope === 'events') {
		const ts = parseEventStart((item as EventItem).startDate);
		return Number.isFinite(ts) ? ts : null;
	}
	const raw = String(
		unknownRecord(item).deadline ??
			unknownRecord(item).applicationDeadline ??
			unknownRecord(item).publishDate ??
			unknownRecord(item).publishedAt ??
			unknownRecord(item).updatedAt ??
			''
	);
	if (!raw) return null;
	const ts = new Date(raw).getTime();
	return Number.isFinite(ts) ? ts : null;
}

function withinRequestedDateRange(
	item: ContentItem,
	scope: CoilKey,
	request: SearchRequest
): boolean {
	if (!request.dateFrom && !request.dateTo) return true;
	const itemTs = itemSortTimestamp(item, scope);
	if (itemTs === null) return false;
	const fromTs = request.dateFrom
		? new Date(toStartOfDayIso(request.dateFrom)).getTime()
		: -Infinity;
	const toTs = request.dateTo ? new Date(toEndOfDayIso(request.dateTo)).getTime() : Infinity;
	return itemTs >= fromTs && itemTs <= toTs;
}

function hasRefinements(request: SearchRequest): boolean {
	return Boolean(
		request.dateFrom ||
		request.dateTo ||
		Object.values(request.filters).some((values) => (values?.length ?? 0) > 0)
	);
}

function toolboxSubsectionMatch(item: ToolboxItem, subId: string): boolean {
	if (!subId) return true;
	const cat = (item.category ?? '').toLowerCase();
	const mt = (item.mediaType ?? '').toLowerCase();
	switch (subId) {
		case 'indigenous-economic-futures':
			return cat.includes('indigenous economic futures') || cat.includes('economic development');
		case 'tribal-govts-enterprises':
			return cat.includes('tribal allies');
		case 'toolkits':
			return mt.includes('toolkit');
		case 'agency-policy-docs':
			return mt.includes('policy document') || mt.includes('report');
		case 'library':
			return !mt.includes('toolkit') && !mt.includes('policy document') && !mt.includes('report');
		default:
			return true;
	}
}

function eventTypeValue(event: EventItem): string {
	for (const group of eventTypeGroups) {
		if (group.tags.some((tag) => (event.types ?? [event.type ?? '']).includes(tag))) {
			return group.label;
		}
	}
	return event.type ?? '';
}

const contentScopeConfigs = {
	events: {
		label: coilLabels.events,
		searchFields: ['location', 'region', 'type', 'hostOrg', 'organizationName', 'venueName'],
		facets: [
			{ key: 'region', label: 'Region', field: 'region' },
			{ key: 'type', label: 'Type', field: 'type' },
			{ key: 'cost', label: 'Cost', field: 'cost' }
		],
		getItems: () => getEvents({ includeIcal: false }),
		toResult: (item: EventItem): SearchResult =>
			presentResult({
				id: item.id,
				slug: item.slug,
				title: item.title,
				summary: item.description ? stripHtml(item.description) : undefined,
				scope: 'events',
				coil: 'events',
				kind: 'content',
				href: `/events/${item.slug ?? item.id}`,
				meta: [item.type, item.location, item.region].filter(Boolean) as string[],
				imageUrl: item.imageUrl,
				fields: item as unknown
			}),
		meiliSort: (sort) =>
			sort === 'title'
				? ['title:asc']
				: sort === 'date'
					? ['sortDate:asc']
					: sort === 'recent'
						? ['updatedAt:desc']
						: undefined,
		meiliFacetFields: ['region', 'type', 'cost'],
		meiliFilterFields: { region: 'region', type: 'type', cost: 'cost' }
	},
	funding: {
		label: coilLabels.funding,
		searchFields: ['funderName', 'amountDescription', 'region', 'applicationStatus', 'fundingType'],
		facets: [
			{ key: 'type', label: 'Type', field: 'fundingType' },
			{ key: 'status', label: 'Status', field: 'applicationStatus' }
		],
		getItems: getPublishedFunding,
		toResult: (item: FundingItem): SearchResult =>
			presentResult({
				id: item.id,
				slug: item.slug,
				title: item.title,
				summary: item.description ? stripHtml(item.description) : undefined,
				scope: 'funding',
				coil: 'funding',
				kind: 'content',
				href: `/funding/${item.slug ?? item.id}`,
				meta: [item.funderName, item.applicationStatus, item.region].filter(Boolean) as string[],
				imageUrl: item.imageUrl,
				fields: item as unknown
			}),
		meiliSort: (sort) =>
			sort === 'title'
				? ['title:asc']
				: sort === 'date'
					? ['sortDate:asc']
					: sort === 'recent'
						? ['updatedAt:desc']
						: undefined,
		meiliFacetFields: ['fundingType', 'applicationStatus'],
		meiliFilterFields: { type: 'fundingType', status: 'applicationStatus' }
	},
	redpages: {
		label: coilLabels.redpages,
		searchFields: ['tribalAffiliation', 'serviceType', 'region', 'city', 'state'],
		facets: [
			{ key: 'serviceType', label: 'Service Type', field: 'serviceType' },
			{ key: 'region', label: 'Region', field: 'region' }
		],
		getItems: getPublishedBusinesses,
		toResult: (item: RedPagesItem): SearchResult =>
			presentResult({
				id: item.id,
				slug: item.slug,
				title: item.title,
				summary: item.description ? stripHtml(item.description) : undefined,
				scope: 'redpages',
				coil: 'redpages',
				kind: 'content',
				href: `/red-pages/${item.slug ?? item.id}`,
				meta: [item.tribalAffiliation, item.serviceType, item.region].filter(Boolean) as string[],
				imageUrl: item.imageUrl,
				fields: item as unknown
			}),
		meiliSort: (sort) =>
			sort === 'title' ? ['title:asc'] : sort === 'recent' ? ['updatedAt:desc'] : undefined,
		meiliFacetFields: ['serviceType', 'region'],
		meiliFilterFields: { serviceType: 'serviceType', region: 'region' }
	},
	jobs: {
		label: coilLabels.jobs,
		searchFields: ['employerName', 'location', 'jobType', 'sector', 'seniority', 'workArrangement'],
		facets: [
			{ key: 'type', label: 'Job Type', field: 'jobType' },
			{ key: 'sector', label: 'Sector', field: 'sector' },
			{ key: 'level', label: 'Level', field: 'seniority' },
			{ key: 'workArrangement', label: 'Work Arrangement', field: 'workArrangement' }
		],
		getItems: getPublishedJobs,
		toResult: (item: JobItem): SearchResult =>
			presentResult({
				id: item.id,
				slug: item.slug,
				title: item.title,
				summary: item.description ? stripHtml(item.description) : undefined,
				scope: 'jobs',
				coil: 'jobs',
				kind: 'content',
				href: `/jobs/${item.slug ?? item.id}`,
				meta: [item.employerName, item.location, item.workArrangement].filter(Boolean) as string[],
				imageUrl: item.imageUrl,
				fields: item as unknown
			}),
		meiliSort: (sort) =>
			sort === 'title'
				? ['title:asc']
				: sort === 'recent'
					? ['updatedAt:desc']
					: sort === 'date'
						? ['sortDate:desc']
						: undefined,
		meiliFacetFields: ['jobType', 'sector', 'seniority', 'workArrangement'],
		meiliFilterFields: {
			type: 'jobType',
			sector: 'sector',
			level: 'seniority',
			workArrangement: 'workArrangement'
		}
	},
	toolbox: {
		label: coilLabels.toolbox,
		searchFields: ['sourceName', 'mediaType', 'category', 'author'],
		facets: [
			{ key: 'mediaType', label: 'Media Type', field: 'mediaType' },
			{ key: 'category', label: 'Category', field: 'category' }
		],
		getItems: getPublishedResources,
		toResult: (item: ToolboxItem): SearchResult =>
			presentResult({
				id: item.id,
				slug: item.slug,
				title: item.title,
				summary: item.description
					? stripHtml(item.description)
					: item.body
						? stripHtml(item.body)
						: undefined,
				scope: 'toolbox',
				coil: 'toolbox',
				kind: 'content',
				href: `/toolbox/${item.slug ?? item.id}`,
				meta: [item.mediaType, item.category, item.sourceName].filter(Boolean) as string[],
				imageUrl: item.imageUrl,
				fields: item as unknown
			}),
		meiliSort: (sort) =>
			sort === 'title'
				? ['title:asc']
				: sort === 'recent'
					? ['updatedAt:desc']
					: sort === 'date'
						? ['sortDate:desc']
						: undefined,
		meiliFacetFields: ['mediaType', 'category'],
		meiliFilterFields: { mediaType: 'mediaType', category: 'category' }
	}
} satisfies Record<CoilKey, AnyScopeConfig>;

function filterFallbackItems<T extends ContentItem>(
	items: T[],
	scope: CoilKey,
	request: SearchRequest
): { filtered: T[]; facets: SearchFacetGroup[] } {
	const config = contentScopeConfigs[scope];
	const queryFiltered = items.filter(
		(item) =>
			matchSearch(item, request.q, config.searchFields as Array<keyof T>) &&
			withinRequestedDateRange(item, scope, request)
	);
	let filtered = queryFiltered;

	for (const facet of config.facets) {
		const selected = request.filters[facet.key] ?? [];
		if (!selected.length) continue;
		filtered = filtered.filter((item) => {
			const raw =
				scope === 'events' && facet.key === 'type'
					? eventTypeValue(item as EventItem)
					: String(unknownRecord(item)[facet.field as string] ?? '');
			return selected.includes(raw);
		});
	}

	if (scope === 'toolbox' && (request.filters.subsection?.length ?? 0) > 0) {
		filtered = filtered.filter((item) =>
			request.filters.subsection?.some((value) =>
				toolboxSubsectionMatch(item as ToolboxItem, value)
			)
		);
	}

	filtered = [...filtered].sort((a, b) => {
		if (request.sort === 'title') return a.title.localeCompare(b.title);
		if (request.sort === 'recent') {
			const aDate =
				new Date(String(unknownRecord(a).updatedAt ?? a.publishedAt ?? '')).getTime() || 0;
			const bDate =
				new Date(String(unknownRecord(b).updatedAt ?? b.publishedAt ?? '')).getTime() || 0;
			return bDate - aDate;
		}
		if (request.sort === 'date') {
			const aDate =
				scope === 'events'
					? (parseEventStart((a as EventItem).startDate) ?? Number.MAX_SAFE_INTEGER)
					: (itemSortTimestamp(a, scope) ?? Number.MAX_SAFE_INTEGER);
			const bDate =
				scope === 'events'
					? (parseEventStart((b as EventItem).startDate) ?? Number.MAX_SAFE_INTEGER)
					: (itemSortTimestamp(b, scope) ?? Number.MAX_SAFE_INTEGER);
			return aDate - bDate;
		}
		return 0;
	});

	const facets = config.facets.map((facet) => {
		const counts: Record<string, number> = {};
		for (const item of queryFiltered) {
			const value =
				scope === 'events' && facet.key === 'type'
					? eventTypeValue(item as EventItem)
					: String(unknownRecord(item)[facet.field as string] ?? '');
			if (!value) continue;
			counts[value] = (counts[value] ?? 0) + 1;
		}
		return facetGroup(
			facet.key,
			facet.label,
			counts,
			request.filters[facet.key],
			String(facet.field)
		);
	});

	return { filtered, facets };
}

async function runSingleScopeBrowseSearch(
	scope: CoilKey,
	request: SearchRequest
): Promise<
	Pick<
		SearchResponse,
		'pagination' | 'facets' | 'results' | 'groups' | 'resultSource' | 'fallbackReason'
	>
> {
	const readiness = await getSearchReadiness();
	const config = contentScopeConfigs[scope];

	if (readiness.state === 'ready' && (request.filters.subsection?.length ?? 0) === 0) {
		try {
			const offset = (request.page - 1) * request.limit;
			const filter = [
				...buildFilterExpression(request.filters, config),
				...buildDateExpressions(request)
			];
			const meili = await searchIndex(scope, request.q, {
				limit: request.limit,
				offset,
				filter: filter.length > 0 ? filter : undefined,
				sort: config.meiliSort(request.sort),
				facets: config.meiliFacetFields,
				allowEmpty: true
			});
			const items = await config.getItems();
			const itemMap = new Map(items.map((item) => [item.id, item]));
			const hydratedResults = meili.hits.map((hit) => {
				const matched = itemMap.get(hit.id);
				return matched ? config.toResult(matched) : resultFromDoc(hit);
			});
			const results = (await semanticSearchAdapter.rerankResults(request, hydratedResults)).slice(
				0,
				request.limit
			);
			const meiliFieldMap = config.meiliFilterFields as Partial<
				Record<keyof SearchFilters, string>
			>;
			const facets = config.facets.map((facet) =>
				facetGroup(
					facet.key,
					facet.label,
					meili.facetDistribution?.[meiliFieldMap[facet.key] ?? String(facet.field)],
					request.filters[facet.key],
					String(facet.field)
				)
			);
			return {
				pagination: buildPagination(request.page, request.limit, meili.estimatedTotalHits),
				facets,
				results,
				groups: [{ key: scope, label: config.label, total: meili.estimatedTotalHits, results }],
				resultSource: 'meilisearch',
				fallbackReason: undefined
			};
		} catch {
			// Fall through to compatibility mode
		}
	}

	const items = await config.getItems();
	const { filtered, facets } = filterFallbackItems(items, scope, request);
	const total = filtered.length;
	const pageItems = filtered.slice(
		(request.page - 1) * request.limit,
		request.page * request.limit
	);
	const results = pageItems.map(config.toResult);
	return {
		pagination: buildPagination(request.page, request.limit, total),
		facets,
		results,
		groups: [{ key: scope, label: config.label, total, results }],
		resultSource: 'database',
		fallbackReason: fallbackReasonFromReadiness(readiness, request.q.length)
	};
}

async function runGroupedScopeSearch(
	request: SearchRequest,
	scopes: SearchIndexScope[]
): Promise<
	Pick<
		SearchResponse,
		'pagination' | 'facets' | 'results' | 'groups' | 'resultSource' | 'fallbackReason'
	>
> {
	const readiness = await getSearchReadiness();

	const canUseFastGroupedSearch =
		request.q.length >= 2 &&
		readiness.state === 'ready' &&
		request.sort === 'relevance' &&
		request.page === 1 &&
		!hasRefinements(request);

	if (canUseFastGroupedSearch) {
		const grouped = await searchScopesWithStatus(scopes, request.q, { limit: request.limit });
		if (grouped.ok) {
			const groups = scopes
				.map((scope) => ({
					key: scope,
					label: SEARCH_SCOPE_LABELS[scope],
					total: grouped.results[scope].length,
					results: grouped.results[scope].map((doc) =>
						adaptResultForSurface(resultFromDoc(doc), request.surface)
					)
				}))
				.filter((group) => group.results.length > 0);
			const results = await semanticSearchAdapter.rerankResults(
				request,
				groups.flatMap((group) => group.results)
			);
			return {
				pagination: buildPagination(1, request.limit, results.length),
				facets:
					request.scope === 'all'
						? [
								{
									key: 'type',
									label: 'Content Areas',
									multi: true,
									buckets: groups.map((group) => ({
										value: group.key,
										label: group.label,
										count: group.total,
										active: false
									}))
								}
							]
						: [],
				results,
				groups,
				resultSource: 'meilisearch',
				fallbackReason: undefined
			};
		}
	}

	const fallbackGroups = await Promise.all(
		scopes.map(async (scope) => {
			if (scope === 'organizations') {
				const result = await getOrganizations({ search: request.q, limit: request.limit });
				return {
					key: scope,
					label: SEARCH_SCOPE_LABELS[scope],
					total: result.total,
					results: result.orgs.map((org) =>
						presentResult({
							id: org.id,
							title: org.name,
							summary: org.description ? stripHtml(org.description) : undefined,
							scope,
							kind: 'organization' as const,
							href: `/admin/organizations/${org.id}`,
							meta: [org.region, org.website].filter(Boolean) as string[],
							fields: org
						})
					)
				};
			}
			if (scope === 'venues') {
				const result = await getVenues({ search: request.q, limit: request.limit });
				return {
					key: scope,
					label: SEARCH_SCOPE_LABELS[scope],
					total: result.total,
					results: result.venues.map((venue) =>
						presentResult({
							id: venue.id,
							title: venue.name,
							summary: [venue.address, venue.city, venue.state].filter(Boolean).join(', '),
							scope,
							kind: 'venue' as const,
							href: `/admin/venues/${venue.id}`,
							meta: [venue.city, venue.state].filter(Boolean) as string[],
							fields: venue
						})
					)
				};
			}
			if (scope === 'sources') {
				const result = await getSourcesForAdmin({
					search: request.q,
					limit: request.limit,
					sort: 'name',
					order: 'asc'
				});
				return {
					key: scope,
					label: SEARCH_SCOPE_LABELS[scope],
					total: result.total,
					results: result.items.map((source) =>
						presentResult({
							id: source.id,
							title: source.name,
							summary: source.sourceUrl ?? source.fetchUrl ?? source.homepageUrl ?? undefined,
							scope,
							kind: 'source' as const,
							href: `/admin/sources/${source.id}`,
							meta: [source.healthStatus, source.status].filter(Boolean) as string[],
							fields: source
						})
					)
				};
			}

			const contentSearch = await runSingleScopeBrowseSearch(scope, {
				...request,
				scope,
				surface: 'browse',
				page: 1
			});
			return {
				key: scope,
				label: SEARCH_SCOPE_LABELS[scope],
				total: contentSearch.pagination.total,
				results: contentSearch.results
					.slice(0, request.limit)
					.map((result) => adaptResultForSurface(result, request.surface))
			};
		})
	);

	const groups = fallbackGroups.filter((group) => group.results.length > 0);
	return {
		pagination: buildPagination(1, request.limit, groups.flatMap((group) => group.results).length),
		facets:
			request.scope === 'all'
				? [
						{
							key: 'type',
							label: 'Content Areas',
							multi: true,
							buckets: groups.map((group) => ({
								value: group.key,
								label: group.label,
								count: group.total,
								active: false
							}))
						}
					]
				: [],
		results: groups.flatMap((group) => group.results),
		groups,
		resultSource: 'database',
		fallbackReason: fallbackReasonFromReadiness(readiness, request.q.length)
	};
}

export async function runUnifiedSearch(request: SearchRequest): Promise<SearchResponse> {
	const startedAt = Date.now();
	const readiness = await getSearchReadiness();
	const expandedTerms = await semanticSearchAdapter.expandQuery(request);
	void expandedTerms;

	let responseSlice:
		| Pick<
				SearchResponse,
				'pagination' | 'facets' | 'results' | 'groups' | 'resultSource' | 'fallbackReason'
		  >
		| undefined;

	if (
		request.surface === 'browse' &&
		request.scope !== 'all' &&
		request.scope in contentScopeConfigs
	) {
		responseSlice = await runSingleScopeBrowseSearch(request.scope as CoilKey, request);
	} else if (request.surface === 'admin') {
		const scopes =
			request.scope === 'all'
				? ([...PUBLIC_SEARCH_SCOPES, 'organizations', 'venues', 'sources'] as SearchIndexScope[])
				: [request.scope as SearchIndexScope];
		responseSlice = await runGroupedScopeSearch(request, scopes);
	} else if (request.scope === 'all') {
		responseSlice = await runGroupedScopeSearch(request, [...PUBLIC_SEARCH_SCOPES]);
	} else if (request.scope in contentScopeConfigs) {
		responseSlice = await runSingleScopeBrowseSearch(request.scope as CoilKey, request);
	} else {
		responseSlice = await runGroupedScopeSearch(request, [request.scope as SearchIndexScope]);
	}

	return {
		query: request.q,
		request,
		readiness,
		resultSource: responseSlice.resultSource,
		fallbackReason: responseSlice.fallbackReason,
		latencyMs: Date.now() - startedAt,
		pagination: responseSlice.pagination,
		facets: responseSlice.facets,
		groups: responseSlice.groups,
		results: responseSlice.results,
		suggestions: buildSuggestions(request),
		experience: buildExperience(request, readiness, responseSlice.resultSource)
	};
}
