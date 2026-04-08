import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$env/dynamic/public', () => ({
	env: {
		PUBLIC_ASSET_BASE_URL: 'https://assets.example.com/kb-uploads'
	}
}));

const { getSetting, setSetting } = vi.hoisted(() => ({
	getSetting: vi.fn(),
	setSetting: vi.fn()
}));

vi.mock('../src/lib/server/settings', () => ({
	getSetting,
	setSetting
}));

vi.mock('../src/lib/server/events', () => ({
	getEventById: vi.fn(),
	queryEventsForHomepage: vi.fn()
}));

vi.mock('../src/lib/server/funding', () => ({
	getFundingById: vi.fn(),
	queryFundingForHomepage: vi.fn()
}));

vi.mock('../src/lib/server/jobs', () => ({
	getJobById: vi.fn(),
	queryJobsForHomepage: vi.fn()
}));

vi.mock('../src/lib/server/toolbox', () => ({
	getResourceById: vi.fn(),
	queryResourcesForHomepage: vi.fn()
}));

vi.mock('../src/lib/server/red-pages', () => ({
	getBusinessById: vi.fn(),
	queryBusinessesForHomepage: vi.fn()
}));

import {
	getHomepageConfig,
	saveHomepageConfig,
	HOMEPAGE_CONFIG_KEY
} from '../src/lib/server/homepage';
import {
	buildHomepageItemHref,
	buildHomepageSectionMoreHref,
	resolveSectionLayoutPreset
} from '../src/lib/data/homepage';

