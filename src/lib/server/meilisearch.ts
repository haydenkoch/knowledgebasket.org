/**
 * Unified Meilisearch client and index settings for public and admin search.
 */
import { MeiliSearch } from 'meilisearch';
import type { CoilKey, EventItem } from '$lib/data/kb';
import { stripHtml } from '$lib/utils/format';
import {
	PUBLIC_SEARCH_SCOPES,
	SEARCH_INDEX_SCOPES,
	type SearchIndexScope,
	type SearchIssue,
	type SearchReadiness
} from '$lib/server/search-contracts';
import { readRuntimeConfigValue } from '$lib/server/runtime-secrets';

const SEARCH_INDEX_VERSION = '2026-04-unified-search-v1';
const MEILISEARCH_TIMEOUT_MS = 1500;
const HEALTH_CACHE_TTL_MS = 30_000;

const INDEXES: Record<SearchIndexScope, string> = {
	events: 'events',
	funding: 'funding',
	redpages: 'red_pages',
	jobs: 'jobs',
	toolbox: 'toolbox',
	organizations: 'organizations',
	venues: 'venues',
	sources: 'sources'
};

export const SEARCH_INDEX_UIDS = INDEXES;
export const SEARCH_READY_COILS = PUBLIC_SEARCH_SCOPES;
export const SEARCH_READY_SCOPES = SEARCH_INDEX_SCOPES;

type SearchIndexSettings = {
	searchableAttributes: string[];
	filterableAttributes: string[];
	sortableAttributes: string[];
	displayedAttributes: string[];
	rankingRules: string[];
	synonyms: Record<string, string[]>;
	typoTolerance: {
		enabled: boolean;
		disableOnWords: string[];
		disableOnAttributes: string[];
		minWordSizeForTypos: { oneTypo: number; twoTypos: number };
	};
};

const SHARED_DISPLAY_ATTRIBUTES = [
	'id',
	'slug',
	'title',
	'summary',
	'description',
	'scope',
	'coil',
	'kind',
	'href',
	'status',
	'updatedAt',
	'publishedAt',
	'sortDate',
	'featuredRank',
	'openRank',
	'imageUrl',
	'region',
	'organization',
	'organizationName',
	'tags'
];

const SHARED_RANKING_RULES = ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'];

const SHARED_SYNONYMS = {
	tribe: ['tribal', 'tribes'],
	tribal: ['tribe', 'tribes'],
	job: ['jobs', 'employment', 'career'],
	jobs: ['job', 'employment', 'careers'],
	funding: ['grant', 'grants', 'capital'],
	grant: ['funding', 'grants'],
	event: ['events', 'gathering'],
	events: ['event', 'gatherings'],
	business: ['vendor', 'businesses'],
	resource: ['toolkit', 'guide', 'resources']
};

