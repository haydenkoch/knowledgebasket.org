/**
 * Events data layer: single source of truth for events (Postgres + iCal merge).
 */
import { eq, desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { events as eventsTable } from '$lib/server/db/schema';
import { fetchEventsFromIcalFeed } from '$lib/server/ical-feed';
import { indexEvent } from '$lib/server/meilisearch';
import type { EventItem } from '$lib/data/kb';

export type EventRow = typeof eventsTable.$inferSelect;
export type EventInsert = typeof eventsTable.$inferInsert;

function formatDateForItem(d: Date | null): string | undefined {
	if (!d) return undefined;
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${m}/${day}/${y}`;
}

function rowToEventItem(row: EventRow): EventItem {
	return {
		id: row.id,
		slug: row.slug,
		title: row.title,
		description: row.description ?? undefined,
		coil: 'events',
		location: row.location ?? undefined,
		address: row.address ?? undefined,
		lat: row.lat ?? undefined,
		lng: row.lng ?? undefined,
		region: row.region ?? undefined,
		type: row.type ?? undefined,
		types: row.types ?? undefined,
		audience: row.audience ?? undefined,
		cost: row.cost ?? undefined,
		eventUrl: row.eventUrl ?? undefined,
		startDate: row.startDate ? formatDateForItem(row.startDate) : undefined,
		endDate: row.endDate ? formatDateForItem(row.endDate) : undefined,
		hostOrg: row.hostOrg ?? undefined,
		imageUrl: row.imageUrl ?? undefined
	};
}

/**
 * Get all published events from DB and merge with iCal feed. Return shape compatible with EventItem[].
 * iCal strategy: merged in memory here (DB events + News from Native California feed). Optionally later:
 * sync iCal into Postgres and index in Meilisearch for a single source of truth.
 */
export async function getEvents(options?: { includeIcal?: boolean }): Promise<EventItem[]> {
	const includeIcal = options?.includeIcal ?? true;
	let rows: EventRow[] = [];
	try {
		rows = await db
			.select()
			.from(eventsTable)
			.where(eq(eventsTable.status, 'published'))
			.orderBy(desc(eventsTable.startDate));
	} catch (err) {
		console.warn('[events] DB query failed (run pnpm run db:push if the events table is missing):', err);
	}
	const icalItems = includeIcal ? await fetchEventsFromIcalFeed() : [];
	const fromDb = rows.map(rowToEventItem);
	const combined = [...fromDb, ...icalItems];
	combined.sort((a, b) => {
		const aStart = a.startDate ? new Date(a.startDate).getTime() : 0;
		const bStart = b.startDate ? new Date(b.startDate).getTime() : 0;
		return aStart - bStart;
	});
	return combined;
}

/**
 * Get one event by slug. Returns null if not found (e.g. might be from iCal only).
 */
export async function getEventBySlug(slug: string): Promise<EventItem | null> {
	try {
		const rows = await db.select().from(eventsTable).where(eq(eventsTable.slug, slug)).limit(1);
		const row = rows[0];
		if (!row) return null;
		return rowToEventItem(row);
	} catch (err) {
		console.warn('[events] getEventBySlug failed:', err);
		return null;
	}
}

function slugify(title: string): string {
	return title
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '') || 'event';
}

/**
 * Ensure unique slug: if slug exists, append -2, -3, etc.
 */
async function uniqueSlug(baseSlug: string): Promise<string> {
	let slug = baseSlug.slice(0, 100);
	let n = 0;
	// eslint-disable-next-line no-constant-condition
	while (true) {
		const existing = await db.select({ id: eventsTable.id }).from(eventsTable).where(eq(eventsTable.slug, slug)).limit(1);
		if (existing.length === 0) return slug;
		n += 1;
		slug = `${baseSlug.slice(0, 90)}-${n}`;
	}
}

/**
 * Create a new event (e.g. from submit form). Sets source = 'submission', status = 'published'.
 * Returns the created event in EventItem shape.
 */
export async function createEvent(data: {
	title: string;
	description?: string;
	location?: string;
	address?: string;
	region?: string;
	audience?: string;
	cost?: string;
	eventUrl?: string;
	startDate?: string;
	endDate?: string;
	hostOrg?: string;
	lat?: number;
	lng?: number;
	type?: string;
	types?: string[];
	imageUrl?: string;
}): Promise<EventItem> {
	const baseSlug = slugify(data.title);
	const slug = await uniqueSlug(baseSlug);
	const startDate = data.startDate ? new Date(data.startDate) : null;
	const endDate = data.endDate ? new Date(data.endDate) : null;
	const [row] = await db
		.insert(eventsTable)
		.values({
			slug,
			title: data.title,
			description: data.description ?? null,
			location: data.location ?? null,
			address: data.address ?? null,
			region: data.region ?? null,
			audience: data.audience ?? null,
			cost: data.cost ?? null,
			eventUrl: data.eventUrl ?? null,
			startDate,
			endDate,
			hostOrg: data.hostOrg ?? null,
			lat: data.lat ?? null,
			lng: data.lng ?? null,
			type: data.type ?? null,
			types: data.types ?? null,
			imageUrl: data.imageUrl ?? null,
			status: 'published',
			source: 'submission'
		})
		.returning();
	if (!row) throw new Error('Insert did not return row');
	const item = rowToEventItem(row);
	await indexEvent(item);
	return item;
}

/**
 * Update an event by id (for future admin). Returns updated event or null.
 */
export async function updateEvent(
	id: string,
	data: Partial<Omit<EventInsert, 'id' | 'createdAt'>>
): Promise<EventItem | null> {
	const [row] = await db.update(eventsTable).set(data).where(eq(eventsTable.id, id)).returning();
	if (!row) return null;
	return rowToEventItem(row);
}

/**
 * Get all event rows from DB (for Meilisearch reindex). Includes only published.
 */
export async function getAllEventRowsForIndex(): Promise<EventRow[]> {
	return db
		.select()
		.from(eventsTable)
		.where(eq(eventsTable.status, 'published'));
}
