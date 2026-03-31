/**
 * Meilisearch client for multi-coil search. No-op when MEILISEARCH_HOST is not set.
 */
import { MeiliSearch } from 'meilisearch';
import { env } from '$env/dynamic/private';
import type { CoilKey } from '$lib/data/kb';
import { stripHtml } from '$lib/utils/format';

const INDEXES: Record<CoilKey, string> = {
	events: 'events',
	funding: 'funding',
	redpages: 'red_pages',
	jobs: 'jobs',
	toolbox: 'toolbox'
};

const SEARCHABLE_ATTRIBUTES: Record<CoilKey, string[]> = {
	events: ['title', 'description', 'location', 'region', 'hostOrg', 'type'],
	funding: ['title', 'description', 'funderName', 'focusAreas', 'eligibilityType'],
	redpages: ['name', 'description', 'serviceType', 'tribalAffiliation', 'city', 'state'],
	jobs: ['title', 'description', 'employerName', 'location', 'sector'],
	toolbox: ['title', 'description', 'body', 'sourceName', 'author', 'category']
};

function getClient(): MeiliSearch | null {
	const host = env.MEILISEARCH_HOST;
	if (!host) return null;
	return new MeiliSearch({
		host,
		apiKey: env.MEILISEARCH_API_KEY || undefined
	});
}

// ── Search document types ─────────────────────────────────

export type SearchDoc = {
	id: string;
	slug: string;
	title: string;
	description?: string;
	coil: CoilKey;
	[key: string]: unknown;
};

export type EventSearchDoc = SearchDoc & {
	coil: 'events';
	location?: string;
	region?: string;
	type?: string;
	types?: string[];
	startDate?: string;
	endDate?: string;
	status: string;
	hostOrg?: string;
};

export type FundingSearchDoc = SearchDoc & {
	coil: 'funding';
	funderName?: string;
	focusAreas?: string[];
	eligibilityType?: string;
	fundingType?: string;
	applicationStatus?: string;
	region?: string;
};

export type RedPagesSearchDoc = SearchDoc & {
	coil: 'redpages';
	name: string;
	serviceType?: string;
	tribalAffiliation?: string;
	city?: string;
	state?: string;
	region?: string;
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

// ── Index settings ────────────────────────────────────────

async function ensureIndexSettings(
	client: MeiliSearch,
	coil: CoilKey
): Promise<void> {
	try {
		const index = client.index(INDEXES[coil]);
		await index.updateSearchableAttributes(SEARCHABLE_ATTRIBUTES[coil]);
	} catch {
		// Index may not exist yet
	}
}

// ── Index a single document ───────────────────────────────

export async function indexDocument(coil: CoilKey, doc: SearchDoc): Promise<void> {
	const client = getClient();
	if (!client) return;
	const index = client.index(INDEXES[coil]);
	await index.addDocuments([doc]);
}

// ── Remove a document ─────────────────────────────────────

export async function removeDocument(coil: CoilKey, docId: string): Promise<void> {
	const client = getClient();
	if (!client) return;
	const index = client.index(INDEXES[coil]);
	await index.deleteDocument(docId);
}

// ── Search a single coil ─────────────────────────────────

export async function searchCoil(
	coil: CoilKey,
	q: string,
	opts?: { limit?: number; filter?: string }
): Promise<SearchDoc[]> {
	const client = getClient();
	if (!client || !q || q.trim().length < 2) return [];
	try {
		const index = client.index(INDEXES[coil]);
		const res = await index.search(q.trim(), {
			limit: opts?.limit ?? 50,
			filter: opts?.filter
		});
		return res.hits as SearchDoc[];
	} catch (err) {
		console.warn(`[meilisearch] search failed for ${coil}:`, err);
		return [];
	}
}

// ── Search all coils (global search) ──────────────────────

export async function searchAll(
	q: string,
	opts?: { limit?: number }
): Promise<Record<CoilKey, SearchDoc[]>> {
	const client = getClient();
	const empty: Record<CoilKey, SearchDoc[]> = {
		events: [],
		funding: [],
		redpages: [],
		jobs: [],
		toolbox: []
	};
	if (!client || !q || q.trim().length < 2) return empty;

	try {
		const results = await client.multiSearch({
			queries: Object.entries(INDEXES).map(([coil, indexUid]) => ({
				indexUid,
				q: q.trim(),
				limit: opts?.limit ?? 10
			}))
		});

		const coilKeys = Object.keys(INDEXES) as CoilKey[];
		for (let i = 0; i < results.results.length; i++) {
			const coil = coilKeys[i];
			empty[coil] = results.results[i].hits as SearchDoc[];
		}
		return empty;
	} catch (err) {
		console.warn('[meilisearch] multi-search failed:', err);
		return empty;
	}
}

// ── Reindex all documents for a coil ──────────────────────

export async function reindexCoil(coil: CoilKey, docs: SearchDoc[]): Promise<void> {
	const client = getClient();
	if (!client) return;
	const index = client.index(INDEXES[coil]);
	if (docs.length === 0) return;
	await index.addDocuments(docs);
	await ensureIndexSettings(client, coil);
}

// ── Backward-compatible event helpers ─────────────────────

import type { EventItem } from '$lib/data/kb';

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
		types: item.types,
		startDate: item.startDate,
		endDate: item.endDate,
		status: 'published',
		hostOrg: item.hostOrg
	};
}

export async function indexEvent(event: EventItem & { id: string }): Promise<void> {
	if (event.status !== 'published' || event.unlisted) return;
	await indexDocument('events', eventToDoc(event));
}

export async function searchEvents(q: string): Promise<EventItem[]> {
	const hits = await searchCoil('events', q);
	return hits.map((h) => ({
		id: h.id,
		slug: h.slug,
		title: h.title,
		description: h.description,
		coil: 'events' as const,
		location: (h as EventSearchDoc).location,
		region: (h as EventSearchDoc).region,
		type: (h as EventSearchDoc).type,
		types: (h as EventSearchDoc).types,
		startDate: (h as EventSearchDoc).startDate,
		endDate: (h as EventSearchDoc).endDate
	})) as EventItem[];
}

export async function reindexAllEvents(events: (EventItem & { id: string })[]): Promise<void> {
	const toIndex = events.filter((e) => e.status === 'published' && !e.unlisted);
	const docs = toIndex.map(eventToDoc);
	await reindexCoil('events', docs);
}

export function isMeilisearchConfigured(): boolean {
	return !!env.MEILISEARCH_HOST;
}
