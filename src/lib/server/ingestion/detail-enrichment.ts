import { load } from 'cheerio';
import type {
	AdapterConfig,
	DetailEnrichmentConfig,
	DetailEnrichmentField,
	DetailEnrichmentSelector,
	NormalizedRecord,
	ParsedItem
} from './types';
import { normalizeUrl } from './dedupe';

type EnrichmentResult = {
	records: NormalizedRecord[];
	warnings: string[];
};

export async function enrichNormalizedRecords(
	config: AdapterConfig,
	parsedItems: ParsedItem[],
	records: NormalizedRecord[]
): Promise<EnrichmentResult> {
	const enrichment = (config.detailEnrichment ?? null) as DetailEnrichmentConfig | null;
	if (!enrichment?.enabled || records.length === 0) {
		return { records, warnings: [] };
	}

	const warnings: string[] = [];
	const nextRecords: NormalizedRecord[] = [];

	for (let index = 0; index < records.length; index += 1) {
		const record = records[index]!;
		const parsedItem = parsedItems[index];
		if (record.coil !== 'events') {
			nextRecords.push(record);
			continue;
		}

		const detailUrl = getDetailUrl(enrichment, parsedItem, record);
		if (!detailUrl) {
			nextRecords.push(record);
			continue;
		}

		try {
			const html = await fetchDetailHtml(detailUrl);
			const extracted = extractFields(html, detailUrl, enrichment);
			nextRecords.push(applyExtractedFields(record, extracted, enrichment.preferPageFields ?? []));
		} catch (error) {
			warnings.push(
				`${record.title}: ${error instanceof Error ? error.message : 'Page enrichment failed'}`
			);
			nextRecords.push(record);
		}
	}

	return { records: nextRecords, warnings };
}

function getDetailUrl(
	config: DetailEnrichmentConfig,
	parsedItem: ParsedItem | undefined,
	record: NormalizedRecord
) {
	const source =
		config.fetchFrom === 'normalizedUrl' ? record.url : (parsedItem?.sourceItemUrl ?? record.url);
	return normalizeUrl(source);
}

async function fetchDetailHtml(url: string) {
	const response = await fetch(url, {
		headers: {
			Accept: 'text/html, application/xhtml+xml;q=0.9, */*;q=0.8',
			'User-Agent': 'KnowledgeBasket-SourceOps/1.0 (+https://knowledgebasket.org)'
		},
		signal: AbortSignal.timeout(10000)
	});

	if (!response.ok) {
		throw new Error(`HTML enrichment returned HTTP ${response.status}`);
	}

	return response.text();
}

function extractFields(
	html: string,
	detailUrl: string,
	config: DetailEnrichmentConfig
): Partial<Record<DetailEnrichmentField, string | null>> {
	const $ = load(html);

	return {
		description:
			extractField($, config.selectors?.description) ??
			$('meta[name="description"]').attr('content')?.trim() ??
			null,
		image_url:
			extractField($, config.selectors?.image_url) ??
			$('meta[property="og:image"]').attr('content')?.trim() ??
			$('meta[name="twitter:image"]').attr('content')?.trim() ??
			null,
		organization_name: extractField($, config.selectors?.organization_name) ?? null,
		location_name: extractField($, config.selectors?.location_name) ?? null,
		location_address: extractField($, config.selectors?.location_address) ?? null,
		registration_url: extractField($, config.selectors?.registration_url) ?? detailUrl
	};
}

function extractField($: ReturnType<typeof load>, selector: DetailEnrichmentSelector | undefined) {
	if (!selector) return null;
	if (typeof selector === 'string') {
		return cleanText($(selector).first().text());
	}

	const target = $(selector.selector).first();
	switch (selector.extract) {
		case 'html':
			return cleanText(target.html());
		case 'href':
			return cleanText(target.attr('href'));
		case 'src':
			return cleanText(target.attr('src'));
		case 'attribute':
			return selector.attribute ? cleanText(target.attr(selector.attribute)) : null;
		case 'text':
		default:
			return cleanText(target.text());
	}
}

function applyExtractedFields(
	record: NormalizedRecord,
	extracted: Partial<Record<DetailEnrichmentField, string | null>>,
	preferPageFields: DetailEnrichmentField[]
): NormalizedRecord {
	const next = { ...record };
	const prefer = new Set(preferPageFields);

	for (const [field, value] of Object.entries(extracted) as Array<
		[DetailEnrichmentField, string | null | undefined]
	>) {
		if (!value) continue;
		const currentValue = next[field as keyof NormalizedRecord];
		const shouldReplace =
			prefer.has(field) ||
			currentValue == null ||
			(typeof currentValue === 'string' && currentValue.trim().length === 0);
		if (shouldReplace) {
			(next as Record<string, unknown>)[field] = value;
		}
	}

	return next;
}

function cleanText(value: string | null | undefined) {
	if (!value) return null;
	const cleaned = value.replace(/\s+/g, ' ').trim();
	return cleaned.length > 0 ? cleaned : null;
}
