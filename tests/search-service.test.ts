import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchRequest, SearchResult } from '$lib/server/search-contracts';

const meilisearchMock = vi.hoisted(() => ({
	getSearchReadiness: vi.fn(),
	searchIndex: vi.fn(),
	searchScopesWithStatus: vi.fn()
}));

const searchSemanticMock = vi.hoisted(() => ({
	semanticSearchAdapter: {
		expandQuery: vi.fn(async () => []),
		decorateDocuments: vi.fn(
			async <T extends Record<string, unknown>>(documents: T[]) => documents
		),
		rerankResults: vi.fn(async (_request: SearchRequest, results: SearchResult[]) => results)
	}
}));

const eventsMock = vi.hoisted(() => ({ getEvents: vi.fn(async () => []) }));
const fundingMock = vi.hoisted(() => ({ getPublishedFunding: vi.fn(async () => []) }));
const jobsMock = vi.hoisted(() => ({ getPublishedJobs: vi.fn(async () => []) }));
const businessesMock = vi.hoisted(() => ({ getPublishedBusinesses: vi.fn(async () => []) }));
const resourcesMock = vi.hoisted(() => ({ getPublishedResources: vi.fn(async () => []) }));
const organizationsMock = vi.hoisted(() => ({
	getOrganizations: vi.fn(async () => ({ orgs: [], total: 0 }))
}));
const venuesMock = vi.hoisted(() => ({ getVenues: vi.fn(async () => ({ venues: [], total: 0 })) }));
const sourcesMock = vi.hoisted(() => ({
	getSourcesForAdmin: vi.fn(async () => ({ items: [], total: 0 }))
}));

vi.mock('$lib/server/meilisearch', () => meilisearchMock);
vi.mock('$lib/server/search-semantic', () => searchSemanticMock);
vi.mock('$lib/server/events', () => eventsMock);
vi.mock('$lib/server/funding', () => fundingMock);
vi.mock('$lib/server/jobs', () => jobsMock);
vi.mock('$lib/server/red-pages', () => businessesMock);
vi.mock('$lib/server/toolbox', () => resourcesMock);
vi.mock('$lib/server/organizations', () => organizationsMock);
vi.mock('$lib/server/venues', () => venuesMock);
vi.mock('$lib/server/sources', () => sourcesMock);

describe('runUnifiedSearch', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns truthful degraded metadata when indexed search is only partially ready', async () => {
		eventsMock.getEvents.mockResolvedValue([
			{
				id: 'evt-1',
				title: 'Tribal Climate Gathering',
				description: 'Community planning summit',
				coil: 'events',
				location: 'Reno',
				region: 'Sierra'
			}
		] as never);
		meilisearchMock.getSearchReadiness.mockResolvedValue({
			state: 'partial',
			detail: 'missing-indexes',
			configured: true,
			available: true,
			settingsVersion: 'test',
			indexedScopes: ['events'],
			missingScopes: [
				'funding',
				'redpages',
				'jobs',
				'toolbox',
				'organizations',
				'venues',
				'sources'
			],
			mismatchedScopes: [],
			issues: []
		});

		const { runUnifiedSearch } = await import('$lib/server/search-service');
		const response = await runUnifiedSearch({
			q: 'tribal',
			surface: 'global',
			scope: 'all',
			page: 1,
			limit: 10,
			sort: 'relevance',
			filters: {}
		});

		expect(response.resultSource).toBe('database');
		expect(response.fallbackReason).toBe('missing-index');
		expect(response.experience.degraded).toBe(true);
		expect(response.experience.degradedLabel).toContain('rebuilding');
		expect(response.results[0]?.presentation.badge).toBe('Events');
		expect(response.results[0]?.presentation.icon).toBe('calendar');
	});

	it('returns presentation-ready grouped results when Meilisearch is ready', async () => {
		meilisearchMock.getSearchReadiness.mockResolvedValue({
			state: 'ready',
			detail: 'ready',
			configured: true,
			available: true,
			settingsVersion: 'test',
			indexedScopes: [
				'events',
				'funding',
				'redpages',
				'jobs',
				'toolbox',
				'organizations',
				'venues',
				'sources'
			],
			missingScopes: [],
			mismatchedScopes: [],
			issues: []
		});
		meilisearchMock.searchScopesWithStatus.mockResolvedValue({
			ok: true,
			results: {
				events: [
					{
						id: 'evt-1',
						title: 'Tribal Climate Gathering',
						scope: 'events',
						coil: 'events',
						summary: 'Community planning summit',
						href: '/events/evt-1',
						region: 'Sierra',
						organizationName: 'Indigenous Futures'
					}
				],
				funding: [],
				redpages: [],
				jobs: [],
				toolbox: [],
				organizations: [],
				venues: [],
				sources: []
			}
		});

		const { runUnifiedSearch } = await import('$lib/server/search-service');
		const response = await runUnifiedSearch({
			q: 'tribal climate',
			surface: 'global',
			scope: 'all',
			page: 1,
			limit: 10,
			sort: 'relevance',
			filters: {}
		});

		expect(response.resultSource).toBe('meilisearch');
		expect(response.experience.degraded).toBe(false);
		expect(response.groups[0]?.results[0]?.presentation.subtitle).toContain('Indigenous Futures');
		expect(response.groups[0]?.results[0]?.presentation.destinationLabel).toBe('Open result');
	});
});