const SEARCH_SETTINGS: Record<SearchIndexScope, SearchIndexSettings> = {
	events: {
		searchableAttributes: [
			'exactTitle',
			'title',
			'summary',
			'description',
			'location',
			'region',
			'hostOrg',
			'organizationName',
			'venueName',
			'type',
			'tags'
		],
		filterableAttributes: ['scope', 'coil', 'status', 'region', 'type', 'cost', 'sortDate'],
		sortableAttributes: ['updatedAt', 'publishedAt', 'sortDate', 'featuredRank', 'title'],
		displayedAttributes: [...SHARED_DISPLAY_ATTRIBUTES, 'location', 'hostOrg', 'venueName', 'type'],
		rankingRules: SHARED_RANKING_RULES,
		synonyms: SHARED_SYNONYMS,
		typoTolerance: {
			enabled: true,
			disableOnWords: [],
			disableOnAttributes: ['slug'],
			minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 }
		}
	},
	funding: {
		searchableAttributes: [
			'exactTitle',
			'title',
			'summary',
			'description',
			'funderName',
			'organizationName',
			'focusAreas',
			'eligibilityType',
			'fundingType',
			'tags',
			'region'
		],
		filterableAttributes: [
			'scope',
			'coil',
			'status',
			'region',
			'applicationStatus',
			'fundingType',
			'eligibilityType',
			'sortDate'
		],
		sortableAttributes: [
			'updatedAt',
			'publishedAt',
			'sortDate',
			'openRank',
			'featuredRank',
			'title'
		],
		displayedAttributes: [
			...SHARED_DISPLAY_ATTRIBUTES,
			'funderName',
			'focusAreas',
			'eligibilityType',
			'fundingType',
			'applicationStatus'
		],
		rankingRules: SHARED_RANKING_RULES,
		synonyms: SHARED_SYNONYMS,
		typoTolerance: {
			enabled: true,
			disableOnWords: [],
			disableOnAttributes: ['slug'],
			minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 }
		}
	},
	redpages: {
		searchableAttributes: [
			'exactTitle',
			'title',
			'name',
			'summary',
			'description',
			'serviceType',
			'tribalAffiliation',
			'organizationName',
			'city',
			'state',
			'tags'
		],
		filterableAttributes: [
			'scope',
			'coil',
			'status',
			'region',
			'serviceType',
			'tribalAffiliation',
			'sortDate'
		],
		sortableAttributes: ['updatedAt', 'publishedAt', 'featuredRank', 'title'],
		displayedAttributes: [
			...SHARED_DISPLAY_ATTRIBUTES,
			'name',
			'serviceType',
			'tribalAffiliation',
			'city',
			'state'
		],
		rankingRules: SHARED_RANKING_RULES,
		synonyms: SHARED_SYNONYMS,
		typoTolerance: {
			enabled: true,
			disableOnWords: [],
			disableOnAttributes: ['slug'],
			minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 }
		}
	},
	jobs: {
		searchableAttributes: [
			'exactTitle',
			'title',
			'summary',
			'description',
			'employerName',
			'organizationName',
			'location',
			'sector',
			'jobType',
			'seniority',
			'workArrangement',
			'tags',
			'region'
		],
		filterableAttributes: [
			'scope',
			'coil',
			'status',
			'region',
			'sector',
			'jobType',
			'seniority',
			'workArrangement',
			'sortDate'
		],
		sortableAttributes: ['updatedAt', 'publishedAt', 'sortDate', 'featuredRank', 'title'],
		displayedAttributes: [
			...SHARED_DISPLAY_ATTRIBUTES,
			'employerName',
			'location',
			'sector',
			'jobType',
			'seniority',
			'workArrangement'
		],
		rankingRules: SHARED_RANKING_RULES,
		synonyms: SHARED_SYNONYMS,
		typoTolerance: {
			enabled: true,
			disableOnWords: [],
			disableOnAttributes: ['slug'],
			minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 }
		}
	},
	toolbox: {
		searchableAttributes: [
			'exactTitle',
			'title',
			'summary',
			'description',
			'body',
			'sourceName',
			'organizationName',
			'author',
			'category',
			'resourceType',
			'mediaType',
			'tags'
		],
		filterableAttributes: [
			'scope',
			'coil',
			'status',
			'category',
			'mediaType',
			'resourceType',
			'sortDate'
		],
		sortableAttributes: ['updatedAt', 'publishedAt', 'sortDate', 'featuredRank', 'title'],
		displayedAttributes: [
			...SHARED_DISPLAY_ATTRIBUTES,
			'body',
			'sourceName',
			'author',
			'category',
			'resourceType',
			'mediaType'
		],
		rankingRules: SHARED_RANKING_RULES,
		synonyms: SHARED_SYNONYMS,
		typoTolerance: {
			enabled: true,
			disableOnWords: [],
			disableOnAttributes: ['slug'],
			minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 }
		}
	},
	organizations: {
		searchableAttributes: [
			'exactTitle',
			'title',
			'summary',
			'description',
			'website',
			'email',
			'region',
			'tribalAffiliation',
			'aliases'
		],
		filterableAttributes: ['scope', 'kind', 'region', 'verified'],
		sortableAttributes: ['updatedAt', 'title'],
		displayedAttributes: [
			...SHARED_DISPLAY_ATTRIBUTES,
			'website',
			'email',
			'verified',
			'aliases',
			'tribalAffiliation'
		],
		rankingRules: SHARED_RANKING_RULES,
		synonyms: SHARED_SYNONYMS,
		typoTolerance: {
			enabled: true,
			disableOnWords: [],
			disableOnAttributes: ['slug'],
			minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 }
		}
	},
	venues: {
		searchableAttributes: [
			'exactTitle',
			'title',
			'summary',
			'description',
			'address',
			'city',
			'state',
			'website',
			'aliases'
		],
		filterableAttributes: ['scope', 'kind', 'state', 'organizationId'],
		sortableAttributes: ['updatedAt', 'title'],
		displayedAttributes: [
			...SHARED_DISPLAY_ATTRIBUTES,
			'address',
			'city',
			'state',
			'website',
			'aliases',
			'organizationId'
		],
		rankingRules: SHARED_RANKING_RULES,
		synonyms: SHARED_SYNONYMS,
		typoTolerance: {
			enabled: true,
			disableOnWords: [],
			disableOnAttributes: ['slug'],
			minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 }
		}
	},
	sources: {
		searchableAttributes: [
			'exactTitle',
			'title',
			'summary',
			'description',
			'sourceUrl',
			'fetchUrl',
			'homepageUrl',
			'healthStatus',
			'coils'
		],
		filterableAttributes: ['scope', 'kind', 'status', 'healthStatus', 'enabled', 'quarantined'],
		sortableAttributes: ['updatedAt', 'title'],
		displayedAttributes: [
			...SHARED_DISPLAY_ATTRIBUTES,
			'sourceUrl',
			'fetchUrl',
			'homepageUrl',
			'healthStatus',
			'enabled',
			'quarantined',
			'coils'
		],
		rankingRules: SHARED_RANKING_RULES,
		synonyms: SHARED_SYNONYMS,
		typoTolerance: {
			enabled: true,
			disableOnWords: [],
			disableOnAttributes: ['slug'],
			minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 }
		}
	}
};

