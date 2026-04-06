import type { CoilKey } from '$lib/data/kb';
import {
	PUBLIC_SEARCH_SCOPES,
	SEARCH_INDEX_SCOPES,
	SEARCH_SCOPE_LABELS
} from '$lib/search/search-constants';

export type SearchSurface = 'autocomplete' | 'global' | 'browse' | 'admin';
export type SearchScope = CoilKey | 'all' | 'organizations' | 'venues' | 'sources';
export type SearchIndexScope = Exclude<SearchScope, 'all'>;
export type SearchResultSource = 'meilisearch' | 'database';
export type SearchSort = 'relevance' | 'recent' | 'title' | 'date';
export type SearchKind = 'content' | 'organization' | 'venue' | 'source';
export type SearchResultIcon =
	| 'calendar'
	| 'funding'
	| 'business'
	| 'job'
	| 'resource'
	| 'organization'
	| 'venue'
	| 'source'
	| 'page';
export type SearchReadinessDetail =
	| 'not-configured'
	| 'host-unavailable'
	| 'missing-indexes'
	| 'settings-mismatch'
	| 'ready';
export type SearchIssueType =
	| 'configuration'
	| 'unavailable'
	| 'missing-index'
	| 'settings-mismatch';
export type SearchFallbackReason =
	| 'query-too-short'
	| 'search-offline'
	| 'missing-index'
	| 'settings-mismatch'
	| 'meilisearch-error';

export type SearchFilters = Partial<
	Record<
		| 'region'
		| 'type'
		| 'status'
		| 'sector'
		| 'level'
		| 'workArrangement'
		| 'mediaType'
		| 'category'
		| 'serviceType'
		| 'tribalAffiliation'
		| 'eligibilityType'
		| 'fundingType'
		| 'cost'
		| 'subsection',
		string[]
	>
>;

export type SearchRequest = {
	q: string;
	surface: SearchSurface;
	scope: SearchScope;
	page: number;
	limit: number;
	sort: SearchSort;
	dateFrom?: string;
	dateTo?: string;
	filters: SearchFilters;
};

export type SearchIssue = {
	type: SearchIssueType;
	scope?: SearchIndexScope;
	indexUid?: string;
	message: string;
};

export type SearchReadiness = {
	state: 'offline' | 'partial' | 'ready';
	detail: SearchReadinessDetail;
	configured: boolean;
	available: boolean;
	settingsVersion: string;
	indexedScopes: SearchIndexScope[];
	missingScopes: SearchIndexScope[];
	mismatchedScopes: SearchIndexScope[];
	issues: SearchIssue[];
	error?: string;
};

export type SearchFacetBucket = {
	value: string;
	label: string;
	count: number;
	active: boolean;
};

export type SearchFacetGroup = {
	key: string;
	label: string;
	multi: boolean;
	buckets: SearchFacetBucket[];
};

export type SearchResult = {
	id: string;
	slug?: string;
	title: string;
	summary?: string;
	scope: SearchIndexScope;
	coil?: CoilKey;
	kind: SearchKind;
	href: string;
	meta: string[];
	imageUrl?: string;
	presentation: SearchResultPresentation;
	fields?: unknown;
};

export type SearchGroup = {
	key: string;
	label: string;
	total: number;
	results: SearchResult[];
};

export type SearchPagination = {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
};

export type SearchSuggestion = {
	label: string;
	href: string;
	kind: 'query' | 'scope';
};

export type SearchResultAction = {
	id: 'open' | 'view-all' | 'edit' | 'review' | 'manage' | 'browse';
	label: string;
	href: string;
	intent: 'navigate' | 'submit';
};

export type SearchResultPresentation = {
	badge: string;
	subtitle: string;
	icon: SearchResultIcon;
	destinationLabel: string;
	intent: 'open' | 'edit' | 'review' | 'manage';
	actions: SearchResultAction[];
};

export type SearchExperience = {
	degraded: boolean;
	degradedLabel?: string;
	canUseFastResults: boolean;
	canUseAdvancedFilters: boolean;
	canUseFacets: boolean;
};

export type SearchResponse = {
	query: string;
	request: SearchRequest;
	readiness: SearchReadiness;
	resultSource: SearchResultSource;
	fallbackReason?: SearchFallbackReason;
	latencyMs: number;
	pagination: SearchPagination;
	facets: SearchFacetGroup[];
	groups: SearchGroup[];
	results: SearchResult[];
	suggestions: SearchSuggestion[];
	experience: SearchExperience;
};

export { SEARCH_INDEX_SCOPES, PUBLIC_SEARCH_SCOPES, SEARCH_SCOPE_LABELS };
