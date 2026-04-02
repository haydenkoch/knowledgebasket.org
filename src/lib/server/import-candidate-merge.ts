import type { ImportedCandidateRow } from './import-candidates';

type Coil = ImportedCandidateRow['coil'];

type MergeFieldDecision = {
	field: string;
	candidate: unknown;
	live: unknown;
	snapshot: unknown;
	reason: string;
};

export type MergePreview = {
	appliedFields: MergeFieldDecision[];
	preservedFields: MergeFieldDecision[];
	unchangedFields: MergeFieldDecision[];
	patch: Record<string, unknown>;
	nextSnapshot: Record<string, unknown>;
};

type FieldGroup = {
	field: string;
	keys: string[];
	apply: (normalized: Record<string, unknown>) => Record<string, unknown>;
};

type DescriptorMap = Record<Coil, FieldGroup[]>;

const FIELD_GROUPS: DescriptorMap = {
	events: [
		{
			field: 'title',
			keys: ['title'],
			apply: (normalized) => ({ title: readString(normalized, 'title') ?? 'Untitled event' })
		},
		{
			field: 'description',
			keys: ['description'],
			apply: (normalized) => ({ description: readString(normalized, 'description') ?? undefined })
		},
		{
			field: 'url',
			keys: ['url'],
			apply: (normalized) => ({ eventUrl: readString(normalized, 'url') ?? undefined })
		},
		{
			field: 'start_date',
			keys: ['start_date'],
			apply: (normalized) => ({ startDate: readString(normalized, 'start_date') ?? undefined })
		},
		{
			field: 'end_date',
			keys: ['end_date'],
			apply: (normalized) => ({ endDate: readString(normalized, 'end_date') ?? undefined })
		},
		{
			field: 'location',
			keys: ['location_name', 'location_address', 'location_state'],
			apply: (normalized) => ({
				location: buildEventLocation(normalized),
				address: readString(normalized, 'location_address') ?? undefined,
				region:
					readString(normalized, 'region') ?? readString(normalized, 'location_state') ?? undefined
			})
		},
		{
			field: 'organization_name',
			keys: ['organization_name'],
			apply: (normalized) => ({
				hostOrg: readString(normalized, 'organization_name') ?? undefined
			})
		},
		{
			field: 'event_type',
			keys: ['event_type'],
			apply: (normalized) => ({ type: readString(normalized, 'event_type') ?? undefined })
		},
		{
			field: 'registration_url',
			keys: ['registration_url'],
			apply: (normalized) => ({
				registrationUrl: readString(normalized, 'registration_url') ?? undefined
			})
		},
		{
			field: 'timezone',
			keys: ['timezone'],
			apply: (normalized) => ({ timezone: readString(normalized, 'timezone') ?? undefined })
		},
		{
			field: 'virtual_url',
			keys: ['is_virtual', 'virtual_url'],
			apply: (normalized) => ({
				virtualEventUrl:
					readBoolean(normalized, 'is_virtual')
						? (readString(normalized, 'virtual_url') ??
							readString(normalized, 'url') ??
							undefined)
						: undefined,
				eventFormat: readBoolean(normalized, 'is_virtual') ? 'online' : undefined
			})
		},
		{
			field: 'cost',
			keys: ['cost'],
			apply: (normalized) => ({ cost: readString(normalized, 'cost') ?? undefined })
		},
		{
			field: 'tags',
			keys: ['tags'],
			apply: (normalized) => ({ tags: readStringArray(normalized, 'tags') })
		},
		{
			field: 'image_url',
			keys: ['image_url'],
			apply: (normalized) => ({ imageUrl: readString(normalized, 'image_url') ?? undefined })
		}
	],
	funding: [
		{
			field: 'title',
			keys: ['title'],
			apply: (normalized) => ({ title: readString(normalized, 'title') ?? 'Untitled funding' })
		},
		{
			field: 'description',
			keys: ['description'],
			apply: (normalized) => ({ description: readString(normalized, 'description') ?? null })
		},
		{
			field: 'funder_name',
			keys: ['funder_name', 'organization_name'],
			apply: (normalized) => ({
				funderName:
					readString(normalized, 'funder_name') ??
					readString(normalized, 'organization_name') ??
					null
			})
		},
		{
			field: 'funding_type',
			keys: ['funding_type'],
			apply: (normalized) => ({ fundingType: readString(normalized, 'funding_type') ?? null })
		},
		{
			field: 'status',
			keys: ['status'],
			apply: (normalized) => ({ applicationStatus: readString(normalized, 'status') ?? 'open' })
		},
		{
			field: 'deadline',
			keys: ['deadline'],
			apply: (normalized) => ({ deadline: toDate(readString(normalized, 'deadline')) })
		},
		{
			field: 'amount_min',
			keys: ['amount_min'],
			apply: (normalized) => ({ amountMin: readNumber(normalized, 'amount_min') })
		},
		{
			field: 'amount_max',
			keys: ['amount_max'],
			apply: (normalized) => ({ amountMax: readNumber(normalized, 'amount_max') })
		},
		{
			field: 'amount_description',
			keys: ['amount_description'],
			apply: (normalized) => ({
				amountDescription: readString(normalized, 'amount_description') ?? null
			})
		},
		{
			field: 'region',
			keys: ['region'],
			apply: (normalized) => ({ region: readString(normalized, 'region') ?? null })
		},
		{
			field: 'eligibility',
			keys: ['eligibility'],
			apply: (normalized) => ({ eligibilityType: readString(normalized, 'eligibility') ?? null })
		},
		{
			field: 'url',
			keys: ['url', 'application_url'],
			apply: (normalized) => ({
				applyUrl:
					readString(normalized, 'application_url') ?? readString(normalized, 'url') ?? null
			})
		},
		{
			field: 'tags',
			keys: ['tags'],
			apply: (normalized) => ({ tags: readStringArray(normalized, 'tags') ?? null })
		},
		{
			field: 'image_url',
			keys: ['image_url'],
			apply: (normalized) => ({ imageUrl: readString(normalized, 'image_url') ?? null })
		}
	],
	jobs: [
		{
			field: 'title',
			keys: ['title'],
			apply: (normalized) => ({ title: readString(normalized, 'title') ?? 'Untitled job' })
		},
		{
			field: 'description',
			keys: ['description'],
			apply: (normalized) => ({ description: readString(normalized, 'description') ?? null })
		},
		{
			field: 'organization_name',
			keys: ['organization_name'],
			apply: (normalized) => ({
				employerName: readString(normalized, 'organization_name') ?? null
			})
		},
		{
			field: 'job_type',
			keys: ['job_type'],
			apply: (normalized) => ({ jobType: readString(normalized, 'job_type') ?? null })
		},
		{
			field: 'work_arrangement',
			keys: ['is_remote', 'is_hybrid'],
			apply: (normalized) => ({
				workArrangement: readBoolean(normalized, 'is_remote')
					? 'remote'
					: readBoolean(normalized, 'is_hybrid')
						? 'hybrid'
						: 'on_site'
			})
		},
		{
			field: 'location',
			keys: ['location_city', 'location_state', 'region'],
			apply: (normalized) => ({
				location: buildJobLocation(normalized),
				city: readString(normalized, 'location_city') ?? null,
				state: readString(normalized, 'location_state') ?? null,
				region:
					readString(normalized, 'region') ?? readString(normalized, 'location_state') ?? null
			})
		},
		{
			field: 'salary_min',
			keys: ['salary_min'],
			apply: (normalized) => ({ compensationMin: readNumber(normalized, 'salary_min') })
		},
		{
			field: 'salary_max',
			keys: ['salary_max'],
			apply: (normalized) => ({ compensationMax: readNumber(normalized, 'salary_max') })
		},
		{
			field: 'salary_period',
			keys: ['salary_period'],
			apply: (normalized) => ({
				compensationType: readString(normalized, 'salary_period') ?? null
			})
		},
		{
			field: 'salary_description',
			keys: ['salary_description'],
			apply: (normalized) => ({
				compensationDescription: readString(normalized, 'salary_description') ?? null
			})
		},
		{
			field: 'closing_date',
			keys: ['closing_date'],
			apply: (normalized) => ({ applicationDeadline: toDate(readString(normalized, 'closing_date')) })
		},
		{
			field: 'department',
			keys: ['department'],
			apply: (normalized) => ({ department: readString(normalized, 'department') ?? null })
		},
		{
			field: 'url',
			keys: ['url', 'application_url'],
			apply: (normalized) => ({
				applyUrl:
					readString(normalized, 'application_url') ?? readString(normalized, 'url') ?? null
			})
		},
		{
			field: 'tags',
			keys: ['tags'],
			apply: (normalized) => ({ tags: readStringArray(normalized, 'tags') ?? null })
		},
		{
			field: 'image_url',
			keys: ['image_url'],
			apply: (normalized) => ({ imageUrl: readString(normalized, 'image_url') ?? null })
		}
	],
	red_pages: [
		{
			field: 'title',
			keys: ['title'],
			apply: (normalized) => ({ name: readString(normalized, 'title') ?? 'Untitled listing' })
		},
		{
			field: 'description',
			keys: ['description'],
			apply: (normalized) => ({ description: readString(normalized, 'description') ?? null })
		},
		{
			field: 'organization_name',
			keys: ['organization_name'],
			apply: (normalized) => ({ ownerName: readString(normalized, 'organization_name') ?? null })
		},
		{
			field: 'organization_type',
			keys: ['organization_type'],
			apply: (normalized) => ({
				serviceType: readString(normalized, 'organization_type') ?? null
			})
		},
		{
			field: 'service_area',
			keys: ['service_area'],
			apply: (normalized) => ({ serviceArea: readString(normalized, 'service_area') ?? null })
		},
		{
			field: 'tribal_affiliation',
			keys: ['tribal_affiliation'],
			apply: (normalized) => ({
				tribalAffiliation: readString(normalized, 'tribal_affiliation') ?? null
			})
		},
		{
			field: 'website',
			keys: ['website', 'url'],
			apply: (normalized) => ({
				website: readString(normalized, 'website') ?? readString(normalized, 'url') ?? null
			})
		},
		{
			field: 'address',
			keys: ['address'],
			apply: (normalized) => ({ address: readString(normalized, 'address') ?? null })
		},
		{
			field: 'city',
			keys: ['city'],
			apply: (normalized) => ({ city: readString(normalized, 'city') ?? null })
		},
		{
			field: 'state',
			keys: ['state', 'region'],
			apply: (normalized) => ({
				state: readString(normalized, 'state') ?? null,
				region: readString(normalized, 'region') ?? readString(normalized, 'state') ?? null
			})
		},
		{
			field: 'zip',
			keys: ['zip'],
			apply: (normalized) => ({ zip: readString(normalized, 'zip') ?? null })
		},
		{
			field: 'email',
			keys: ['email'],
			apply: (normalized) => ({ email: readString(normalized, 'email') ?? null })
		},
		{
			field: 'phone',
			keys: ['phone'],
			apply: (normalized) => ({ phone: readString(normalized, 'phone') ?? null })
		},
		{
			field: 'tags',
			keys: ['tags'],
			apply: (normalized) => ({ tags: readStringArray(normalized, 'tags') ?? null })
		},
		{
			field: 'image_url',
			keys: ['image_url'],
			apply: (normalized) => ({ imageUrl: readString(normalized, 'image_url') ?? null })
		}
	],
	toolbox: [
		{
			field: 'title',
			keys: ['title'],
			apply: (normalized) => ({ title: readString(normalized, 'title') ?? 'Untitled resource' })
		},
		{
			field: 'description',
			keys: ['description'],
			apply: (normalized) => ({ description: readString(normalized, 'description') ?? null })
		},
		{
			field: 'publisher',
			keys: ['publisher', 'organization_name'],
			apply: (normalized) => ({
				sourceName:
					readString(normalized, 'publisher') ??
					readString(normalized, 'organization_name') ??
					null
			})
		},
		{
			field: 'resource_type',
			keys: ['resource_type'],
			apply: (normalized) => ({
				resourceType: readString(normalized, 'resource_type') ?? 'other'
			})
		},
		{
			field: 'format',
			keys: ['format'],
			apply: (normalized) => ({ mediaType: readString(normalized, 'format') ?? null })
		},
		{
			field: 'url',
			keys: ['url'],
			apply: (normalized) => ({ externalUrl: readString(normalized, 'url') ?? null })
		},
		{
			field: 'topics',
			keys: ['topics'],
			apply: (normalized) => ({ categories: readStringArray(normalized, 'topics') ?? null })
		},
		{
			field: 'tags',
			keys: ['tags'],
			apply: (normalized) => ({ tags: readStringArray(normalized, 'tags') ?? null })
		},
		{
			field: 'publication_date',
			keys: ['publication_date'],
			apply: (normalized) => ({ publishDate: toDate(readString(normalized, 'publication_date')) })
		},
		{
			field: 'image_url',
			keys: ['image_url'],
			apply: (normalized) => ({ imageUrl: readString(normalized, 'image_url') ?? null })
		}
	]
};

