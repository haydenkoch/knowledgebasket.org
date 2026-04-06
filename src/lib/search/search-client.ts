import type {
	SearchGroup,
	SearchFilters,
	SearchRequest,
	SearchResponse,
	SearchScope,
	SearchSort,
	SearchSurface
} from '$lib/server/search-contracts';

export const MIN_SEARCH_QUERY_LENGTH = 2;
export const SEARCH_DEBOUNCE_MS = 180;

export type SearchLinkOptions = {
	q?: string;
	scope?: SearchScope;
	sort?: SearchSort;
	page?: number;
	limit?: number;
	surface?: SearchSurface;
	dateFrom?: string;
	dateTo?: string;
	filters?: SearchFilters;
};

function appendFilters(params: URLSearchParams, filters: SearchFilters = {}) {
	for (const [key, values] of Object.entries(filters)) {
		for (const value of values ?? []) {
			if (value) params.append(key, value);
		}
	}
}

export function buildSearchParams({
	q = '',
	scope = 'all',
	sort = 'relevance',
	page = 1,
	limit,
	surface,
	dateFrom,
	dateTo,
	filters = {}
}: SearchLinkOptions): URLSearchParams {
	const params = new URLSearchParams();
	if (q.trim()) params.set('q', q.trim());
	if (scope !== 'all') params.set('coil', scope);
	if (sort !== 'relevance') params.set('sort', sort);
	if (page > 1) params.set('page', String(page));
	if (typeof limit === 'number') params.set('limit', String(limit));
	if (surface && surface !== 'global') params.set('surface', surface);
	if (dateFrom) params.set('from', dateFrom);
	if (dateTo) params.set('to', dateTo);
	appendFilters(params, filters);
	return params;
}

export function buildSearchHref(options: SearchLinkOptions = {}): string {
	const query = buildSearchParams(options).toString();
	return query ? `/search?${query}` : '/search';
}

export function buildSearchApiHref(options: SearchLinkOptions = {}): string {
	const params = buildSearchParams(options);
	if (options.surface && options.surface !== 'global') {
		params.set('surface', options.surface);
	}
	const query = params.toString();
	return query ? `/api/search?${query}` : '/api/search';
}

export async function fetchSearchResponse(
	fetcher: typeof fetch,
	options: SearchLinkOptions,
	controller?: AbortController
): Promise<SearchResponse> {
	const response = await fetcher(buildSearchApiHref(options), {
		signal: controller?.signal
	});
	if (!response.ok) {
		throw new Error('Search request failed');
	}
	return (await response.json()) as SearchResponse;
}

export function searchGroupsWithResults(groups: SearchGroup[]): SearchGroup[] {
	return groups.filter((group) => group.results.length > 0);
}

export function buildScopedSearchHref(term: string, scope: SearchScope = 'all'): string {
	return buildSearchHref({ q: term, scope });
}

export function toSearchLinkOptions(request: Partial<SearchRequest>): SearchLinkOptions {
	return {
		q: request.q,
		scope: request.scope,
		sort: request.sort,
		page: request.page,
		limit: request.limit,
		surface: request.surface,
		dateFrom: request.dateFrom,
		dateTo: request.dateTo,
		filters: request.filters
	};
}