let lastHealthCheckAt = 0;
let lastHealthStatus = false;

function getClient(): MeiliSearch | null {
	const host = readRuntimeConfigValue('MEILISEARCH_HOST')?.trim();
	if (!host) return null;
	return new MeiliSearch({
		host,
		apiKey: readRuntimeConfigValue('MEILISEARCH_API_KEY') || undefined
	});
}

async function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
	return await Promise.race([
		promise,
		new Promise<never>((_, reject) => {
			setTimeout(() => reject(new Error(`${label} timed out`)), MEILISEARCH_TIMEOUT_MS);
		})
	]);
}

type EnqueuedTaskLike = {
	taskUid?: number;
	uid?: number;
};

async function waitForTask(client: MeiliSearch, task: EnqueuedTaskLike, label: string) {
	const taskUid =
		typeof task.taskUid === 'number'
			? task.taskUid
			: typeof task.uid === 'number'
				? task.uid
				: null;
	if (taskUid === null) return;
	await withTimeout(client.tasks.waitForTask(taskUid), `${label} task`);
}

export type SearchDoc = {
	id: string;
	slug?: string;
	title: string;
	description?: string;
	summary?: string;
	coil?: CoilKey;
	scope?: SearchIndexScope;
	kind?: 'content' | 'organization' | 'venue' | 'source';
	href?: string;
	status?: string;
	updatedAt?: string;
	publishedAt?: string;
	sortDate?: string;
	openRank?: number;
	featuredRank?: number;
	imageUrl?: string;
	region?: string;
	organization?: string;
	organizationName?: string;
	exactTitle?: string;
	tags?: string[];
	[key: string]: unknown;
};

export type EventSearchDoc = SearchDoc & {
	coil: 'events';
	location?: string;
	type?: string;
	hostOrg?: string;
	venueName?: string;
	startDate?: string;
	endDate?: string;
	cost?: string;
};

