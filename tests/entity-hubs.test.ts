import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	getOrganizationBySlug: vi.fn(),
	getOrganizationById: vi.fn(),
	getVenueBySlug: vi.fn(),
	getUpcomingEventsByOrganizationId: vi.fn(),
	getUpcomingEventsByVenueId: vi.fn(),
	getFundingByOrganizationId: vi.fn(),
	getJobsByOrganizationId: vi.fn(),
	getBusinessesByOrganizationId: vi.fn(),
	getResourcesByOrganizationId: vi.fn(),
	getVenuesByOrganizationId: vi.fn()
}));

vi.mock('../src/lib/server/organizations', () => ({
	getOrganizationBySlug: mocks.getOrganizationBySlug,
	getOrganizationById: mocks.getOrganizationById
}));

vi.mock('../src/lib/server/venues', () => ({
	getVenueBySlug: mocks.getVenueBySlug,
	getVenuesByOrganizationId: mocks.getVenuesByOrganizationId
}));

vi.mock('../src/lib/server/events', () => ({
	getUpcomingEventsByOrganizationId: mocks.getUpcomingEventsByOrganizationId,
	getUpcomingEventsByVenueId: mocks.getUpcomingEventsByVenueId
}));

vi.mock('../src/lib/server/funding', () => ({
	getFundingByOrganizationId: mocks.getFundingByOrganizationId
}));

vi.mock('../src/lib/server/jobs', () => ({
	getJobsByOrganizationId: mocks.getJobsByOrganizationId
}));

vi.mock('../src/lib/server/red-pages', () => ({
	getBusinessesByOrganizationId: mocks.getBusinessesByOrganizationId
}));

vi.mock('../src/lib/server/toolbox', () => ({
	getResourcesByOrganizationId: mocks.getResourcesByOrganizationId
}));

import { load as loadOrganizationHub } from '../src/routes/o/[slug]/+page.server';
import { load as loadVenueHub } from '../src/routes/v/[slug]/+page.server';

describe('entity hub loaders', () => {
	beforeEach(() => {
		Object.values(mocks).forEach((mock) => mock.mockReset());
	});

	it('returns cross-coil content for organization hubs', async () => {
		mocks.getOrganizationBySlug.mockResolvedValue({
			id: 'org-1',
			slug: 'future-rivers',
			name: 'Future Rivers'
		});
		mocks.getUpcomingEventsByOrganizationId.mockResolvedValue([
			{ id: 'event-1', title: 'Gathering' }
		]);
		mocks.getFundingByOrganizationId.mockResolvedValue([{ id: 'funding-1', title: 'Grant' }]);
		mocks.getJobsByOrganizationId.mockResolvedValue([{ id: 'job-1', title: 'Coordinator' }]);
		mocks.getBusinessesByOrganizationId.mockResolvedValue([{ id: 'biz-1', title: 'Studio' }]);
		mocks.getResourcesByOrganizationId.mockResolvedValue([{ id: 'resource-1', title: 'Toolkit' }]);
		mocks.getVenuesByOrganizationId.mockResolvedValue([{ id: 'venue-1', name: 'Longhouse' }]);

		const result = await loadOrganizationHub({
			params: { slug: 'future-rivers' }
		} as Parameters<typeof loadOrganizationHub>[0]);

		expect(result.organization.name).toBe('Future Rivers');
		expect(result.collections.events).toHaveLength(1);
		expect(result.collections.funding).toHaveLength(1);
		expect(result.collections.jobs).toHaveLength(1);
		expect(result.collections.redpages).toHaveLength(1);
		expect(result.collections.toolbox).toHaveLength(1);
		expect(result.collections.venues).toHaveLength(1);
	});

	it('hydrates venue hubs from the linked organization when present', async () => {
		mocks.getVenueBySlug.mockResolvedValue({
			id: 'venue-1',
			slug: 'longhouse',
			name: 'Longhouse',
			organizationId: 'org-1'
		});
		mocks.getOrganizationById.mockResolvedValue({
			id: 'org-1',
			slug: 'future-rivers',
			name: 'Future Rivers'
		});
		mocks.getUpcomingEventsByVenueId.mockResolvedValue([{ id: 'event-1', title: 'Gathering' }]);
		mocks.getFundingByOrganizationId.mockResolvedValue([{ id: 'funding-1', title: 'Grant' }]);
		mocks.getJobsByOrganizationId.mockResolvedValue([{ id: 'job-1', title: 'Coordinator' }]);
		mocks.getBusinessesByOrganizationId.mockResolvedValue([{ id: 'biz-1', title: 'Studio' }]);
		mocks.getResourcesByOrganizationId.mockResolvedValue([{ id: 'resource-1', title: 'Toolkit' }]);

		const result = await loadVenueHub({
			params: { slug: 'longhouse' }
		} as Parameters<typeof loadVenueHub>[0]);

		expect(result.venue.name).toBe('Longhouse');
		expect(result.organization?.name).toBe('Future Rivers');
		expect(result.collections.events).toHaveLength(1);
		expect(result.collections.funding).toHaveLength(1);
		expect(result.collections.jobs).toHaveLength(1);
		expect(result.collections.redpages).toHaveLength(1);
		expect(result.collections.toolbox).toHaveLength(1);
	});

	it('keeps venue hubs event-only when no linked organization exists', async () => {
		mocks.getVenueBySlug.mockResolvedValue({
			id: 'venue-1',
			slug: 'longhouse',
			name: 'Longhouse',
			organizationId: null
		});
		mocks.getUpcomingEventsByVenueId.mockResolvedValue([{ id: 'event-1', title: 'Gathering' }]);

		const result = await loadVenueHub({
			params: { slug: 'longhouse' }
		} as Parameters<typeof loadVenueHub>[0]);

		expect(result.organization).toBeNull();
		expect(result.collections.events).toHaveLength(1);
		expect(result.collections.funding).toEqual([]);
		expect(result.collections.jobs).toEqual([]);
		expect(result.collections.redpages).toEqual([]);
		expect(result.collections.toolbox).toEqual([]);
	});
});
