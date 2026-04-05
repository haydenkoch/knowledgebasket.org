import { createHash } from 'node:crypto';
import type { AdapterConfig, ConfigValidationResult, IngestionAdapter, ParsedItem } from '../types';
import type { NormalizeResult, ParseResult, FetchResult, Coil, NormalizedEvent } from '../types';
import { normalizeUrl } from '../dedupe';
import { parseIcalEvents } from './ical-shared';

type ICalAdapterConfig = AdapterConfig & {
	startDateFilter?: string;
	endDateFilter?: string;
	categoryFilter?: string[];
	defaultTimezone?: string;
};

const USER_AGENT = 'KnowledgeBasket-SourceOps/1.0 (+https://knowledgebasket.org)';

export const icalGenericAdapter: IngestionAdapter = {
	adapterType: 'ical_generic',
	displayName: 'Generic iCal Feed',
	supportedCoils: ['events'],

	async fetch(source): Promise<FetchResult> {
		const url = source.fetchUrl ?? source.sourceUrl;
		const startedAt = Date.now();

		try {
			const response = await fetch(url, {
				headers: {
					'User-Agent': USER_AGENT,
					Accept: 'text/calendar, text/plain;q=0.9, */*;q=0.5'
				},
				signal: AbortSignal.timeout(15000)
			});

			const rawContent = await response.text();
			const responseTimeMs = Date.now() - startedAt;
			const headers = Object.fromEntries(response.headers.entries());
			const contentHash = createHash('sha256').update(rawContent).digest('hex');
			const status = response.ok ? 'success' : mapHttpStatusToFetchStatus(response.status);

			return {
				success: response.ok,
				status,
				httpStatusCode: response.status,
				responseTimeMs,
				rawContent: response.ok ? rawContent : null,
				contentHash: response.ok ? contentHash : null,
				contentSizeBytes: Buffer.byteLength(rawContent, 'utf8'),
				errorMessage: response.ok ? null : `HTTP ${response.status} while fetching iCal feed`,
				errorCategory: response.ok ? null : mapHttpStatusToErrorCategory(response.status),
				headers
			};
		} catch (error) {
			return {
				success: false,
				status:
					error instanceof DOMException && error.name === 'TimeoutError' ? 'timeout' : 'failure',
				httpStatusCode: null,
				responseTimeMs: Date.now() - startedAt,
				rawContent: null,
				contentHash: null,
				contentSizeBytes: 0,
				errorMessage: error instanceof Error ? error.message : 'Unknown fetch error',
				errorCategory:
					error instanceof DOMException && error.name === 'TimeoutError' ? 'timeout' : 'network',
				headers: {}
			};
		}
	},

	async parse(rawContent, config): Promise<ParseResult> {
		try {
			const events = parseIcalEvents(rawContent);
			const items: ParsedItem[] = events.map((event) => ({
				fields: {
					summary: event.summary,
					description: event.description,
					location: event.location,
					url: event.url,
					attachments: event.attachments,
					dtstart: event.start.toISOString(),
					dtend: event.end?.toISOString() ?? null,
					timezone: event.timezone,
					categories: event.categories,
					recurrenceRule: event.recurrenceRule,
					isRecurring: event.isRecurring
				},
				sourceItemId: event.uid || null,
				sourceItemUrl: normalizeUrl(event.url) ?? null
			}));

			const filteredItems = filterParsedItems(items, config as ICalAdapterConfig);
			return {
				success: true,
				items: filteredItems,
				totalFound: filteredItems.length,
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
						message: error instanceof Error ? error.message : 'Unknown parse error',
						context: 'ical.parse'
					}
				]
			};
		}
	},

	async normalize(items, coil, config): Promise<NormalizeResult> {
		if (coil !== 'events') {
			return {
				success: false,
				records: [],
				errors: [
					{
						itemIndex: 0,
						message: `Adapter ${this.adapterType} only supports the events coil`,
						field: 'coil',
						rawValue: coil
					}
				]
			};
		}

		const normalized: NormalizedEvent[] = [];
		const errors: NormalizeResult['errors'] = [];

		items.forEach((item, index) => {
			try {
				const record = normalizeEventItem(item, config as ICalAdapterConfig);
				normalized.push(record);
			} catch (error) {
				errors.push({
					itemIndex: index,
					message: error instanceof Error ? error.message : 'Unknown normalization error',
					field: null,
					rawValue: item.fields
				});
			}
		});

		return {
			success: errors.length === 0,
			records: normalized,
			errors
		};
	},

	validateConfig(config, source): ConfigValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];
		const candidateUrl =
			(typeof config.fetchUrl === 'string' && config.fetchUrl) ||
			source?.fetchUrl ||
			source?.sourceUrl;

		if (!candidateUrl) {
			errors.push('An iCal source needs a fetch URL or source URL.');
		} else {
			try {
				const parsed = new URL(candidateUrl);
				if (
					!/\.ics($|\?)/i.test(parsed.pathname) &&
					!parsed.searchParams.toString().includes('ical')
				) {
					warnings.push('The fetch URL does not look like a typical .ics endpoint.');
				}
			} catch {
				errors.push('The configured fetch URL is not a valid URL.');
			}
		}

		if (
			config.startDateFilter &&
			Number.isNaN(new Date(String(config.startDateFilter)).getTime())
		) {
			errors.push('startDateFilter must be a valid ISO date.');
		}
		if (config.endDateFilter && Number.isNaN(new Date(String(config.endDateFilter)).getTime())) {
			errors.push('endDateFilter must be a valid ISO date.');
		}

		return { valid: errors.length === 0, errors, warnings };
	}
};

