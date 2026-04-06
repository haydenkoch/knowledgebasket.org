const DEFAULT_DATE_OPTIONS = {
	month: 'short',
	day: 'numeric',
	year: 'numeric'
} satisfies Intl.DateTimeFormatOptions;

const DEFAULT_DATETIME_OPTIONS = {
	month: 'short',
	day: 'numeric',
	year: 'numeric',
	hour: 'numeric',
	minute: '2-digit'
} satisfies Intl.DateTimeFormatOptions;

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const UTC_MIDNIGHT_RE = /^(\d{4})-(\d{2})-(\d{2})T00:00:00(?:\.0+)?Z$/i;
const DATE_LIKE_RE = /^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/;
const URL_RE = /^https?:\/\//i;

export const jobTypeLabels: Record<string, string> = {
	full_time: 'Full-time',
	'full-time': 'Full-time',
	part_time: 'Part-time',
	'part-time': 'Part-time',
	contract: 'Contract',
	temporary: 'Temporary',
	fellowship: 'Fellowship',
	internship: 'Internship',
	volunteer: 'Volunteer',
	other: 'Other'
};

export const workArrangementLabels: Record<string, string> = {
	on_site: 'On-site',
	'on-site': 'On-site',
	in_office: 'In-office',
	'in-office': 'In-office',
	remote: 'Remote',
	hybrid: 'Hybrid'
};

export const seniorityLabels: Record<string, string> = {
	entry: 'Entry level',
	mid: 'Mid-level',
	senior: 'Senior',
	director: 'Director / Executive'
};

export const fundingTypeLabels: Record<string, string> = {
	grant: 'Grant',
	fellowship: 'Fellowship',
	scholarship: 'Scholarship',
	loan: 'Loan',
	award: 'Award',
	other: 'Other',
	federal: 'Federal',
	state: 'State',
	local_county: 'Local / County',
	'local-county': 'Local / County',
	private_foundation: 'Private Foundation',
	'private-foundation': 'Private Foundation',
	ngo: 'NGO',
	corporate: 'Corporate',
	tribal: 'Tribal'
};

export const applicationStatusLabels: Record<string, string> = {
	open: 'Open',
	rolling: 'Rolling',
	ongoing: 'Ongoing',
	rolling_ongoing: 'Rolling / Ongoing',
	'rolling-ongoing': 'Rolling / Ongoing',
	coming_soon: 'Coming soon',
	'coming-soon': 'Coming soon',
	closed: 'Closed'
};

export const eligibilityTypeLabels: Record<string, string> = {
	tribal_gov: 'Tribal government',
	tribal_government: 'Tribal government',
	nonprofit: 'Nonprofit',
	individual: 'Individual',
	for_profit: 'For-profit',
	'for-profit': 'For-profit',
	tribal_enterprise: 'Tribal enterprise',
	community_org: 'Community organization',
	community_organization: 'Community organization'
};

export const sectorLabels: Record<string, string> = {
	government: 'Government / Tribal',
	environmental: 'Environmental / Conservation',
	health: 'Health & Wellness',
	education: 'Education',
	technology: 'Technology',
	construction: 'Construction / Trades',
	nonprofit: 'Nonprofit',
	legal: 'Legal',
	arts_culture: 'Arts & Culture',
	'arts-culture': 'Arts & Culture',
	economic_development: 'Economic Development',
	'economic-development': 'Economic Development',
	other: 'Other'
};

const fieldValueLabels: Record<string, Record<string, string>> = {
	application_status: applicationStatusLabels,
	eligibility_type: eligibilityTypeLabels,
	funding_type: fundingTypeLabels,
	job_type: jobTypeLabels,
	work_arrangement: workArrangementLabels,
	seniority: seniorityLabels,
	sector: sectorLabels
};

type IdentifierCasing = 'sentence' | 'title';

export type DisplayValueOptions = {
	key?: string;
	fallback?: string;
	dateStyle?: 'date' | 'datetime';
	dateOptions?: Intl.DateTimeFormatOptions;
};

function normalizeIdentifier(value: string): string {
	return value
		.trim()
		.replace(/([a-z0-9])([A-Z])/g, '$1_$2')
		.replace(/[\s-]+/g, '_')
		.toLowerCase();
}

function parseDateOnlyParts(value: string) {
	const match = value.match(DATE_ONLY_RE) ?? value.match(UTC_MIDNIGHT_RE);
	if (!match) return null;
	return {
		year: Number(match[1]),
		month: Number(match[2]),
		day: Number(match[3])
	};
}

function isValidDate(date: Date): boolean {
	return !Number.isNaN(date.getTime());
}