export function mapCandidateToComparable(
	coil: Coil,
	normalized: Record<string, unknown>
): Record<string, unknown> {
	switch (coil) {
		case 'events':
			return {
				title: readString(normalized, 'title'),
				description: readString(normalized, 'description'),
				url: readString(normalized, 'url'),
				start_date: readIsoString(normalized, 'start_date'),
				end_date: readIsoString(normalized, 'end_date'),
				location_name: readString(normalized, 'location_name'),
				location_address: readString(normalized, 'location_address'),
				location_state: readString(normalized, 'location_state'),
				organization_name: readString(normalized, 'organization_name'),
				event_type: readString(normalized, 'event_type'),
				registration_url: readString(normalized, 'registration_url'),
				timezone: readString(normalized, 'timezone'),
				is_virtual: readBoolean(normalized, 'is_virtual'),
				virtual_url: readString(normalized, 'virtual_url'),
				cost: readString(normalized, 'cost'),
				tags: readStringArray(normalized, 'tags'),
				image_url: readString(normalized, 'image_url')
			};
		case 'funding':
			return {
				title: readString(normalized, 'title'),
				description: readString(normalized, 'description'),
				funder_name:
					readString(normalized, 'funder_name') ?? readString(normalized, 'organization_name'),
				funding_type: readString(normalized, 'funding_type'),
				status: readString(normalized, 'status'),
				deadline: readIsoString(normalized, 'deadline'),
				amount_min: readNumber(normalized, 'amount_min'),
				amount_max: readNumber(normalized, 'amount_max'),
				amount_description: readString(normalized, 'amount_description'),
				region: readString(normalized, 'region'),
				eligibility: readString(normalized, 'eligibility'),
				url: readString(normalized, 'application_url') ?? readString(normalized, 'url'),
				tags: readStringArray(normalized, 'tags'),
				image_url: readString(normalized, 'image_url')
			};
		case 'jobs':
			return {
				title: readString(normalized, 'title'),
				description: readString(normalized, 'description'),
				organization_name: readString(normalized, 'organization_name'),
				job_type: readString(normalized, 'job_type'),
				is_remote: readBoolean(normalized, 'is_remote'),
				is_hybrid: readBoolean(normalized, 'is_hybrid'),
				location_city: readString(normalized, 'location_city'),
				location_state: readString(normalized, 'location_state'),
				region: readString(normalized, 'region'),
				salary_min: readNumber(normalized, 'salary_min'),
				salary_max: readNumber(normalized, 'salary_max'),
				salary_period: readString(normalized, 'salary_period'),
				salary_description: readString(normalized, 'salary_description'),
				closing_date: readIsoString(normalized, 'closing_date'),
				department: readString(normalized, 'department'),
				url: readString(normalized, 'application_url') ?? readString(normalized, 'url'),
				tags: readStringArray(normalized, 'tags'),
				image_url: readString(normalized, 'image_url')
			};
		case 'red_pages':
			return {
				title: readString(normalized, 'title'),
				description: readString(normalized, 'description'),
				organization_name: readString(normalized, 'organization_name'),
				organization_type: readString(normalized, 'organization_type'),
				service_area: readString(normalized, 'service_area'),
				tribal_affiliation: readString(normalized, 'tribal_affiliation'),
				website: readString(normalized, 'website') ?? readString(normalized, 'url'),
				address: readString(normalized, 'address'),
				city: readString(normalized, 'city'),
				state: readString(normalized, 'state'),
				region: readString(normalized, 'region'),
				zip: readString(normalized, 'zip'),
				email: readString(normalized, 'email'),
				phone: readString(normalized, 'phone'),
				tags: readStringArray(normalized, 'tags'),
				image_url: readString(normalized, 'image_url')
			};
		case 'toolbox':
			return {
				title: readString(normalized, 'title'),
				description: readString(normalized, 'description'),
				publisher: readString(normalized, 'publisher') ?? readString(normalized, 'organization_name'),
				resource_type: readString(normalized, 'resource_type'),
				format: readString(normalized, 'format'),
				url: readString(normalized, 'url'),
				topics: readStringArray(normalized, 'topics'),
				tags: readStringArray(normalized, 'tags'),
				publication_date: readIsoString(normalized, 'publication_date'),
				image_url: readString(normalized, 'image_url')
			};
		default:
			return normalized;
	}
}

