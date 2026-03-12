/**
 * Meilisearch client for events search. No-op when MEILISEARCH_HOST is not set.
 */
import { MeiliSearch } from 'meilisearch';
import { env } from '$env/dynamic/private';
import type { EventItem } from '$lib/data/kb';

const INDEX_NAME = 'events';

function getClient(): MeiliSearch | null {
	const host = env.MEILISEARCH_HOST;
	if (!host) return null;
	return new MeiliSearch({
		host,
		apiKey: env.MEILISEARCH_API_KEY || undefined
	});
}

export type EventSearchDoc = {
	id: string;
	slug: string;
	title: string;
	description?: string;
	location?: string;
	region?: string;
	type?: string;
	types?: string[];
	startDate?: string;
	endDate?: string;
	status: string;
	coil: 'events';
};

function eventToDoc(item: EventItem & { id: string }): EventSearchDoc {
	return {
		id: item.id,
		slug: (item as EventItem & { slug?: string }).slug ?? item.id,
		title: item.title,
		description: item.description,
		location: item.location,
		region: item.region,
		type: item.type,
		types: item.types,
		startDate: item.startDate,
		endDate: item.endDate,
		status: 'published',
		coil: 'events'
	};
}

/**
 * Index one event (add or update). No-op if Meilisearch is not configured.
 */
export async function indexEvent(event: EventItem & { id: string }): Promise<void> {
	const client = getClient();
	if (!client) return;
	const index = client.index(INDEX_NAME);
	await index.addDocuments([eventToDoc(event)]);
}

/**
 * Search events. Returns EventItem-like array. Empty array if Meilisearch not configured or query too short.
 */
export async function searchEvents(q: string): Promise<EventItem[]> {
	const client = getClient();
	if (!client || !q || q.trim().length < 2) return [];
	const index = client.index(INDEX_NAME);
	const res = await index.search(q.trim(), { limit: 50 });
	const hits = res.hits as EventSearchDoc[];
	return hits.map((h) => ({
		id: h.id,
		slug: h.slug,
		title: h.title,
		description: h.description,
		coil: 'events' as const,
		location: h.location,
		region: h.region,
		type: h.type,
		types: h.types,
		startDate: h.startDate,
		endDate: h.endDate
	})) as EventItem[];
}

/**
 * Replace all documents in the index with the given events. Use after seed or bulk sync.
 */
export async function reindexAllEvents(events: (EventItem & { id: string })[]): Promise<void> {
	const client = getClient();
	if (!client) return;
	const index = client.index(INDEX_NAME);
	const docs = events.map(eventToDoc);
	await index.addDocuments(docs);
}
