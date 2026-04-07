import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	getEvents: vi.fn(),
	getPublishedFunding: vi.fn(),
	getPublishedJobs: vi.fn(),
	getPublishedBusinesses: vi.fn(),
	getPublishedResources: vi.fn(),
	getOrganizations: vi.fn(),
	getVenues: vi.fn()
}));

vi.mock('../src/lib/server/events', () => ({
	getEvents: mocks.getEvents
}));

vi.mock('../src/lib/server/funding', () => ({
	getPublishedFunding: mocks.getPublishedFunding
}));

vi.mock('../src/lib/server/jobs', () => ({
	getPublishedJobs: mocks.getPublishedJobs
}));

vi.mock('../src/lib/server/red-pages', () => ({
	getPublishedBusinesses: mocks.getPublishedBusinesses
}));

vi.mock('../src/lib/server/toolbox', () => ({
	getPublishedResources: mocks.getPublishedResources
}));

vi.mock('../src/lib/server/organizations', () => ({
	getOrganizations: mocks.getOrganizations
}));

vi.mock('../src/lib/server/venues', () => ({
	getVenues: mocks.getVenues
}));

import { GET as sitemapGet } from '../src/routes/sitemap.xml/+server';
import { GET as robotsGet } from '../src/routes/robots.txt/+server';

describe('discovery routes', () => {
	beforeEach(() => {
		Object.values(mocks).forEach((mock) => mock.mockReset());
		mocks.getEvents.mockResolvedValue([
			{ id: 'event-1', slug: 'gathering', startDate: '2026-04-10' }
		]);
		mocks.getPublishedFunding.mockResolvedValue([]);
		mocks.getPublishedJobs.mockResolvedValue([]);
		mocks.getPublishedBusinesses.mockResolvedValue([]);
		mocks.getPublishedResources.mockResolvedValue([]);
		mocks.getOrganizations.mockResolvedValue({
			orgs: [{ id: 'org-1', slug: 'future-rivers', updatedAt: '2026-04-01T00:00:00.000Z' }],
			total: 1
		});
		mocks.getVenues.mockResolvedValue({
			venues: [{ id: 'venue-1', slug: 'longhouse', updatedAt: '2026-04-02T00:00:00.000Z' }],
			total: 1
		});
	});

	it('includes public organization and venue hubs in the sitemap', async () => {
		const response = await sitemapGet({
			url: new URL('https://kb.example.com/sitemap.xml')
		} as Parameters<typeof sitemapGet>[0]);
		const xml = await response.text();

		expect(xml).toContain('<loc>https://kb.example.com/events/gathering</loc>');
		expect(xml).toContain('<loc>https://kb.example.com/o/future-rivers</loc>');
		expect(xml).toContain('<loc>https://kb.example.com/v/longhouse</loc>');
		expect(xml).toContain('<lastmod>2026-04-01T00:00:00.000Z</lastmod>');
		expect(xml).toContain('<lastmod>2026-04-02T00:00:00.000Z</lastmod>');
	});

	it('disallows private and submit routes in robots.txt', async () => {
		const response = await robotsGet({
			url: new URL('https://kb.example.com/robots.txt')
		} as Parameters<typeof robotsGet>[0]);
		const robots = await response.text();

		expect(robots).toContain('Disallow: /admin');
		expect(robots).toContain('Disallow: /account');
		expect(robots).toContain('Disallow: /events/submit');
		expect(robots).toContain('Disallow: /toolbox/submit');
		expect(robots).toContain('Sitemap: https://kb.example.com/sitemap.xml');
	});
});