export function planCandidateMerge(
	coil: Coil,
	normalized: Record<string, unknown>,
	liveComparable: Record<string, unknown>,
	sourceSnapshot: Record<string, unknown> | null | undefined
): MergePreview {
	const groups = FIELD_GROUPS[coil];
	const baselineSnapshot =
		sourceSnapshot && Object.keys(sourceSnapshot).length > 0 ? sourceSnapshot : liveComparable;
	const patch: Record<string, unknown> = {};
	const nextSnapshot = { ...baselineSnapshot };
	const appliedFields: MergeFieldDecision[] = [];
	const preservedFields: MergeFieldDecision[] = [];
	const unchangedFields: MergeFieldDecision[] = [];
	const candidateComparable = mapCandidateToComparable(coil, normalized);

	for (const group of groups) {
		const candidate = packValues(group.keys, candidateComparable);
		const live = packValues(group.keys, liveComparable);
		const snapshot = packValues(group.keys, baselineSnapshot);

		if (!hasMeaningfulValue(candidate)) {
			unchangedFields.push({
				field: group.field,
				candidate,
				live,
				snapshot,
				reason: 'Blank source values do not clear existing content automatically.'
			});
			continue;
		}

		if (isEqual(candidate, live)) {
			assignSnapshotValues(nextSnapshot, group.keys, candidate);
			unchangedFields.push({
				field: group.field,
				candidate,
				live,
				snapshot,
				reason: 'Live content already matches the incoming source value.'
			});
			continue;
		}

		if (!isEqual(live, snapshot)) {
			preservedFields.push({
				field: group.field,
				candidate,
				live,
				snapshot,
				reason: 'Live content differs from the last accepted source snapshot.'
			});
			continue;
		}

		Object.assign(patch, group.apply(normalized));
		assignSnapshotValues(nextSnapshot, group.keys, candidate);
		appliedFields.push({
			field: group.field,
			candidate,
			live,
			snapshot,
			reason: 'Live content still matches the prior source snapshot, so the source update is safe.'
		});
	}

	return { appliedFields, preservedFields, unchangedFields, patch, nextSnapshot };
}

