import { beforeEach, describe, expect, it, vi } from 'vitest';

const job = {
	id: 'job-1',
	slug: 'programs-lead',
	title: 'Programs Lead',
	userInterested: false,
	interestCount: 0
};

const getJobBySlug = vi.fn(async () => job);
const toggleJobInterest = vi.fn(async () => true);
const isBookmarked = vi.fn(async () => false);
const toggleBookmark = vi.fn(async () => ({ bookmarked: true }));

vi.mock('../src/lib/server/jobs', () => ({
	getJobBySlug,
	toggleJobInterest
}));

vi.mock('../src/lib/server/personalization', () => ({
	isBookmarked,
	toggleBookmark
}));

vi.mock('$env/dynamic/private', () => ({
	env: {
		MAPBOX_ACCESS_TOKEN: 'pk.test'
	}
}));

describe('job page actions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('loads bookmark and interest state for the signed-in viewer', async () => {
		const mod = await import('../src/routes/jobs/[slug]/+page.server');

		const result = await mod.load({
			params: { slug: 'programs-lead' },
			url: new URL('http://localhost/jobs/programs-lead'),
			locals: { user: { id: 'user-1' } }
		} as never);

		expect(getJobBySlug).toHaveBeenCalledWith('programs-lead', 'user-1');
		expect(result.item.slug).toBe('programs-lead');
		expect(result.isBookmarked).toBe(false);
	});

	it('toggles interest for signed-in users', async () => {
		const mod = await import('../src/routes/jobs/[slug]/+page.server');

		const result = await mod.actions.toggleInterest({
			locals: { user: { id: 'user-1' } },
			params: { slug: 'programs-lead' }
		} as never);

		expect(toggleJobInterest).toHaveBeenCalledWith('job-1', 'user-1');
		expect(result).toEqual({ success: true, interested: true });
	});
});
