import {
	fetchJson,
	parseDateLike,
	parseNumberLike,
	resolveAdapterHeaders,
	selectSourceUrl,
	splitTags
} from '../shared';
import { extractPath } from '../shared';
import { normalizeUrl } from '../dedupe';
import type {
	AdapterConfig,
	ConfigValidationResult,
	FetchResult,
	IngestionAdapter,
	NormalizeResult,
	NormalizedFunding,
	NormalizedRedPagesEntry,
	ParseResult,
	SourceRecord
} from '../types';

type ApiAdapterConfig = AdapterConfig & {
	method?: 'GET' | 'POST';
	query_params?: Record<string, string>;
	headers?: Record<string, string>;
	items_path?: string;
	pagination?: {
		type: 'offset' | 'cursor' | 'page';
		param_name: string;
		page_size: number;
		max_pages: number;
	};
	__sourceSlug?: string;
};

export const apiJsonAdapter: IngestionAdapter = {
	adapterType: 'api_json',
	displayName: 'Generic JSON API',
	supportedCoils: ['funding', 'red_pages'],

	async fetch(source): Promise<FetchResult> {
		const resolved = resolveApiConfig(source, source.adapterConfig as ApiAdapterConfig);
		if (resolved.mode === 'arcgis') {
			return fetchArcGisFeatures(resolved.serviceUrl, resolved.maxPages, resolved.pageSize);
		}

		const aggregatedItems: unknown[] = [];
		let pagesFetched = 0;
		let lastFetch: FetchResult | null = null;

		for (let page = 0; page < resolved.maxPages; page += 1) {
			const query = { ...resolved.queryParams };
			if (resolved.pagination) {
				if (resolved.pagination.type === 'page') {
					query[resolved.pagination.paramName] = String(page + 1);
				} else if (resolved.pagination.type === 'offset') {
					query[resolved.pagination.paramName] = String(page * resolved.pagination.pageSize);
				}
			}

			const body = resolved.method === 'POST' ? JSON.stringify(query) : undefined;
			const queryParams = resolved.method === 'GET' ? query : undefined;
			const { fetchResult, data } = await fetchJson<Record<string, unknown>>(resolved.url, {
				method: resolved.method,
				headers: {
					'Content-Type': 'application/json',
					...resolved.headers
				},
				query: queryParams,
				body
			});
			lastFetch = fetchResult;
			if (!fetchResult.success || !data) return fetchResult;

			const pageItems = extractPath(data, resolved.itemsPath);
			const normalizedItems = Array.isArray(pageItems) ? pageItems : [];
			aggregatedItems.push(...normalizedItems);
			pagesFetched += 1;

			if (!resolved.pagination || normalizedItems.length < resolved.pagination.pageSize) break;
		}

		const rawContent = JSON.stringify({ items: aggregatedItems, pagesFetched });
		return {
			success: true,
			status: 'success' as const,
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
			const parsed = JSON.parse(rawContent) as { items?: unknown[] };
			const items = (parsed.items ?? [])
				.filter(
					(entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object'
				)
				.map((entry) => ({
					fields: entry,
					sourceItemId:
						readString(entry.id) ??
						readString(entry.objectid) ??
						readString(entry.OBJECTID) ??
						null,
					sourceItemUrl: normalizeUrl(readString(entry.url) ?? readString(entry.website))
				}));
			return { success: true, items, totalFound: items.length, errors: [] };
		} catch (error) {
			return {
				success: false,
				items: [],
				totalFound: 0,
				errors: [
					{
						itemIndex: null,
						message: error instanceof Error ? error.message : 'Failed to parse JSON payload',
						context: 'api-json.parse'
					}
				]
			};
		}
	},

	async normalize(items, coil): Promise<NormalizeResult> {
		const errors: NormalizeResult['errors'] = [];
		const records: Array<NormalizedFunding | NormalizedRedPagesEntry> = [];
		items.forEach((item, index) => {
			try {
				if (coil === 'funding') {
					records.push(normalizeFunding(item.fields));
				} else if (coil === 'red_pages') {
					records.push(normalizeRedPages(item.fields));
				} else {
					throw new Error(`api_json does not support ${coil}`);
				}
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
		const resolved = resolveApiConfig(source as SourceRecord, config as ApiAdapterConfig);
		const errors: string[] = [];
		if (resolved.mode === 'request') {
			try {
				new URL(resolved.url);
			} catch {
				errors.push('API sources require a valid URL or fetch URL.');
			}
		}
		return { valid: errors.length === 0, errors, warnings: [] };
	}
};

function resolveApiConfig(source: SourceRecord, config: ApiAdapterConfig) {
	if (source.slug === 'bia-tribal-leaders') {
		return {
			mode: 'arcgis' as const,
			serviceUrl:
				'https://services1.arcgis.com/UxqqIfhng71wUT9x/arcgis/rest/services/TribalLeadership_Directory/FeatureServer/0',
			pageSize: 200,
			maxPages: 10
		};
	}

	return {
		mode: 'request' as const,
		url: selectSourceUrl(source, config),
		method: config.method ?? 'GET',
		queryParams: { ...(config.query_params ?? {}) },
		headers: resolveAdapterHeaders(config.headers),
		itemsPath: config.items_path ?? 'items',
		pagination: config.pagination
			? {
					type: config.pagination.type,
					paramName: config.pagination.param_name,
					pageSize: Number(config.pagination.page_size ?? 100),
					maxPages: Number(config.pagination.max_pages ?? 1)
				}
			: null,
		maxPages: Number(config.pagination?.max_pages ?? 1)
	};
}

async function fetchArcGisFeatures(serviceUrl: string, maxPages: number, pageSize: number) {
	const items: Array<Record<string, unknown>> = [];
	let lastFetch: FetchResult | null = null;

	for (let page = 0; page < maxPages; page += 1) {
		const queryUrl = `${serviceUrl}/query`;
		const { fetchResult, data } = await fetchJson<Record<string, unknown>>(queryUrl, {
			query: {
				where: '1=1',
				outFields: '*',
				f: 'json',
				resultOffset: page * pageSize,
				resultRecordCount: pageSize
			}
		});
		lastFetch = fetchResult;
		if (!fetchResult.success || !data) return fetchResult;
		const features = extractPath(data, 'features');
		const rows = Array.isArray(features) ? features : [];
		const mapped = rows
			.map((entry) =>
				entry && typeof entry === 'object'
					? ((entry as Record<string, unknown>).attributes as Record<string, unknown> | undefined)
					: undefined
			)
			.filter((entry): entry is Record<string, unknown> => Boolean(entry));
		items.push(...mapped);
		if (mapped.length < pageSize) break;
	}

	const rawContent = JSON.stringify({ items });
	return {
		success: true,
		status: 'success' as const,
		httpStatusCode: lastFetch?.httpStatusCode ?? 200,
		responseTimeMs: lastFetch?.responseTimeMs ?? 0,
		rawContent,
		contentHash: lastFetch?.contentHash ?? null,
		contentSizeBytes: Buffer.byteLength(rawContent, 'utf8'),
		errorMessage: null,
		errorCategory: null,
		headers: lastFetch?.headers ?? {}
	};
}

function normalizeFunding(fields: Record<string, unknown>): NormalizedFunding {
	return {
		coil: 'funding',
		title: readString(fields.title) ?? readString(fields.name) ?? 'Untitled funding',
		description: readString(fields.description),
		url: normalizeUrl(readString(fields.url) ?? readString(fields.website)),
		organization_name: readString(fields.organization),
		organization_id: null,
		tags: splitTags(fields.tags),
		region: readString(fields.region),
		image_url: null,
		funding_type: 'grant',
		amount_min: parseNumberLike(fields.amount_min),
		amount_max: parseNumberLike(fields.amount_max),
		amount_description: readString(fields.amount_description),
		deadline: parseDateLike(fields.deadline),
		is_rolling: !parseDateLike(fields.deadline),
		eligibility: readString(fields.eligibility),
		funder_name: readString(fields.funder_name) ?? readString(fields.organization),
		funder_url: normalizeUrl(readString(fields.funder_url)),
		application_url: normalizeUrl(readString(fields.application_url) ?? readString(fields.url)),
		opportunity_number: readString(fields.opportunity_number),
		cfda_number: readString(fields.cfda_number),
		status: 'open'
	};
}

function normalizeRedPages(fields: Record<string, unknown>): NormalizedRedPagesEntry {
	const title =
		readString(fields.tribefullname) ??
		readString(fields['Tribe Full Name']) ??
		readString(fields.organization) ??
		readString(fields.title) ??
		'Untitled listing';
	return {
		coil: 'red_pages',
		title,
		description: readString(fields.notes),
		url: normalizeUrl(readString(fields.website)),
		organization_name: readString(fields.organization),
		organization_id: null,
		tags: splitTags(fields.biaregion),
		region: readString(fields.state),
		image_url: null,
		organization_type: 'tribal_government',
		address: readString(fields.physicaladdress),
		city: readString(fields.city),
		state: readString(fields.state),
		zip: readString(fields.zipcode),
		phone: readString(fields.phone),
		email: readString(fields.email),
		website: normalizeUrl(readString(fields.website)),
		service_area: readString(fields.biaregion),
		tribal_affiliation: readString(fields.tribealternatename) ?? readString(fields.tribe),
		year_established: null
	};
}

function readString(value: unknown): string | null {
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}
