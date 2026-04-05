import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
	compositeKey,
	contentFingerprint,
	runDedupeStrategies
} from '../src/lib/server/ingestion/dedupe';
import { applyAiEnrichment } from '../src/lib/server/ingestion/ai-enrichment';
import { icalGenericAdapter } from '../src/lib/server/ingestion/adapters/ical-generic';
import { enrichNormalizedRecords } from '../src/lib/server/ingestion/detail-enrichment';
import { validateSourceConfig } from '../src/lib/server/ingestion/validation';
import { planCandidateMerge } from '../src/lib/server/import-candidate-merge';
import { getSourceProvenanceByPublishedRecord } from '../src/lib/server/source-provenance';
import type { IngestionPreviewResult, IngestionResult } from '../src/lib/server/ingestion/types';
import { _createSourceDetailActions } from '../src/routes/admin/sources/[id]/+page.server';
import {
	canonicalRecords,
	events,
	importedCandidates,
	mergeHistory,
	recordImages,
	sourceRecordLinks
} from '../src/lib/server/db/schema';

const fixturePath = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'fixtures',
	'smithsonian-sample.ics'
);
const seedSourcesPath = path.resolve(
	process.cwd(),
	'..',
	'..',
	'kb-data',
	'source-ops',
	'data',
	'seed-sources.json'
);
const icsFixture = readFileSync(fixturePath, 'utf8');

