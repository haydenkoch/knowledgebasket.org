import { parse as parseCsv } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { normalizeUrl } from '../dedupe';
import { fetchText, inferDownloadUrlFromHtml, selectSourceUrl, splitTags } from '../shared';
import type {
	AdapterConfig,
	ConfigValidationResult,
	FetchResult,
	IngestionAdapter,
	NormalizeResult,
	NormalizedRedPagesEntry,
	ParseResult
} from '../types';

type CsvImportConfig = AdapterConfig & {
	file_url?: string;
	field_map?: Record<string, string>;
	skip_rows?: number;
	sheet_name?: string;
	__sourceUrl?: string;
};

export const csvImportAdapter: IngestionAdapter = {
	adapterType: 'csv_import',
	displayName: 'CSV / XLSX Import',
	supportedCoils: ['red_pages'],

	async fetch(source): Promise<FetchResult> {
		const config = source.adapterConfig as CsvImportConfig;
		let url = readString(config.file_url) ?? source.fetchUrl ?? null;
		if (!url) {
			const pageUrl = selectSourceUrl(source, config);
			const sourcePage = await fetchText(pageUrl, { accept: 'text/html, */*;q=0.8' });
			if (!sourcePage.success || !sourcePage.rawContent) return sourcePage;
			url = inferDownloadUrlFromHtml(sourcePage.rawContent, pageUrl);
			if (!url) {
				return {
					...sourcePage,
					success: false,
					status: 'failure',
					rawContent: null,
					contentHash: null,
					errorCategory: 'not_found',
					errorMessage: 'No downloadable CSV/XLSX file was discovered from the source page.'
				};
			}
		}

		return fetchText(url, {
			accept:
				'text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, */*;q=0.8'
		});
	},

	async parse(rawContent, config): Promise<ParseResult> {
		try {
			const cfg = config as CsvImportConfig;
			const rows = rawContent.startsWith('PK')
				? parseWorkbook(rawContent, cfg.sheet_name)
				: (parseCsv(rawContent, {
						columns: true,
						skip_empty_lines: true,
						from_line: Number(cfg.skip_rows ?? 0) + 1
					}) as Array<Record<string, unknown>>);

			const items = rows.map((row, index) => ({
				fields: row,
				sourceItemId: readString(row.id) ?? readString(row.OBJECTID) ?? `${index + 1}`,
				sourceItemUrl: normalizeUrl(readString(row.website) ?? readString(row.url))
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
						message: error instanceof Error ? error.message : 'Failed to parse CSV/XLSX payload',
						context: 'csv-import.parse'
					}
				]
			};
		}
	},

	async normalize(items, _coil, config): Promise<NormalizeResult> {
		const cfg = config as CsvImportConfig;
		const fieldMap = cfg.field_map ?? {};
		const records: NormalizedRedPagesEntry[] = [];
		const errors: NormalizeResult['errors'] = [];

		items.forEach((item, index) => {
			try {
				const fields = item.fields;
				const get = (...keys: string[]) =>
					keys
						.map((key) => fieldMap[key] ?? key)
						.map((key) => fields[key])
						.find((value) => value !== undefined && value !== null);

				records.push({
					coil: 'red_pages',
					title:
						readString(get('title', 'name', 'facility_name', 'tribefullname', 'facility')) ??
						'Untitled listing',
					description: readString(get('description', 'notes', 'jobtitle')),
					url: normalizeUrl(readString(get('url', 'website'))),
					organization_name: readString(get('organization', 'owner_name', 'tribe')),
					organization_id: null,
					tags: splitTags(get('tags', 'category', 'type')),
					region: readString(get('region', 'state')),
					image_url: null,
					organization_type: inferOrgType(readString(get('organization_type', 'type', 'LARtype'))),
					address: readString(get('address', 'physicaladdress', 'street', 'mailingaddress')),
					city: readString(get('city', 'mailingaddresscity')),
					state: readString(get('state', 'mailingaddressstate')),
					zip: readString(get('zip', 'zipcode', 'mailingaddresszipcode')),
					phone: readString(get('phone')),
					email: readString(get('email')),
					website: normalizeUrl(readString(get('website', 'url'))),
					service_area: readString(get('service_area', 'biaregion')),
					tribal_affiliation: readString(get('tribal_affiliation', 'tribe', 'tribealternatename')),
					year_established: readNumber(get('year_established'))
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
		const candidateUrl =
			readString((config as CsvImportConfig).file_url) ?? source?.fetchUrl ?? source?.sourceUrl;
		const errors: string[] = [];
		if (!candidateUrl) {
			errors.push('CSV import sources require a valid source or file URL.');
			return { valid: false, errors, warnings: [] };
		}
		try {
			new URL(candidateUrl);
		} catch {
			errors.push('CSV import sources require a valid source or file URL.');
		}
		return { valid: errors.length === 0, errors, warnings: [] };
	}
};

function parseWorkbook(rawContent: string, sheetName?: string) {
	const workbook = XLSX.read(Buffer.from(rawContent, 'binary'), { type: 'buffer' });
	const targetSheet = sheetName && workbook.Sheets[sheetName] ? sheetName : workbook.SheetNames[0];
	if (!targetSheet) return [];
	return XLSX.utils.sheet_to_json(workbook.Sheets[targetSheet]!, { defval: null }) as Array<
		Record<string, unknown>
	>;
}

function readString(value: unknown): string | null {
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim()) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

function inferOrgType(value: string | null): NormalizedRedPagesEntry['organization_type'] {
	const normalized = value?.toLowerCase() ?? '';
	if (normalized.includes('tribal')) return 'tribal_government';
	if (normalized.includes('health')) return 'health_facility';
	if (normalized.includes('education')) return 'education';
	if (normalized.includes('housing')) return 'housing_authority';
	if (normalized.includes('legal')) return 'legal_aid';
	if (normalized.includes('media')) return 'media';
	if (normalized.includes('business')) return 'business';
	if (normalized.includes('nonprofit')) return 'nonprofit';
	return 'other';
}
