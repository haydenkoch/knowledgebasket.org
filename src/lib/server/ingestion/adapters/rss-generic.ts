import { XMLParser } from 'fast-xml-parser';
import { normalizeUrl } from '../dedupe';
import {
	cleanText,
	extractPath,
	fetchText,
	inferFeedUrlFromHtml,
	parseDateLike,
	selectSourceUrl,
	splitTags
} from '../shared';
import type {
	AdapterConfig,
	ConfigValidationResult,
	FetchResult,
	IngestionAdapter,
	NormalizeResult,
	NormalizedEvent,
	NormalizedFunding,
	NormalizedToolboxItem,
	ParseResult,
	ParsedItem,
	SourceRecord
} from '../types';

type RssAdapterConfig = AdapterConfig & {
	feedUrl?: string;
	maxItems?: number;
	itemsPath?: string;
	fieldMap?: Record<string, string | string[]>;
	sourceItemIdPath?: string | string[];
};

const parser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '',
	parseTagValue: false,
	parseAttributeValue: false,
	removeNSPrefix: true,
	textNodeName: 'text'
});

export const rssGenericAdapter: IngestionAdapter = {
	adapterType: 'rss_generic',
	displayName: 'Generic RSS/Atom Feed',
	supportedCoils: ['events', 'funding', 'toolbox'],

	async fetch(source): Promise<FetchResult> {
		const config = source.adapterConfig as RssAdapterConfig;
		const initialUrl = selectSourceUrl(source, config);
		const initial = await fetchText(initialUrl, {
			accept:
				'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8, */*;q=0.5'
		});
		if (!initial.success || !initial.rawContent) return initial;

		const contentType = initial.headers['content-type']?.toLowerCase() ?? '';
		const looksLikeFeed =
			contentType.includes('xml') ||
			initial.rawContent.trim().startsWith('<?xml') ||
			initial.rawContent.includes('<rss') ||
			initial.rawContent.includes('<feed');

		if (looksLikeFeed) return initial;

		const feedUrl = inferFeedUrlFromHtml(initial.rawContent, initialUrl);
		if (!feedUrl) {
			return {
				...initial,
				success: false,
				status: 'failure',
				rawContent: null,
				contentHash: null,
				errorCategory: 'not_found',
				errorMessage: 'No RSS or Atom feed could be discovered from the source page.'
			};
		}

		return fetchText(feedUrl, {
			accept:
				'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5'
		});
	},

	async parse(rawContent, config): Promise<ParseResult> {
		try {
			const parsed = parser.parse(rawContent) as Record<string, unknown>;
			const source = getItemsFromFeed(parsed);
			const items = source.items
				.slice(
					0,
					typeof (config as RssAdapterConfig).maxItems === 'number'
						? Number((config as RssAdapterConfig).maxItems)
						: 100
				)
				.map((item) => toParsedItem(item, source.feedTitle, config as RssAdapterConfig));

			return {
				success: true,
				items,
				totalFound: items.length,
				errors: []
			};
		} catch (error) {
			return {
				success: false,
				items: [],
				totalFound: 0,
				errors: [
					{
						itemIndex: null,
						message: error instanceof Error ? error.message : 'Failed to parse RSS/Atom feed',
						context: 'rss.parse'
					}
				]
			};
		}
	},

	async normalize(items, coil): Promise<NormalizeResult> {
		const records: Array<NormalizedEvent | NormalizedFunding | NormalizedToolboxItem> = [];
		const errors: NormalizeResult['errors'] = [];

		items.forEach((item, index) => {
			try {
				if (coil === 'events') {
					records.push(normalizeEvent(item));
					return;
				}
				if (coil === 'funding') {
					records.push(normalizeFunding(item));
					return;
				}
				if (coil === 'toolbox') {
					records.push(normalizeToolbox(item));
					return;
				}
				throw new Error(`RSS adapter does not support ${coil}`);
			} catch (error) {
				errors.push({
					itemIndex: index,
					message: error instanceof Error ? error.message : 'Normalization failed',
					field: null,
					rawValue: item.fields
				});
			}
		});

		return {
			success: errors.length === 0,
			records,
			errors
		};
	},

	validateConfig(config, source): ConfigValidationResult {
		const candidateUrl = selectSourceUrl(source as SourceRecord, config);
		const errors: string[] = [];
		const warnings: string[] = [];
		try {
			new URL(candidateUrl);
		} catch {
			errors.push('RSS source needs a valid feed URL or source URL.');
		}
		const rssConfig = config as RssAdapterConfig;
		if (!rssConfig.fieldMap || Object.keys(rssConfig.fieldMap).length === 0) {
			warnings.push('No RSS field map configured; generic feed mapping will be used.');
		}
		return { valid: errors.length === 0, errors, warnings };
	}
};