describe('ingestion dedupe helpers', () => {
	it('generates a stable fingerprint regardless of whitespace and casing', () => {
		const left = {
			coil: 'events' as const,
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
		};

		const right = {
			...left,
			title: '  knowledge   gathering  ',
			description: 'COMMUNITY EVENT',
			tags: ['education', 'community']
		};

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

	it('promotes ATTACH images without collapsing the event URL into registration', async () => {
		const parsed = await icalGenericAdapter.parse(
			[
				'BEGIN:VCALENDAR',
				'VERSION:2.0',
				'BEGIN:VEVENT',
				'UID:event-attach@example.com',
				'SUMMARY:Native California Big Time',
				'URL:https://newsfromnativecalifornia.com/event/native-california-big-time/',
				'ATTACH:https://newsfromnativecalifornia.com/wp-content/uploads/2026/04/big-time.jpg',
				'DTSTART:20260510T180000Z',
				'END:VEVENT',
				'END:VCALENDAR'
			].join('\n'),
			{}
		);
		const normalized = await icalGenericAdapter.normalize(parsed.items, 'events', {});

		expect(normalized.records[0]).toEqual(
			expect.objectContaining({
				url: 'https://newsfromnativecalifornia.com/event/native-california-big-time',
				image_url: 'https://newsfromnativecalifornia.com/wp-content/uploads/2026/04/big-time.jpg',
				registration_url: null
			})
		);
	});
});

describe('detail enrichment', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('enriches normalized event records from their HTML detail page', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({
				ok: true,
				status: 200,
				text: async () => `
					<html>
						<head>
							<meta property="og:image" content="https://example.com/event.jpg" />
						</head>
						<body>
							<div class="tribe-events-content">Full event description from the page.</div>
							<div class="tribe-organizer">News from Native California</div>
							<div class="tribe-venue">Bay Area Cultural Center</div>
							<div class="tribe-address">123 Story Ave, Oakland, CA</div>
							<a class="tribe-events-event-url" href="https://example.com/register">Register</a>
						</body>
					</html>
				`
			}))
		);

		const result = await enrichNormalizedRecords(
			{
				detailEnrichment: {
					enabled: true,
					fetchFrom: 'sourceItemUrl',
					selectors: {
						description: { selector: '.tribe-events-content', extract: 'html' },
						organization_name: { selector: '.tribe-organizer', extract: 'text' },
						location_name: { selector: '.tribe-venue', extract: 'text' },
						location_address: { selector: '.tribe-address', extract: 'text' },
						registration_url: { selector: '.tribe-events-event-url', extract: 'href' }
					},
					preferPageFields: ['description', 'image_url', 'organization_name', 'location_name']
				}
			},
			[
				{
					fields: {},
					sourceItemId: 'evt-1',
					sourceItemUrl: 'https://example.com/event'
				}
			],
			[
				{
					coil: 'events',
					title: 'Event',
					description: 'Short summary',
					url: 'https://example.com/event',
					organization_name: null,
					organization_id: null,
					tags: [],
					region: null,
					image_url: null,
					start_date: '2026-05-10T18:00:00.000Z',
					end_date: null,
					start_time: '2026-05-10T18:00:00.000Z',
					end_time: null,
					timezone: null,
					location_name: null,
					location_address: null,
					location_city: null,
					location_state: null,
					location_zip: null,
					is_virtual: false,
					virtual_url: null,
					is_recurring: false,
					recurrence_rule: null,
					event_type: null,
					registration_url: null,
					cost: null
				}
			]
		);

		expect(result.warnings).toHaveLength(0);
		expect(result.records[0]).toEqual(
			expect.objectContaining({
				description: 'Full event description from the page.',
				image_url: 'https://example.com/event.jpg',
				organization_name: 'News from Native California',
				location_name: 'Bay Area Cultural Center',
				location_address: '123 Story Ave, Oakland, CA',
				registration_url: 'https://example.com/register'
			})
		);
	});

	it('keeps the base record when HTML enrichment fails', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({ ok: false, status: 500 }))
		);

		const baseRecord = {
			coil: 'events' as const,
			title: 'Event',
			description: 'Base description',
			url: 'https://example.com/event',
			organization_name: null,
			organization_id: null,
			tags: [],
			region: null,
			image_url: null,
			start_date: '2026-05-10T18:00:00.000Z',
			end_date: null,
			start_time: '2026-05-10T18:00:00.000Z',
			end_time: null,
			timezone: null,
			location_name: null,
			location_address: null,
			location_city: null,
			location_state: null,
			location_zip: null,
			is_virtual: false,
			virtual_url: null,
			is_recurring: false,
			recurrence_rule: null,
			event_type: null,
			registration_url: null,
			cost: null
		};

		const result = await enrichNormalizedRecords(
			{
				detailEnrichment: {
					enabled: true,
					fetchFrom: 'sourceItemUrl'
				}
			},
			[
				{
					fields: {},
					sourceItemId: 'evt-1',
					sourceItemUrl: 'https://example.com/event'
				}
			],
			[baseRecord]
		);

		expect(result.records[0]).toEqual(baseRecord);
		expect(result.warnings[0]).toContain('HTTP 500');
	});

	it('captures lazy images, structured URLs, and separate application links from the detail page', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({
				ok: true,
				status: 200,
				text: async () => `
					<html>
						<head>
							<script type="application/ld+json">
								{
									"@context": "https://schema.org",
									"@type": "Event",
									"url": "https://bigtime.example.org/festival",
									"image": "https://newsfromnativecalifornia.com/wp-content/uploads/2026/04/structured-big-time.jpg",
									"organizer": {
										"@type": "Organization",
										"name": "News from Native California",
										"url": "https://newsfromnativecalifornia.com"
									},
									"location": {
										"@type": "Place",
										"name": "UC Davis Quad",
										"sameAs": "https://campus.example.org/quad"
									}
								}
							</script>
						</head>
						<body>
							<img class="hero" src="data:image/gif;base64,AAAA" data-src="https://newsfromnativecalifornia.com/wp-content/uploads/2026/04/lazy-big-time.jpg" />
							<a class="tribe-events-event-url" href="https://bigtime.example.org/festival">Website</a>
							<a href="https://vendors.example.org/apply">Vendor application</a>
						</body>
					</html>
				`
			}))
		);

		const result = await enrichNormalizedRecords(
			{
				detailEnrichment: {
					enabled: true,
					fetchFrom: 'sourceItemUrl',
					linkSelectors: [
						{
							role: 'canonical_item',
							selector: '.tribe-events-event-url',
							extract: 'href'
						},
						{
							role: 'application',
							selector: 'a[href*="vendors.example.org"]',
							extract: 'href'
						}
					],
					preferPageFields: ['image_url', 'organization_name', 'location_name']
				}
			},
			[
				{
					fields: {},
					sourceItemId: 'evt-2',
					sourceItemUrl: 'https://newsfromnativecalifornia.com/event/uc-davis-big-time/'
				}
			],
			[
				{
					coil: 'events',
					title: 'UC Davis Big Time',
					description: null,
					url: 'https://newsfromnativecalifornia.com/event/uc-davis-big-time/',
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
					location_name: null,
					location_address: null,
					location_city: null,
					location_state: null,
					location_zip: null,
					is_virtual: false,
					virtual_url: null,
					is_recurring: false,
					recurrence_rule: null,
					event_type: null,
					registration_url: null,
					cost: null
				}
			]
		);

		expect(result.records[0]).toEqual(
			expect.objectContaining({
				image_url:
					'https://newsfromnativecalifornia.com/wp-content/uploads/2026/04/lazy-big-time.jpg'
			})
		);
		expect(result.urlRoles[0]?.detail_page?.[0]?.url).toBe(
			'https://newsfromnativecalifornia.com/event/uc-davis-big-time'
		);
		expect(result.urlRoles[0]?.canonical_item?.[0]?.url).toBe(
			'https://bigtime.example.org/festival'
		);
		expect(result.urlRoles[0]?.application?.[0]?.url).toBe('https://vendors.example.org/apply');
		expect(result.urlRoles[0]?.organizer?.[0]?.url).toBe('https://newsfromnativecalifornia.com');
		expect(result.urlRoles[0]?.venue?.[0]?.url).toBe('https://campus.example.org/quad');
		expect(result.imageCandidates[0]?.[0]?.url).toBe(
			'https://newsfromnativecalifornia.com/wp-content/uploads/2026/04/lazy-big-time.jpg'
		);
	});

	it('prefers the event image over logos and submit-event promo graphics', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({
				ok: true,
				status: 200,
				text: async () => `
					<html>
						<body>
							<header class="header">
								<a class="logolink" href="https://newsfromnativecalifornia.com/">
									<img
										class="logoimg"
										src="https://newsfromnativecalifornia.com/wp-content/uploads/2020/07/NNC_Logo_white_80.png"
										alt="News from Native California"
									/>
								</a>
							</header>
							<div class="tribe-events-content">
								<p>
									<img
										class="alignnone size-medium lazyload"
										src="data:image/gif;base64,AAAA"
										data-src="https://newsfromnativecalifornia.com/wp-content/uploads/2026/03/real-event-image-226x300.png"
										alt=""
										width="226"
										height="300"
									/>
								</p>
							</div>
							<div class="tribe-events-after-html">
								<img
									src="/wp-content/uploads/2014/02/Submit-an-Event-e1392262100459.jpeg"
									alt="Submit an Event"
									width="224"
									height="300"
								/>
							</div>
							<footer class="footer">
								<img
									class="logoimg"
									src="https://newsfromnativecalifornia.com/wp-content/uploads/2020/07/News_from_Native_California_logo-1.png"
									alt="News from Native California"
								/>
							</footer>
						</body>
					</html>
				`
			}))
		);

		const result = await enrichNormalizedRecords(
			{
				detailEnrichment: {
					enabled: true,
					fetchFrom: 'sourceItemUrl',
					selectors: {
						image_url: {
							selector:
								'.tribe-events-event-image img, .tribe-events-featured-image img, img.wp-post-image',
							extract: 'src'
						}
					},
					preferPageFields: ['image_url']
				}
			},
			[
				{
					fields: {},
					sourceItemId: 'evt-logos-1',
					sourceItemUrl:
						'https://newsfromnativecalifornia.com/event/uc-san-diego-14th-annual-powwow/'
				}
			],
			[
				{
					coil: 'events',
					title: 'UC San Diego 14th Annual Powwow',
					description: null,
					url: 'https://newsfromnativecalifornia.com/event/uc-san-diego-14th-annual-powwow/',
					organization_name: null,
					organization_id: null,
					tags: [],
					region: null,
					image_url: null,
					start_date: '2026-05-17T07:00:00.000Z',
					end_date: null,
					start_time: '2026-05-17T07:00:00.000Z',
					end_time: null,
					timezone: null,
					location_name: null,
					location_address: null,
					location_city: null,
					location_state: null,
					location_zip: null,
					is_virtual: false,
					virtual_url: null,
					is_recurring: false,
					recurrence_rule: null,
					event_type: null,
					registration_url: null,
					cost: null
				}
			]
		);

		expect(result.records[0]?.image_url).toBe(
			'https://newsfromnativecalifornia.com/wp-content/uploads/2026/03/real-event-image-226x300.png'
		);
		expect(
			result.imageCandidates[0]?.some((candidate) => candidate.url.includes('NNC_Logo_white_80'))
		).toBe(true);
		expect(
			result.imageCandidates[0]?.some((candidate) => candidate.url.includes('Submit-an-Event'))
		).toBe(true);
	});

	it('parses Native California detail-page text for cost, corrected date, and venue parts', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({
				ok: true,
				status: 200,
				text: async () => `
					<html>
						<body>
							<div class="tribe-events-content">
								Make your own elderberry clapper stick.
								Date: 2026-05-16
								Location: Maidu Activity Center - 1960 Johnson Ranch Drive, Roseville, CA 95661
								Cost: $55.00
							</div>
							<div class="tribe-organizer">Maidu Museum & Historic Site</div>
							<div class="tribe-venue">Maidu Activity Center</div>
							<div class="tribe-address">1960 Johnson Ranch Drive, Roseville, CA 95661</div>
						</body>
					</html>
				`
			}))
		);

		const result = await enrichNormalizedRecords(
			{
				detailEnrichment: {
					enabled: true,
					fetchFrom: 'sourceItemUrl',
					selectors: {
						description: { selector: '.tribe-events-content', extract: 'html' },
						organization_name: { selector: '.tribe-organizer', extract: 'text' },
						location_name: { selector: '.tribe-venue', extract: 'text' },
						location_address: { selector: '.tribe-address', extract: 'text' }
					},
					preferPageFields: [
						'description',
						'organization_name',
						'location_name',
						'location_address',
						'location_city',
						'location_state',
						'location_zip',
						'start_date',
						'cost'
					]
				}
			},
			[
				{
					fields: {},
					sourceItemId: 'evt-3',
					sourceItemUrl:
						'https://newsfromnativecalifornia.com/event/elderberry-clapper-stick-workshop'
				}
			],
			[
				{
					coil: 'events',
					title: 'Elderberry Clapper Stick Workshop',
					description: null,
					url: 'https://newsfromnativecalifornia.com/event/elderberry-clapper-stick-workshop',
					organization_name: null,
					organization_id: null,
					tags: [],
					region: null,
					image_url: null,
					start_date: '2001-05-16T07:00:00.000Z',
					end_date: null,
					start_time: '2001-05-16T07:00:00.000Z',
					end_time: null,
					timezone: null,
					location_name: '1960 Johnson Ranch Drive, Roseville, CA, United States',
					location_address: '1960 Johnson Ranch Drive, Roseville, CA, United States',
					location_city: null,
					location_state: null,
					location_zip: null,
					is_virtual: false,
					virtual_url: null,
					is_recurring: false,
					recurrence_rule: null,
					event_type: null,
					registration_url: null,
					cost: null
				}
			]
		);

		expect(result.records[0]).toEqual(
			expect.objectContaining({
				organization_name: 'Maidu Museum & Historic Site',
				location_name: 'Maidu Activity Center',
				location_address: '1960 Johnson Ranch Drive, Roseville, CA 95661',
				location_city: 'Roseville',
				location_state: 'CA',
				location_zip: '95661',
				start_date: '2026-05-16T07:00:00.000Z',
				cost: '$55.00'
			})
		);
	});
});