export type FundingSearchDoc = SearchDoc & {
	coil: 'funding';
	funderName?: string;
	focusAreas?: string[];
	eligibilityType?: string;
	fundingType?: string;
	applicationStatus?: string;
	region?: string;
	amountMin?: number;
	amountMax?: number;
	deadline?: string;
};

export type RedPagesSearchDoc = SearchDoc & {
	coil: 'redpages';
	name?: string;
	serviceType?: string;
	tribalAffiliation?: string;
	city?: string;
	state?: string;
	ownershipIdentity?: string[];
	certifications?: string[];
};

export type JobSearchDoc = SearchDoc & {
	coil: 'jobs';
	employerName?: string;
	location?: string;
	sector?: string;
	jobType?: string;
	seniority?: string;
	workArrangement?: string;
	region?: string;
	indigenousPriority?: boolean;
	applicationDeadline?: string;
};

export type ToolboxSearchDoc = SearchDoc & {
	coil: 'toolbox';
	body?: string;
	sourceName?: string;
	author?: string;
	category?: string;
	resourceType?: string;
	mediaType?: string;
};

export type SearchResults = Record<CoilKey, SearchDoc[]>;

export type SearchAllResult = {
	ok: boolean;
	results: SearchResults;
	error?: string;
};

export type SearchScopesResultStatus = {
	ok: boolean;
	results: Record<SearchIndexScope, SearchDoc[]>;
	error?: string;
};

function inferKind(scope: SearchIndexScope): SearchDoc['kind'] {
	switch (scope) {
		case 'organizations':
			return 'organization';
		case 'venues':
			return 'venue';
		case 'sources':
			return 'source';
		default:
			return 'content';
	}
}

function inferHref(scope: SearchIndexScope, doc: SearchDoc): string {
	if (doc.href) return String(doc.href);
	const slug = doc.slug ?? doc.id;
	switch (scope) {
		case 'events':
			return `/events/${slug}`;
		case 'funding':
			return `/funding/${slug}`;
		case 'redpages':
			return `/red-pages/${slug}`;
		case 'jobs':
			return `/jobs/${slug}`;
		case 'toolbox':
			return `/toolbox/${slug}`;
		case 'organizations':
			return `/admin/organizations/${doc.id}`;
		case 'venues':
			return `/admin/venues/${doc.id}`;
		case 'sources':
			return `/admin/sources/${doc.id}`;
	}
}

function normalizeTextSummary(doc: SearchDoc): string | undefined {
	const source = doc.summary ?? doc.description;
	if (!source) return undefined;
	return stripHtml(String(source)).slice(0, 280);
}

function normalizeDocument(scope: SearchIndexScope, doc: SearchDoc): SearchDoc {
	const summary = normalizeTextSummary(doc);
	return {
		...doc,
		slug: doc.slug ?? doc.id,
		scope,
		coil:
			scope === 'organizations' || scope === 'venues' || scope === 'sources' ? undefined : scope,
		kind: doc.kind ?? inferKind(scope),
		status: String(doc.status ?? 'published'),
		summary,
		description: summary,
		href: inferHref(scope, doc),
		exactTitle: String(doc.title).trim().toLowerCase(),
		updatedAt: doc.updatedAt ?? doc.publishedAt ?? new Date(0).toISOString(),
		publishedAt: doc.publishedAt ?? doc.updatedAt ?? new Date(0).toISOString(),
		sortDate: doc.sortDate ?? doc.publishedAt ?? doc.updatedAt ?? new Date(0).toISOString(),
		openRank: typeof doc.openRank === 'number' ? doc.openRank : 0,
		featuredRank: typeof doc.featuredRank === 'number' ? doc.featuredRank : 0,
		organization:
			typeof doc.organization === 'string'
				? doc.organization
				: typeof doc.organizationName === 'string'
					? doc.organizationName
					: undefined
	};
}

