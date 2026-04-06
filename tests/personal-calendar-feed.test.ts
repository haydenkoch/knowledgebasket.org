import { beforeEach, describe, expect, it, vi } from 'vitest';

const getPersonalCalendarFeedByToken = vi.fn();
const getPersonalCalendarFeedEvents = vi.fn();

vi.mock('../src/lib/server/personalization', () => ({
	getPersonalCalendarFeedByToken,
	getPersonalCalendarFeedEvents
}));

describe('personal calendar feed', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 404 for unknown feed tokens', async () => {
		getPersonalCalendarFeedByToken.mockResolvedValueOnce(null);
		const mod = await import('../src/routes/account/calendar/feed/[token]/+server');

		await expect(
			mod.GET({
				params: { token: 'missing' },
				url: new URL('https://example.com/account/calendar/feed/missing')
			} as never)
		).rejects.toMatchObject({ status: 404 });
	});

	it('renders an ICS feed for followed and saved events', async () => {
		getPersonalCalendarFeedByToken.mockResolvedValueOnce({ userId: 'user-1', token: 'abc' });
		getPersonalCalendarFeedEvents.mockResolvedValueOnce([
			{
				id: 'event-1',
				slug: 'gathering',
				title: 'Community Gathering',
				description: 'A welcoming event',
				location: 'Bishop, CA',
				startDate: '2026-04-10T18:00:00.000Z',
				endDate: '2026-04-10T20:00:00.000Z'
			}
		]);

		const mod = await import('../src/routes/account/calendar/feed/[token]/+server');
		const response = await mod.GET({
			params: { token: 'abc' },
			url: new URL('https://example.com/account/calendar/feed/abc')
		} as never);

		expect(response.headers.get('content-type')).toContain('text/calendar');
		expect(await response.text()).toContain('SUMMARY:Community Gathering');
	});
});