function normalizeEventItem(item: ParsedItem, config: ICalAdapterConfig): NormalizedEvent {
	const title = getString(item.fields.summary) ?? 'Untitled event';
	const startDate = asIsoString(item.fields.dtstart);
	if (!startDate) throw new Error('Event is missing a valid start date');

	const endDate = asIsoString(item.fields.dtend);
	const location = getString(item.fields.location);
	const url = normalizeUrl(getString(item.fields.url));
	const description = getString(item.fields.description);
	const categories = asStringArray(item.fields.categories);
	const attachments = asStringArray(item.fields.attachments);
	const timezone = getString(item.fields.timezone) ?? config.defaultTimezone ?? null;
	const { city, state, zip } = parseLocation(location);
	const isVirtual = detectVirtualEvent(location, url, description);

	return {
		coil: 'events',
		title,
		description,
		url,
		organization_name: null,
		organization_id: null,
		tags: categories,
		region: state ?? null,
		image_url: attachments[0] ?? null,
		start_date: startDate,
		end_date: endDate,
		start_time: startDate,
		end_time: endDate,
		timezone,
		location_name: location,
		location_address: location,
		location_city: city,
		location_state: state,
		location_zip: zip,
		is_virtual: isVirtual,
		virtual_url: isVirtual ? url : null,
		is_recurring: Boolean(item.fields.isRecurring),
		recurrence_rule: getString(item.fields.recurrenceRule),
		event_type: categories[0] ?? null,
		registration_url: null,
		cost: null
	};
}

function filterParsedItems(items: ParsedItem[], config: ICalAdapterConfig): ParsedItem[] {
	const startFilter = config.startDateFilter ? new Date(config.startDateFilter) : null;
	const endFilter = config.endDateFilter ? new Date(config.endDateFilter) : null;
	const categoryFilter = (config.categoryFilter ?? []).map((entry) => entry.toLowerCase());

	return items.filter((item) => {
		const start = asDate(item.fields.dtstart);
		if (startFilter && start && start < startFilter) return false;
		if (endFilter && start && start > endFilter) return false;
		if (categoryFilter.length > 0) {
			const categories = asStringArray(item.fields.categories).map((entry) => entry.toLowerCase());
			if (!categories.some((entry) => categoryFilter.includes(entry))) return false;
		}
		return true;
	});
}

function getString(value: unknown): string | null {
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asIsoString(value: unknown): string | null {
	const date = asDate(value);
	return date ? date.toISOString() : null;
}

function asDate(value: unknown): Date | null {
	if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
	if (typeof value === 'string' && value.trim()) {
		const parsed = new Date(value);
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	}
	return null;
}

function asStringArray(value: unknown): string[] {
	if (Array.isArray(value))
		return value.filter((entry): entry is string => typeof entry === 'string');
	if (typeof value === 'string')
		return value
			.split(',')
			.map((entry) => entry.trim())
			.filter(Boolean);
	return [];
}

function parseLocation(location: string | null): {
	city: string | null;
	state: string | null;
	zip: string | null;
} {
	if (!location) return { city: null, state: null, zip: null };
	const normalized = location.replace(/\n+/g, ', ').replace(/\s+/g, ' ').trim();
	const zipMatch = normalized.match(/\b\d{5}(?:-\d{4})?\b/);
	const stateMatch = normalized.match(/\b([A-Z]{2})\b(?:\s+\d{5}(?:-\d{4})?)?$/);
	const parts = normalized
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean);

	return {
		city: parts.length >= 2 ? parts[parts.length - 2] : null,
		state: stateMatch?.[1] ?? null,
		zip: zipMatch?.[0] ?? null
	};
}

function detectVirtualEvent(
	location: string | null,
	url: string | null,
	description: string | null
): boolean {
	const haystack = `${location ?? ''} ${url ?? ''} ${description ?? ''}`.toLowerCase();
	return ['virtual', 'online', 'zoom', 'teams', 'meet.google'].some((needle) =>
		haystack.includes(needle)
	);
}

function mapHttpStatusToFetchStatus(status: number): FetchResult['status'] {
	if (status === 408 || status === 504) return 'timeout';
	if (status >= 200 && status < 300) return 'success';
	return 'failure';
}

function mapHttpStatusToErrorCategory(status: number): FetchResult['errorCategory'] {
	if (status === 401 || status === 403) return 'auth';
	if (status === 404) return 'not_found';
	if (status === 408 || status === 504) return 'timeout';
	if (status === 429) return 'rate_limit';
	if (status >= 500) return 'server_error';
	return 'unknown';
}

export function adapterSupportsCoil(adapter: IngestionAdapter, coil: Coil): boolean {
	return adapter.supportedCoils.includes(coil);
}