function getItemsFromFeed(feed: Record<string, unknown>) {
	const rss = feed.rss as { channel?: Record<string, unknown> } | undefined;
	if (rss?.channel) {
		return {
			feedTitle: readString(rss.channel.title),
			items: asArray(rss.channel.item)
		};
	}

	const atom = feed.feed as Record<string, unknown> | undefined;
	if (atom) {
		return {
			feedTitle: readString(atom.title),
			items: asArray(atom.entry)
		};
	}

	return { feedTitle: null, items: [] as Record<string, unknown>[] };
}

function toParsedItem(
	item: Record<string, unknown>,
	feedTitle: string | null,
	config: RssAdapterConfig
): ParsedItem {
	const readMapped = (key: string) => readMappedValue(item, config.fieldMap?.[key]);
	const link = normalizeUrl(readString(readMapped('url')) ?? extractLink(item.link));
	const guid = readString(readMapped('guid')) ?? readString(item.guid);
	return {
		fields: {
			title: cleanText(readString(readMapped('title')) ?? readString(item.title)),
			description:
				cleanText(readString(readMapped('description'))) ??
				cleanText(readString(item['content:encoded'])) ??
				cleanText(readString(item.content)) ??
				cleanText(readString(item.summary)) ??
				cleanText(readString(item.description)),
			url: link,
			published_at:
				parseDateLike(readMapped('published_at')) ??
				parseDateLike(item.pubDate) ??
				parseDateLike(item.published) ??
				parseDateLike(item.updated) ??
				null,
			deadline: parseDateLike(readMapped('deadline')),
			start_date: parseDateLike(readMapped('start_date')),
			event_date: parseDateLike(readMapped('event_date')),
			location: cleanText(readString(readMapped('location'))),
			categories: extractCategories(readMapped('categories') ?? item.category),
			author:
				cleanText(readString(readMapped('author'))) ??
				cleanText(readString(item.creator)) ??
				cleanText(readString(item.author)) ??
				cleanText(readNestedString(item.author, 'name')),
			feed_title: cleanText(readString(readMapped('feed_title'))) ?? feedTitle,
			guid
		},
		sourceItemId:
			readString(readMapped('source_item_id')) ??
			readMappedSourceItemId(item, config.sourceItemIdPath) ??
			guid ??
			link,
		sourceItemUrl: link
	};
}

function readMappedValue(record: Record<string, unknown>, mapping: string | string[] | undefined) {
	if (!mapping) return null;
	for (const path of Array.isArray(mapping) ? mapping : [mapping]) {
		const value = extractPath(record, path);
		if (value !== null && value !== undefined && value !== '') return value;
	}
	return null;
}

function readMappedSourceItemId(
	record: Record<string, unknown>,
	path: string | string[] | undefined
) {
	const value = readMappedValue(record, path);
	if (typeof value === 'string' && value.trim()) return value.trim();
	return null;
}

