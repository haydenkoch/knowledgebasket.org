import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { compositeKey, contentFingerprint, runDedupeStrategies } from '../src/lib/server/ingestion/dedupe';
import { icalGenericAdapter } from '../src/lib/server/ingestion/adapters/ical-generic';
import { _createSourceDetailActions } from '../src/routes/admin/sources/[id]/+page.server';
import {
	canonicalRecords,
	events,
	importedCandidates,
	mergeHistory,
	sourceRecordLinks
} from '../src/lib/server/db/schema';

const fixturePath = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'fixtures',
	'smithsonian-sample.ics'
);
const icsFixture = readFileSync(fixturePath, 'utf8');

describe('ingestion dedupe helpers', () => {
	it('generates a stable fingerprint regardless of whitespace and casing', () => {
		const left = {
			coil: 'events',
			title: 'Knowledge Gathering',
			description: 'Community event',
			url: 'https://example.com/event',
			organization_name: null,
			organization_id: null,
			tags: ['Community', 'Education'],
			region: 'CA',
			image_url: null,
			start_date: '2026-05-10T18:00:00.000Z',
			end_date: null,
			start_time: null,
			end_time: null,
			timezone: null,
			location_name: 'Bishop',
			location_address: null,
			location_city: 'Bishop',
			location_state: 'CA',
			location_zip: null,
			is_virtual: false,
			virtual_url: null,
			is_recurring: false,
			recurrence_rule: null,
			event_type: null,
			registration_url: null,
			cost: null
		} as const;

		const right = {
			...left,
			title: '  knowledge   gathering  ',
			description: 'COMMUNITY EVENT',
			tags: ['education', 'community']
		} as const;

		expect(contentFingerprint(left)).toBe(contentFingerprint(right));
	});

	it('builds the expected event composite key', () => {
		const result = compositeKey({
			coil: 'events',
			title: 'Knowledge Gathering',
			description: null,
			url: 'https://example.com/event',
			organization_name: null,
			organization_id: null,
			tags: [],
			region: null,
			image_url: null,
			start_date: '2026-05-10T18:00:00.000Z',
			end_date: null,
			start_time: null,
			end_time: null,
			timezone: null,
			location_name: 'Bishop',
			location_address: null,
			location_city: 'Bishop',
			location_state: 'CA',
			location_zip: null,
			is_virtual: false,
			virtual_url: null,
			is_recurring: false,
			recurrence_rule: null,
			event_type: null,
			registration_url: null,
			cost: null
		});

		expect(result.raw).toContain('knowledge gathering');
		expect(result.raw).toContain('bishop');
		expect(result.hash).toHaveLength(32);
	});

	it('stops at the first matching dedupe strategy', async () => {
		const lookup = {
			byFingerprint: vi.fn(async () => null),
			byCompositeKey: vi.fn(async () => ({
				strategy: 'composite_key' as const,
				canonicalRecordId: 'canon-1',
				confidence: 0.92
			})),
			byUrl: vi.fn(async () => null),
			byExternalId: vi.fn(async () => null),
			byTitleSimilarity: vi.fn(async () => null)
		};

		const result = await runDedupeStrategies(
			['content_hash', 'composite_key', 'url_match'],
			{
				coil: 'events',
				title: 'Knowledge Gathering',
				description: null,
				url: 'https://example.com/event',
				organization_name: null,
				organization_id: null,
				tags: [],
				region: null,
				image_url: null,
				start_date: '2026-05-10T18:00:00.000Z',
				end_date: null,
				start_time: null,
				end_time: null,
				timezone: null,
				location_name: 'Bishop',
				location_address: null,
				location_city: 'Bishop',
				location_state: 'CA',
				location_zip: null,
				is_virtual: false,
				virtual_url: null,
				is_recurring: false,
				recurrence_rule: null,
				event_type: null,
				registration_url: null,
				cost: null
			},
			'source-1',
			lookup
		);

		expect(result.result).toBe('update');
		expect(lookup.byFingerprint).toHaveBeenCalledOnce();
		expect(lookup.byCompositeKey).toHaveBeenCalledOnce();
		expect(lookup.byUrl).not.toHaveBeenCalled();
	});
});

