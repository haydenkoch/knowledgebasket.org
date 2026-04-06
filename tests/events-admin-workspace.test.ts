import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getEventsForAdmin, getEventStatusCounts } = vi.hoisted(() => ({
	getEventsForAdmin: vi.fn(),
	getEventStatusCounts: vi.fn()
}));

const { getAllListsWithCounts, createList } = vi.hoisted(() => ({
	getAllListsWithCounts: vi.fn(),
	createList: vi.fn()
}));

vi.mock('../src/lib/server/events', () => ({
	getEventsForAdmin,
	getEventStatusCounts,
	bulkApproveEvents: vi.fn(),
	bulkRejectEvents: vi.fn(),
	bulkDeleteEvents: vi.fn()
}));

vi.mock('../src/lib/server/event-lists', () => ({
	getAllListsWithCounts,
	createList
}));

function makeRequest(formData: FormData): Request {
	return new Request('http://localhost/admin/events?tab=lists', {
		method: 'POST',
		body: formData
	});
}

describe('admin events workspace', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getEventsForAdmin.mockResolvedValue({ events: [], total: 0 });
		getEventStatusCounts.mockResolvedValue({ pending: 2, published: 5 });
		getAllListsWithCounts.mockResolvedValue([]);
		createList.mockResolvedValue({ id: 'list-1' });
	});

	it('loads the lists tab alongside event queue metadata', async () => {
		getAllListsWithCounts.mockResolvedValue([
			{
				id: 'list-1',
				title: 'Featured',
				slug: 'featured',
				sortOrder: 0,
				itemCount: 3,
				createdAt: new Date('2026-04-01T00:00:00.000Z'),
				updatedAt: new Date('2026-04-05T00:00:00.000Z')
			}
		]);

		const mod = await import('../src/routes/admin/events/+page.server');
		const result = (await mod.load({
			url: new URL('https://example.com/admin/events?tab=lists')
		} as never))!;

		expect(result.currentTab).toBe('lists');
		expect(result.lists).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					title: 'Featured',
					itemCount: 3
				})
			])
		);
	});

	it('creates curated lists with a generated slug from the shared workspace action', async () => {
		const mod = await import('../src/routes/admin/events/+page.server');
		const form = new FormData();
		form.set('title', 'Spring Highlights');

		const result = await mod.actions.createList({
			request: makeRequest(form)
		} as never);

		expect(result).toEqual({ success: true });
		expect(createList).toHaveBeenCalledWith({
			title: 'Spring Highlights',
			slug: 'spring-highlights'
		});
	});
});
