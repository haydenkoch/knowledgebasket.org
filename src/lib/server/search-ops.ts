import type { CoilKey } from '$lib/data/kb';
import { getEvents } from '$lib/server/events';
import { getPublishedFunding } from '$lib/server/funding';
import { getPublishedJobs } from '$lib/server/jobs';
import { getOrganizations } from '$lib/server/organizations';
import {
	getSearchReadiness,
	reindexAllEvents,
	reindexScope,
	type SearchDoc
} from '$lib/server/meilisearch';
import { getPublishedBusinesses } from '$lib/server/red-pages';
import { runUnifiedSearch } from '$lib/server/search-service';
import { getSourcesForAdmin } from '$lib/server/sources';
import { getPublishedResources } from '$lib/server/toolbox';
import type {
	SearchIndexScope,
	SearchResponse,
	SearchResultSource
} from '$lib/server/search-contracts';
import { getVenues } from '$lib/server/venues';
import { stripHtml } from '$lib/utils/format';

type SearchReindexSummary = Record<SearchIndexScope, number>;

function contentSummary(item: {
	description?: string | null;
	body?: string | null;
}): string | undefined {
	return item.description
		? stripHtml(item.description).slice(0, 2000)
		: item.body
			? stripHtml(item.body).slice(0, 2000)
			: undefined;
}

export async function runPublicSearch(query: string, limit = 12): Promise<SearchResponse> {
	return await runUnifiedSearch({
		q: query,
		surface: 'global',
		scope: 'all',
		page: 1,
		limit,
		sort: 'relevance',
		filters: {}
	});
}

async function reindexPublicScope(coil: CoilKey): Promise<number> {
	switch (coil) {
		case 'events': {
			const items = await getEvents({ includeIcal: false });
			await reindexAllEvents(items);
			return items.length;
		}
		case 'funding': {
			const items = await getPublishedFunding();
			await reindexScope(
				'funding',
				items.map((item) => ({
					id: item.id,
					slug: item.slug ?? item.id,
					title: item.title,
					description: contentSummary(item),
					coil: 'funding',
					funderName: item.funderName,
					organizationName: item.organizationName,
					focusAreas: item.focusAreas,
					eligibilityType: item.eligibilityType,
					fundingType: item.fundingType,
					applicationStatus: item.applicationStatus,
					region: item.region,
					tags: item.tags,
					imageUrl: item.imageUrl,
					publishedAt: item.publishedAt,
					updatedAt: item.publishedAt,
					sortDate: item.deadline ?? item.publishedAt,
					openRank:
						item.applicationStatus === 'open' || item.applicationStatus === 'rolling' ? 1 : 0,
					featuredRank: item.featured ? 1 : 0
				}))
			);
			return items.length;
		}
		case 'redpages': {
			const items = await getPublishedBusinesses();
			await reindexScope(
				'redpages',
				items.map((item) => ({
					id: item.id,
					slug: item.slug ?? item.id,
					title: item.title,
					name: item.name ?? item.title,
					description: contentSummary(item),
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
					imageUrl: item.imageUrl,
					publishedAt: item.publishedAt,
					updatedAt: item.publishedAt,
					featuredRank: item.featured ? 1 : 0
				}))
			);
			return items.length;
		}
		case 'jobs': {
			const items = await getPublishedJobs();
			await reindexScope(
				'jobs',
				items.map((item) => ({
					id: item.id,
					slug: item.slug ?? item.id,
					title: item.title,
					description: contentSummary(item),
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
					imageUrl: item.imageUrl,
					publishedAt: item.publishedAt,
					updatedAt: item.publishedAt,
					sortDate: item.publishedAt,
					featuredRank: item.featured ? 1 : 0
				}))
			);
			return items.length;
		}
		case 'toolbox': {
			const items = await getPublishedResources();
			await reindexScope(
				'toolbox',
				items.map((item) => ({
					id: item.id,
					slug: item.slug ?? item.id,
					title: item.title,
					description: contentSummary(item),
					coil: 'toolbox',
					body: item.body ? stripHtml(item.body).slice(0, 5000) : undefined,
					sourceName: item.sourceName,
					organizationName: item.organizationName,
					author: item.author,
					category: item.category,
					resourceType: item.resourceType,
					mediaType: item.mediaType,
					tags: item.tags,
					imageUrl: item.imageUrl,
					publishedAt: item.publishedAt,
					updatedAt: item.lastReviewedAt ?? item.publishedAt,
					sortDate: item.publishDate ?? item.publishedAt,
					featuredRank: item.featured ? 1 : 0
				}))
			);
			return items.length;
		}
	}
}

