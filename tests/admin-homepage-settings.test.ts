import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
	getHomepageDraftConfig,
	getHomepageLiveConfig,
	getHomepagePublishMeta,
	publishHomepageDraftConfig,
	resetHomepageDraftConfig,
	saveHomepageDraftConfig,
	fetchHomepageSectionPreview
} = vi.hoisted(() => ({
	getHomepageDraftConfig: vi.fn(),
	getHomepageLiveConfig: vi.fn(),
	getHomepagePublishMeta: vi.fn(),
	publishHomepageDraftConfig: vi.fn(),
	resetHomepageDraftConfig: vi.fn(),
	saveHomepageDraftConfig: vi.fn(),
	fetchHomepageSectionPreview: vi.fn()
}));

vi.mock('../src/lib/server/homepage', async () => {
	const actual = await vi.importActual<typeof import('../src/lib/server/homepage')>(
		'../src/lib/server/homepage'
	);

	return {
		...actual,
		getHomepageDraftConfig,
		getHomepageLiveConfig,
		getHomepagePublishMeta,
		publishHomepageDraftConfig,
		resetHomepageDraftConfig,
		saveHomepageDraftConfig,
		fetchHomepageSectionPreview
	};
});

import { actions } from '../src/routes/admin/settings/homepage/+page.server';

function makeRequest(formData: FormData): Request {
	return new Request('http://localhost/admin/settings/homepage', {
		method: 'POST',
		body: formData
	});
}

describe('homepage settings actions', () => {
	beforeEach(() => {
		getHomepageDraftConfig.mockReset();
		getHomepageLiveConfig.mockReset();
		getHomepagePublishMeta.mockReset();
		publishHomepageDraftConfig.mockReset();
		resetHomepageDraftConfig.mockReset();
		saveHomepageDraftConfig.mockReset();
		fetchHomepageSectionPreview.mockReset();
	});

	it('publishes the posted sections payload before copying draft to live', async () => {
		getHomepageDraftConfig.mockResolvedValue({
			featured: [],
			sections: [
				{
					id: 'existing',
					source: 'events',
					visible: true,
					limit: 3,
					sortBy: 'date',
					sortDir: 'asc',
					futureOnly: true,
					heading: 'Upcoming Events',
					layoutPreset: 'auto'
				}
			]
		});
		publishHomepageDraftConfig.mockResolvedValue({
			publishedAt: '2026-04-06T00:00:00.000Z',
			publishedById: 'admin-1'
		});

		const form = new FormData();
		form.set(
			'sectionsPayload',
			JSON.stringify([
				{
					id: 'container-1',
					source: 'container',
					visible: true,
					heading: '',
					columns: 2,
					children: [
						{
							id: 'child-1',
							source: 'events',
							visible: true,
							limit: 4,
							sortBy: 'date',
							sortDir: 'asc',
							futureOnly: true,
							heading: 'Upcoming Events',
							layoutPreset: 'cards'
						}
					]
				}
			])
		);

		const result = await actions.publishDraft({
			request: makeRequest(form),
			locals: { user: { id: 'admin-1' } }
		} as never);

		expect(result).toEqual(expect.objectContaining({ success: true }));
		expect(saveHomepageDraftConfig).toHaveBeenCalledOnce();
		expect(saveHomepageDraftConfig).toHaveBeenCalledWith(
			expect.objectContaining({
				sections: [
					expect.objectContaining({
						id: 'container-1',
						source: 'container',
						columns: 2,
						children: [
							expect.objectContaining({
								id: 'child-1',
								source: 'events',
								limit: 4,
								sortBy: 'date',
								sortDir: 'asc',
								futureOnly: true,
								layoutPreset: 'cards'
							})
						]
					})
				]
			})
		);
		expect(publishHomepageDraftConfig).toHaveBeenCalledWith('admin-1');
	});

	it('still publishes the saved draft when no sections payload is posted', async () => {
		publishHomepageDraftConfig.mockResolvedValue({
			publishedAt: '2026-04-06T00:00:00.000Z',
			publishedById: 'admin-2'
		});

		const result = await actions.publishDraft({
			request: makeRequest(new FormData()),
			locals: { user: { id: 'admin-2' } }
		} as never);

		expect(result).toEqual(expect.objectContaining({ success: true }));
		expect(saveHomepageDraftConfig).not.toHaveBeenCalled();
		expect(publishHomepageDraftConfig).toHaveBeenCalledWith('admin-2');
	});
});
