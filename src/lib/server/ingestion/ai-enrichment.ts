import { addFieldProvenance, addUrlEvidence } from './evidence';
import { normalizeUrl } from './dedupe';
import type {
	AiExtractedFacts,
	ExtractedFieldSuggestion,
	FieldProvenanceMap,
	NormalizedRecord,
	ParsedItem,
	SourceRecord,
	UrlRoleMap
} from './types';

type AiEnrichmentConfig = {
	enabled?: boolean;
	model?: string;
	maxRecordsPerRun?: number;
	minDescriptionLength?: number;
};

type AiEnrichmentArtifacts = {
	records: NormalizedRecord[];
	fieldProvenance: FieldProvenanceMap[];
	urlRoles: UrlRoleMap[];
	extractedFacts: AiExtractedFacts[];
	diagnostics: Array<Record<string, unknown>>;
	stats: {
		attempted: number;
		completed: number;
		skipped: number;
		conflicts: number;
	};
};

const DEFAULT_MODEL = process.env.OPENAI_INGESTION_MODEL?.trim() || 'gpt-5-mini';
const RESPONSES_ENDPOINT =
	process.env.OPENAI_RESPONSES_URL?.trim() || 'https://api.openai.com/v1/responses';

export function shouldRunAiEnrichment(source: SourceRecord) {
	const config = readAiConfig(source);
	return Boolean(process.env.OPENAI_API_KEY?.trim()) && config.enabled !== false;
}

export async function applyAiEnrichment(
	source: SourceRecord,
	items: ParsedItem[],
	records: NormalizedRecord[],
	fieldProvenance: FieldProvenanceMap[],
	urlRoles: UrlRoleMap[],
	diagnostics: Array<Record<string, unknown>>
): Promise<AiEnrichmentArtifacts> {
	const config = readAiConfig(source);
	const maxRecordsPerRun = clampInteger(config.maxRecordsPerRun, 8);
	const minDescriptionLength = clampInteger(config.minDescriptionLength, 120);

	const nextRecords = [...records];
	const nextFieldProvenance = [...fieldProvenance];
	const nextUrlRoles = [...urlRoles];
	const nextDiagnostics = diagnostics.map((entry) => ({ ...entry }));
	const extractedFacts: AiExtractedFacts[] = records.map(() => emptyFacts());

	let attempted = 0;
	let completed = 0;
	let skipped = 0;
	let conflicts = 0;

	for (let index = 0; index < records.length; index += 1) {
		const record = records[index]!;
		const item = items[index];
		if (!shouldEnrichRecord(record, item, maxRecordsPerRun > attempted, minDescriptionLength)) {
			skipped += 1;
			continue;
		}

		attempted += 1;

		try {
			const facts = await enrichRecordWithAi(source, item, record, nextUrlRoles[index] ?? {});
			extractedFacts[index] = facts;
			const applied = applyFactsToRecord(
				record,
				facts,
				nextFieldProvenance[index] ?? {},
				nextUrlRoles[index] ?? {}
			);

			nextRecords[index] = applied.record;
			nextFieldProvenance[index] = applied.fieldProvenance;
			nextUrlRoles[index] = applied.urlRoles;
			nextDiagnostics[index] = {
				...nextDiagnostics[index],
				aiEnrichmentApplied: true,
				aiModel: facts.model ?? DEFAULT_MODEL,
				aiOfferCount: facts.offers.length,
				aiConflictCount: facts.conflicts.length
			};
			completed += 1;
			conflicts += facts.conflicts.length;
		} catch (error) {
			nextDiagnostics[index] = {
				...nextDiagnostics[index],
				aiEnrichmentFailed: true,
				aiEnrichmentError: error instanceof Error ? error.message : 'Unknown AI enrichment failure'
			};
		}
	}

	return {
		records: nextRecords,
		fieldProvenance: nextFieldProvenance,
		urlRoles: nextUrlRoles,
		extractedFacts,
		diagnostics: nextDiagnostics,
		stats: { attempted, completed, skipped, conflicts }
	};
}