async function ensureIndex(scope: SearchIndexScope): Promise<void> {
	const client = getClient();
	if (!client) return;
	const uid = INDEXES[scope];
	try {
		await withTimeout(client.getIndex(uid), `get ${scope} index`);
	} catch {
		const task = await withTimeout(
			client.createIndex(uid, { primaryKey: 'id' }),
			`create ${scope} index`
		);
		await waitForTask(client, task, `create ${scope} index`);
	}
}

async function applyIndexSettings(scope: SearchIndexScope): Promise<void> {
	const client = getClient();
	if (!client) return;
	await ensureIndex(scope);
	const index = client.index(INDEXES[scope]);
	const settings = SEARCH_SETTINGS[scope];
	const task = await withTimeout(index.updateSettings(settings), `update ${scope} settings`);
	await waitForTask(client, task, `update ${scope} settings`);
}

function normalizeSettingsPayload(payload: Record<string, unknown>) {
	const synonyms = Object.fromEntries(
		Object.entries((payload.synonyms as Record<string, string[] | undefined>) ?? {})
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, values]) => [
				key,
				[...(values ?? [])].sort((left, right) => left.localeCompare(right))
			])
	);

	return JSON.stringify({
		searchableAttributes: payload.searchableAttributes ?? [],
		filterableAttributes: [...((payload.filterableAttributes as string[]) ?? [])].sort((a, b) =>
			a.localeCompare(b)
		),
		sortableAttributes: [...((payload.sortableAttributes as string[]) ?? [])].sort((a, b) =>
			a.localeCompare(b)
		),
		displayedAttributes: payload.displayedAttributes ?? [],
		rankingRules: payload.rankingRules ?? [],
		synonyms,
		typoTolerance: {
			enabled: Boolean((payload.typoTolerance as Record<string, unknown> | undefined)?.enabled),
			disableOnWords: [
				...(((payload.typoTolerance as Record<string, unknown> | undefined)?.disableOnWords ??
					[]) as string[])
			].sort((a, b) => a.localeCompare(b)),
			disableOnAttributes: [
				...(((payload.typoTolerance as Record<string, unknown> | undefined)?.disableOnAttributes ??
					[]) as string[])
			].sort((a, b) => a.localeCompare(b)),
			minWordSizeForTypos: (payload.typoTolerance as Record<string, unknown> | undefined)
				?.minWordSizeForTypos ?? {
				oneTypo: 4,
				twoTypos: 8
			}
		}
	});
}

async function hasSettingsMismatch(scope: SearchIndexScope): Promise<boolean> {
	const client = getClient();
	if (!client) return true;
	const index = client.index(INDEXES[scope]);
	const current = await withTimeout(index.getSettings(), `read ${scope} settings`);
	const expected = SEARCH_SETTINGS[scope];
	const currentSubset = {
		searchableAttributes: current.searchableAttributes ?? [],
		filterableAttributes: current.filterableAttributes ?? [],
		sortableAttributes: current.sortableAttributes ?? [],
		displayedAttributes: current.displayedAttributes ?? [],
		rankingRules: current.rankingRules ?? [],
		synonyms: current.synonyms ?? {},
		typoTolerance: current.typoTolerance ?? {
			enabled: true,
			disableOnWords: [],
			disableOnAttributes: [],
			minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 }
		}
	};
	return normalizeSettingsPayload(currentSubset) !== normalizeSettingsPayload(expected);
}

export async function indexDocument(scope: SearchIndexScope, doc: SearchDoc): Promise<void> {
	const client = getClient();
	if (!client) return;
	await ensureIndex(scope);
	const index = client.index(INDEXES[scope]);
	const task = await withTimeout(
		index.addDocuments([normalizeDocument(scope, doc)]),
		`${scope} add document`
	);
	await waitForTask(client, task, `${scope} add document`);
}

export async function removeDocument(scope: SearchIndexScope, docId: string): Promise<void> {
	const client = getClient();
	if (!client) return;
	const index = client.index(INDEXES[scope]);
	const task = await withTimeout(index.deleteDocument(docId), `${scope} delete document`);
	await waitForTask(client, task, `${scope} delete document`);
}

