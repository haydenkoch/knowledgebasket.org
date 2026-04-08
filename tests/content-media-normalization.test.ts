import { beforeEach, describe, expect, it, vi } from 'vitest';

const selectResponses = vi.hoisted(() => [] as unknown[][]);
const executeResponses = vi.hoisted(() => [] as unknown[][]);

vi.mock('$env/dynamic/public', () => ({
	env: {
		PUBLIC_ASSET_BASE_URL: 'https://assets.example.com/kb-uploads'
	}
}));

vi.mock('$lib/server/db', () => {
	const nextSelectResponse = () => Promise.resolve(selectResponses.shift() ?? []);

	function makeChain() {
		const chain: Record<string, unknown> = {
			from: vi.fn(() => chain),
			where: vi.fn(() => chain),
			orderBy: vi.fn(() => chain),
			limit: vi.fn(() => chain),
			offset: vi.fn(() => chain),
			leftJoin: vi.fn(() => chain),
			then: (
				onFulfilled: (value: unknown[]) => unknown,
				onRejected?: (error: unknown) => unknown
			) => nextSelectResponse().then(onFulfilled, onRejected),
			catch: (onRejected: (error: unknown) => unknown) => nextSelectResponse().catch(onRejected),
			finally: (onFinally: () => void) => nextSelectResponse().finally(onFinally)
		};
		return chain;
	}

	return {
		db: {
			select: vi.fn(() => makeChain()),
			execute: vi.fn(async () => executeResponses.shift() ?? [])
		},
		type: {}
	};
});

vi.mock('$lib/server/meilisearch', () => ({
	indexDocument: vi.fn(),
	removeDocument: vi.fn()
}));

vi.mock('$lib/server/source-provenance', () => ({
	getSourceProvenanceByPublishedRecord: vi.fn()
}));

vi.mock('$lib/server/sanitize-rich-text', () => ({
	sanitizeRichTextHtml: (value: string | undefined) => value
}));

vi.mock('$lib/server/admin-content', () => ({
	buildModerationFields: vi.fn(() => ({}))
}));

function resetQueues() {
	selectResponses.length = 0;
	executeResponses.length = 0;
}

