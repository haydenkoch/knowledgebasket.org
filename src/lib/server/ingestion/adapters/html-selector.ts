import { load, type CheerioAPI } from 'cheerio';
import { normalizeUrl } from '../dedupe';
import {
	absoluteUrl,
	cleanText,
	fetchText,
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
	NormalizedJob,
	NormalizedRedPagesEntry,
	ParseResult,
	ParsedItem,
	SourceRecord
} from '../types';

type FieldRule = {
	selector: string;
	extract?: 'text' | 'href' | 'src' | 'attribute' | 'html';
	attribute?: string;
	transform?: 'trim' | 'lowercase' | 'parse_date' | 'strip_html';
};

type HtmlSelectorConfig = AdapterConfig & {
	listSelector?: string;
	itemSelector?: string;
	fieldRules?: Record<string, FieldRule>;
	baseUrl?: string;
	maxItems?: number;
	__sourceSlug?: string;
	__sourceUrl?: string;
};

type HtmlNode = Parameters<CheerioAPI>[0];
type ExtractTarget = {
	attr(name: string): string | undefined;
	html(): string | null | undefined;
	text(): string;
};

export const htmlSelectorAdapter: IngestionAdapter = {
	adapterType: 'html_selector',
	displayName: 'Generic HTML Selector',
	supportedCoils: ['events', 'funding', 'jobs', 'red_pages'],

	async fetch(source): Promise<FetchResult> {
		return fetchText(selectSourceUrl(source, source.adapterConfig as AdapterConfig), {
			accept: 'text/html, application/xhtml+xml;q=0.9, */*;q=0.8'
		});
	},

	async parse(rawContent, config): Promise<ParseResult> {
		try {
			const cfg = config as HtmlSelectorConfig;
			const $ = load(rawContent);
			const baseUrl = cfg.baseUrl ?? cfg.__sourceUrl ?? '';
			const items = (
				cfg.itemSelector
					? $(cfg.itemSelector)
					: $('article, .post, .event, .job, .listing, .card, li')
			)
				.toArray()
				.map((element) => extractItem($, element, { ...cfg, baseUrl }))
				.filter(
					(entry) => entry.sourceItemId || entry.sourceItemUrl || readString(entry.fields.title)
				)
				.slice(0, Number(cfg.maxItems ?? 100));

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
						message: error instanceof Error ? error.message : 'Failed to parse HTML source',
						context: 'html.parse'
					}
				]
			};
		}
	},

	async normalize(items, coil): Promise<NormalizeResult> {
		const records: Array<
			NormalizedEvent | NormalizedFunding | NormalizedJob | NormalizedRedPagesEntry
		> = [];
		const errors: NormalizeResult['errors'] = [];

		items.forEach((item, index) => {
			try {
				if (coil === 'events') records.push(normalizeEvent(item));
				else if (coil === 'funding') records.push(normalizeFunding(item));
				else if (coil === 'jobs') records.push(normalizeJob(item));
				else if (coil === 'red_pages') records.push(normalizeRedPages(item));
				else throw new Error(`HTML adapter does not support ${coil}`);
			} catch (error) {
				errors.push({
					itemIndex: index,
					message: error instanceof Error ? error.message : 'Normalization failed',
					field: null,
					rawValue: item.fields
				});
			}
		});

		return { success: errors.length === 0, records, errors };
	},

	validateConfig(config, source): ConfigValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];
		try {
			new URL(selectSourceUrl(source as SourceRecord, config));
		} catch {
			errors.push('HTML selector sources require a valid source URL.');
		}
		const htmlConfig = config as HtmlSelectorConfig;
		if (!htmlConfig.itemSelector) {
			warnings.push('No item selector configured; generic HTML fallback will be used.');
		}
		if (!htmlConfig.fieldRules || Object.keys(htmlConfig.fieldRules).length === 0) {
			warnings.push('No field rules configured; generic field extraction fallback will be used.');
		}
		return { valid: errors.length === 0, errors, warnings };
	}
};

function extractItem($: CheerioAPI, element: HtmlNode, config: HtmlSelectorConfig): ParsedItem {
	const root = $(element);
	if (config.fieldRules && Object.keys(config.fieldRules).length > 0) {
		const fields: Record<string, unknown> = {};
		for (const [key, rule] of Object.entries(config.fieldRules)) {
			const target =
				rule.selector === ':scope' || rule.selector === 'self'
					? root
					: root.find(rule.selector).first();
			const raw = extractRuleValue(target, rule);
			fields[key] = applyTransform(raw, rule.transform);
		}
		const sourceItemUrl = normalizeUrl(
			absoluteUrl(readString(fields.url) ?? readString(fields.link), config.baseUrl ?? '')
		);
		return {
			fields,
			sourceItemId: readString(fields.id) ?? sourceItemUrl,
			sourceItemUrl
		};
	}

	const title =
		cleanText(root.find('h1, h2, h3, h4, .title, .entry-title, .post-title').first().text()) ??
		cleanText(root.find('a').first().text());
	const url = normalizeUrl(
		absoluteUrl(root.find('a[href]').first().attr('href') || '', config.baseUrl ?? '')
	);
	const description =
		cleanText(root.find('.summary, .excerpt, .description, p').first().html()) ??
		cleanText(root.find('p').first().text());
	const dateText =
		cleanText(root.find('time').first().attr('datetime')) ??
		cleanText(root.find('time').first().text()) ??
		cleanText(root.find('.date, .posted-on, .event-date').first().text());
	const location =
		cleanText(root.find('.location, .event-location, .venue, .address').first().text()) ?? null;

	return {
		fields: {
			title,
			url,
			description,
			date: dateText,
			location,
			category: cleanText(root.find('.category, .tag, .event-type').first().text())
		},
		sourceItemId: url ?? title,
		sourceItemUrl: url
	};
}