describe('homepage config', () => {
	beforeEach(() => {
		getSetting.mockReset();
		setSetting.mockReset();
	});

	it('rehydrates rich text content and keyword filters from stored settings', async () => {
		getSetting.mockResolvedValue(
			JSON.stringify({
				featured: [{ coil: 'events', itemId: 'event-1', title: 'Lead story' }],
				sections: [
					{
						id: 'announcement',
						source: 'richtext',
						visible: true,
						limit: 1,
						sortBy: 'published',
						sortDir: 'desc',
						futureOnly: false,
						heading: 'Announcements',
						content: '<p>Spring gathering this week.</p>'
					},
					{
						id: 'jobs',
						source: 'jobs',
						visible: true,
						limit: 4,
						sortBy: 'title',
						sortDir: 'asc',
						futureOnly: false,
						heading: 'Hiring now',
						searchQuery: 'youth',
						excludedIds: ['job-2']
					}
				]
			})
		);

		const config = await getHomepageConfig();

		expect(config.sections).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: 'announcement',
					source: 'richtext',
					content: '<p>Spring gathering this week.</p>'
				}),
				expect.objectContaining({
					id: 'jobs',
					source: 'jobs',
					searchQuery: 'youth',
					excludedIds: ['job-2'],
					layoutPreset: 'auto'
				})
			])
		);
	});

	it('normalizes invalid stored presets back to auto', async () => {
		getSetting.mockResolvedValue(
			JSON.stringify({
				featured: [],
				sections: [
					{
						id: 'funding',
						source: 'funding',
						visible: true,
						limit: 6,
						sortBy: 'deadline',
						sortDir: 'asc',
						futureOnly: true,
						heading: 'Funding',
						layoutPreset: 'banner'
					}
				]
			})
		);

		const config = await getHomepageConfig();

		expect(config.sections[0]?.layoutPreset).toBe('auto');
		expect(resolveSectionLayoutPreset(config.sections[0]!)).toBe('list');
	});

	it('normalizes legacy local asset URLs inside stored image sections', async () => {
		getSetting.mockResolvedValue(
			JSON.stringify({
				featured: [],
				sections: [
					{
						id: 'hero-image',
						source: 'image',
						visible: true,
						limit: 1,
						sortBy: 'published',
						sortDir: 'desc',
						futureOnly: false,
						heading: 'Hero image',
						imageUrl: 'http://localhost:9000/kb-uploads/homepage/hero.png?version=2#intro',
						imageAlt: 'Homepage hero'
					},
					{
						id: 'container-1',
						source: 'container',
						visible: true,
						limit: 1,
						sortBy: 'published',
						sortDir: 'desc',
						futureOnly: false,
						heading: '',
						columns: 2,
						children: [
							{
								id: 'child-image',
								source: 'image',
								visible: true,
								limit: 1,
								sortBy: 'published',
								sortDir: 'desc',
								futureOnly: false,
								heading: 'Child image',
								imageUrl: 'http://localhost:9000/kb-uploads/events/curated/elderberry.png'
							}
						]
					}
				]
			})
		);

		const config = await getHomepageConfig();
		const imageSection = config.sections.find((section) => section.id === 'hero-image');
		const container = config.sections.find((section) => section.id === 'container-1');

		expect(imageSection?.imageUrl).toBe(
			'https://assets.example.com/kb-uploads/homepage/hero.png?version=2#intro'
		);
		expect(container?.children?.[0]?.imageUrl).toBe(
			'https://assets.example.com/kb-uploads/events/curated/elderberry.png'
		);
	});

	it('returns a fresh default config each time settings are missing', async () => {
		getSetting.mockResolvedValue(null);

		const first = await getHomepageConfig();
		first.sections[0].heading = 'Mutated heading';
		first.sections.push({
			id: 'temporary',
			source: 'richtext',
			visible: true,
			limit: 1,
			sortBy: 'published',
			sortDir: 'desc',
			futureOnly: false,
			heading: 'Temporary',
			content: '<p>Draft</p>'
		});

		const second = await getHomepageConfig();

		expect(second.sections.some((section) => section.id === 'temporary')).toBe(false);
		expect(second.sections[0]?.heading).toBe("Editor's Picks");
	});

	it('respects configs without a featured section', async () => {
		getSetting.mockResolvedValue(
			JSON.stringify({
				featured: [],
				sections: [
					{
						id: 'jobs',
						source: 'jobs',
						visible: true,
						limit: 4,
						sortBy: 'published',
						sortDir: 'desc',
						futureOnly: false,
						heading: 'Latest jobs'
					}
				]
			})
		);

		const config = await getHomepageConfig();

		expect(config.sections).toHaveLength(1);
		expect(config.sections[0]?.source).toBe('jobs');
	});

	it('saves a cloned payload instead of mutating the caller state', async () => {
		const config = {
			featured: [{ coil: 'events' as const, itemId: 'event-1', title: 'Lead' }],
			sections: [
				{
					id: 'announcement',
					source: 'richtext' as const,
					visible: true,
					limit: 1,
					sortBy: 'published' as const,
					sortDir: 'desc' as const,
					futureOnly: false,
					heading: 'Announcements',
					content: '<p>Hello</p>'
				}
			]
		};

		await saveHomepageConfig(config);
		config.sections[0]!.heading = 'Changed after save';

		expect(setSetting).toHaveBeenCalledWith(
			HOMEPAGE_CONFIG_KEY,
			expect.stringContaining('"heading":"Announcements"')
		);
	});

	it('builds section see-more URLs from homepage filters', () => {
		expect(
			buildHomepageSectionMoreHref({
				source: 'events',
				searchQuery: 'youth gathering',
				futureOnly: true
			})
		).toBe('/events?q=youth+gathering&future=1');
		expect(
			buildHomepageSectionMoreHref({
				source: 'jobs',
				searchQuery: 'coordinator',
				futureOnly: false
			})
		).toBe('/jobs?q=coordinator');
	});

	it('builds homepage item URLs with coil route aliases', () => {
		expect(
			buildHomepageItemHref('redpages', {
				id: 'business-1',
				slug: 'capital-city-beads'
			})
		).toBe('/red-pages/capital-city-beads');
		expect(
			buildHomepageItemHref('featured', {
				id: 'business-1',
				slug: 'capital-city-beads',
				coil: 'redpages'
			})
		).toBe('/red-pages/capital-city-beads');
	});
});