describe('public media normalization', () => {
	beforeEach(() => {
		resetQueues();
		vi.resetModules();
	});

	it('rewrites legacy job image URLs', async () => {
		selectResponses.push([
			{
				id: 'job-1',
				slug: 'community-coordinator',
				title: 'Community Coordinator',
				description: null,
				qualifications: null,
				employerName: 'Future Rivers',
				organizationId: null,
				jobType: 'Full-time',
				seniority: null,
				sector: null,
				sectors: null,
				department: null,
				tags: null,
				workArrangement: null,
				location: null,
				address: null,
				city: null,
				state: null,
				zip: null,
				lat: null,
				lng: null,
				region: null,
				compensationType: null,
				compensationMin: null,
				compensationMax: null,
				compensationDescription: null,
				benefits: null,
				applyUrl: null,
				applicationDeadline: null,
				applicationInstructions: null,
				indigenousPriority: false,
				tribalPreference: false,
				imageUrl: 'http://localhost:9000/kb-uploads/jobs/community-coordinator.png',
				imageUrls: ['http://localhost:9000/kb-uploads/jobs/community-coordinator-detail.png'],
				status: 'published',
				source: null,
				featured: false,
				unlisted: false,
				createdAt: new Date('2026-04-07T00:00:00.000Z'),
				updatedAt: new Date('2026-04-07T00:00:00.000Z'),
				publishedAt: new Date('2026-04-07T00:00:00.000Z'),
				closedAt: null,
				rejectedAt: null,
				rejectionReason: null,
				adminNotes: null,
				submittedById: null,
				reviewedById: null
			}
		]);

		const { getPublishedJobs } = await import('../src/lib/server/jobs');
		const items = await getPublishedJobs();

		expect(items[0]?.imageUrl).toBe(
			'https://assets.example.com/kb-uploads/jobs/community-coordinator.png'
		);
		expect(items[0]?.imageUrls).toEqual([
			'https://assets.example.com/kb-uploads/jobs/community-coordinator-detail.png'
		]);
	});

	it('rewrites legacy toolbox image URLs', async () => {
		selectResponses.push([
			{
				id: 'resource-1',
				slug: 'salmon-toolkit',
				title: 'Salmon Toolkit',
				description: null,
				body: null,
				sourceName: 'Knowledge Basket',
				organizationId: null,
				resourceType: 'guide',
				mediaType: 'Guide',
				category: 'Water',
				categories: ['Water'],
				tags: null,
				contentMode: 'link',
				externalUrl: 'https://example.com/toolkit',
				fileUrl: null,
				imageUrl: 'http://localhost:9000/kb-uploads/toolbox/salmon-toolkit.png',
				imageUrls: ['http://localhost:9000/kb-uploads/toolbox/salmon-toolkit-detail.png'],
				author: null,
				publishDate: null,
				lastReviewedAt: null,
				status: 'published',
				source: null,
				featured: false,
				unlisted: false,
				createdAt: new Date('2026-04-07T00:00:00.000Z'),
				updatedAt: new Date('2026-04-07T00:00:00.000Z'),
				publishedAt: new Date('2026-04-07T00:00:00.000Z'),
				rejectedAt: null,
				rejectionReason: null,
				adminNotes: null,
				submittedById: null,
				reviewedById: null
			}
		]);

		const { getPublishedResources } = await import('../src/lib/server/toolbox');
		const items = await getPublishedResources();

		expect(items[0]?.imageUrl).toBe(
			'https://assets.example.com/kb-uploads/toolbox/salmon-toolkit.png'
		);
		expect(items[0]?.imageUrls).toEqual([
			'https://assets.example.com/kb-uploads/toolbox/salmon-toolkit-detail.png'
		]);
	});

	it('rewrites legacy red pages logo and gallery URLs', async () => {
		selectResponses.push([
			{
				id: 'biz-1',
				slug: 'future-rivers-studio',
				name: 'Future Rivers Studio',
				description: null,
				organizationId: null,
				ownerName: null,
				serviceType: 'Design',
				serviceTypes: ['Design'],
				serviceArea: null,
				tags: null,
				tribalAffiliation: null,
				tribalAffiliations: null,
				ownershipIdentity: null,
				website: 'https://example.com/studio',
				email: null,
				phone: null,
				address: null,
				city: null,
				state: null,
				zip: null,
				lat: null,
				lng: null,
				region: null,
				businessHours: null,
				logoUrl: 'http://localhost:9000/kb-uploads/red-pages/logo.png',
				imageUrl: 'http://localhost:9000/kb-uploads/red-pages/hero.png',
				imageUrls: ['http://localhost:9000/kb-uploads/red-pages/gallery.png'],
				certifications: null,
				socialLinks: null,
				status: 'published',
				source: null,
				featured: false,
				unlisted: false,
				createdAt: new Date('2026-04-07T00:00:00.000Z'),
				updatedAt: new Date('2026-04-07T00:00:00.000Z'),
				publishedAt: new Date('2026-04-07T00:00:00.000Z'),
				rejectedAt: null,
				verifiedAt: null,
				rejectionReason: null,
				adminNotes: null,
				submittedById: null,
				reviewedById: null,
				verified: false
			}
		]);

		const { getPublishedBusinesses } = await import('../src/lib/server/red-pages');
		const items = await getPublishedBusinesses();

		expect(items[0]?.logoUrl).toBe('https://assets.example.com/kb-uploads/red-pages/logo.png');
		expect(items[0]?.imageUrl).toBe('https://assets.example.com/kb-uploads/red-pages/hero.png');
		expect(items[0]?.imageUrls).toEqual([
			'https://assets.example.com/kb-uploads/red-pages/gallery.png'
		]);
	});

	it('rewrites legacy organization logos for list and map views', async () => {
		executeResponses.push([{ present: 1 }]);
		selectResponses.push(
			[{ count: 1 }],
			[
				{
					id: 'org-1',
					slug: 'future-rivers',
					name: 'Future Rivers',
					description: null,
					website: null,
					email: null,
					phone: null,
					logoUrl: 'http://localhost:9000/kb-uploads/logos/organizations/future-rivers.png',
					orgType: 'Nonprofit',
					orgTypes: null,
					region: null,
					address: null,
					city: null,
					state: null,
					zip: null,
					lat: null,
					lng: null,
					tribalAffiliation: null,
					tribalAffiliations: null,
					socialLinks: null,
					verified: false,
					verifiedAt: null,
					verifiedById: null,
					verificationNotes: null,
					createdAt: new Date('2026-04-07T00:00:00.000Z'),
					updatedAt: new Date('2026-04-07T00:00:00.000Z'),
					aliases: []
				}
			],
			[
				{
					id: 'org-1',
					slug: 'future-rivers',
					name: 'Future Rivers',
					lat: 39.1,
					lng: -120.2,
					logoUrl: 'http://localhost:9000/kb-uploads/logos/organizations/future-rivers.png',
					orgType: 'Nonprofit',
					verified: false,
					city: 'Placerville',
					state: 'CA',
					description: 'Watershed restoration work'
				}
			]
		);

		const { getOrganizations, getOrganizationMapPoints } =
			await import('../src/lib/server/organizations');
		const { orgs } = await getOrganizations();
		const mapPoints = await getOrganizationMapPoints();

		expect(orgs[0]?.logoUrl).toBe(
			'https://assets.example.com/kb-uploads/logos/organizations/future-rivers.png'
		);
		expect(mapPoints[0]?.logoUrl).toBe(
			'https://assets.example.com/kb-uploads/logos/organizations/future-rivers.png'
		);
	});

	it('rewrites legacy venue images for list and map views', async () => {
		executeResponses.push([{ present: 1 }]);
		selectResponses.push(
			[{ count: 1 }],
			[
				{
					id: 'venue-1',
					slug: 'longhouse',
					name: 'Longhouse',
					description: null,
					address: null,
					city: 'Auburn',
					state: 'CA',
					zip: null,
					lat: null,
					lng: null,
					website: null,
					imageUrl: 'http://localhost:9000/kb-uploads/venues/longhouse.png',
					venueType: 'Community space',
					organizationId: null,
					createdAt: new Date('2026-04-07T00:00:00.000Z'),
					updatedAt: new Date('2026-04-07T00:00:00.000Z'),
					aliases: []
				}
			],
			[
				{
					id: 'venue-1',
					slug: 'longhouse',
					name: 'Longhouse',
					lat: 39.1,
					lng: -120.2,
					imageUrl: 'http://localhost:9000/kb-uploads/venues/longhouse.png',
					venueType: 'Community space',
					city: 'Auburn',
					state: 'CA',
					address: '123 River Rd',
					description: 'Gathering place'
				}
			]
		);

		const { getVenues, getVenueMapPoints } = await import('../src/lib/server/venues');
		const { venues } = await getVenues();
		const mapPoints = await getVenueMapPoints();

		expect(venues[0]?.imageUrl).toBe('https://assets.example.com/kb-uploads/venues/longhouse.png');
		expect(mapPoints[0]?.imageUrl).toBe(
			'https://assets.example.com/kb-uploads/venues/longhouse.png'
		);
	});
});
