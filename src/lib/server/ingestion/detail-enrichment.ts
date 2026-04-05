import { load } from 'cheerio';
import {
	addFieldProvenance,
	addImageCandidate,
	addUrlEvidence,
	isGenericImageUrl,
	selectPrimaryImageCandidate
} from './evidence';
import type {
	AdapterConfig,
	DetailEnrichmentConfig,
	DetailEnrichmentField,
	DetailEnrichmentSelector,
	FieldProvenanceMap,
	ImageCandidate,
	NormalizedRecord,
	ParsedItem,
	UrlRole,
	UrlRoleMap
} from './types';
import { absoluteUrl } from './shared';
import { normalizeUrl } from './dedupe';

type DetailEnrichmentArtifacts = {
	records: NormalizedRecord[];
	warnings: string[];
	fieldProvenance: FieldProvenanceMap[];
	urlRoles: UrlRoleMap[];
	imageCandidates: ImageCandidate[][];
	diagnostics: Array<Record<string, unknown>>;
};

export async function enrichNormalizedRecords(
	config: AdapterConfig,
	parsedItems: ParsedItem[],
	records: NormalizedRecord[]
): Promise<DetailEnrichmentArtifacts> {
	const enrichment = (config.detailEnrichment ?? null) as DetailEnrichmentConfig | null;
	if (!enrichment?.enabled || records.length === 0) {
		return {
			records,
			warnings: [],
			fieldProvenance: records.map(() => ({})),
			urlRoles: records.map(() => ({})),
			imageCandidates: records.map(() => []),
			diagnostics: records.map(() => ({}))
		};
	}

	const warnings: string[] = [];
	const nextRecords: NormalizedRecord[] = [];
	const fieldProvenance: FieldProvenanceMap[] = [];
	const urlRoles: UrlRoleMap[] = [];
	const imageCandidates: ImageCandidate[][] = [];
	const diagnostics: Array<Record<string, unknown>> = [];

	for (let index = 0; index < records.length; index += 1) {
		const record = records[index]!;
		const parsedItem = parsedItems[index];
		const detailUrl = getDetailUrl(enrichment, parsedItem, record);

		let provenance: FieldProvenanceMap = {};
		let links: UrlRoleMap = {};
		let images: ImageCandidate[] = [];
		let recordDiagnostics: Record<string, unknown> = {};

		if (!detailUrl) {
			nextRecords.push(record);
			fieldProvenance.push(provenance);
			urlRoles.push(links);
			imageCandidates.push(images);
			diagnostics.push(recordDiagnostics);
			continue;
		}

		links = addUrlEvidence(links, {
			url: detailUrl,
			role: 'detail_page',
			source: 'detail_page',
			confidence: 1,
			extracted: true
		});

		try {
			const html = await fetchDetailHtml(detailUrl);
			const enriched = extractDetailArtifacts(html, detailUrl, enrichment);
			provenance = enriched.fieldProvenance;
			links = enriched.urlRoles;
			images = enriched.imageCandidates;
			recordDiagnostics = enriched.diagnostics;
			nextRecords.push(
				applyExtractedFields(record, enriched.extractedFields, enrichment.preferPageFields ?? [])
			);
		} catch (error) {
			warnings.push(
				`${record.title}: ${error instanceof Error ? error.message : 'Page enrichment failed'}`
			);
			recordDiagnostics = {
				detailEnrichmentFailed: true,
				detailUrl
			};
			nextRecords.push(record);
		}

		fieldProvenance.push(provenance);
		urlRoles.push(links);
		imageCandidates.push(images);
		diagnostics.push(recordDiagnostics);
	}

	return {
		records: nextRecords,
		warnings,
		fieldProvenance,
		urlRoles,
		imageCandidates,
		diagnostics
	};
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

function extractDetailArtifacts(
	html: string,
	detailUrl: string,
	config: DetailEnrichmentConfig
): {
	extractedFields: Partial<Record<DetailEnrichmentField, string | null>>;
	fieldProvenance: FieldProvenanceMap;
	urlRoles: UrlRoleMap;
	imageCandidates: ImageCandidate[];
	diagnostics: Record<string, unknown>;
} {
	const $ = load(html);
	let fieldProvenance: FieldProvenanceMap = {};
	let urlRoles: UrlRoleMap = {};
	let imageCandidates: ImageCandidate[] = [];

	const extractedFields: Partial<Record<DetailEnrichmentField, string | null>> = {};

	const description =
		extractField($, config.selectors?.description)?.value ??
		$('meta[name="description"]').attr('content')?.trim() ??
		null;
	if (description) {
		extractedFields.description = description;
		fieldProvenance = addFieldProvenance(fieldProvenance, 'description', {
			value: description,
			source: 'detail_page',
			confidence: 0.95
		});
	}

	const configuredImage = extractField($, config.selectors?.image_url, detailUrl);
	if (configuredImage?.value) {
		imageCandidates = addImageCandidate(imageCandidates, {
			url: configuredImage.value,
			role: 'detail',
			source: 'detail_page',
			sourceUrl: detailUrl,
			confidence: isGenericImageUrl(configuredImage.value) ? 0.18 : 0.94,
			isMeaningful: !isGenericImageUrl(configuredImage.value),
			note: 'Configured image selector'
		});
	}

	const organizationName = extractField($, config.selectors?.organization_name)?.value ?? null;
	if (organizationName) {
		extractedFields.organization_name = organizationName;
		fieldProvenance = addFieldProvenance(fieldProvenance, 'organization_name', {
			value: organizationName,
			source: 'detail_page',
			confidence: 0.9
		});
	}

	const locationName = extractField($, config.selectors?.location_name)?.value ?? null;
	if (locationName) {
		extractedFields.location_name = locationName;
		fieldProvenance = addFieldProvenance(fieldProvenance, 'location_name', {
			value: locationName,
			source: 'detail_page',
			confidence: 0.9
		});
	}

	const locationAddress = extractField($, config.selectors?.location_address)?.value ?? null;
	if (locationAddress) {
		extractedFields.location_address = locationAddress;
		fieldProvenance = addFieldProvenance(fieldProvenance, 'location_address', {
			value: locationAddress,
			source: 'detail_page',
			confidence: 0.9
		});
	}

	const configuredLink = extractField($, config.selectors?.registration_url, detailUrl);
	if (configuredLink?.value) {
		extractedFields.registration_url = configuredLink.value;
		fieldProvenance = addFieldProvenance(fieldProvenance, 'registration_url', {
			value: configuredLink.value,
			source: 'detail_page',
			confidence: 0.78,
			note: 'Configured registration_url selector'
		});
	}

	const heuristicFields = extractEventPageHeuristics($, detailUrl);
	for (const [field, value] of Object.entries(heuristicFields.extractedFields) as Array<
		[DetailEnrichmentField, string | null]
	>) {
		if (!value) continue;
		if (!extractedFields[field]) extractedFields[field] = value;
	}
	fieldProvenance = mergeFieldProvenance(fieldProvenance, heuristicFields.fieldProvenance);
	urlRoles = mergeUrlRoles(urlRoles, heuristicFields.urlRoles);

	imageCandidates = addMetaImages(imageCandidates, $, detailUrl);
	imageCandidates = addInlineImages(imageCandidates, $, detailUrl);
	if (!extractedFields.image_url) {
		extractedFields.image_url =
			imageCandidates.find((candidate) => candidate.isMeaningful !== false)?.url ?? null;
		if (extractedFields.image_url) {
			fieldProvenance = addFieldProvenance(fieldProvenance, 'image_url', {
				value: extractedFields.image_url,
				source: 'structured_data',
				confidence: 0.88,
				note: 'Fallback image from meta or inline discovery'
			});
		}
	}

	const structured = extractStructuredData($, detailUrl);
	fieldProvenance = mergeFieldProvenance(fieldProvenance, structured.fieldProvenance);
	urlRoles = structured.urlRoles;
	imageCandidates = [...imageCandidates, ...structured.imageCandidates];

	if (!extractedFields.image_url) {
		const primaryImage = selectPrimaryImageCandidate(imageCandidates);
		if (primaryImage?.url && primaryImage.isMeaningful !== false) {
			extractedFields.image_url = primaryImage.url;
			fieldProvenance = addFieldProvenance(fieldProvenance, 'image_url', {
				value: primaryImage.url,
				source: primaryImage.source,
				confidence: primaryImage.confidence ?? 0.88,
				note: primaryImage.note ?? 'Best ranked image candidate from detail enrichment'
			});
		}
	}

	const linkEvidence = classifyPageLinks($, detailUrl);
	urlRoles = mergeUrlRoles(urlRoles, linkEvidence);

	if (configuredLink?.value) {
		urlRoles = addUrlEvidence(
			urlRoles,
			classifyConfiguredLink(configuredLink.value, configuredLink.label, detailUrl)
		);
	}

	return {
		extractedFields,
		fieldProvenance,
		urlRoles,
		imageCandidates,
		diagnostics: {
			detailUrl,
			structuredDataCount: structured.structuredDataCount,
			linkRoleCount: Object.values(urlRoles).reduce(
				(sum, entries) => sum + ((entries as Array<unknown> | undefined)?.length ?? 0),
				0
			),
			imageCandidateCount: imageCandidates.length
		}
	};
}

function extractEventPageHeuristics($: ReturnType<typeof load>, detailUrl: string) {
	let extractedFields: Partial<Record<DetailEnrichmentField, string | null>> = {};
	let fieldProvenance: FieldProvenanceMap = {};
	let urlRoles: UrlRoleMap = {};

	const bodyText = cleanText($('body').text()) ?? '';
	const detailsText =
		cleanText(
			$(
				'.tribe-events-single-event-description, .tribe-events-content, .tribe-events-event-meta'
			).text()
		) ?? bodyText;

	const costMatch = detailsText.match(/\bCost:\s*([$][0-9][\d,]*(?:\.\d{2})?)/i);
	if (costMatch?.[1]) {
		extractedFields = { ...extractedFields, cost: costMatch[1] } as typeof extractedFields;
		fieldProvenance = addFieldProvenance(fieldProvenance, 'cost', {
			value: costMatch[1],
			source: 'detail_page',
			confidence: 0.92,
			note: 'Parsed cost from event page text'
		});
	}

	const isoDateMatch = detailsText.match(/\bDate:\s*(\d{4}-\d{2}-\d{2})\b/i);
	if (isoDateMatch?.[1]) {
		const normalizedDate = `${isoDateMatch[1]}T07:00:00.000Z`;
		extractedFields.start_date = normalizedDate;
		fieldProvenance = addFieldProvenance(fieldProvenance, 'start_date', {
			value: normalizedDate,
			source: 'detail_page',
			confidence: 0.9,
			note: 'Parsed ISO event date from detail page text'
		});
	}

	const locationMatch = detailsText.match(
		/\bLocation:\s*([^\n]+?)(?:\s+Cost:|\s+Image:|\s+Event Contact Information:|$)/i
	);
	if (locationMatch?.[1]) {
		const rawLocation = cleanText(locationMatch[1])?.replace(/[–—]/g, '-').trim() ?? null;
		if (rawLocation) {
			const parsedLocation = parseFreeformLocation(rawLocation);
			if (parsedLocation.name) {
				extractedFields.location_name = parsedLocation.name;
				fieldProvenance = addFieldProvenance(fieldProvenance, 'location_name', {
					value: parsedLocation.name,
					source: 'detail_page',
					confidence: 0.88,
					note: 'Parsed location name from event page text'
				});
			}
			if (parsedLocation.address) {
				extractedFields.location_address = parsedLocation.address;
				fieldProvenance = addFieldProvenance(fieldProvenance, 'location_address', {
					value: parsedLocation.address,
					source: 'detail_page',
					confidence: 0.88,
					note: 'Parsed location address from event page text'
				});
			}
			if (parsedLocation.city) {
				extractedFields.location_city = parsedLocation.city;
				fieldProvenance = addFieldProvenance(fieldProvenance, 'location_city', {
					value: parsedLocation.city,
					source: 'detail_page',
					confidence: 0.86
				});
			}
			if (parsedLocation.state) {
				extractedFields.location_state = parsedLocation.state;
				fieldProvenance = addFieldProvenance(fieldProvenance, 'location_state', {
					value: parsedLocation.state,
					source: 'detail_page',
					confidence: 0.86
				});
			}
			if (parsedLocation.zip) {
				extractedFields.location_zip = parsedLocation.zip;
				fieldProvenance = addFieldProvenance(fieldProvenance, 'location_zip', {
					value: parsedLocation.zip,
					source: 'detail_page',
					confidence: 0.86
				});
			}
		}
	}

	const organizerWebsite = normalizeDetailUrl(
		$('a')
			.filter(
				(_, el) => cleanText($(el).text())?.toLowerCase().includes('organizer website') ?? false
			)
			.first()
			.attr('href'),
		detailUrl
	);
	if (organizerWebsite) {
		urlRoles = addUrlEvidence(urlRoles, {
			url: organizerWebsite,
			role: 'organizer',
			source: 'detail_page',
			confidence: 0.9,
			extracted: true
		});
	}

	const venueWebsite = normalizeDetailUrl(
		$('a')
			.filter((_, el) => cleanText($(el).text())?.toLowerCase().includes('venue website') ?? false)
			.first()
			.attr('href'),
		detailUrl
	);
	if (venueWebsite) {
		urlRoles = addUrlEvidence(urlRoles, {
			url: venueWebsite,
			role: 'venue',
			source: 'detail_page',
			confidence: 0.88,
			extracted: true
		});
	}

	return { extractedFields, fieldProvenance, urlRoles };
}

function extractField(
	$: ReturnType<typeof load>,
	selector: DetailEnrichmentSelector | undefined,
	baseUrl?: string
) {
	if (!selector) return null;
	if (typeof selector === 'string') {
		const target = $(selector).first();
		return {
			value: cleanText(target.text()),
			label: cleanText(target.text())
		};
	}

	const target = $(selector.selector).first();
	const value = extractSelectorValue(target, selector, baseUrl);
	return {
		value,
		label: cleanText(target.text())
	};
}

function extractSelectorValue(
	target: ReturnType<ReturnType<typeof load>>,
	selector: Exclude<DetailEnrichmentSelector, string>,
	baseUrl?: string
) {
	switch (selector.extract) {
		case 'html':
			return cleanText(target.html());
		case 'href':
			return normalizeDetailUrl(target.attr('href'), baseUrl);
		case 'src':
			return resolveImageLikeUrl(target, baseUrl);
		case 'attribute':
			return selector.attribute ? cleanText(target.attr(selector.attribute)) : null;
		case 'text':
		default:
			return cleanText(target.text());
	}
}

function addMetaImages(
	candidates: ImageCandidate[],
	$: ReturnType<typeof load>,
	detailUrl: string
) {
	const metaUrls = [
		$('meta[property="og:image"]').attr('content'),
		$('meta[name="twitter:image"]').attr('content')
	]
		.map((value) => normalizeDetailUrl(value, detailUrl))
		.filter((value): value is string => Boolean(value));

	return metaUrls.reduce(
		(acc, url) =>
			addImageCandidate(acc, {
				url,
				role: 'structured',
				source: 'meta',
				sourceUrl: detailUrl,
				confidence: 0.88,
				isMeaningful: !isGenericImageUrl(url)
			}),
		candidates
	);
}

function addInlineImages(
	candidates: ImageCandidate[],
	$: ReturnType<typeof load>,
	detailUrl: string
) {
	return $('img')
		.toArray()
		.reduce((acc, element) => {
			const target = $(element);
			const url = resolveImageLikeUrl(target, detailUrl);
			if (!url) return acc;
			const assessment = assessInlineImageCandidate(target, url);
			return addImageCandidate(acc, {
				url,
				role: 'inline',
				source: 'inline',
				sourceUrl: detailUrl,
				confidence: assessment.confidence,
				isMeaningful: assessment.isMeaningful,
				width: readNumber(target.attr('width')),
				height: readNumber(target.attr('height')),
				note: assessment.note
			});
		}, candidates);
}

function extractStructuredData($: ReturnType<typeof load>, detailUrl: string) {
	let fieldProvenance: FieldProvenanceMap = {};
	let urlRoles: UrlRoleMap = addUrlEvidence(
		{},
		{
			url: detailUrl,
			role: 'detail_page',
			source: 'detail_page',
			confidence: 1,
			extracted: true
		}
	);
	let imageCandidates: ImageCandidate[] = [];
	let structuredDataCount = 0;

	$('script[type="application/ld+json"]').each((_, element) => {
		const raw = $(element).html();
		if (!raw) return;
		const documents = parseJsonLd(raw);
		structuredDataCount += documents.length;

		for (const document of documents) {
			const event = asObject(document);
			if (!event) continue;
			const eventUrl = normalizeDetailUrl(readString(event.url), detailUrl);
			if (eventUrl) {
				urlRoles = addUrlEvidence(urlRoles, {
					url: eventUrl === detailUrl ? detailUrl : eventUrl,
					role: eventUrl === detailUrl ? 'detail_page' : 'canonical_item',
					source: 'structured_data',
					confidence: 0.94,
					extracted: true
				});
			}

			const eventImage = firstString(event.image);
			if (eventImage) {
				imageCandidates = addImageCandidate(imageCandidates, {
					url: normalizeDetailUrl(eventImage, detailUrl) ?? eventImage,
					role: 'structured',
					source: 'structured_data',
					sourceUrl: detailUrl,
					confidence: 0.9,
					isMeaningful: !isGenericImageUrl(eventImage)
				});
			}

			const organizer = asObject(event.organizer);
			if (organizer) {
				const organizerName = readString(organizer.name);
				if (organizerName) {
					fieldProvenance = addFieldProvenance(fieldProvenance, 'organization_name', {
						value: organizerName,
						source: 'structured_data',
						confidence: 0.9
					});
				}
				for (const candidateUrl of [readString(organizer.url), readString(organizer.sameAs)]) {
					const normalized = normalizeDetailUrl(candidateUrl, detailUrl);
					if (!normalized) continue;
					urlRoles = addUrlEvidence(urlRoles, {
						url: normalized,
						role: 'organizer',
						source: 'structured_data',
						confidence: 0.9,
						extracted: true
					});
				}
			}

			const location = asObject(event.location);
			if (location) {
				const locationName = readString(location.name);
				if (locationName) {
					fieldProvenance = addFieldProvenance(fieldProvenance, 'location_name', {
						value: locationName,
						source: 'structured_data',
						confidence: 0.9
					});
				}
				const address = asObject(location.address);
				const fullAddress = [
					readString(address?.streetAddress),
					readString(address?.addressLocality),
					readString(address?.addressRegion),
					readString(address?.postalCode)
				]
					.filter(Boolean)
					.join(', ');
				if (fullAddress) {
					fieldProvenance = addFieldProvenance(fieldProvenance, 'location_address', {
						value: fullAddress,
						source: 'structured_data',
						confidence: 0.88
					});
				}
				for (const candidateUrl of [readString(location.url), readString(location.sameAs)]) {
					const normalized = normalizeDetailUrl(candidateUrl, detailUrl);
					if (!normalized) continue;
					urlRoles = addUrlEvidence(urlRoles, {
						url: normalized,
						role: 'venue',
						source: 'structured_data',
						confidence: 0.88,
						extracted: true
					});
				}
			}
		}
	});

	return { fieldProvenance, urlRoles, imageCandidates, structuredDataCount };
}

function classifyPageLinks($: ReturnType<typeof load>, detailUrl: string) {
	let map: UrlRoleMap = addUrlEvidence(
		{},
		{
			url: detailUrl,
			role: 'detail_page',
			source: 'detail_page',
			confidence: 1,
			extracted: true
		}
	);

	$('a[href]').each((_, element) => {
		const target = $(element);
		const url = normalizeDetailUrl(target.attr('href'), detailUrl);
		if (!url) return;
		const label = cleanText(target.text()) ?? '';
		const klass = (target.attr('class') ?? '').toLowerCase();
		const context = `${label} ${klass}`.toLowerCase();

		let role: UrlRole | null = null;
		if (context.includes('organizer')) role = 'organizer';
		else if (context.includes('venue')) role = 'venue';
		else if (context.includes('register') || context.includes('ticket') || context.includes('rsvp'))
			role = 'registration';
		else if (context.includes('apply') || context.includes('application')) role = 'application';
		else if (context.includes('website')) role = 'canonical_item';

		if (!role) {
			const lcUrl = url.toLowerCase();
			if (lcUrl.includes('docs.google.com/forms') || lcUrl.includes('/apply')) role = 'application';
			else if (
				lcUrl.includes('/register') ||
				lcUrl.includes('eventbrite') ||
				lcUrl.includes('ticket')
			)
				role = 'registration';
			else if (lcUrl !== detailUrl && !lcUrl.includes('google.com/maps')) role = 'canonical_item';
		}

		if (!role) return;
		map = addUrlEvidence(map, {
			url,
			role,
			source: 'detail_page',
			label,
			confidence: role === 'canonical_item' ? 0.78 : 0.85,
			extracted: true
		});
	});

	return map;
}

function classifyConfiguredLink(url: string, label: string | null | undefined, detailUrl: string) {
	const context = `${label ?? ''} ${url}`.toLowerCase();
	let role: UrlRole = 'canonical_item';
	if (context.includes('register') || context.includes('ticket') || context.includes('rsvp')) {
		role = 'registration';
	} else if (
		context.includes('apply') ||
		context.includes('application') ||
		context.includes('vendor')
	) {
		role = 'application';
	} else if (normalizeDetailUrl(url, detailUrl) === detailUrl) {
		role = 'detail_page';
	}

	return {
		url,
		role,
		source: 'detail_page' as const,
		label,
		confidence: role === 'canonical_item' ? 0.76 : 0.86,
		extracted: true
	};
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

function mergeFieldProvenance(
	left: FieldProvenanceMap,
	right: FieldProvenanceMap
): FieldProvenanceMap {
	let merged = left;
	for (const [field, entries] of Object.entries(right) as Array<
		[string, FieldProvenanceMap[string]]
	>) {
		for (const entry of entries) merged = addFieldProvenance(merged, field, entry);
	}
	return merged;
}

function mergeUrlRoles(left: UrlRoleMap, right: UrlRoleMap): UrlRoleMap {
	let merged = left;
	for (const entries of Object.values(right) as Array<UrlRoleMap[UrlRole]>) {
		for (const entry of entries ?? []) merged = addUrlEvidence(merged, entry);
	}
	return merged;
}

function normalizeDetailUrl(value: string | null | undefined, baseUrl?: string) {
	if (!value?.trim()) return null;
	const absolute = absoluteUrl(value.trim(), baseUrl ?? value.trim());
	return normalizeUrl(absolute);
}

function resolveImageLikeUrl(target: ReturnType<ReturnType<typeof load>>, baseUrl?: string) {
	const candidate =
		target.attr('data-src') ||
		target.attr('data-lazy-src') ||
		target.attr('data-original') ||
		readSrcset(target.attr('srcset')) ||
		target.attr('src') ||
		null;
	return normalizeDetailUrl(candidate, baseUrl);
}

function readSrcset(value: string | null | undefined) {
	if (!value) return null;
	return (
		value
			.split(',')
			.map((entry) => entry.trim().split(/\s+/)[0]?.trim() ?? '')
			.filter(Boolean)[0] ?? null
	);
}

function parseJsonLd(value: string): unknown[] {
	try {
		const parsed = JSON.parse(value);
		if (Array.isArray(parsed)) return parsed;
		if (
			parsed &&
			typeof parsed === 'object' &&
			Array.isArray((parsed as { '@graph'?: unknown[] })['@graph'])
		) {
			return (parsed as { '@graph': unknown[] })['@graph'];
		}
		return [parsed];
	} catch {
		return [];
	}
}

function asObject(value: unknown): Record<string, unknown> | null {
	return value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function firstString(value: unknown): string | null {
	if (typeof value === 'string' && value.trim()) return value.trim();
	if (Array.isArray(value)) {
		return (
			value.find(
				(entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
			) ?? null
		);
	}
	return null;
}

function readString(value: unknown): string | null {
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readNumber(value: string | null | undefined) {
	if (!value) return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function cleanText(value: string | null | undefined) {
	if (!value) return null;
	const cleaned = value.replace(/\s+/g, ' ').trim();
	return cleaned.length > 0 ? cleaned : null;
}

function assessInlineImageCandidate(
	target: ReturnType<ReturnType<typeof load>>,
	url: string
): {
	confidence: number;
	isMeaningful: boolean;
	note: string | null;
} {
	const alt = (target.attr('alt') ?? '').toLowerCase();
	const klass = (target.attr('class') ?? '').toLowerCase();
	const parentContext = [
		target.parent().attr('class') ?? '',
		target.closest('header').attr('class') ?? '',
		target.closest('footer').attr('class') ?? '',
		target
			.closest('.logo-holder, .logolink, .site-logo, .header, .subfooter, .footer')
			.attr('class') ?? '',
		target
			.closest(
				'.tribe-events-single-event-description, .tribe-events-content, .tribe-events-event-image, .tribe-events-featured-image, article'
			)
			.attr('class') ?? ''
	]
		.join(' ')
		.toLowerCase();
	const textContext = `${alt} ${klass} ${parentContext} ${url}`.toLowerCase();

	if (
		textContext.includes('submit an event') ||
		textContext.includes('loading events') ||
		textContext.includes('tribe-loading') ||
		textContext.includes('spinner')
	) {
		return { confidence: 0.05, isMeaningful: false, note: 'Promotional or loading graphic' };
	}

	if (
		textContext.includes('logoimg') ||
		textContext.includes('logolink') ||
		textContext.includes('logo-holder') ||
		textContext.includes('news from native california') ||
		textContext.includes('_logo') ||
		textContext.includes('-logo') ||
		textContext.includes('logo.')
	) {
		return { confidence: 0.02, isMeaningful: false, note: 'Site logo or branding image' };
	}

	if (target.closest('header, footer, .header, .subfooter, .footer').length > 0) {
		return { confidence: 0.08, isMeaningful: false, note: 'Header or footer image' };
	}

	if (
		target.closest(
			'.tribe-events-single-event-description, .tribe-events-content, .tribe-events-event-image, .tribe-events-featured-image, article'
		).length > 0
	) {
		return {
			confidence: 0.86,
			isMeaningful: !isGenericImageUrl(url),
			note: 'Image found inside event content'
		};
	}

	if (target.closest('.tribe-events-after-html').length > 0) {
		return { confidence: 0.2, isMeaningful: false, note: 'Below-the-event promotional area' };
	}

	return {
		confidence: 0.6,
		isMeaningful: !isGenericImageUrl(url),
		note: null
	};
}

function parseFreeformLocation(value: string) {
	const normalized = value.replace(/\s+/g, ' ').trim();
	const [left, right] = normalized.split(/\s+-\s+/, 2);
	const addressBlock = right ?? left;
	const name = right ? cleanText(left) : null;
	const address = cleanText(addressBlock);
	const parts = addressBlock
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean);
	const last = parts[parts.length - 1] ?? '';
	const city = parts.length >= 2 ? (parts[parts.length - 2] ?? null) : null;
	const stateZip = last.match(/\b([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\b/);
	return {
		name,
		address,
		city,
		state: stateZip?.[1] ?? null,
		zip: stateZip?.[2] ?? null
	};
}
