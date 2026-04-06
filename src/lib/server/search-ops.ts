import type { CoilKey } from '$lib/data/kb';
import { getEvents, searchEventsFromDb } from '$lib/server/events';
import { getPublishedFunding, searchFundingFromDb } from '$lib/server/funding';
import { getPublishedJobs, searchJobsFromDb } from '$lib/server/jobs';
import {
	getSearchReadiness,
	reindexAllEvents,
	reindexCoil,
	searchAllWithStatus,
	type SearchDoc
} from '$lib/server/meilisearch';
import { getOrganizations } from '$lib/server/organizations';
import { getPublishedBusinesses, searchBusinessesFromDb } from '$lib/server/red-pages';
import { getSourcesForAdmin } from '$lib/server/sources';
import { getPublishedResources, searchResourcesFromDb } from '$lib/server/toolbox';
import { getVenues } from '$lib/server/venues';
import { stripHtml } from '$lib/utils/format';

type SearchReindexSummary = Record<CoilKey, number>;
type PublicSearchResult = {
	readiness: Awaited<ReturnType<typeof getSearchReadiness>>;
	results: Record<CoilKey, SearchDoc[]>;
	resultSource: 'meilisearch' | 'database';
};

const emptyResults: Record<CoilKey, SearchDoc[]> = {
	events: [],
	funding: [],
	redpages: [],
	jobs: [],
	toolbox: []
};

export async function searchAllFromDb(
	query: string,
	limit = 12
): Promise<Record<CoilKey, SearchDoc[]>> {
	if (query.trim().length < 2) return { ...emptyResults };

	const [events, funding, jobs, toolbox, redpages] = await Promise.all([
		searchEventsFromDb(query)
			.then((items) =>
				items.slice(0, limit).map((item) => ({
					id: item.id,
					slug: item.slug ?? item.id,
					title: item.title,
					description: item.description,
					coil: 'events' as const
				}))
			)
			.catch(() => []),
		searchFundingFromDb(query, limit)
			.then((items) => items.map((item) => ({ ...item, coil: 'funding' as const })))
			.catch(() => []),
		searchJobsFromDb(query, limit)
			.then((items) => items.map((item) => ({ ...item, coil: 'jobs' as const })))
			.catch(() => []),
		searchResourcesFromDb(query, limit)
			.then((items) => items.map((item) => ({ ...item, coil: 'toolbox' as const })))
			.catch(() => []),
		searchBusinessesFromDb(query, limit)
			.then((items) => items.map((item) => ({ ...item, coil: 'redpages' as const })))
			.catch(() => [])
	]);

	return { events, funding, jobs, toolbox, redpages };
}

export async function runPublicSearch(query: string, limit = 12): Promise<PublicSearchResult> {
	const readiness = await getSearchReadiness();
	if (query.trim().length < 2) {
		return {
			readiness,
			results: { ...emptyResults },
			resultSource: readiness.state === 'ready' ? 'meilisearch' : 'database'
		};
	}

	if (readiness.state === 'ready') {
		const meili = await searchAllWithStatus(query, { limit });
		if (meili.ok) {
			return {
				readiness,
				results: meili.results,
				resultSource: 'meilisearch'
			};
		}
	}

	return {
		readiness:
			readiness.state === 'ready' ? { ...readiness, state: 'partial' as const } : readiness,
		results: await searchAllFromDb(query, limit),
		resultSource: 'database'
	};
}