describe('ical generic adapter', () => {
	it('parses fixture ICS content and removes duplicate UID/start rows', async () => {
		const parsed = await icalGenericAdapter.parse(icsFixture, {});

		expect(parsed.success).toBe(true);
		expect(parsed.totalFound).toBe(2);
		expect(parsed.items[0]?.sourceItemId).toBe('event-1@example.com');
	});

	it('normalizes parsed items into KB event candidate shape', async () => {
		const parsed = await icalGenericAdapter.parse(icsFixture, {});
		const normalized = await icalGenericAdapter.normalize(parsed.items, 'events', {});

		expect(normalized.success).toBe(true);
		expect(normalized.records).toHaveLength(2);
		expect(normalized.records[0]).toEqual(
			expect.objectContaining({
				coil: 'events',
				title: 'Smithsonian Knowledge Gathering',
				location_city: 'Washington',
				location_state: 'DC',
				url: 'https://example.com/events/knowledge-gathering'
			})
		);
		expect(normalized.records[1]).toEqual(
			expect.objectContaining({
				is_virtual: true,
				virtual_url: 'https://example.com/events/virtual-session'
			})
		);
	});
});

describe('source detail actions', () => {
	it('returns preview data from testSource without touching import execution', async () => {
		const preview = {
			sourceId: 'source-1',
			adapterType: 'ical_generic',
			fetchResult: {
				success: true,
				status: 'success',
				httpStatusCode: 200,
				responseTimeMs: 12,
				rawContent: 'ics',
				contentHash: 'hash',
				contentSizeBytes: 100,
				errorMessage: null,
				errorCategory: null,
				headers: {}
			},
			parseResult: null,
			normalizeResult: null,
			candidates: [],
			dedupeCounts: { new: 0, duplicate: 0, update: 0, ambiguous: 0 },
			durationMs: 12
		} as const;

		const previewSource = vi.fn(async () => preview);
		const ingestSource = vi.fn();
		const actions = _createSourceDetailActions({
			updateSource: vi.fn() as never,
			previewSource,
			ingestSource: ingestSource as never
		});

		const result = await actions.testSource!({
			params: { id: 'source-1' }
		} as never);

		expect(previewSource).toHaveBeenCalledWith('source-1');
		expect(ingestSource).not.toHaveBeenCalled();
		expect(result).toEqual(
			expect.objectContaining({
				success: true,
				previewMode: 'test',
				preview
			})
		);
	});

	it('returns persisted import data from runImport', async () => {
		const importResult = {
			sourceId: 'source-1',
			adapterType: 'ical_generic',
			success: true,
			batchId: 'batch-1',
			fetchLogId: 'fetch-1',
			fetchResult: {
				success: true,
				status: 'success',
				httpStatusCode: 200,
				responseTimeMs: 12,
				rawContent: 'ics',
				contentHash: 'hash',
				contentSizeBytes: 100,
				errorMessage: null,
				errorCategory: null,
				headers: {}
			},
			parseResult: null,
			normalizeResult: null,
			candidates: [],
			dedupeCounts: { new: 0, duplicate: 0, update: 0, ambiguous: 0 },
			durationMs: 20,
			candidatesCreated: 1,
			duplicatesSkipped: 0,
			updatesQueued: 0,
			errors: []
		} as const;

		const actions = _createSourceDetailActions({
			updateSource: vi.fn() as never,
			previewSource: vi.fn() as never,
			ingestSource: vi.fn(async () => importResult) as never
		});

		const result = await actions.runImport!({
			params: { id: 'source-1' }
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				success: true,
				previewMode: 'import',
				importResult
			})
		);
	});
});