export async function searchIndex(
	scope: SearchIndexScope,
	q: string,
	opts?: {
		limit?: number;
		offset?: number;
		filter?: string | string[];
		sort?: string[];
		facets?: string[];
		allowEmpty?: boolean;
	}
): Promise<{
	hits: SearchDoc[];
	estimatedTotalHits: number;
	facetDistribution?: Record<string, Record<string, number>>;
}> {
	const client = getClient();
	if (!client || (!opts?.allowEmpty && (!q || q.trim().length < 2))) {
		return { hits: [], estimatedTotalHits: 0, facetDistribution: {} };
	}
	const index = client.index(INDEXES[scope]);
	const result = await withTimeout(
		index.search(q.trim(), {
			limit: opts?.limit ?? 10,
			offset: opts?.offset ?? 0,
			filter: opts?.filter,
			sort: opts?.sort,
			facets: opts?.facets
		}),
		`${scope} search`
	);
	return {
		hits: (result.hits as SearchDoc[]).map((doc) => normalizeDocument(scope, doc)),
		estimatedTotalHits: result.estimatedTotalHits ?? result.hits.length,
		facetDistribution: result.facetDistribution as
			| Record<string, Record<string, number>>
			| undefined
	};
}

export async function searchScopesWithStatus(
	scopes: readonly SearchIndexScope[],
	q: string,
	opts?: { limit?: number }
): Promise<SearchScopesResultStatus> {
	const empty = Object.fromEntries(
		SEARCH_INDEX_SCOPES.map((scope) => [scope, []])
	) as unknown as Record<SearchIndexScope, SearchDoc[]>;
	const client = getClient();
	if (!client || !q || q.trim().length < 2 || scopes.length === 0) {
		return { ok: true, results: empty };
	}

	try {
		const results = await withTimeout(
			client.multiSearch({
				queries: scopes.map((scope) => ({
					indexUid: INDEXES[scope],
					q: q.trim(),
					limit: opts?.limit ?? 5
				}))
			}),
			'multi-search'
		);
		for (let i = 0; i < scopes.length; i++) {
			empty[scopes[i]] =
				(results.results[i]?.hits as SearchDoc[] | undefined)?.map((doc) =>
					normalizeDocument(scopes[i], doc)
				) ?? [];
		}
		return { ok: true, results: empty };
	} catch (error) {
		return {
			ok: false,
			results: empty,
			error: error instanceof Error ? error.message : 'Multi-search failed'
		};
	}
}

export async function searchScopes(
	scopes: readonly SearchIndexScope[],
	q: string,
	opts?: { limit?: number }
): Promise<Record<SearchIndexScope, SearchDoc[]>> {
	return (await searchScopesWithStatus(scopes, q, opts)).results;
}

export async function searchAll(q: string, opts?: { limit?: number }): Promise<SearchResults> {
	return (await searchAllWithStatus(q, opts)).results;
}

export async function searchAllWithStatus(
	q: string,
	opts?: { limit?: number }
): Promise<SearchAllResult> {
	const grouped = await searchScopesWithStatus(PUBLIC_SEARCH_SCOPES, q, opts);
	const results = {
		events: grouped.results.events,
		funding: grouped.results.funding,
		redpages: grouped.results.redpages,
		jobs: grouped.results.jobs,
		toolbox: grouped.results.toolbox
	};
	const ok =
		grouped.ok && (Object.values(results).some((items) => items.length > 0) || q.trim().length < 2);
	return { ok, results, ...(ok ? {} : { error: grouped.error ?? 'Search request failed' }) };
}