function assignSnapshotValues(
	snapshot: Record<string, unknown>,
	keys: string[],
	value: unknown
) {
	if (keys.length === 1) {
		snapshot[keys[0] ?? ''] = value;
		return;
	}

	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		for (const key of keys) snapshot[key] = null;
		return;
	}

	for (const key of keys) {
		snapshot[key] = (value as Record<string, unknown>)[key] ?? null;
	}
}

function packValues(keys: string[], record: Record<string, unknown>) {
	if (keys.length === 1) return normalizeValue(record[keys[0] ?? '']);
	return Object.fromEntries(keys.map((key) => [key, normalizeValue(record[key])]));
}

function normalizeValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(normalizeValue);
	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
				key,
				normalizeValue(entry)
			])
		);
	}
	if (typeof value === 'string') {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : null;
	}
	return value ?? null;
}

function hasMeaningfulValue(value: unknown): boolean {
	if (Array.isArray(value)) return value.some(hasMeaningfulValue);
	if (value && typeof value === 'object') return Object.values(value).some(hasMeaningfulValue);
	return value !== null && value !== undefined && value !== '';
}

function isEqual(left: unknown, right: unknown) {
	return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function readString(data: Record<string, unknown>, key: string): string | null {
	const value = data[key];
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readStringArray(data: Record<string, unknown>, key: string): string[] | undefined {
	const value = data[key];
	if (!Array.isArray(value)) return undefined;
	const items = value.filter(
		(entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
	);
	return items.length > 0 ? items : undefined;
}

function readBoolean(data: Record<string, unknown>, key: string) {
	return data[key] === true;
}

function readNumber(data: Record<string, unknown>, key: string) {
	const value = data[key];
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readIsoString(data: Record<string, unknown>, key: string) {
	const value = readString(data, key);
	if (!value) return null;
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function toDate(value: string | null) {
	if (!value) return null;
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildEventLocation(normalized: Record<string, unknown>) {
	const parts = [
		readString(normalized, 'location_name'),
		readString(normalized, 'location_address'),
		readString(normalized, 'location_city'),
		readString(normalized, 'location_state')
	].filter(Boolean);
	return parts.length > 0 ? parts.join(', ') : undefined;
}

function buildJobLocation(normalized: Record<string, unknown>) {
	const parts = [
		readString(normalized, 'location_city'),
		readString(normalized, 'location_state')
	].filter(Boolean);
	return parts.length > 0 ? parts.join(', ') : null;
}