describe('approveCandidate publishing', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('creates a live event row and canonical/source links for a new candidate', async () => {
		const createEvent = vi.fn(async () => ({ id: 'evt-1' }));
		const updateEvent = vi.fn();
		const fakeDb = createFakeDb({
			candidates: [
				{
					id: 'cand-1',
					sourceId: 'source-1',
					batchId: 'batch-1',
					coil: 'events',
					status: 'pending_review',
					priority: 'normal',
					rawData: {},
					normalizedData: {
						coil: 'events',
						title: 'Knowledge Gathering',
						description: 'A community event',
						url: 'https://example.com/events/knowledge-gathering',
						organization_name: 'Smithsonian',
						organization_id: null,
						tags: ['Community'],
						region: 'DC',
						image_url: null,
						start_date: '2026-05-10T18:00:00.000Z',
						end_date: '2026-05-10T20:00:00.000Z',
						start_time: null,
						end_time: null,
						timezone: 'UTC',
						location_name: 'Washington, DC',
						location_address: 'Washington, DC',
						location_city: 'Washington',
						location_state: 'DC',
						location_zip: null,
						is_virtual: false,
						virtual_url: null,
						is_recurring: false,
						recurrence_rule: null,
						event_type: 'Community',
						registration_url: 'https://example.com/events/knowledge-gathering',
						cost: null
					},
					sourceItemId: 'event-1@example.com',
					sourceItemUrl: 'https://example.com/events/knowledge-gathering',
					dedupeResult: 'new',
					dedupeStrategyUsed: null,
					matchedCanonicalId: null,
					contentFingerprint: 'fingerprint-1',
					sourceAttribution: 'Source: Smithsonian',
					reviewedAt: null,
					reviewedBy: null,
					reviewNotes: null,
					rejectionReason: null,
					importedAt: new Date(),
					updatedAt: new Date(),
					expiresAt: null
				}
			]
		});

		vi.doMock('$lib/server/db', () => ({ db: fakeDb }));
		vi.doMock('$lib/server/events', () => ({ createEvent, updateEvent }));
		vi.doMock('$lib/server/funding', () => ({ createFunding: vi.fn(), updateFunding: vi.fn() }));
		vi.doMock('$lib/server/jobs', () => ({ createJob: vi.fn(), updateJob: vi.fn() }));
		vi.doMock('$lib/server/red-pages', () => ({ createBusiness: vi.fn(), updateBusiness: vi.fn() }));
		vi.doMock('$lib/server/toolbox', () => ({ createResource: vi.fn(), updateResource: vi.fn() }));

		const { approveCandidate } = await import('../src/lib/server/import-candidates');
		const result = await approveCandidate('cand-1', 'reviewer-1');

		expect(createEvent).toHaveBeenCalledOnce();
		expect(updateEvent).not.toHaveBeenCalled();
		expect(result?.status).toBe('approved');
		expect(fakeDb.state.canonicalRecords[0]?.publishedRecordId).toBe('evt-1');
		expect(fakeDb.state.sourceRecordLinks).toHaveLength(1);
		expect(fakeDb.state.mergeHistory).toHaveLength(1);
	});

	it('updates an existing live event row when the candidate matches a canonical record', async () => {
		const createEvent = vi.fn();
		const updateEvent = vi.fn(async () => ({ id: 'evt-1' }));
		const fakeDb = createFakeDb({
			candidates: [
				{
					id: 'cand-2',
					sourceId: 'source-1',
					batchId: 'batch-1',
					coil: 'events',
					status: 'pending_review',
					priority: 'normal',
					rawData: {},
					normalizedData: {
						coil: 'events',
						title: 'Knowledge Gathering Updated',
						description: 'An updated event',
						url: 'https://example.com/events/knowledge-gathering',
						organization_name: 'Smithsonian',
						organization_id: null,
						tags: ['Community'],
						region: 'DC',
						image_url: null,
						start_date: '2026-05-10T18:00:00.000Z',
						end_date: '2026-05-10T20:00:00.000Z',
						start_time: null,
						end_time: null,
						timezone: 'UTC',
						location_name: 'Washington, DC',
						location_address: 'Washington, DC',
						location_city: 'Washington',
						location_state: 'DC',
						location_zip: null,
						is_virtual: false,
						virtual_url: null,
						is_recurring: false,
						recurrence_rule: null,
						event_type: 'Community',
						registration_url: 'https://example.com/events/knowledge-gathering',
						cost: null
					},
					sourceItemId: 'event-1@example.com',
					sourceItemUrl: 'https://example.com/events/knowledge-gathering',
					dedupeResult: 'update',
					dedupeStrategyUsed: 'external_id',
					matchedCanonicalId: 'canon-1',
					contentFingerprint: 'fingerprint-2',
					sourceAttribution: 'Source: Smithsonian',
					reviewedAt: null,
					reviewedBy: null,
					reviewNotes: null,
					rejectionReason: null,
					importedAt: new Date(),
					updatedAt: new Date(),
					expiresAt: null
				}
			],
			canonicalRecords: [
				{
					id: 'canon-1',
					coil: 'events',
					publishedRecordId: 'evt-1',
					canonicalTitle: 'Knowledge Gathering',
					compositeKey: 'old-key',
					contentFingerprint: 'fingerprint-1',
					canonicalUrl: 'https://example.com/events/knowledge-gathering',
					externalIds: {},
					sourceCount: 1,
					primarySourceId: 'source-1',
					createdAt: new Date(),
					updatedAt: new Date()
				}
			],
			sourceRecordLinks: [
				{
					id: 'link-1',
					sourceId: 'source-1',
					canonicalRecordId: 'canon-1',
					sourceItemId: 'event-1@example.com',
					sourceItemUrl: 'https://example.com/events/knowledge-gathering',
					sourceAttribution: 'Source: Smithsonian',
					lastSeenAt: new Date(),
					lastSyncAt: new Date(),
					isPrimary: true,
					createdAt: new Date(),
					updatedAt: new Date()
				}
			],
			events: [
				{
					id: 'evt-1',
					slug: 'knowledge-gathering',
					title: 'Knowledge Gathering'
				}
			]
		});

		vi.doMock('$lib/server/db', () => ({ db: fakeDb }));
		vi.doMock('$lib/server/events', () => ({ createEvent, updateEvent }));
		vi.doMock('$lib/server/funding', () => ({ createFunding: vi.fn(), updateFunding: vi.fn() }));
		vi.doMock('$lib/server/jobs', () => ({ createJob: vi.fn(), updateJob: vi.fn() }));
		vi.doMock('$lib/server/red-pages', () => ({ createBusiness: vi.fn(), updateBusiness: vi.fn() }));
		vi.doMock('$lib/server/toolbox', () => ({ createResource: vi.fn(), updateResource: vi.fn() }));

		const { approveCandidate } = await import('../src/lib/server/import-candidates');
		const result = await approveCandidate('cand-2', 'reviewer-1');

		expect(updateEvent).toHaveBeenCalledWith(
			'evt-1',
			expect.objectContaining({ title: 'Knowledge Gathering Updated', status: 'published' }),
			expect.any(Object)
		);
		expect(createEvent).not.toHaveBeenCalled();
		expect(result?.matchedCanonicalId).toBe('canon-1');
		expect(fakeDb.state.canonicalRecords[0]?.publishedRecordId).toBe('evt-1');
	});
});