function readAiConfig(source: SourceRecord): AiEnrichmentConfig {
	const adapterConfig =
		source.adapterConfig && typeof source.adapterConfig === 'object'
			? (source.adapterConfig as Record<string, unknown>)
			: {};
	const config =
		adapterConfig.aiEnrichment && typeof adapterConfig.aiEnrichment === 'object'
			? (adapterConfig.aiEnrichment as Record<string, unknown>)
			: {};

	return {
		enabled: typeof config.enabled === 'boolean' ? config.enabled : true,
		model:
			typeof config.model === 'string' && config.model.trim() ? config.model.trim() : DEFAULT_MODEL,
		maxRecordsPerRun:
			typeof config.maxRecordsPerRun === 'number' ? config.maxRecordsPerRun : undefined,
		minDescriptionLength:
			typeof config.minDescriptionLength === 'number' ? config.minDescriptionLength : undefined
	};
}

function clampInteger(value: number | undefined, fallback: number) {
	if (!Number.isFinite(value)) return fallback;
	return Math.max(1, Math.floor(value!));
}

function shouldEnrichRecord(
	record: NormalizedRecord,
	item: ParsedItem | undefined,
	withinBudget: boolean,
	minDescriptionLength: number
) {
	if (!withinBudget) return false;
	const text = [record.title, record.description, readRawText(item?.fields)]
		.filter(Boolean)
		.join(' ');
	if (text.trim().length < minDescriptionLength) return false;

	switch (record.coil) {
		case 'events':
			return Boolean(
				!record.cost ||
				!record.organization_name ||
				!record.location_city ||
				!record.location_state ||
				!record.location_zip ||
				(record.location_name && looksLikeFullAddress(record.location_name)) ||
				(record.registration_url &&
					normalizeUrl(record.registration_url) === normalizeUrl(item?.sourceItemUrl))
			);
		case 'funding':
			return Boolean(!record.funder_name || !record.deadline || !record.application_url);
		case 'jobs':
			return Boolean(!record.organization_name || !record.application_url || !record.closing_date);
		case 'red_pages':
			return Boolean(!record.organization_name || !record.city || !record.state);
		case 'toolbox':
			return Boolean(!record.publisher || !record.publication_date);
	}
}

