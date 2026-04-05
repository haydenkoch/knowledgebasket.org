import { normalizeUrl } from '../dedupe';
import { fetchJson, parseDateLike, parseNumberLike, selectSourceUrl, splitTags } from '../shared';
import type {
	AdapterConfig,
	ConfigValidationResult,
	FetchResult,
	IngestionAdapter,
	NormalizeResult,
	NormalizedFunding,
	ParseResult,
	SourceRecord
} from '../types';

type GrantsGovConfig = AdapterConfig & {
	query_params?: Record<string, string>;
	items_path?: string;
	pagination?: {
		param_name: string;
		page_size: number;
		max_pages: number;
	};
};

export const grantsGovApiAdapter: IngestionAdapter = {
	adapterType: 'grants_gov_api',
	displayName: 'Grants.gov API',
	supportedCoils: ['funding'],

	async fetch(source): Promise<FetchResult> {
		const config = source.adapterConfig as GrantsGovConfig;
		const url = selectSourceUrl(source, config);
		const items: unknown[] = [];
		const pageSize = Number(config.pagination?.page_size ?? 25);
		const maxPages = Number(config.pagination?.max_pages ?? 5);
		const paramName = config.pagination?.param_name ?? 'startRecordNum';
		let lastFetch: FetchResult | null = null;

		for (let page = 0; page < maxPages; page += 1) {
			const body = {
				...(config.query_params ?? {}),
				[paramName]: page * pageSize,
				rows: pageSize
			};
			const { fetchResult, data } = await fetchJson<Record<string, unknown>>(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			lastFetch = fetchResult;
			if (!fetchResult.success || !data) return fetchResult;

			const pageItems = getPath(data, config.items_path ?? 'oppHits');
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
				.map((entry) => ({
					fields: entry,
					sourceItemId: readString(entry.opportunityNumber) ?? readString(entry.id) ?? null,
					sourceItemUrl: normalizeUrl(readString(entry.opportunityLink) ?? readString(entry.url))
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
						message: error instanceof Error ? error.message : 'Failed to parse Grants.gov payload',
						context: 'grants-gov.parse'
					}
				]
			};
		}
	},

	async normalize(items): Promise<NormalizeResult> {
		const records: NormalizedFunding[] = [];
		const errors: NormalizeResult['errors'] = [];
		items.forEach((item, index) => {
			try {
				const fields = item.fields;
				records.push({
					coil: 'funding',
					title:
						readString(fields.opportunityTitle) ??
						readString(fields.synopsisTitle) ??
						'Untitled funding',
					description: readString(fields.synopsis) ?? readString(fields.description),
					url: normalizeUrl(
						readString(fields.opportunityLink) ??
							readString(fields.opportunityUrl) ??
							readString(fields.url)
					),
					organization_name: readString(fields.agencyName),
					organization_id: null,
					tags: splitTags(fields.categoryExplanation),
					region: 'US',
					image_url: null,
					funding_type: 'grant',
					amount_min: parseNumberLike(fields.awardFloor),
					amount_max: parseNumberLike(fields.awardCeiling),
					amount_description: readString(fields.estimatedFunding),
					deadline: parseDateLike(fields.closeDate),
					is_rolling: !parseDateLike(fields.closeDate),
					eligibility: readString(fields.eligibleApplicants),
					funder_name: readString(fields.agencyName),
					funder_url: normalizeUrl(readString(fields.agencyUrl)),
					application_url: normalizeUrl(
						readString(fields.opportunityLink) ?? readString(fields.url)
					),
					opportunity_number: readString(fields.opportunityNumber),
					cfda_number: readString(fields.cfdaNumber),
					status: readString(fields.oppStatus)?.toLowerCase().includes('forecast')
						? 'upcoming'
						: 'open'
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
		try {
			new URL(selectSourceUrl(source as SourceRecord, config));
		} catch {
			errors.push('Grants.gov adapter requires a valid API URL.');
		}
		return { valid: errors.length === 0, errors, warnings: [] };
	}
};

function getPath(data: unknown, path: string) {
	return path.split('.').reduce<unknown>((current, segment) => {
		if (!current || typeof current !== 'object') return undefined;
		return (current as Record<string, unknown>)[segment];
	}, data);
}

function readString(value: unknown): string | null {
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}