export async function reindexScope(scope: SearchIndexScope, docs: SearchDoc[]): Promise<void> {
	const client = getClient();
	if (!client) return;
	await ensureIndex(scope);
	const index = client.index(INDEXES[scope]);
	const clearTask = await withTimeout(index.deleteAllDocuments(), `clear ${scope} index`);
	await waitForTask(client, clearTask, `clear ${scope} index`);
	if (docs.length > 0) {
		const reindexTask = await withTimeout(
			index.addDocuments(docs.map((doc) => normalizeDocument(scope, doc))),
			`reindex ${scope}`
		);
		await waitForTask(client, reindexTask, `reindex ${scope}`);
	}
	await applyIndexSettings(scope);
}

function eventToDoc(item: EventItem & { id: string }): EventSearchDoc {
	return {
		id: item.id,
		slug: item.slug ?? item.id,
		title: item.title,
		description: item.description ? stripHtml(item.description).slice(0, 2000) : undefined,
		coil: 'events',
		location: item.location,
		region: item.region,
		type: item.type,
		startDate: item.startDate,
		endDate: item.endDate,
		status: item.status ?? 'published',
		hostOrg: item.hostOrg,
		organizationName: item.organizationName,
		venueName: item.venueName,
		tags: item.tags,
		imageUrl: item.imageUrl,
		publishedAt: item.publishedAt,
		updatedAt: item.publishedAt,
		sortDate: item.startDate,
		featuredRank: item.featured ? 1 : 0
	};
}

export async function indexEvent(event: EventItem & { id: string }): Promise<void> {
	if (event.status !== 'published' || event.unlisted) return;
	await indexDocument('events', eventToDoc(event));
}

export async function searchEvents(q: string): Promise<EventItem[]> {
	const result = await searchIndex('events', q, { limit: 50 });
	return result.hits.map((h) => ({
		id: h.id,
		slug: h.slug,
		title: h.title,
		description: h.summary,
		coil: 'events' as const,
		location: h.location as string | undefined,
		region: h.region as string | undefined,
		type: h.type as string | undefined,
		startDate: h.startDate as string | undefined,
		endDate: h.endDate as string | undefined
	})) as EventItem[];
}

export async function reindexAllEvents(events: (EventItem & { id: string })[]): Promise<void> {
	const toIndex = events.filter((event) => event.status === 'published' && !event.unlisted);
	await reindexScope('events', toIndex.map(eventToDoc));
}

export function isMeilisearchConfigured(): boolean {
	return !!readRuntimeConfigValue('MEILISEARCH_HOST')?.trim();
}

export async function isMeilisearchAvailable(force = false): Promise<boolean> {
	const host = readRuntimeConfigValue('MEILISEARCH_HOST')?.trim();
	if (!host) return false;

	const now = Date.now();
	if (!force && now - lastHealthCheckAt < HEALTH_CACHE_TTL_MS) {
		return lastHealthStatus;
	}

	try {
		const healthUrl = new URL('/health', host.endsWith('/') ? host : `${host}/`).toString();
		const apiKey = readRuntimeConfigValue('MEILISEARCH_API_KEY');
		const response = await withTimeout(
			fetch(healthUrl, {
				headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined
			}),
			'meilisearch health'
		);
		lastHealthStatus = response.ok;
	} catch {
		lastHealthStatus = false;
	}

	lastHealthCheckAt = now;
	return lastHealthStatus;
}

function getMeilisearchHeaders(): HeadersInit | undefined {
	const apiKey = readRuntimeConfigValue('MEILISEARCH_API_KEY');
	return apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined;
}

async function listIndexUids(): Promise<string[]> {
	const host = readRuntimeConfigValue('MEILISEARCH_HOST')?.trim();
	if (!host) return [];

	const indexesUrl = new URL('/indexes', host.endsWith('/') ? host : `${host}/`).toString();
	const response = await withTimeout(
		fetch(indexesUrl, {
			headers: getMeilisearchHeaders()
		}),
		'meilisearch indexes'
	);

	if (!response.ok) {
		throw new Error(`Unable to read Meilisearch indexes (${response.status})`);
	}

	const payload = (await response.json()) as { results?: Array<{ uid?: string }> };
	return (payload.results ?? [])
		.map((entry) => entry.uid?.trim())
		.filter((uid): uid is string => !!uid);
}

