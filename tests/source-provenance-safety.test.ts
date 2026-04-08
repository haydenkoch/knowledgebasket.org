import { describe, expect, it } from 'vitest';
import { getSourceProvenanceByPublishedRecord } from '../src/lib/server/source-provenance';

describe('source provenance safety', () => {
	it('drops unsafe public URLs and falls back to a safe source URL', async () => {
		const canonical = {
			id: 'canon-1',
			coil: 'events',
			publishedRecordId: 'evt-1',
			primarySourceId: 'source-1',
			sourceCount: 1
		};

		const joinedLinks = [
			{
				link: {
					sourceItemUrl: 'javascript:alert(1)',
					sourceAttribution: null,
					lastSyncAt: new Date('2026-03-15T00:00:00.000Z'),
					lastSeenAt: new Date('2026-03-14T00:00:00.000Z'),
					isPrimary: true
				},
				source: {
					id: 'source-1',
					name: 'Primary Source',
					slug: 'primary-source',
					homepageUrl: 'data:text/html,bad',
					sourceUrl: 'https://example.com/source',
					attributionText: 'Primary attribution'
				}
			}
		];

		const database = {
			select(selection?: unknown) {
				if (selection) {
					return {
						from() {
							return {
								where() {
									return {
										limit: async () => [canonical]
									};
								},
								innerJoin() {
									return {
										where: async () => joinedLinks
									};
								}
							};
						}
					};
				}

				return {
					from() {
						return {
							where() {
								return {
									limit: async () => [canonical]
								};
							}
						};
					}
				};
			}
		};

		const provenance = await getSourceProvenanceByPublishedRecord(
			'events',
			'evt-1',
			database as never
		);

		expect(provenance).toEqual({
			sourceName: 'Primary Source',
			sourceSlug: 'primary-source',
			sourceUrl: 'https://example.com/source',
			sourceItemUrl: undefined,
			attributionText: 'Primary attribution',
			lastSyncedAt: '2026-03-15T00:00:00.000Z',
			sourceCount: 1
		});
	});
});