async function reindexAdminScope(
	scope: Extract<SearchIndexScope, 'organizations' | 'venues' | 'sources'>
): Promise<number> {
	switch (scope) {
		case 'organizations': {
			const { orgs } = await getOrganizations({ limit: 5000 });
			await reindexScope(
				'organizations',
				orgs.map((org) => ({
					id: org.id,
					slug: org.slug,
					title: org.name,
					description: org.description ?? undefined,
					scope: 'organizations',
					kind: 'organization',
					region: org.region ?? undefined,
					website: org.website ?? undefined,
					email: org.email ?? undefined,
					tribalAffiliation: org.tribalAffiliation ?? undefined,
					aliases: org.aliases ?? [],
					verified: org.verified ?? false,
					updatedAt: org.updatedAt.toISOString()
				}))
			);
			return orgs.length;
		}
		case 'venues': {
			const { venues } = await getVenues({ limit: 5000 });
			await reindexScope(
				'venues',
				venues.map((venue) => ({
					id: venue.id,
					slug: venue.slug,
					title: venue.name,
					description: venue.description ?? undefined,
					scope: 'venues',
					kind: 'venue',
					address: venue.address ?? undefined,
					city: venue.city ?? undefined,
					state: venue.state ?? undefined,
					website: venue.website ?? undefined,
					organizationId: venue.organizationId ?? undefined,
					aliases: venue.aliases ?? [],
					updatedAt: venue.updatedAt.toISOString()
				}))
			);
			return venues.length;
		}
		case 'sources': {
			const { items } = await getSourcesForAdmin({ limit: 5000, sort: 'name', order: 'asc' });
			await reindexScope(
				'sources',
				items.map((source) => ({
					id: source.id,
					slug: source.slug,
					title: source.name,
					description: source.description ?? undefined,
					scope: 'sources',
					kind: 'source',
					sourceUrl: source.sourceUrl,
					fetchUrl: source.fetchUrl,
					homepageUrl: source.homepageUrl,
					healthStatus: source.healthStatus,
					status: source.status,
					enabled: source.enabled,
					quarantined: source.quarantined,
					coils: source.coils,
					updatedAt: source.updatedAt.toISOString()
				}))
			);
			return items.length;
		}
	}
}

export async function reindexSearchScope(scope: SearchIndexScope): Promise<number> {
	if (scope === 'organizations' || scope === 'venues' || scope === 'sources') {
		return await reindexAdminScope(scope);
	}
	return await reindexPublicScope(scope);
}

export async function reindexPublishedContentCoil(coil: CoilKey): Promise<number> {
	return await reindexPublicScope(coil);
}

export async function reindexAllPublishedContent(): Promise<SearchReindexSummary> {
	const summary: Partial<SearchReindexSummary> = {};
	for (const scope of [
		'events',
		'funding',
		'redpages',
		'jobs',
		'toolbox',
		'organizations',
		'venues',
		'sources'
	] satisfies SearchIndexScope[]) {
		summary[scope] = await reindexSearchScope(scope);
	}
	return summary as SearchReindexSummary;
}

export async function getSearchOperationsSnapshot(query = '') {
	const searchReadiness = await getSearchReadiness();
	const [events, funding, redpages, jobs, toolbox, organizations, venues, sources, adminSearch] =
		await Promise.all([
			getEvents({ includeIcal: false }),
			getPublishedFunding(),
			getPublishedBusinesses(),
			getPublishedJobs(),
			getPublishedResources(),
			getOrganizations({ search: query, limit: query ? 8 : 6 }),
			getVenues({ search: query, limit: query ? 8 : 6 }),
			getSourcesForAdmin({ search: query, limit: query ? 8 : 6, sort: 'name', order: 'asc' }),
			runUnifiedSearch({
				q: query,
				surface: 'admin',
				scope: 'all',
				page: 1,
				limit: 6,
				sort: 'relevance',
				filters: {}
			})
		]);

	const publishedCounts: SearchReindexSummary = {
		events: events.length,
		funding: funding.length,
		redpages: redpages.length,
		jobs: jobs.length,
		toolbox: toolbox.length,
		organizations: organizations.total,
		venues: venues.total,
		sources: sources.total
	};

	const contentGroups = Object.fromEntries(
		adminSearch.groups
			.filter((group) => ['events', 'funding', 'redpages', 'jobs', 'toolbox'].includes(group.key))
			.map((group) => [group.key, group.results.map((item) => item.fields as SearchDoc)])
	) as Record<CoilKey, SearchDoc[]>;

	return {
		meilisearchConfigured: searchReadiness.configured,
		meilisearchAvailable: searchReadiness.available,
		searchReadiness,
		searchMode: searchReadiness.state,
		resultSource: adminSearch.resultSource as SearchResultSource,
		publishedCounts,
		contentResults: {
			events: contentGroups.events ?? [],
			funding: contentGroups.funding ?? [],
			redpages: contentGroups.redpages ?? [],
			jobs: contentGroups.jobs ?? [],
			toolbox: contentGroups.toolbox ?? []
		},
		entityResults: {
			organizations:
				adminSearch.groups
					.find((group) => group.key === 'organizations')
					?.results.map((item) => item.fields) ?? organizations.orgs,
			venues:
				adminSearch.groups
					.find((group) => group.key === 'venues')
					?.results.map((item) => item.fields) ?? venues.venues,
			sources:
				adminSearch.groups
					.find((group) => group.key === 'sources')
					?.results.map((item) => item.fields) ?? sources.items
		}
	};
}