type SearchReadinessDeps = {
	isConfigured: () => boolean;
	isAvailable: (force?: boolean) => Promise<boolean>;
	listIndexUids: () => Promise<string[]>;
	hasSettingsMismatch: (scope: SearchIndexScope) => Promise<boolean>;
};

const defaultSearchReadinessDeps: SearchReadinessDeps = {
	isConfigured: isMeilisearchConfigured,
	isAvailable: isMeilisearchAvailable,
	listIndexUids,
	hasSettingsMismatch
};

export function _createSearchReadinessLoader(
	deps: SearchReadinessDeps = defaultSearchReadinessDeps
) {
	return async (force = false): Promise<SearchReadiness> => {
		const configured = deps.isConfigured();
		if (!configured) {
			return {
				state: 'offline',
				detail: 'not-configured',
				configured: false,
				available: false,
				settingsVersion: SEARCH_INDEX_VERSION,
				indexedScopes: [],
				missingScopes: [...SEARCH_READY_SCOPES],
				mismatchedScopes: [],
				issues: [{ type: 'configuration', message: 'Meilisearch is not configured' }],
				error: 'Meilisearch is not configured'
			};
		}

		const available = await deps.isAvailable(force);
		if (!available) {
			return {
				state: 'offline',
				detail: 'host-unavailable',
				configured: true,
				available: false,
				settingsVersion: SEARCH_INDEX_VERSION,
				indexedScopes: [],
				missingScopes: [...SEARCH_READY_SCOPES],
				mismatchedScopes: [],
				issues: [{ type: 'unavailable', message: 'Meilisearch is not reachable' }],
				error: 'Meilisearch is not reachable'
			};
		}

		try {
			const existingIndexUids = new Set(await deps.listIndexUids());
			const indexedScopes = SEARCH_READY_SCOPES.filter((scope) =>
				existingIndexUids.has(INDEXES[scope])
			);
			const missingScopes = SEARCH_READY_SCOPES.filter(
				(scope) => !existingIndexUids.has(INDEXES[scope])
			);
			const mismatchedScopes: SearchIndexScope[] = [];
			const issues: SearchIssue[] = [];

			for (const scope of indexedScopes) {
				if (await deps.hasSettingsMismatch(scope)) {
					mismatchedScopes.push(scope);
					issues.push({
						type: 'settings-mismatch',
						scope,
						indexUid: INDEXES[scope],
						message: `Index settings are outdated for ${scope}`
					});
				}
			}

			for (const scope of missingScopes) {
				issues.push({
					type: 'missing-index',
					scope,
					indexUid: INDEXES[scope],
					message: `Missing index for ${scope}`
				});
			}

			const detail =
				missingScopes.length > 0
					? 'missing-indexes'
					: mismatchedScopes.length > 0
						? 'settings-mismatch'
						: 'ready';

			return {
				state: detail === 'ready' ? 'ready' : 'partial',
				detail,
				configured: true,
				available: true,
				settingsVersion: SEARCH_INDEX_VERSION,
				indexedScopes,
				missingScopes,
				mismatchedScopes,
				issues,
				...(issues.length > 0 ? { error: issues.map((issue) => issue.message).join('; ') } : {})
			};
		} catch (error) {
			return {
				state: 'partial',
				detail: 'settings-mismatch',
				configured: true,
				available: true,
				settingsVersion: SEARCH_INDEX_VERSION,
				indexedScopes: [],
				missingScopes: [...SEARCH_READY_SCOPES],
				mismatchedScopes: [],
				issues: [
					{
						type: 'settings-mismatch',
						message:
							error instanceof Error ? error.message : 'Unable to inspect Meilisearch indexes'
					}
				],
				error: error instanceof Error ? error.message : 'Unable to inspect Meilisearch indexes'
			};
		}
	};
}

export async function getSearchReadiness(force = false): Promise<SearchReadiness> {
	return await _createSearchReadinessLoader()(force);
}

export { SEARCH_INDEX_VERSION };