function formatWithOptions(date: Date, options: Intl.DateTimeFormatOptions): string {
	return new Intl.DateTimeFormat('en-US', options).format(date);
}

function formatCalendarDateParts(
	parts: { year: number; month: number; day: number },
	options: Intl.DateTimeFormatOptions
): string {
	return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(
		new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
	);
}

function isDateLikeString(value: string): boolean {
	if (parseDateOnlyParts(value)) return true;
	if (!DATE_LIKE_RE.test(value)) return false;
	return isValidDate(new Date(value));
}

function inferDateStyle(key?: string): 'date' | 'datetime' {
	const normalized = key ? normalizeIdentifier(key) : '';
	if (normalized.endsWith('_at') || normalized === 'published_at') return 'datetime';
	return 'date';
}

function shouldHumanizeString(value: string): boolean {
	return /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/i.test(value);
}

function lookupLabel(map: Record<string, string>, value: string): string | undefined {
	return map[value] ?? map[normalizeIdentifier(value)];
}

export function humanizeIdentifier(value: string, casing: IdentifierCasing = 'sentence'): string {
	const normalized = value
		.trim()
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/[_-]+/g, ' ')
		.replace(/\s+/g, ' ');
	if (!normalized) return '';

	return normalized
		.split(' ')
		.map((word, index) => {
			if (/^[A-Z0-9]{2,}$/.test(word)) return word;
			const lower = word.toLowerCase();
			if (casing === 'sentence' && index > 0) return lower;
			return lower.charAt(0).toUpperCase() + lower.slice(1);
		})
		.join(' ');
}

export function formatDisplayDate(
	value: Date | string | number | null | undefined,
	options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTIONS,
	fallback = '—'
): string {
	if (value == null || value === '') return fallback;

	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (!trimmed) return fallback;
		const dateOnly = parseDateOnlyParts(trimmed);
		if (dateOnly) return formatCalendarDateParts(dateOnly, options);
		const parsed = new Date(trimmed);
		return isValidDate(parsed) ? formatWithOptions(parsed, options) : fallback;
	}

	const parsed = value instanceof Date ? value : new Date(value);
	return isValidDate(parsed) ? formatWithOptions(parsed, options) : fallback;
}

export function formatDisplayDateTime(
	value: Date | string | number | null | undefined,
	options: Intl.DateTimeFormatOptions = DEFAULT_DATETIME_OPTIONS,
	fallback = '—'
): string {
	if (typeof value === 'string') {
		const dateOnly = parseDateOnlyParts(value.trim());
		if (dateOnly) return formatCalendarDateParts(dateOnly, DEFAULT_DATE_OPTIONS);
	}
	return formatDisplayDate(value, options, fallback);
}

export function isUrlLike(value: unknown): boolean {
	return typeof value === 'string' && URL_RE.test(value.trim());
}

export function formatDisplayValue(value: unknown, options: DisplayValueOptions = {}): string {
	const fallback = options.fallback ?? '—';

	if (value == null) return fallback;

	if (Array.isArray(value)) {
		const items = value
			.map((entry) => {
				if (
					entry &&
					typeof entry === 'object' &&
					!Array.isArray(entry) &&
					!(entry instanceof Date)
				) {
					return JSON.stringify(entry);
				}
				return formatDisplayValue(entry, options);
			})
			.filter((entry) => entry !== fallback);
		return items.length ? items.join(', ') : fallback;
	}

	if (value instanceof Date) {
		return (options.dateStyle ?? inferDateStyle(options.key)) === 'datetime'
			? formatDisplayDateTime(value, options.dateOptions, fallback)
			: formatDisplayDate(value, options.dateOptions, fallback);
	}

	if (typeof value === 'object') {
		return JSON.stringify(value);
	}

	if (typeof value === 'boolean') return value ? 'Yes' : 'No';
	if (typeof value === 'number') return Number.isFinite(value) ? String(value) : fallback;
	if (typeof value !== 'string') return String(value);

	const trimmed = value.trim();
	if (!trimmed) return fallback;
	if (isUrlLike(trimmed)) return trimmed;

	if (isDateLikeString(trimmed)) {
		return (options.dateStyle ?? inferDateStyle(options.key)) === 'datetime'
			? formatDisplayDateTime(trimmed, options.dateOptions, fallback)
			: formatDisplayDate(trimmed, options.dateOptions, fallback);
	}

	const labelMap = options.key ? fieldValueLabels[normalizeIdentifier(options.key)] : undefined;
	const mapped = labelMap ? lookupLabel(labelMap, trimmed) : undefined;
	if (mapped) return mapped;

	if (shouldHumanizeString(trimmed)) return humanizeIdentifier(trimmed);

	return trimmed;
}
