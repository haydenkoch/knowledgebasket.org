import ical from 'node-ical';
import { stripHtml } from '$lib/utils/format';

export interface ParsedIcalEvent {
	uid: string;
	summary: string;
	description: string | null;
	location: string | null;
	url: string | null;
	attachments: string[];
	start: Date;
	end: Date | null;
	timezone: string | null;
	categories: string[];
	isRecurring: boolean;
	recurrenceRule: string | null;
}

type RawIcalEvent = {
	type?: string;
	start?: Date | string;
	end?: Date | string;
	summary?: string;
	description?: string;
	location?: string;
	uid?: string;
	url?: string;
	rrule?: { toString?: () => string } | null;
	timezone?: string;
	xtimezone?: string;
	categories?: string[] | string;
	attach?: string | string[] | Array<{ val?: string | null }>;
	datetype?: 'date' | 'date-time';
};

export function parseIcalEvents(rawContent: string): ParsedIcalEvent[] {
	const parsed = ical.parseICS(rawContent) as Record<string, RawIcalEvent | undefined>;
	const events: ParsedIcalEvent[] = [];
	const seen = new Set<string>();

	for (const [key, value] of Object.entries(parsed)) {
		if (!value || value.type !== 'VEVENT' || !value.start) continue;

		const start = toDate(value.start);
		if (!start) continue;

		const end = toDate(value.end);
		const uid = (value.uid ?? key).trim();
		const dedupeKey = `${uid}|${start.toISOString()}`;
		if (seen.has(dedupeKey)) continue;
		seen.add(dedupeKey);

		events.push({
			uid,
			summary: (value.summary ?? 'Untitled event').trim(),
			description: value.description ? stripHtml(value.description) : null,
			location: value.location?.trim() || null,
			url: value.url?.trim() || null,
			attachments: normalizeAttachments(value.attach),
			start,
			end,
			timezone: value.timezone ?? value.xtimezone ?? null,
			categories: normalizeCategories(value.categories),
			isRecurring: Boolean(value.rrule),
			recurrenceRule: typeof value.rrule?.toString === 'function' ? value.rrule.toString() : null
		});
	}

	events.sort((left, right) => left.start.getTime() - right.start.getTime());
	return events;
}

function toDate(value: Date | string | undefined): Date | null {
	if (!value) return null;
	if (value instanceof Date) return value;
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeCategories(value: string[] | string | undefined): string[] {
	if (Array.isArray(value)) return value.map((entry) => entry.trim()).filter(Boolean);
	if (typeof value === 'string') {
		return value
			.split(',')
			.map((entry) => entry.trim())
			.filter(Boolean);
	}
	return [];
}

function normalizeAttachments(value: RawIcalEvent['attach']): string[] {
	if (!value) return [];
	const list = Array.isArray(value) ? value : [value];
	return list
		.map((entry) => {
			if (typeof entry === 'string') return entry.trim();
			if (entry && typeof entry === 'object' && typeof entry.val === 'string')
				return entry.val.trim();
			return '';
		})
		.filter(Boolean);
}