async function enrichRecordWithAi(
	source: SourceRecord,
	item: ParsedItem | undefined,
	record: NormalizedRecord,
	urlRoles: UrlRoleMap
) {
	const apiKey = process.env.OPENAI_API_KEY?.trim();
	if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

	const payload = {
		source: {
			id: source.id,
			name: source.name,
			slug: source.slug,
			coil: record.coil
		},
		record,
		sourceItem: {
			id: item?.sourceItemId ?? null,
			url: item?.sourceItemUrl ?? null,
			fields: sanitizeRawFields(item?.fields ?? {})
		},
		urlRoles
	};

	const response = await fetch(RESPONSES_ENDPOINT, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`
		},
		body: JSON.stringify({
			model: readAiConfig(source).model ?? DEFAULT_MODEL,
			store: false,
			instructions:
				'You extract structured enrichment facts for an ingestion pipeline. Return JSON only. Do not invent facts. Use null when uncertain. Prefer conflicts over overwriting established values. Extract repeatable offers/prices, people, parsed location parts, conservative field suggestions, and explicit conflicts.',
			input: JSON.stringify(payload),
			text: {
				format: {
					type: 'json_schema',
					name: 'ingestion_ai_enrichment',
					strict: true,
					schema: aiEnrichmentSchema
				}
			}
		})
	});

	if (!response.ok) {
		throw new Error(`OpenAI enrichment failed with HTTP ${response.status}`);
	}

	const data = (await response.json()) as Record<string, unknown>;
	const rawJson = extractResponseText(data);
	const parsed = JSON.parse(rawJson) as AiExtractedFacts;
	return normalizeFacts({
		...parsed,
		model:
			typeof data.model === 'string' ? data.model : (readAiConfig(source).model ?? DEFAULT_MODEL)
	});
}

function applyFactsToRecord(
	record: NormalizedRecord,
	facts: AiExtractedFacts,
	fieldProvenance: FieldProvenanceMap,
	urlRoles: UrlRoleMap
) {
	let nextRecord = { ...record };
	let nextFieldProvenance = fieldProvenance;
	let nextUrlRoles = urlRoles;

	const suggestionMap = new Map(facts.fieldSuggestions.map((entry) => [entry.field, entry]));

	if (record.coil === 'events') {
		const eventRecord = { ...nextRecord } as Extract<NormalizedRecord, { coil: 'events' }>;
		const costSuggestion =
			readSuggestion(suggestionMap, 'cost') ?? deriveCostFromOffers(facts.offers);
		if (!eventRecord.cost && costSuggestion?.value) {
			eventRecord.cost = costSuggestion.value;
			nextFieldProvenance = addFieldProvenance(nextFieldProvenance, 'cost', {
				value: costSuggestion.value,
				source: 'ai',
				confidence: costSuggestion.confidence ?? 0.68,
				note: costSuggestion.reason ?? 'AI-extracted event cost'
			});
		}

		const location = facts.locationParts;
		if (location) {
			if (
				shouldApplySuggestion(eventRecord.location_name, location.name, eventRecord.location_name)
			) {
				eventRecord.location_name = location.name;
				nextFieldProvenance = addFieldProvenance(nextFieldProvenance, 'location_name', {
					value: location.name,
					source: 'ai',
					confidence: location.confidence ?? 0.7,
					note: 'AI-parsed venue/location name'
				});
			}
			const formattedAddress = formatAddress(location);
			if (
				shouldApplySuggestion(
					eventRecord.location_address,
					formattedAddress,
					eventRecord.location_address
				)
			) {
				eventRecord.location_address = formattedAddress;
				nextFieldProvenance = addFieldProvenance(nextFieldProvenance, 'location_address', {
					value: formattedAddress,
					source: 'ai',
					confidence: location.confidence ?? 0.7,
					note: 'AI-parsed address components'
				});
			}
			eventRecord.location_city = chooseMissingValue(eventRecord.location_city, location.city);
			eventRecord.location_state = chooseMissingValue(eventRecord.location_state, location.state);
			eventRecord.location_zip = chooseMissingValue(eventRecord.location_zip, location.postalCode);

			if (eventRecord.location_city && eventRecord.location_city !== record.location_city) {
				nextFieldProvenance = addFieldProvenance(nextFieldProvenance, 'location_city', {
					value: eventRecord.location_city,
					source: 'ai',
					confidence: location.confidence ?? 0.68,
					note: 'AI-parsed location component'
				});
			}
			if (eventRecord.location_state && eventRecord.location_state !== record.location_state) {
				nextFieldProvenance = addFieldProvenance(nextFieldProvenance, 'location_state', {
					value: eventRecord.location_state,
					source: 'ai',
					confidence: location.confidence ?? 0.68,
					note: 'AI-parsed location component'
				});
			}
			if (eventRecord.location_zip && eventRecord.location_zip !== record.location_zip) {
				nextFieldProvenance = addFieldProvenance(nextFieldProvenance, 'location_zip', {
					value: eventRecord.location_zip,
					source: 'ai',
					confidence: location.confidence ?? 0.68,
					note: 'AI-parsed location component'
				});
			}
		}

		const organizationSuggestion =
			readSuggestion(suggestionMap, 'organization_name') ??
			personToOrganizationSuggestion(facts.people);
		if (!eventRecord.organization_name && organizationSuggestion?.value) {
			eventRecord.organization_name = organizationSuggestion.value;
			nextFieldProvenance = addFieldProvenance(nextFieldProvenance, 'organization_name', {
				value: organizationSuggestion.value,
				source: 'ai',
				confidence: organizationSuggestion.confidence ?? 0.64,
				note: organizationSuggestion.reason ?? 'AI-extracted organization'
			});
		}

		const registrationSuggestion = readSuggestion(suggestionMap, 'registration_url');
		if (!eventRecord.registration_url && registrationSuggestion?.value) {
			eventRecord.registration_url = registrationSuggestion.value;
			nextFieldProvenance = addFieldProvenance(nextFieldProvenance, 'registration_url', {
				value: registrationSuggestion.value,
				source: 'ai',
				confidence: registrationSuggestion.confidence ?? 0.62,
				note: registrationSuggestion.reason ?? 'AI-extracted registration link'
			});
			nextUrlRoles = addUrlEvidence(nextUrlRoles, {
				url: registrationSuggestion.value,
				role: 'registration',
				source: 'ai',
				confidence: registrationSuggestion.confidence ?? 0.62,
				extracted: true
			});
		}

		nextRecord = eventRecord;
	}

	if (record.coil === 'funding') {
		const fundingRecord = { ...nextRecord } as Extract<NormalizedRecord, { coil: 'funding' }>;
		const funderSuggestion = readSuggestion(suggestionMap, 'funder_name');
		if (!fundingRecord.funder_name && funderSuggestion?.value) {
			fundingRecord.funder_name = funderSuggestion.value;
			nextFieldProvenance = addFieldProvenance(nextFieldProvenance, 'funder_name', {
				value: funderSuggestion.value,
				source: 'ai',
				confidence: funderSuggestion.confidence ?? 0.64,
				note: funderSuggestion.reason ?? 'AI-extracted funder'
			});
		}
		nextRecord = fundingRecord;
	}

	if (record.coil === 'jobs') {
		const jobRecord = { ...nextRecord } as Extract<NormalizedRecord, { coil: 'jobs' }>;
		const employerSuggestion = readSuggestion(suggestionMap, 'organization_name');
		if (!jobRecord.organization_name && employerSuggestion?.value) {
			jobRecord.organization_name = employerSuggestion.value;
			nextFieldProvenance = addFieldProvenance(nextFieldProvenance, 'organization_name', {
				value: employerSuggestion.value,
				source: 'ai',
				confidence: employerSuggestion.confidence ?? 0.64,
				note: employerSuggestion.reason ?? 'AI-extracted employer'
			});
		}
		nextRecord = jobRecord;
	}

	return {
		record: nextRecord,
		fieldProvenance: nextFieldProvenance,
		urlRoles: nextUrlRoles
	};
}

function deriveCostFromOffers(offers: AiExtractedFacts['offers']): ExtractedFieldSuggestion | null {
	const primary = offers.find((offer) => offer.priceText || offer.amount != null);
	if (!primary) return null;
	return {
		field: 'cost',
		value:
			primary.priceText ??
			(primary.amount != null
				? `${primary.currency === 'USD' || !primary.currency ? '$' : `${primary.currency} `}${primary.amount}`
				: null),
		confidence: primary.confidence,
		reason: primary.label ?? 'AI-extracted offer'
	};
}

function personToOrganizationSuggestion(
	people: AiExtractedFacts['people']
): ExtractedFieldSuggestion | null {
	const organizer = people.find((person) =>
		Boolean(person.role && /organizer|host|provider|publisher|funder|employer/i.test(person.role))
	);
	if (!organizer) return null;
	return {
		field: 'organization_name',
		value: organizer.affiliation ?? organizer.name,
		confidence: organizer.confidence,
		reason: organizer.role ?? 'AI-extracted organization from people'
	};
}

function chooseMissingValue(current: string | null, proposed: string | null) {
	if (current?.trim()) return current;
	return proposed?.trim() ? proposed : current;
}

function shouldApplySuggestion(
	current: string | null,
	proposed: string | null,
	original: string | null
) {
	if (!proposed?.trim()) return false;
	if (!current?.trim()) return true;
	return Boolean(original && looksLikeFullAddress(original) && proposed !== current);
}

function formatAddress(location: AiExtractedFacts['locationParts']) {
	if (!location) return null;
	const parts = [location.street, location.city, location.state, location.postalCode].filter(
		Boolean
	);
	return parts.length > 0 ? parts.join(', ') : null;
}

function readSuggestion(suggestions: Map<string, ExtractedFieldSuggestion>, field: string) {
	return suggestions.get(field) ?? null;
}

function readRawText(fields: Record<string, unknown> | undefined) {
	if (!fields || typeof fields !== 'object') return '';
	return Object.values(fields)
		.flatMap((value) => (Array.isArray(value) ? value : [value]))
		.filter((value): value is string => typeof value === 'string')
		.join(' ');
}

function sanitizeRawFields(fields: Record<string, unknown>) {
	const trimmedEntries = Object.entries(fields)
		.slice(0, 24)
		.map(([key, value]) => [key, sanitizeUnknown(value)]);
	return Object.fromEntries(trimmedEntries);
}

function sanitizeUnknown(value: unknown): unknown {
	if (typeof value === 'string') return value.slice(0, 1500);
	if (Array.isArray(value)) return value.slice(0, 12).map((entry) => sanitizeUnknown(entry));
	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>)
				.slice(0, 12)
				.map(([key, entry]) => [key, sanitizeUnknown(entry)])
		);
	}
	return value;
}

function normalizeFacts(facts: AiExtractedFacts): AiExtractedFacts {
	return {
		offers: Array.isArray(facts.offers) ? facts.offers : [],
		people: Array.isArray(facts.people) ? facts.people : [],
		locationParts: facts.locationParts ?? null,
		fieldSuggestions: Array.isArray(facts.fieldSuggestions) ? facts.fieldSuggestions : [],
		conflicts: Array.isArray(facts.conflicts) ? facts.conflicts : [],
		notes: Array.isArray(facts.notes)
			? facts.notes.filter((entry) => typeof entry === 'string')
			: [],
		model: facts.model ?? null
	};
}

function emptyFacts(): AiExtractedFacts {
	return {
		offers: [],
		people: [],
		locationParts: null,
		fieldSuggestions: [],
		conflicts: [],
		notes: [],
		model: null
	};
}

function looksLikeFullAddress(value: string | null | undefined) {
	if (!value) return false;
	return /\d{2,}.*,\s*[A-Za-z .'-]+,\s*[A-Z]{2}\b/.test(value);
}

function extractResponseText(payload: Record<string, unknown>) {
	if (typeof payload.output_text === 'string' && payload.output_text.trim())
		return payload.output_text;

	const output = Array.isArray(payload.output) ? payload.output : [];
	for (const item of output) {
		if (!item || typeof item !== 'object') continue;
		const content = Array.isArray((item as { content?: unknown }).content)
			? ((item as { content: Array<Record<string, unknown>> }).content ?? [])
			: [];
		for (const entry of content) {
			const text =
				typeof entry.text === 'string'
					? entry.text
					: entry.text &&
						  typeof entry.text === 'object' &&
						  typeof (entry.text as { value?: unknown }).value === 'string'
						? ((entry.text as { value: string }).value ?? '')
						: '';
			if (text.trim()) return text;
		}
	}

	throw new Error('OpenAI enrichment response did not include structured text output');
}

const aiEnrichmentSchema = {
	type: 'object',
	properties: {
		offers: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					label: { type: ['string', 'null'] },
					amount: { type: ['number', 'null'] },
					currency: { type: ['string', 'null'] },
					priceText: { type: ['string', 'null'] },
					notes: { type: ['string', 'null'] },
					confidence: { type: ['number', 'null'] }
				},
				required: ['label', 'amount', 'currency', 'priceText', 'notes', 'confidence'],
				additionalProperties: false
			}
		},
		people: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					name: { type: 'string' },
					role: { type: ['string', 'null'] },
					affiliation: { type: ['string', 'null'] },
					confidence: { type: ['number', 'null'] }
				},
				required: ['name', 'role', 'affiliation', 'confidence'],
				additionalProperties: false
			}
		},
		locationParts: {
			type: ['object', 'null'],
			properties: {
				name: { type: ['string', 'null'] },
				street: { type: ['string', 'null'] },
				city: { type: ['string', 'null'] },
				state: { type: ['string', 'null'] },
				postalCode: { type: ['string', 'null'] },
				country: { type: ['string', 'null'] },
				confidence: { type: ['number', 'null'] }
			},
			required: ['name', 'street', 'city', 'state', 'postalCode', 'country', 'confidence'],
			additionalProperties: false
		},
		fieldSuggestions: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					field: { type: 'string' },
					value: { type: ['string', 'null'] },
					confidence: { type: ['number', 'null'] },
					reason: { type: ['string', 'null'] }
				},
				required: ['field', 'value', 'confidence', 'reason'],
				additionalProperties: false
			}
		},
		conflicts: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					field: { type: 'string' },
					existingValue: { type: ['string', 'null'] },
					proposedValue: { type: ['string', 'null'] },
					reason: { type: ['string', 'null'] },
					confidence: { type: ['number', 'null'] }
				},
				required: ['field', 'existingValue', 'proposedValue', 'reason', 'confidence'],
				additionalProperties: false
			}
		},
		notes: {
			type: 'array',
			items: { type: 'string' }
		}
	},
	required: ['offers', 'people', 'locationParts', 'fieldSuggestions', 'conflicts', 'notes'],
	additionalProperties: false
} as const;
