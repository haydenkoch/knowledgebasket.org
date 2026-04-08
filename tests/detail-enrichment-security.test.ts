import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enrichNormalizedRecords } from '../src/lib/server/ingestion/detail-enrichment';

describe('detail enrichment security', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('skips local detail URLs instead of fetching them', async () => {
		const baseRecord = {
			coil: 'events',
			title: 'Community Gathering',
			url: 'https://example.com/events/community-gathering'
		};

		const result = await enrichNormalizedRecords(
			{
				detailEnrichment: {
					enabled: true,
					fetchFrom: 'sourceItemUrl'
				}
			} as never,
			[
				{
					sourceItemUrl: 'http://127.0.0.1/private'
				}
			] as never,
			[baseRecord] as never
		);

		expect(fetch).not.toHaveBeenCalled();
		expect(result.records[0]).toEqual(baseRecord);
		expect(result.warnings).toEqual([]);
	});
});