function normalizeEvent(item: ParsedItem): NormalizedEvent {
	const title = readString(item.fields.title) ?? 'Untitled event';
	const startDate =
		parseDateLike(item.fields.start_date) ??
		parseDateLike(item.fields.event_date) ??
		parseDateLike(item.fields.published_at) ??
		new Date().toISOString();
	const url = normalizeUrl(readString(item.fields.url));
	const description = cleanText(readString(item.fields.description));
	const categories = splitTags(item.fields.categories);

	return {
		coil: 'events',
		title,
		description,
		url,
		organization_name: readString(item.fields.feed_title),
		organization_id: null,
		tags: categories,
		region: null,
		image_url: null,
		start_date: startDate,
		end_date: null,
		start_time: startDate,
		end_time: null,
		timezone: null,
		location_name: readString(item.fields.location),
		location_address: null,
		location_city: null,
		location_state: null,
		location_zip: null,
		is_virtual: true,
		virtual_url: url,
		is_recurring: false,
		recurrence_rule: null,
		event_type: categories[0] ?? null,
		registration_url: null,
		cost: null
	};
}

function normalizeFunding(item: ParsedItem): NormalizedFunding {
	const deadline = parseDateLike(item.fields.deadline);
	const title = readString(item.fields.title) ?? 'Untitled funding';
	const url = normalizeUrl(readString(item.fields.url));
	const description = cleanText(readString(item.fields.description));

	return {
		coil: 'funding',
		title,
		description,
		url,
		organization_name: readString(item.fields.feed_title),
		organization_id: null,
		tags: splitTags(item.fields.categories),
		region: null,
		image_url: null,
		funding_type: 'grant',
		amount_min: null,
		amount_max: null,
		amount_description: null,
		deadline,
		is_rolling: deadline === null,
		eligibility: null,
		funder_name: readString(item.fields.feed_title),
		funder_url: null,
		application_url: url,
		opportunity_number: readString(item.fields.guid),
		cfda_number: null,
		status: deadline && new Date(deadline).getTime() < Date.now() ? 'closed' : 'open'
	};
}

function normalizeToolbox(item: ParsedItem): NormalizedToolboxItem {
	const url = normalizeUrl(readString(item.fields.url));
	return {
		coil: 'toolbox',
		title: readString(item.fields.title) ?? 'Untitled resource',
		description: cleanText(readString(item.fields.description)),
		url,
		organization_name: readString(item.fields.feed_title),
		organization_id: null,
		tags: splitTags(item.fields.categories),
		region: null,
		image_url: null,
		resource_type: 'other',
		format: inferToolboxFormat(url),
		topics: splitTags(item.fields.categories),
		publisher: readString(item.fields.feed_title),
		publication_date: parseDateLike(item.fields.published_at),
		last_verified_at: new Date().toISOString(),
		link_healthy: Boolean(url),
		file_size: null
	};
}

function inferToolboxFormat(url: string | null) {
	if (!url) return 'html' as const;
	if (url.endsWith('.pdf')) return 'pdf' as const;
	if (url.match(/\.(mp4|mov|youtube|youtu\.be)/i)) return 'video' as const;
	return 'html' as const;
}

function asArray(value: unknown): Record<string, unknown>[] {
	if (Array.isArray(value)) {
		return value.filter(
			(entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object'
		);
	}
	if (value && typeof value === 'object') return [value as Record<string, unknown>];
	return [];
}

function readString(value: unknown): string | null {
	if (typeof value === 'string' && value.trim()) return value.trim();
	if (
		value &&
		typeof value === 'object' &&
		typeof (value as { text?: unknown }).text === 'string'
	) {
		const text = (value as { text: string }).text.trim();
		return text || null;
	}
	return null;
}

function readNestedString(value: unknown, key: string): string | null {
	if (!value || typeof value !== 'object') return null;
	return readString((value as Record<string, unknown>)[key]);
}

function extractLink(value: unknown): string | null {
	if (typeof value === 'string') return value.trim() || null;
	if (Array.isArray(value)) {
		for (const entry of value) {
			const found = extractLink(entry);
			if (found) return found;
		}
		return null;
	}
	if (value && typeof value === 'object') {
		const record = value as Record<string, unknown>;
		return readString(record.href) ?? readString(record.url) ?? readString(record.text);
	}
	return null;
}

function extractCategories(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value.flatMap((entry) => extractCategories(entry));
	}
	if (typeof value === 'string') return splitTags(value);
	if (value && typeof value === 'object') {
		const record = value as Record<string, unknown>;
		return splitTags(
			readString(record.text) ?? readString(record.term) ?? readString(record.label)
		);
	}
	return [];
}
