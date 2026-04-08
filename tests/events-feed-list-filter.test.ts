import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getEvents, getEventById } = vi.hoisted(() => ({
	getEvents: vi.fn(),
	getEventById: vi.fn()
}));

const { getListBySlug, getPublicListEventIds } = vi.hoisted(() => ({
	getListBySlug: vi.fn(),
	getPublicListEventIds: vi.fn()
}));

vi.mock('../src/lib/server/events', () => ({
	getEvents,
	getEventById
}));

vi.mock('../src/lib/server/event-lists', () => ({
	getListBySlug,
	getPublicListEventIds
}));

describe('events feed list filtering', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('uses public-safe curated ids when rendering a list-specific ICS feed', async () => {
		getEvents.mockResolvedValue([
			{
				id: 'base-event',
				title: 'Base event',
				status: 'published',
				startDate: '2026-04-10T18:00:00.000Z',
				endDate: '2026-04-10T20:00:00.000Z'
			}
		]);
		getListBySlug.mockResolvedValue({
			id: 'list-1',
			title: 'Featured',
			slug: 'featured'
		});
		getPublicListEventIds.mockResolvedValue(['curated-event']);
		getEventById.mockResolvedValue({
			id: 'curated-event',
			title: 'Curated event',
			status: 'published',
			startDate: '2026-04-11T18:00:00.000Z',
			endDate: '2026-04-11T20:00:00.000Z'
		});

		const mod = await import('../src/routes/events/feed.ics/+server');
		const response = await mod.GET({
			url: new URL('https://example.com/events/feed.ics?list=featured')
		} as never);

		const body = await response.text();

		expect(getPublicListEventIds).toHaveBeenCalledWith('list-1');
		expect(body).toContain('SUMMARY:Curated event');
		expect(body).not.toContain('SUMMARY:Base event');
	});

	it('escapes reserved ICS characters in public feed output', async () => {
		getEvents.mockResolvedValue([
			{
				id: 'base-event',
				title: 'Base event',
				status: 'published',
				startDate: '2026-04-10T18:00:00.000Z',
				endDate: '2026-04-10T20:00:00.000Z'
			}
		]);
		getListBySlug.mockResolvedValue({
			id: 'list-1',
			title: 'Featured',
			slug: 'featured'
		});
		getPublicListEventIds.mockResolvedValue(['curated-event']);
		getEventById.mockResolvedValue({
			id: 'curated-event',
			title: 'Curated; event, notes \\ draft',
			location: 'Bishop; CA, Plaza \\ Lot 4',
			status: 'published',
			startDate: '2026-04-11T18:00:00.000Z',
			endDate: '2026-04-11T20:00:00.000Z'
		});

		const mod = await import('../src/routes/events/feed.ics/+server');
		const response = await mod.GET({
			url: new URL('https://example.com/events/feed.ics?list=featured')
		} as never);
		const body = await response.text();

		expect(body).toContain('SUMMARY:Curated\\; event\\, notes \\\\ draft');
		expect(body).toContain('LOCATION:Bishop\\; CA\\, Plaza \\\\ Lot 4');
	});
});