function extractRuleValue(target: ExtractTarget, rule: FieldRule) {
	switch (rule.extract) {
		case 'href':
			return target.attr('href') ?? null;
		case 'src':
			return target.attr('src') ?? null;
		case 'attribute':
			return rule.attribute ? (target.attr(rule.attribute) ?? null) : null;
		case 'html':
			return target.html() ?? null;
		case 'text':
		default:
			return target.text();
	}
}

function applyTransform(value: unknown, transform: FieldRule['transform']) {
	if (typeof value !== 'string') return value;
	switch (transform) {
		case 'lowercase':
			return value.toLowerCase().trim();
		case 'parse_date':
			return parseDateLike(value);
		case 'strip_html':
			return cleanText(value);
		case 'trim':
		default:
			return value.trim();
	}
}

function normalizeEvent(item: ParsedItem): NormalizedEvent {
	const title = readString(item.fields.title) ?? 'Untitled event';
	const startDate = parseDateLike(item.fields.date) ?? new Date().toISOString();
	const location = readString(item.fields.location);
	return {
		coil: 'events',
		title,
		description: cleanText(readString(item.fields.description)),
		url: normalizeUrl(readString(item.fields.url)),
		organization_name: null,
		organization_id: null,
		tags: splitTags(item.fields.category),
		region: null,
		image_url: null,
		start_date: startDate,
		end_date: null,
		start_time: startDate,
		end_time: null,
		timezone: null,
		location_name: location,
		location_address: location,
		location_city: null,
		location_state: null,
		location_zip: null,
		is_virtual: !location,
		virtual_url: !location ? normalizeUrl(readString(item.fields.url)) : null,
		is_recurring: false,
		recurrence_rule: null,
		event_type: splitTags(item.fields.category)[0] ?? null,
		registration_url: null,
		cost: null
	};
}

function normalizeFunding(item: ParsedItem): NormalizedFunding {
	const deadline = parseDateLike(item.fields.deadline ?? item.fields.date);
	return {
		coil: 'funding',
		title: readString(item.fields.title) ?? 'Untitled funding',
		description: cleanText(readString(item.fields.description)),
		url: normalizeUrl(readString(item.fields.url)),
		organization_name: null,
		organization_id: null,
		tags: splitTags(item.fields.category),
		region: null,
		image_url: null,
		funding_type: 'grant',
		amount_min: null,
		amount_max: null,
		amount_description: null,
		deadline,
		is_rolling: deadline === null,
		eligibility: null,
		funder_name: null,
		funder_url: null,
		application_url: normalizeUrl(readString(item.fields.url)),
		opportunity_number: item.sourceItemId,
		cfda_number: null,
		status: deadline && new Date(deadline).getTime() < Date.now() ? 'closed' : 'open'
	};
}

function normalizeJob(item: ParsedItem): NormalizedJob {
	return {
		coil: 'jobs',
		title: readString(item.fields.title) ?? 'Untitled job',
		description: cleanText(readString(item.fields.description)),
		url: normalizeUrl(readString(item.fields.url)),
		organization_name: null,
		organization_id: null,
		tags: splitTags(item.fields.category),
		region: null,
		image_url: null,
		job_type: 'full_time',
		salary_min: null,
		salary_max: null,
		salary_period: null,
		salary_description: null,
		location_city: null,
		location_state: null,
		is_remote: false,
		is_hybrid: false,
		closing_date: parseDateLike(item.fields.deadline ?? item.fields.date),
		posted_date: parseDateLike(item.fields.date),
		indian_preference: false,
		department: null,
		application_url: normalizeUrl(readString(item.fields.url)),
		contact_email: null
	};
}

function normalizeRedPages(item: ParsedItem): NormalizedRedPagesEntry {
	return {
		coil: 'red_pages',
		title: readString(item.fields.title) ?? 'Untitled listing',
		description: cleanText(readString(item.fields.description)),
		url: normalizeUrl(readString(item.fields.url)),
		organization_name: null,
		organization_id: null,
		tags: splitTags(item.fields.category),
		region: null,
		image_url: null,
		organization_type: 'other',
		address: readString(item.fields.location),
		city: null,
		state: null,
		zip: null,
		phone: null,
		email: null,
		website: normalizeUrl(readString(item.fields.url)),
		service_area: null,
		tribal_affiliation: null,
		year_established: null
	};
}

function readString(value: unknown): string | null {
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}
