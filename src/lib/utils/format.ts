/** Remove HTML tags for plain-text display (e.g. in list cards). */
export function stripHtml(html: string): string {
	if (!html) return '';
	return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Match item against search query (title, description, and extra text fields). */
export function matchSearch<T extends { title: string; description?: string }>(
	item: T,
	q: string,
	extraFields: (keyof T)[] = []
): boolean {
	if (!q || !q.trim()) return true;
	const term = q.trim().toLowerCase();
	const hay = [
		item.title,
		item.description ?? '',
		...extraFields.map((k) => String((item as Record<string, unknown>)[k as string] ?? ''))
	]
		.join(' ')
		.toLowerCase();
	return hay.includes(term);
}

/** Filter items by facet selections: each key in facets is a field name, value is array of selected values; empty array = no filter. */
export function filterByFacets<T>(items: T[], facets: Record<string, string[]>): T[] {
	return items.filter((item) => {
		const obj = item as Record<string, unknown>;
		for (const [field, selected] of Object.entries(facets)) {
			if (selected.length === 0) continue;
			const val = obj[field];
			const str = val != null ? String(val) : '';
			if (!selected.includes(str)) return false;
		}
		return true;
	});
}

/** Get event type tags from event (types array or type string). Split only on " / " or "," so multi-word tags stay one (e.g. "Big Time", "Art Exhibit", "Trade Show"). */
export function getEventTypeTags(event: { type?: string; types?: string[] }): string[] {
	if (event.types?.length) return event.types;
	const t = (event.type ?? '').trim();
	if (!t) return [];
	// Split at slash or comma only — never at space
	return t.split(/\s*\/\s*|,\s*/).map((s) => s.trim()).filter(Boolean);
}

/** Event matches a type group if it has any tag in the group's tags. */
export function eventMatchesTypeGroup(
	event: { type?: string; types?: string[] },
	groupTags: readonly string[]
): boolean {
	const tags = getEventTypeTags(event);
	return tags.some((tag) => groupTags.includes(tag));
}

/** Count events per type group (for filter UI). Group label -> count. */
export function eventTypeGroupCounts(
	events: { type?: string; types?: string[] }[],
	groups: readonly { label: string; tags: readonly string[] }[]
): Record<string, number> {
	const out: Record<string, number> = {};
	for (const g of groups) {
		out[g.label] = events.filter((e) => eventMatchesTypeGroup(e, g.tags)).length;
	}
	return out;
}

/** Count items per value for given field (for sidebar facet counts). */
export function facetCounts<T>(items: T[], field: keyof T): Record<string, number> {
	const out: Record<string, number> = {};
	for (const item of items) {
		const val = (item as Record<string, unknown>)[field as string];
		const str = val != null ? String(val) : '';
		if (!str) continue;
		out[str] = (out[str] ?? 0) + 1;
	}
	return out;
}

/** Parse event start date (MM/DD/YYYY or ISO). Returns timestamp for sorting or null. */
export function parseEventStart(startDate?: string): number | null {
	if (!startDate?.trim()) return null;
	const s = startDate.trim();
	const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
	if (mdy) {
		const d = new Date(Number(mdy[3]), Number(mdy[1]) - 1, Number(mdy[2]));
		return isNaN(d.getTime()) ? null : d.getTime();
	}
	const d = new Date(s);
	return isNaN(d.getTime()) ? null : d.getTime();
}

/** Format event date for list/card: "Jun 8" or "Jun 8 – 12". */
export function formatEventDateShort(startDate?: string, endDate?: string): string {
	const start = startDate?.trim() ? new Date(parseEventStart(startDate)!) : null;
	if (!start || isNaN(start.getTime())) return 'Date TBA';
	const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
	const startStr = start.toLocaleDateString('en-US', opts);
	if (!endDate?.trim()) return startStr;
	const end = new Date(parseEventStart(endDate)!);
	if (isNaN(end.getTime()) || end.getTime() === start.getTime()) return startStr;
	const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
	return sameMonth ? `${startStr} – ${end.getDate()}` : `${startStr} – ${end.toLocaleDateString('en-US', opts)}`;
}

/** Format for detail page: "Saturday, June 8, 2025" or "Jun 8 – Jun 12, 2025". */
export function formatEventDateRange(startDate?: string, endDate?: string): string {
	const start = startDate?.trim() ? parseEventStart(startDate) : null;
	if (start == null) return 'Date TBA';
	const startD = new Date(start);
	const longOpts: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
	if (!endDate?.trim()) return startD.toLocaleDateString('en-US', longOpts);
	const end = parseEventStart(endDate);
	if (end == null || end === start) return startD.toLocaleDateString('en-US', longOpts);
	const endD = new Date(end);
	const shortOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
	return `${startD.toLocaleDateString('en-US', shortOpts)} – ${endD.toLocaleDateString('en-US', shortOpts)}`;
}

/** Return calendar day (1–31) for event start, or null. */
export function eventDayOfMonth(startDate?: string): number | null {
	const t = parseEventStart(startDate);
	if (t == null) return null;
	return new Date(t).getDate();
}

/** Return { year, month (0–11), day } for event start, or null. */
export function eventCalendarParts(startDate?: string): { year: number; month: number; day: number } | null {
	const t = parseEventStart(startDate);
	if (t == null) return null;
	const d = new Date(t);
	return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
}

/** Return YYYY-MM-DD for event start (for calendar URL params), or null. */
export function eventDateForCalendarUrl(startDate?: string): string | null {
	const p = eventCalendarParts(startDate);
	if (!p) return null;
	const m = String(p.month + 1).padStart(2, '0');
	const d = String(p.day).padStart(2, '0');
	return `${p.year}-${m}-${d}`;
}

/** True if event spans more than one calendar day. */
export function isMultiDayEvent(startDate?: string, endDate?: string): boolean {
	const startTs = parseEventStart(startDate);
	if (startTs == null) return false;
	const endTs = endDate?.trim() ? parseEventStart(endDate) : null;
	if (endTs == null || endTs <= startTs) return false;
	const startDay = new Date(startTs);
	startDay.setHours(0, 0, 0, 0);
	const endDay = new Date(endTs);
	endDay.setHours(0, 0, 0, 0);
	return endDay.getTime() > startDay.getTime();
}

/** All calendar days an event spans (start through end inclusive). Single day if no end or invalid end. */
export function eventCalendarDaysSpanned(
	startDate?: string,
	endDate?: string
): { year: number; month: number; day: number }[] {
	const startTs = parseEventStart(startDate);
	if (startTs == null) return [];
	const start = new Date(startTs);
	let endTs = endDate?.trim() ? parseEventStart(endDate) : null;
	if (endTs == null || endTs < startTs) endTs = startTs;
	const end = new Date(endTs);
	const out: { year: number; month: number; day: number }[] = [];
	const cur = new Date(start);
	cur.setHours(0, 0, 0, 0);
	const endDay = new Date(end);
	endDay.setHours(0, 0, 0, 0);
	while (cur.getTime() <= endDay.getTime()) {
		out.push({
			year: cur.getFullYear(),
			month: cur.getMonth(),
			day: cur.getDate()
		});
		cur.setDate(cur.getDate() + 1);
	}
	return out;
}

/** Format time for event start (e.g. "2:00 PM") when date has time component; otherwise null. */
export function formatEventTime(startDate?: string): string | null {
	const t = parseEventStart(startDate);
	if (t == null) return null;
	const d = new Date(t);
	if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0) return null;
	return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/** Format date for Google Calendar URL: YYYYMMDDTHHmmssZ (UTC). */
function toGoogleDate(ts: number): string {
	return new Date(ts).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Build Google Calendar "Add to calendar" URL for an event, or null if no start date. */
export function eventGoogleCalendarUrl(event: {
	title?: string;
	startDate?: string;
	endDate?: string;
	description?: string;
	location?: string;
}): string | null {
	const start = parseEventStart(event.startDate);
	if (start == null) return null;
	const end = event.endDate?.trim() ? parseEventStart(event.endDate) : null;
	const endTs = end != null && end > start ? end : start;
	const params = new URLSearchParams({
		action: 'TEMPLATE',
		text: (event.title ?? 'Event').slice(0, 200),
		dates: `${toGoogleDate(start)}/${toGoogleDate(endTs)}`,
		details: stripHtml(String(event.description ?? '')).slice(0, 500),
		location: (event.location ?? '').slice(0, 200)
	});
	return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