describe('ai enrichment', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		process.env.OPENAI_API_KEY = 'test-key';
	});

	it('extracts flexible facts, fills safe gaps, and preserves conflicts for review', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({
				ok: true,
				status: 200,
				json: async () => ({
					model: 'gpt-5-mini',
					output_text: JSON.stringify({
						offers: [
							{
								label: 'Workshop fee',
								amount: 55,
								currency: 'USD',
								priceText: '$55.00',
								notes: null,
								confidence: 0.91
							}
						],
						people: [
							{
								name: 'Michael Ramirez',
								role: 'Instructor',
								affiliation: 'Konkow Maidu',
								confidence: 0.84
							}
						],
						locationParts: {
							name: 'Maidu Activity Center',
							street: '1960 Johnson Ranch Drive',
							city: 'Roseville',
							state: 'CA',
							postalCode: '95661',
							country: 'US',
							confidence: 0.89
						},
						fieldSuggestions: [
							{
								field: 'organization_name',
								value: 'Maidu Museum & Historic Site',
								confidence: 0.62,
								reason: 'Organizer named in page copy'
							}
						],
						conflicts: [
							{
								field: 'start_date',
								existingValue: '2001-05-16T07:00:00.000Z',
								proposedValue: '2026-05-16',
								reason: 'Description text contains a later event date',
								confidence: 0.93
							}
						],
						notes: ['Description includes both venue name and full mailing address']
					})
				})
			}))
		);

		const source = {
			id: 'source-1',
			name: 'News from Native California',
			slug: 'news-from-native-california',
			sourceUrl: 'https://newsfromnativecalifornia.com',
			adapterConfig: {
				aiEnrichment: {
					enabled: true,
					maxRecordsPerRun: 1,
					minDescriptionLength: 20
				}
			}
		} as never;

		const result = await applyAiEnrichment(
			source,
			[
				{
					fields: {
						description:
							'Make your own elderberry clapper stick... Date: 2026-05-16 Location: Maidu Activity Center - 1960 Johnson Ranch Drive, Roseville, CA 95661 Cost: $55.00'
					},
					sourceItemId: 'evt-1',
					sourceItemUrl:
						'https://newsfromnativecalifornia.com/event/elderberry-clapper-stick-workshop'
				}
			],
			[
				{
					coil: 'events',
					title: 'Elderberry Clapper Stick Workshop',
					description:
						'Make your own elderberry clapper stick, a musical instrument used throughout history by California Indigenous peoples. Learn about its cultural significance while shaping, decorating, and assembling your instrument.',
					url: 'https://newsfromnativecalifornia.com/event/elderberry-clapper-stick-workshop',
					organization_name: null,
					organization_id: null,
					tags: [],
					region: null,
					image_url: null,
					start_date: '2001-05-16T07:00:00.000Z',
					end_date: null,
					start_time: '2001-05-16T07:00:00.000Z',
					end_time: null,
					timezone: null,
					location_name: '1960 Johnson Ranch Drive, Roseville, CA, United States',
					location_address: '1960 Johnson Ranch Drive, Roseville, CA, United States',
					location_city: null,
					location_state: null,
					location_zip: null,
					is_virtual: false,
					virtual_url: null,
					is_recurring: false,
					recurrence_rule: null,
					event_type: null,
					registration_url:
						'https://newsfromnativecalifornia.com/event/elderberry-clapper-stick-workshop',
					cost: null
				}
			],
			[{}],
			[
				{
					detail_page: [
						{
							url: 'https://newsfromnativecalifornia.com/event/elderberry-clapper-stick-workshop',
							role: 'detail_page',
							source: 'detail_page',
							confidence: 1
						}
					]
				}
			],
			[{}]
		);

		expect(result.records[0]).toEqual(
			expect.objectContaining({
				cost: '$55.00',
				location_name: 'Maidu Activity Center',
				location_city: 'Roseville',
				location_state: 'CA',
				location_zip: '95661'
			})
		);
		expect(result.extractedFacts[0]).toEqual(
			expect.objectContaining({
				offers: expect.arrayContaining([expect.objectContaining({ amount: 55, currency: 'USD' })]),
				conflicts: expect.arrayContaining([
					expect.objectContaining({ field: 'start_date', proposedValue: '2026-05-16' })
				])
			})
		);
		expect(result.fieldProvenance[0]?.cost?.[0]?.source).toBe('ai');
		expect(result.stats.completed).toBe(1);
	});
});