export async function reindexPublishedContentCoil(coil: CoilKey): Promise<number> {
	switch (coil) {
		case 'events': {
			const items = await getEvents({ includeIcal: false });
			await reindexAllEvents(items);
			return items.length;
		}
		case 'funding': {
			const items = await getPublishedFunding();
			await reindexCoil(
				'funding',
				items.map((item) => ({
					id: item.id,
					slug: item.slug ?? item.id,
					title: item.title,
					description: item.description ? stripHtml(item.description).slice(0, 2000) : undefined,
					coil: 'funding',
					funderName: item.funderName,
					organizationName: item.organizationName,
					focusAreas: item.focusAreas,
					eligibilityType: item.eligibilityType,
					fundingType: item.fundingType,
					applicationStatus: item.applicationStatus,
					region: item.region,
					tags: item.tags,
					imageUrl: item.imageUrl
				}))
			);
			return items.length;
		}
		case 'redpages': {
			const items = await getPublishedBusinesses();
			await reindexCoil(
				'redpages',
				items.map((item) => ({
					id: item.id,
					slug: item.slug ?? item.id,
					title: item.title,
					name: item.name ?? item.title,
					description: item.description ? stripHtml(item.description).slice(0, 2000) : undefined,
					coil: 'redpages',
					serviceType: item.serviceType,
					tribalAffiliation: item.tribalAffiliation,
					city: item.city,
					state: item.state,
					region: item.region,
					ownershipIdentity: item.ownershipIdentity,
					certifications: item.certifications,
					tags: item.tags,
					organizationName: item.organizationName,
					imageUrl: item.imageUrl
				}))
			);
			return items.length;
		}
		case 'jobs': {
			const items = await getPublishedJobs();
			await reindexCoil(
				'jobs',
				items.map((item) => ({
					id: item.id,
					slug: item.slug ?? item.id,
					title: item.title,
					description: item.description ? stripHtml(item.description).slice(0, 2000) : undefined,
					coil: 'jobs',
					employerName: item.employerName,
					organizationName: item.organizationName,
					location: item.location,
					sector: item.sector,
					jobType: item.jobType,
					seniority: item.seniority,
					workArrangement: item.workArrangement,
					region: item.region,
					indigenousPriority: item.indigenousPriority,
					tags: item.tags,
					imageUrl: item.imageUrl
				}))
			);
			return items.length;
		}
		case 'toolbox': {
			const items = await getPublishedResources();
			await reindexCoil(
				'toolbox',
				items.map((item) => ({
					id: item.id,
					slug: item.slug ?? item.id,
					title: item.title,
					description: item.description ? stripHtml(item.description).slice(0, 2000) : undefined,
					coil: 'toolbox',
					body: item.body ? stripHtml(item.body).slice(0, 5000) : undefined,
					sourceName: item.sourceName,
					organizationName: item.organizationName,
					author: item.author,
					category: item.category,
					resourceType: item.resourceType,
					mediaType: item.mediaType,
					tags: item.tags,
					imageUrl: item.imageUrl
				}))
			);
			return items.length;
		}
	}
}

export async function reindexAllPublishedContent(): Promise<SearchReindexSummary> {
	const summary: Partial<SearchReindexSummary> = {};
	for (const coil of ['events', 'funding', 'redpages', 'jobs', 'toolbox'] satisfies CoilKey[]) {
		summary[coil] = await reindexPublishedContentCoil(coil);
	}
	return summary as SearchReindexSummary;
}

export async function getSearchOperationsSnapshot(query = '') {
	const searchReadiness = await getSearchReadiness();
	const [events, funding, redpages, jobs, toolbox, organizations, venues, sources] =
		await Promise.all([
			getEvents({ includeIcal: false }),
			getPublishedFunding(),
			getPublishedBusinesses(),
			getPublishedJobs(),
			getPublishedResources(),
			getOrganizations({ search: query, limit: query ? 8 : 6 }),
			getVenues({ search: query, limit: query ? 8 : 6 }),
			getSourcesForAdmin({ search: query, limit: query ? 8 : 6, sort: 'name', order: 'asc' })
		]);

	const publishedCounts: SearchReindexSummary = {
		events: events.length,
		funding: funding.length,
		redpages: redpages.length,
		jobs: jobs.length,
		toolbox: toolbox.length
	};

	let contentResults: Record<CoilKey, SearchDoc[]> = { ...emptyResults };
	let resultSource: 'meilisearch' | 'database' = 'database';

	if (query.trim().length >= 2) {
		const search = await runPublicSearch(query, 6);
		contentResults = search.results;
		resultSource = search.resultSource;
	}

	return {
		meilisearchConfigured: searchReadiness.configured,
		meilisearchAvailable: searchReadiness.available,
		searchReadiness,
		searchMode: searchReadiness.state,
		resultSource,
		publishedCounts,
		contentResults,
		entityResults: {
			organizations: organizations.orgs,
			venues: venues.venues,
			sources: sources.items
		}
	};
}
