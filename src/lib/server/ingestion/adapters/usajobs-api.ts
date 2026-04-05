import { normalizeUrl } from '../dedupe';
import {
	fetchJson,
	parseDateLike,
	parseNumberLike,
	resolveAdapterHeaders,
	selectSourceUrl,
	splitTags
} from '../shared';
import { extractPath } from '../shared';
import type {
	AdapterConfig,
	ConfigValidationResult,
	FetchResult,
	IngestionAdapter,
	NormalizeResult,
	NormalizedJob,
	ParseResult,
	SourceRecord
} from '../types';

type UsaJobsConfig = AdapterConfig & {
	headers?: Record<string, string>;
	query_params?: Record<string, string>;
	items_path?: string;
	pagination?: {
		param_name: string;
		page_size: number;
		max_pages: number;
	};
};

export const usaJobsApiAdapter: IngestionAdapter = {
	adapterType: 'usajobs_api',
	displayName: 'USAJobs API',
	supportedCoils: ['jobs'],

	async fetch(source): Promise<FetchResult> {
		const config = source.adapterConfig as UsaJobsConfig;
		const headers = {
			Host: 'data.usajobs.gov',
			...resolveAdapterHeaders(config.headers)
		};
		const url = selectSourceUrl(source, config);
		const items: unknown[] = [];
		const pageSize = Number(config.pagination?.page_size ?? 100);
		const maxPages = Number(config.pagination?.max_pages ?? 3);
		const pageParam = config.pagination?.param_name ?? 'Page';
		let lastFetch: FetchResult | null = null;

		for (let page = 0; page < maxPages; page += 1) {
			const query = {
				...(config.query_params ?? {}),
				[pageParam]: String(page + 1)
			};
			const { fetchResult, data } = await fetchJson<Record<string, unknown>>(url, {
				headers,
				query
			});
			lastFetch = fetchResult;
			if (!fetchResult.success || !data) return fetchResult;

			const pageItems = extractPath(data, config.items_path ?? 'SearchResult.SearchResultItems');
			const normalizedItems = Array.isArray(pageItems) ? pageItems : [];
			items.push(...normalizedItems);
			if (normalizedItems.length < pageSize) break;
		}

		const rawContent = JSON.stringify({ items });
		return {
			success: true,
			status: 'success',
			httpStatusCode: lastFetch?.httpStatusCode ?? 200,
			responseTimeMs: lastFetch?.responseTimeMs ?? 0,
			rawContent,
			contentHash: lastFetch?.contentHash ?? null,
			contentSizeBytes: Buffer.byteLength(rawContent, 'utf8'),
			errorMessage: null,
			errorCategory: null,
			headers: lastFetch?.headers ?? {}
		};
	},

	async parse(rawContent): Promise<ParseResult> {
		try {
			const payload = JSON.parse(rawContent) as { items?: unknown[] };
			const items = (payload.items ?? [])
				.filter(
					(entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object'
				)
				.map((entry) => {
					const descriptor = readRecord(entry.MatchedObjectDescriptor);
					return {
						fields: descriptor,
						sourceItemId: readString(descriptor.PositionID) ?? readString(descriptor.PositionURI),
						sourceItemUrl: normalizeUrl(readString(descriptor.PositionURI))
					};
				});
			return { success: true, items, totalFound: items.length, errors: [] };
		} catch (error) {
			return {
				success: false,
				items: [],
				totalFound: 0,
				errors: [
					{
						itemIndex: null,
						message: error instanceof Error ? error.message : 'Failed to parse USAJobs payload',
						context: 'usajobs.parse'
					}
				]
			};
		}
	},

	async normalize(items): Promise<NormalizeResult> {
		const records: NormalizedJob[] = [];
		const errors: NormalizeResult['errors'] = [];
		items.forEach((item, index) => {
			try {
				const fields = item.fields;
				const userArea = readRecord(fields.UserArea);
				const details = readRecord(userArea.Details);
				const locations = Array.isArray(fields.PositionLocation) ? fields.PositionLocation : [];
				const firstLocation =
					locations.find(
						(entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object'
					) ?? {};
				const remuneration = Array.isArray(fields.PositionRemuneration)
					? fields.PositionRemuneration
					: [];
				const firstSalary =
					remuneration.find(
						(entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object'
					) ?? {};
				records.push({
					coil: 'jobs',
					title: readString(fields.PositionTitle) ?? 'Untitled job',
					description: readString(details.JobSummary),
					url: normalizeUrl(readString(fields.PositionURI)),
					organization_name: readString(fields.OrganizationName),
					organization_id: null,
					tags: splitTags(fields.JobCategory),
					region: readString(firstLocation.LocationName),
					image_url: null,
					job_type: mapJobType(readString(fields.PositionSchedule)),
					salary_min: parseNumberLike(firstSalary.MinimumRange),
					salary_max: parseNumberLike(firstSalary.MaximumRange),
					salary_period: mapSalaryPeriod(readString(firstSalary.RateIntervalCode)),
					salary_description: readString(firstSalary.Description),
					location_city: readString(firstLocation.LocationName),
					location_state: null,
					is_remote:
						readString(fields.PositionLocationDisplay)?.toLowerCase().includes('remote') ?? false,
					is_hybrid:
						readString(fields.PositionLocationDisplay)?.toLowerCase().includes('hybrid') ?? false,
					closing_date: parseDateLike(fields.ApplicationCloseDate),
					posted_date: parseDateLike(fields.PublicationStartDate),
					indian_preference: true,
					department: readString(fields.DepartmentName),
					application_url: normalizeUrl(readString(fields.PositionURI)),
					contact_email: readString(details.AgencyContactEmail)
				});
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
		const headers = resolveAdapterHeaders((config as UsaJobsConfig).headers);
		try {
			new URL(selectSourceUrl(source as SourceRecord, config));
		} catch {
			errors.push('USAJobs adapter requires a valid API URL.');
		}
		if (!headers['Authorization-Key']) {
			errors.push('USAJobs adapter requires Authorization-Key via adapter config headers.');
		}
		if (!headers['User-Agent']) {
			errors.push('USAJobs adapter requires User-Agent via adapter config headers.');
		}
		return { valid: errors.length === 0, errors, warnings: [] };
	}
};

function readRecord(value: unknown) {
	return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown): string | null {
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function mapJobType(value: string | null): NormalizedJob['job_type'] {
	const normalized = value?.toLowerCase() ?? '';
	if (normalized.includes('part')) return 'part_time';
	if (normalized.includes('intern')) return 'internship';
	if (normalized.includes('temp')) return 'temporary';
	if (normalized.includes('contract')) return 'contract';
	return 'full_time';
}

function mapSalaryPeriod(value: string | null): NormalizedJob['salary_period'] {
	const normalized = value?.toLowerCase() ?? '';
	if (normalized.includes('per year') || normalized.includes('pa') || normalized.includes('annual'))
		return 'annual';
	if (normalized.includes('per hour') || normalized.includes('ph')) return 'hourly';
	if (normalized.includes('month')) return 'monthly';
	return null;
}