describe('source detail actions', () => {
	it('returns preview data from testSource without touching import execution', async () => {
		const preview: IngestionPreviewResult = {
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
			durationMs: 12,
			stages: []
		};

		const previewSource = vi.fn(async () => preview);
		const ingestSource = vi.fn();
		const actions = _createSourceDetailActions({
			updateSource: vi.fn() as never,
			previewSource,
			ingestSource: ingestSource as never,
			runSourceNow: vi.fn() as never
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
		const importResult: IngestionResult = {
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
			stages: [],
			candidatesCreated: 1,
			duplicatesSkipped: 0,
			updatesQueued: 0,
			errors: [],
			autoApprovedCount: 0
		};

		const actions = _createSourceDetailActions({
			updateSource: vi.fn() as never,
			previewSource: vi.fn() as never,
			ingestSource: vi.fn(async () => importResult) as never,
			runSourceNow: vi.fn() as never
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

	it('passes quarantine and source-ops metadata through updateSource', async () => {
		const updateSource = vi.fn(async () => null);
		const actions = _createSourceDetailActions({
			updateSource: updateSource as never,
			previewSource: vi.fn() as never,
			ingestSource: vi.fn() as never,
			runSourceNow: vi.fn() as never
		});

		const request = new Request('http://localhost', {
			method: 'POST',
			body: new URLSearchParams({
				name: 'News from Native California',
				sourceUrl: 'https://newsfromnativecalifornia.com/events/list/?ical=1',
				adapterConfig: '{}',
				riskProfile: '{}',
				dedupeConfig: '{}',
				qaNotes: '["Watch for vendor links"]',
				adapterVersion: '2026-04-ingestion-hardening',
				quarantineReason: 'Needs selector review'
			})
		});

		await actions.updateSource!({
			params: { id: 'source-1' },
			request
		} as never);

		expect(updateSource).toHaveBeenCalledWith(
			'source-1',
			expect.objectContaining({
				adapterVersion: '2026-04-ingestion-hardening',
				quarantineReason: 'Needs selector review',
				qaNotes: ['Watch for vendor links'],
				quarantined: false
			})
		);
	});
});

describe('source schema health during approval', () => {
	it('keeps approval working when source snapshot storage is unavailable', async () => {
		vi.resetModules();

		const fakeDb = createFakeDb({
			candidates: [
				{
					id: 'cand-compat-1',
					sourceId: 'source-1',
					batchId: 'batch-1',
					coil: 'events',
					status: 'pending_review',
					priority: 'normal',
					rawData: {},
					normalizedData: {
						coil: 'events',
						title: 'Compatibility Gathering',
						description: 'A community event',
						url: 'https://example.com/events/compatibility-gathering',
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
						registration_url: 'https://example.com/events/compatibility-gathering',
						cost: null
					},
					sourceItemId: 'event-compat-1@example.com',
					sourceItemUrl: 'https://example.com/events/compatibility-gathering',
					dedupeResult: 'new',
					dedupeStrategyUsed: null,
					matchedCanonicalId: null,
					contentFingerprint: 'compat-fingerprint-1',
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
			schemaColumns: []
		});

		const createEvent = vi.fn(async () => ({ id: 'evt-compat-1' }));
		vi.doMock('$lib/server/db', () => ({ db: fakeDb }));
		vi.doMock('$lib/server/events', () => ({ createEvent, updateEvent: vi.fn() }));
		vi.doMock('$lib/server/funding', () => ({ createFunding: vi.fn(), updateFunding: vi.fn() }));
		vi.doMock('$lib/server/jobs', () => ({ createJob: vi.fn(), updateJob: vi.fn() }));
		vi.doMock('$lib/server/red-pages', () => ({
			createBusiness: vi.fn(),
			updateBusiness: vi.fn()
		}));
		vi.doMock('$lib/server/toolbox', () => ({ createResource: vi.fn(), updateResource: vi.fn() }));
		vi.doMock('$lib/server/organizations', () => ({
			createOrganization: vi.fn(),
			getOrganizationById: vi.fn(),
			suggestOrganizationMatches: vi.fn(async () => [])
		}));
		vi.doMock('$lib/server/venues', () => ({
			createVenue: vi.fn(),
			getVenueById: vi.fn(),
			suggestVenueMatches: vi.fn(async () => [])
		}));

		const { getSourceOpsSchemaHealth } = await import('../src/lib/server/source-ops-schema');
		const { approveCandidate } = await import('../src/lib/server/import-candidates');
		const health = await getSourceOpsSchemaHealth();
		const result = await approveCandidate('cand-compat-1', 'reviewer-1');

		expect(health.ok).toBe(false);
		expect(health.message).toContain('compatibility mode');
		expect(createEvent).toHaveBeenCalledOnce();
		expect(result?.status).toBe('approved');
		expect(fakeDb.state.canonicalRecords[0]).toEqual(
			expect.not.objectContaining({ sourceSnapshot: expect.anything() })
		);
	});
});

describe('merge-safe source publishing', () => {
	it('applies source updates when live values still match the last accepted snapshot', () => {
		const merge = planCandidateMerge(
			'events',
			{
				coil: 'events',
				title: 'Knowledge Gathering 2026',
				description: 'Updated community event',
				url: 'https://example.com/events/knowledge-gathering',
				organization_name: 'Smithsonian',
				organization_id: null,
				tags: ['Community'],
				region: 'DC',
				image_url: null,
				start_date: '2026-05-10T18:00:00.000Z',
				end_date: null,
				start_time: null,
				end_time: null,
				timezone: 'UTC',
				location_name: 'Washington, DC',
				location_address: null,
				location_city: 'Washington',
				location_state: 'DC',
				location_zip: null,
				is_virtual: false,
				virtual_url: null,
				is_recurring: false,
				recurrence_rule: null,
				event_type: 'Community',
				registration_url: null,
				cost: null
			},
			{
				title: 'Knowledge Gathering',
				description: 'Community event',
				url: 'https://example.com/events/knowledge-gathering',
				start_date: '2026-05-10T18:00:00.000Z'
			},
			{
				title: 'Knowledge Gathering',
				description: 'Community event',
				url: 'https://example.com/events/knowledge-gathering',
				start_date: '2026-05-10T18:00:00.000Z'
			}
		);

		expect(merge.appliedFields.map((field) => field.field)).toEqual(
			expect.arrayContaining(['title', 'description'])
		);
		expect(merge.patch).toEqual(
			expect.objectContaining({
				title: 'Knowledge Gathering 2026',
				description: 'Updated community event'
			})
		);
		expect(merge.preservedFields).toHaveLength(0);
		expect(merge.nextSnapshot.title).toBe('Knowledge Gathering 2026');
	});

	it('preserves curator-edited live values on update candidates', () => {
		const merge = planCandidateMerge(
			'events',
			{
				coil: 'events',
				title: 'Imported title update',
				description: 'Imported description update',
				url: 'https://example.com/events/knowledge-gathering',
				organization_name: 'Smithsonian',
				organization_id: null,
				tags: ['Community'],
				region: 'DC',
				image_url: null,
				start_date: '2026-05-10T18:00:00.000Z',
				end_date: null,
				start_time: null,
				end_time: null,
				timezone: 'UTC',
				location_name: 'Washington, DC',
				location_address: null,
				location_city: 'Washington',
				location_state: 'DC',
				location_zip: null,
				is_virtual: false,
				virtual_url: null,
				is_recurring: false,
				recurrence_rule: null,
				event_type: 'Community',
				registration_url: null,
				cost: null
			},
			{
				title: 'Curated title',
				description: 'Community event',
				url: 'https://example.com/events/knowledge-gathering',
				start_date: '2026-05-10T18:00:00.000Z'
			},
			{
				title: 'Knowledge Gathering',
				description: 'Community event',
				url: 'https://example.com/events/knowledge-gathering',
				start_date: '2026-05-10T18:00:00.000Z'
			}
		);

		expect(merge.preservedFields.map((field) => field.field)).toContain('title');
		expect(merge.patch).not.toHaveProperty('title');
		expect(merge.patch).toEqual(
			expect.objectContaining({
				description: 'Imported description update'
			})
		);
	});

	it('does not clear populated live fields from blank source values', () => {
		const merge = planCandidateMerge(
			'events',
			{
				coil: 'events',
				title: 'Knowledge Gathering',
				description: null,
				url: 'https://example.com/events/knowledge-gathering',
				organization_name: 'Smithsonian',
				organization_id: null,
				tags: ['Community'],
				region: 'DC',
				image_url: null,
				start_date: '2026-05-10T18:00:00.000Z',
				end_date: null,
				start_time: null,
				end_time: null,
				timezone: 'UTC',
				location_name: 'Washington, DC',
				location_address: null,
				location_city: 'Washington',
				location_state: 'DC',
				location_zip: null,
				is_virtual: false,
				virtual_url: null,
				is_recurring: false,
				recurrence_rule: null,
				event_type: 'Community',
				registration_url: null,
				cost: null
			},
			{
				title: 'Knowledge Gathering',
				description: 'Curated event description',
				url: 'https://example.com/events/knowledge-gathering',
				start_date: '2026-05-10T18:00:00.000Z'
			},
			{
				title: 'Knowledge Gathering',
				description: 'Curated event description',
				url: 'https://example.com/events/knowledge-gathering',
				start_date: '2026-05-10T18:00:00.000Z'
			}
		);

		expect(merge.patch).not.toHaveProperty('description');
		expect(merge.unchangedFields.find((field) => field.field === 'description')?.reason).toContain(
			'Blank source values'
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
		vi.doMock('$lib/server/red-pages', () => ({
			createBusiness: vi.fn(),
			updateBusiness: vi.fn()
		}));
		vi.doMock('$lib/server/toolbox', () => ({ createResource: vi.fn(), updateResource: vi.fn() }));

		const { approveCandidate } = await import('../src/lib/server/import-candidates');
		const result = await approveCandidate('cand-1', 'reviewer-1');

		expect(createEvent).toHaveBeenCalledOnce();
		expect(updateEvent).not.toHaveBeenCalled();
		expect(result?.status).toBe('approved');
		expect(fakeDb.state.canonicalRecords[0]?.publishedRecordId).toBe('evt-1');
		expect(fakeDb.state.canonicalRecords[0]?.sourceSnapshot).toEqual(
			expect.objectContaining({
				title: 'Knowledge Gathering',
				description: 'A community event'
			})
		);
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
					sourceSnapshot: {
						title: 'Knowledge Gathering',
						description: 'A community event',
						url: 'https://example.com/events/knowledge-gathering',
						start_date: '2026-05-10T18:00:00.000Z'
					},
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
		vi.doMock('$lib/server/red-pages', () => ({
			createBusiness: vi.fn(),
			updateBusiness: vi.fn()
		}));
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
		expect(fakeDb.state.canonicalRecords[0]?.sourceSnapshot).toEqual(
			expect.objectContaining({
				title: 'Knowledge Gathering Updated'
			})
		);
	});

	it('dedupes repeated image evidence before inserting record_images rows', async () => {
		const createEvent = vi.fn(async () => ({ id: 'evt-dup-img' }));
		const updateEvent = vi.fn();
		const fakeDb = createFakeDb({
			candidates: [
				{
					id: 'cand-dup-img',
					sourceId: 'source-1',
					batchId: 'batch-1',
					coil: 'events',
					status: 'pending_review',
					priority: 'normal',
					rawData: {},
					normalizedData: {
						coil: 'events',
						title: 'Agave Roast',
						description: 'Event with repeated image evidence',
						url: 'https://newsfromnativecalifornia.com/event/agave-roast',
						organization_name: 'Malki Museum',
						organization_id: null,
						tags: [],
						region: 'CA',
						image_url:
							'https://malkimuseum.org/cdn/shop/files/2026_Agave_Roast_Flyer.jpg?v=1772654502&width=1070',
						start_date: '2026-05-10T18:00:00.000Z',
						end_date: null,
						start_time: null,
						end_time: null,
						timezone: 'America/Los_Angeles',
						location_name: 'Malki Museum',
						location_address: 'Banning, CA',
						location_city: 'Banning',
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
					sourceItemId: 'event-dup-img@example.com',
					sourceItemUrl: 'https://newsfromnativecalifornia.com/event/agave-roast',
					dedupeResult: 'new',
					dedupeStrategyUsed: null,
					matchedCanonicalId: null,
					contentFingerprint: 'fingerprint-dup-img',
					sourceAttribution: 'Source: News from Native California',
					reviewedAt: null,
					reviewedBy: null,
					reviewNotes: null,
					rejectionReason: null,
					fieldProvenance: {},
					urlRoles: {},
					imageCandidates: [
						{
							url: 'https://malkimuseum.org/cdn/shop/files/2026_Agave_Roast_Flyer.jpg?v=1772654502&width=1070',
							role: 'inline',
							source: 'inline',
							sourceUrl: 'https://newsfromnativecalifornia.com/event/agave-roast',
							confidence: 0.74,
							isMeaningful: true,
							width: 1070,
							height: 1384
						},
						{
							url: 'https://malkimuseum.org/cdn/shop/files/2026_Agave_Roast_Flyer.jpg?v=1772654502&width=1070',
							role: 'feed',
							source: 'feed',
							sourceUrl: 'https://newsfromnativecalifornia.com/event/agave-roast',
							confidence: 0.8,
							isMeaningful: true
						}
					],
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
		vi.doMock('$lib/server/red-pages', () => ({
			createBusiness: vi.fn(),
			updateBusiness: vi.fn()
		}));
		vi.doMock('$lib/server/toolbox', () => ({ createResource: vi.fn(), updateResource: vi.fn() }));

		const { approveCandidate } = await import('../src/lib/server/import-candidates');
		await approveCandidate('cand-dup-img', 'reviewer-1');

		expect(fakeDb.state.recordImages).toHaveLength(1);
		expect(fakeDb.state.recordImages[0]).toEqual(
			expect.objectContaining({
				imageUrl:
					'https://malkimuseum.org/cdn/shop/files/2026_Agave_Roast_Flyer.jpg?v=1772654502&width=1070',
				isPrimary: true
			})
		);
	});
});

describe('seeded automated source configs', () => {
	it('ship explicit config for all curated html and rss starter sources', () => {
		const seedSources = JSON.parse(readFileSync(seedSourcesPath, 'utf8')) as Array<
			Record<string, unknown>
		>;
		const automated = seedSources.filter((source) =>
			['html_selector', 'rss_generic'].includes(String(source.adapter_type ?? source.adapterType))
		);

		expect(automated).toHaveLength(10);

		for (const source of automated) {
			expect(source.adapter_config ?? source.adapterConfig).toBeTruthy();
			expect(
				Object.keys((source.adapter_config ?? source.adapterConfig) as Record<string, unknown>)
			).not.toHaveLength(0);
		}
	});

	it('validate cleanly through the app adapter registry', () => {
		const seedSources = JSON.parse(readFileSync(seedSourcesPath, 'utf8')) as Array<
			Record<string, unknown>
		>;
		const automated = seedSources.filter((source) =>
			['html_selector', 'rss_generic'].includes(String(source.adapter_type ?? source.adapterType))
		);

		for (const source of automated) {
			const validation = validateSourceConfig({
				id: String(source.slug ?? source.name),
				name: String(source.name),
				slug: String(source.slug),
				sourceUrl: String(source.source_url ?? source.sourceUrl ?? ''),
				fetchUrl: (source.fetch_url ?? source.fetchUrl ?? null) as string | null,
				adapterType: String(source.adapter_type ?? source.adapterType),
				adapterConfig: (source.adapter_config ?? source.adapterConfig ?? {}) as Record<
					string,
					unknown
				>
			} as never);

			expect(validation.valid, `${source.slug} should validate`).toBe(true);
			expect(validation.errors).toHaveLength(0);
		}
	});
});

describe('source provenance helper', () => {
	it('returns primary-source public provenance for a published record', async () => {
		const canonical = {
			id: 'canon-1',
			coil: 'events',
			publishedRecordId: 'evt-1',
			primarySourceId: 'source-2',
			sourceCount: 2
		};
		const joinedLinks = [
			{
				link: {
					sourceItemUrl: 'https://example.com/secondary',
					sourceAttribution: 'Secondary source',
					lastSyncAt: new Date('2026-03-01T00:00:00.000Z'),
					lastSeenAt: new Date('2026-03-01T00:00:00.000Z'),
					isPrimary: false
				},
				source: {
					id: 'source-1',
					name: 'Secondary Source',
					slug: 'secondary-source',
					homepageUrl: 'https://example.com/secondary-home',
					sourceUrl: 'https://example.com/secondary-source',
					attributionText: 'Secondary attribution'
				}
			},
			{
				link: {
					sourceItemUrl: 'https://example.com/original-listing',
					sourceAttribution: null,
					lastSyncAt: new Date('2026-03-15T00:00:00.000Z'),
					lastSeenAt: new Date('2026-03-14T00:00:00.000Z'),
					isPrimary: true
				},
				source: {
					id: 'source-2',
					name: 'Primary Source',
					slug: 'primary-source',
					homepageUrl: 'https://example.com/source-home',
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
			sourceUrl: 'https://example.com/source-home',
			sourceItemUrl: 'https://example.com/original-listing',
			attributionText: 'Primary attribution',
			lastSyncedAt: '2026-03-15T00:00:00.000Z',
			sourceCount: 2
		});
	});
});

function createFakeDb(initial: {
	candidates?: Array<Record<string, unknown>>;
	canonicalRecords?: Array<Record<string, unknown>>;
	sourceRecordLinks?: Array<Record<string, unknown>>;
	mergeHistory?: Array<Record<string, unknown>>;
	recordImages?: Array<Record<string, unknown>>;
	events?: Array<Record<string, unknown>>;
	schemaColumns?: Array<{ table_name: string; column_name: string }>;
}) {
	const tableName = (table: unknown) =>
		(table as { [key: symbol]: string | undefined })?.[Symbol.for('drizzle:Name')] ?? '';
	const projectRow = (row: Record<string, unknown>, selection?: Record<string, unknown>) =>
		selection ? Object.fromEntries(Object.keys(selection).map((key) => [key, row[key]])) : row;

	const state = {
		candidates: [...(initial.candidates ?? [])],
		canonicalRecords: [...(initial.canonicalRecords ?? [])],
		sourceRecordLinks: [...(initial.sourceRecordLinks ?? [])],
		mergeHistory: [...(initial.mergeHistory ?? [])],
		recordImages: [...(initial.recordImages ?? [])],
		events: [...(initial.events ?? [])],
		schemaColumns: [
			...(initial.schemaColumns ?? [
				{ table_name: 'canonical_records', column_name: 'source_snapshot' }
			])
		]
	};

	const tx = {
		select: (selection?: Record<string, unknown>) => ({
			from(table: unknown) {
				const rows =
					tableName(table) === tableName(importedCandidates)
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
						limit: async (count: number) =>
							rows.slice(0, count).map((row) => projectRow(row, selection))
					})
				};
			}
		}),
		insert(table: unknown) {
			return {
				values(values: Record<string, unknown> | Array<Record<string, unknown>>) {
					if (tableName(table) === tableName(canonicalRecords)) {
						const row = { id: `canon-${state.canonicalRecords.length + 1}`, ...values };
						state.canonicalRecords.push(row);
						return {
							returning: async (selection?: Record<string, unknown>) => [projectRow(row, selection)]
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
					if (tableName(table) === tableName(recordImages)) {
						const rows = Array.isArray(values) ? values : [values];
						state.recordImages.push(
							...rows.map((row, index) => ({
								id: `img-${state.recordImages.length + index + 1}`,
								...row
							}))
						);
						return {
							returning: async () => rows
						};
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
								returning: async (selection?: Record<string, unknown>) =>
									target ? [projectRow(target, selection)] : []
							};
						}
					};
				}
			};
		},
		delete: vi.fn((table: unknown) => ({
			where: async () => {
				if (tableName(table) === tableName(recordImages)) {
					state.recordImages = [];
				}
				return [];
			}
		}))
	};

	return {
		state,
		execute: vi.fn(async () => state.schemaColumns),
		transaction: async (callback: (executor: typeof tx) => Promise<unknown>) => callback(tx),
		select: tx.select,
		insert: tx.insert,
		update: tx.update,
		delete: tx.delete
	};
}