function createFakeDb(initial: {
	candidates?: Array<Record<string, unknown>>;
	canonicalRecords?: Array<Record<string, unknown>>;
	sourceRecordLinks?: Array<Record<string, unknown>>;
	mergeHistory?: Array<Record<string, unknown>>;
	events?: Array<Record<string, unknown>>;
}) {
	const tableName = (table: unknown) =>
		(table as { [key: symbol]: string | undefined })?.[Symbol.for('drizzle:Name')] ?? '';

	const state = {
		candidates: [...(initial.candidates ?? [])],
		canonicalRecords: [...(initial.canonicalRecords ?? [])],
		sourceRecordLinks: [...(initial.sourceRecordLinks ?? [])],
		mergeHistory: [...(initial.mergeHistory ?? [])],
		events: [...(initial.events ?? [])]
	};

	const tx = {
		select: () => ({
			from(table: unknown) {
				const rows = tableName(table) === tableName(importedCandidates)
					? state.candidates
					: tableName(table) === tableName(canonicalRecords)
						? state.canonicalRecords
						: tableName(table) === tableName(sourceRecordLinks)
							? state.sourceRecordLinks
							: tableName(table) === tableName(events)
								? state.events
								: [];
				return {
					where: () => ({
						limit: async (count: number) => rows.slice(0, count)
					})
				};
			}
		}),
		insert(table: unknown) {
			return {
				values(values: Record<string, unknown>) {
					if (tableName(table) === tableName(canonicalRecords)) {
						const row = { id: `canon-${state.canonicalRecords.length + 1}`, ...values };
						state.canonicalRecords.push(row);
						return {
							returning: async () => [row]
						};
					}
					if (tableName(table) === tableName(sourceRecordLinks)) {
						return {
							onConflictDoUpdate() {
								const existing = state.sourceRecordLinks[0];
								if (existing) {
									Object.assign(existing, values);
								} else {
									state.sourceRecordLinks.push({
										id: `link-${state.sourceRecordLinks.length + 1}`,
										...values
									});
								}
								return [];
							}
						};
					}
					if (tableName(table) === tableName(mergeHistory)) {
						state.mergeHistory.push({ id: `merge-${state.mergeHistory.length + 1}`, ...values });
						return [];
					}
					return {
						returning: async () => []
					};
				}
			};
		},
		update(table: unknown) {
			return {
				set(values: Record<string, unknown>) {
					return {
						where() {
							const rows =
								tableName(table) === tableName(canonicalRecords)
									? state.canonicalRecords
									: state.candidates;
							const target = rows[0];
							if (target) Object.assign(target, values);
							return {
								returning: async () => (target ? [target] : [])
							};
						}
					};
				}
			};
		},
		delete: vi.fn()
	};

	return {
		state,
		transaction: async (callback: (executor: typeof tx) => Promise<unknown>) => callback(tx),
		select: tx.select,
		insert: tx.insert,
		update: tx.update,
		delete: tx.delete
	};
}
