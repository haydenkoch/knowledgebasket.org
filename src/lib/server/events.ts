/**
 * Events data layer: single source of truth for events (Postgres + iCal merge).
 */
import { eq, ne, desc, asc, gte, ilike, or, and, sql, inArray, isNull } from 'drizzle-orm';
import { db, type DbExecutor } from '$lib/server/db';
import {
	events as eventsTable,
	eventSlugRedirects,
	organizations,
	venues,
	user as userTable
} from '$lib/server/db/schema';
import { fetchEventsFromIcalFeed } from '$lib/server/ical-feed';
import { indexEvent } from '$lib/server/meilisearch';
import { stripHtml } from '$lib/utils/format';
import type { EventItem, PricingTier } from '$lib/data/kb';

export type EventRow = typeof eventsTable.$inferSelect;
export type EventInsert = typeof eventsTable.$inferInsert;
export type AdminEventListItem = EventItem & {
	createdAt?: Date | string | null;
	submitterName?: string;
	submitterEmail?: string;
};

function formatDateForItem(d: Date | null): string | undefined {
	if (!d) return undefined;
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${m}/${day}/${y}`;
}

function rowToEventItem(
	row: EventRow,
	extra?: {
		organizationName?: string;
		venueName?: string;
		organizationSlug?: string;
		venueSlug?: string;
	}
): EventItem {
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
		imageUrl: row.imageUrl ?? undefined,
		imageUrls: Array.isArray(row.imageUrls) ? (row.imageUrls as string[]) : undefined,
		organizationId: row.organizationId ?? undefined,
		venueId: row.venueId ?? undefined,
		parentEventId: row.parentEventId ?? undefined,
		organizationName: extra?.organizationName ?? undefined,
		venueName: extra?.venueName ?? undefined,
		organizationSlug: extra?.organizationSlug ?? undefined,
		venueSlug: extra?.venueSlug ?? undefined,
		pricingTiers: (row.pricingTiers as PricingTier[]) ?? undefined,
		priceMin: row.priceMin,
		priceMax: row.priceMax,
		registrationUrl: row.registrationUrl ?? undefined,
		registrationDeadline: row.registrationDeadline
			? formatDateForItem(row.registrationDeadline)
			: undefined,
		eventFormat: row.eventFormat ?? undefined,
		timezone: row.timezone ?? undefined,
		doorsOpenAt: row.doorsOpenAt?.toISOString() ?? undefined,
		capacity: row.capacity ?? undefined,
		soldOut: row.soldOut ?? undefined,
		ageRestriction: row.ageRestriction ?? undefined,
		accessibilityNotes: row.accessibilityNotes ?? undefined,
		virtualEventUrl: row.virtualEventUrl ?? undefined,
		waitlistUrl: row.waitlistUrl ?? undefined,
		tags: row.tags ?? undefined,
		isAllDay: row.isAllDay ?? undefined,
		featured: row.featured ?? undefined,
		unlisted: row.unlisted ?? undefined,
		status: row.status,
		publishedAt: row.publishedAt ? formatDateForItem(row.publishedAt) : undefined,
		cancelledAt: row.cancelledAt ? formatDateForItem(row.cancelledAt) : undefined,
		rejectedAt: row.rejectedAt ? formatDateForItem(row.rejectedAt) : undefined,
		contactEmail: row.contactEmail ?? undefined,
		contactName: row.contactName ?? undefined,
		contactPhone: row.contactPhone ?? undefined,
		adminNotes: row.adminNotes ?? undefined,
		rejectionReason: row.rejectionReason ?? undefined,
		submittedById: row.submittedById ?? undefined,
		reviewedById: row.reviewedById ?? undefined,
		source: row.source
	};
}

/**
 * Get all published events from DB and merge with iCal feed.
 * By default excludes unlisted; pass includeUnlisted: true for e.g. iCal feed so subscribers see them.
 */
export async function getEvents(options?: {
	includeIcal?: boolean;
	includeUnlisted?: boolean;
}): Promise<EventItem[]> {
	const includeIcal = options?.includeIcal ?? true;
	const includeUnlisted = options?.includeUnlisted ?? false;
	let rows: EventRow[] = [];
	try {
		const whereClause = includeUnlisted
			? eq(eventsTable.status, 'published')
			: and(
					eq(eventsTable.status, 'published'),
					or(eq(eventsTable.unlisted, false), isNull(eventsTable.unlisted))
				);
		rows = await db
			.select()
			.from(eventsTable)
			.where(whereClause)
			.orderBy(desc(eventsTable.startDate));
	} catch (err) {
		console.warn(
			'[events] DB query failed (run pnpm run db:push if the events table is missing):',
			err
		);
	}
	const icalItems = includeIcal ? await fetchEventsFromIcalFeed() : [];
	const fromDb = rows.map((r) => rowToEventItem(r));
	const combined = [...fromDb, ...icalItems];
	combined.sort((a, b) => {
		const aStart = a.startDate ? new Date(a.startDate).getTime() : 0;
		const bStart = b.startDate ? new Date(b.startDate).getTime() : 0;
		return aStart - bStart;
	});
	return combined;
}

/**
 * Search events from DB (no Meilisearch). Used when Meilisearch is not configured.
 * Matches query words against title, description, location, region, hostOrg; returns up to 50.
 */
export async function searchEventsFromDb(q: string): Promise<EventItem[]> {
	const trimmed = q?.trim();
	if (!trimmed || trimmed.length < 2) return [];
	const words = trimmed
		.toLowerCase()
		.split(/\s+/)
		.filter((w) => w.length > 0);
	const events = await getEvents({ includeIcal: false });
	const hay = (e: EventItem) =>
		[
			e.title,
			e.description ? stripHtml(e.description) : '',
			e.location ?? '',
			e.region ?? '',
			e.hostOrg ?? ''
		]
			.join(' ')
			.toLowerCase();
	const out = events.filter((e) => words.every((w) => hay(e).includes(w)));
	return out.slice(0, 50);
}

/**
 * Get the target slug for a redirect if the given slug is an old slug.
 */
export async function getRedirectToSlug(fromSlug: string): Promise<string | null> {
	const [row] = await db
		.select({ toSlug: eventSlugRedirects.toSlug })
		.from(eventSlugRedirects)
		.where(eq(eventSlugRedirects.fromSlug, fromSlug))
		.limit(1);
	return row?.toSlug ?? null;
}

/**
 * Get one event by slug (with org/venue slugs for public links).
 */
export async function getEventBySlug(slug: string): Promise<EventItem | null> {
	try {
		const rows = await db
			.select({
				event: eventsTable,
				orgSlug: organizations.slug,
				venueSlug: venues.slug,
				orgName: organizations.name,
				venueName: venues.name
			})
			.from(eventsTable)
			.leftJoin(organizations, eq(eventsTable.organizationId, organizations.id))
			.leftJoin(venues, eq(eventsTable.venueId, venues.id))
			.where(eq(eventsTable.slug, slug))
			.limit(1);
		const r = rows[0];
		if (!r) return null;
		return rowToEventItem(r.event, {
			organizationName: r.orgName ?? undefined,
			venueName: r.venueName ?? undefined,
			organizationSlug: r.orgSlug ?? undefined,
			venueSlug: r.venueSlug ?? undefined
		});
	} catch (err) {
		console.warn('[events] getEventBySlug failed:', err);
		return null;
	}
}

/**
 * Get event by slug, or by iCal id when slug looks like "ical-*" (imported feed events).
 */
export async function getEventBySlugOrIcalId(slug: string): Promise<EventItem | null> {
	const fromDb = await getEventBySlug(slug);
	if (fromDb) return fromDb;
	if (slug.startsWith('ical-')) {
		const icalEvents = await fetchEventsFromIcalFeed();
		const found = icalEvents.find((e) => e.id === slug || e.slug === slug);
		if (found) return { ...found, slug };
	}
	return null;
}

/**
 * Get one event by id (for admin editing).
 */
export async function getEventById(id: string): Promise<EventItem | null> {
	const rows = await db.select().from(eventsTable).where(eq(eventsTable.id, id)).limit(1);
	const row = rows[0];
	if (!row) return null;
	return rowToEventItem(row);
}

/**
 * Get upcoming published events for an organization (DB only), limit 20.
 */
export async function getUpcomingEventsByOrganizationId(
	organizationId: string
): Promise<EventItem[]> {
	const rows = await db
		.select()
		.from(eventsTable)
		.where(
			and(
				eq(eventsTable.organizationId, organizationId),
				eq(eventsTable.status, 'published'),
				gte(eventsTable.startDate, new Date()),
				or(eq(eventsTable.unlisted, false), isNull(eventsTable.unlisted))
			)
		)
		.orderBy(asc(eventsTable.startDate))
		.limit(20);
	return rows.map((r) => rowToEventItem(r));
}

/**
 * Get upcoming published events for a venue (DB only), limit 20.
 */
export async function getUpcomingEventsByVenueId(venueId: string): Promise<EventItem[]> {
	const rows = await db
		.select()
		.from(eventsTable)
		.where(
			and(
				eq(eventsTable.venueId, venueId),
				eq(eventsTable.status, 'published'),
				gte(eventsTable.startDate, new Date()),
				or(eq(eventsTable.unlisted, false), isNull(eventsTable.unlisted))
			)
		)
		.orderBy(asc(eventsTable.startDate))
		.limit(20);
	return rows.map((r) => rowToEventItem(r));
}

/**
 * Get related events (same org or venue), excluding current, published, upcoming, not unlisted, limit 6.
 */
export async function getRelatedEvents(
	eventId: string,
	organizationId?: string | null,
	venueId?: string | null
): Promise<EventItem[]> {
	const conditions = [
		ne(eventsTable.id, eventId),
		eq(eventsTable.status, 'published'),
		gte(eventsTable.startDate, new Date()),
		or(eq(eventsTable.unlisted, false), isNull(eventsTable.unlisted))
	];
	const sameOrgOrVenue =
		organizationId && venueId
			? or(eq(eventsTable.organizationId, organizationId), eq(eventsTable.venueId, venueId))
			: organizationId
				? eq(eventsTable.organizationId, organizationId)
				: venueId
					? eq(eventsTable.venueId, venueId)
					: null;
	if (!sameOrgOrVenue) return [];
	const rows = await db
		.select()
		.from(eventsTable)
		.where(and(...conditions, sameOrgOrVenue))
		.orderBy(asc(eventsTable.startDate))
		.limit(6);
	return rows.map((r) => rowToEventItem(r));
}

/** Get submission info (createdAt, submitter) for admin display. */
export async function getEventSubmissionInfo(
	eventId: string
): Promise<{ createdAt?: Date; submitterName?: string; submitterEmail?: string }> {
	const rows = await db
		.select({
			createdAt: eventsTable.createdAt,
			submitterName: userTable.name,
			submitterEmail: userTable.email
		})
		.from(eventsTable)
		.leftJoin(userTable, eq(eventsTable.submittedById, userTable.id))
		.where(eq(eventsTable.id, eventId))
		.limit(1);
	const r = rows[0];
	if (!r) return {};
	return {
		createdAt: r.createdAt ?? undefined,
		submitterName: r.submitterName ?? undefined,
		submitterEmail: r.submitterEmail ?? undefined
	};
}

function slugify(title: string): string {
	return (
		title
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '') || 'event'
	);
}

async function uniqueSlug(baseSlug: string): Promise<string> {
	let slug = baseSlug.slice(0, 100);
	let n = 0;
	while (true) {
		const existing = await db
			.select({ id: eventsTable.id })
			.from(eventsTable)
			.where(eq(eventsTable.slug, slug))
			.limit(1);
		if (existing.length === 0) return slug;
		n += 1;
		slug = `${baseSlug.slice(0, 90)}-${n}`;
	}
}

// ── Admin queries ──────────────────────────────────────────

export async function getEventsForAdmin(opts: {
	status?: string;
	search?: string;
	page?: number;
	limit?: number;
	sort?: 'updated' | 'start' | 'title';
	order?: 'asc' | 'desc';
}): Promise<{ events: AdminEventListItem[]; total: number }> {
	const page = opts.page ?? 1;
	const limit = opts.limit ?? 25;
	const offset = (page - 1) * limit;
	const sort = opts.sort ?? 'updated';
	const order = opts.order ?? 'desc';

	const conditions = [];
	if (opts.status && opts.status !== 'all') {
		conditions.push(eq(eventsTable.status, opts.status));
	}
	if (opts.search) {
		conditions.push(
			or(
				ilike(eventsTable.title, `%${opts.search}%`),
				ilike(eventsTable.hostOrg, `%${opts.search}%`)
			)!
		);
	}

	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const [countResult] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(eventsTable)
		.where(where);
	const total = countResult?.count ?? 0;

	const orderColumn =
		sort === 'title'
			? eventsTable.title
			: sort === 'start'
				? eventsTable.startDate
				: eventsTable.updatedAt;
	const orderByClause = order === 'asc' ? asc(orderColumn) : desc(orderColumn);

	const rows = await db
		.select({
			event: eventsTable,
			orgName: organizations.name,
			venueName: venues.name,
			submitterName: userTable.name,
			submitterEmail: userTable.email
		})
		.from(eventsTable)
		.leftJoin(organizations, eq(eventsTable.organizationId, organizations.id))
		.leftJoin(venues, eq(eventsTable.venueId, venues.id))
		.leftJoin(userTable, eq(eventsTable.submittedById, userTable.id))
		.where(where)
		.orderBy(orderByClause)
		.limit(limit)
		.offset(offset);

	const items: AdminEventListItem[] = rows.map((r) => {
		const item = rowToEventItem(r.event, {
			organizationName: r.orgName ?? undefined,
			venueName: r.venueName ?? undefined
		});
		return {
			...item,
			createdAt: r.event.createdAt,
			submitterName: r.submitterName ?? undefined,
			submitterEmail: r.submitterEmail ?? undefined
		};
	});

	return { events: items, total };
}

export async function getEventStatusCounts(): Promise<Record<string, number>> {
	const rows = await db
		.select({
			status: eventsTable.status,
			count: sql<number>`count(*)::int`
		})
		.from(eventsTable)
		.groupBy(eventsTable.status);

	const counts: Record<string, number> = {};
	for (const row of rows) {
		counts[row.status] = row.count;
	}
	return counts;
}

// ── Create / Update ────────────────────────────────────────

export async function createEvent(
	data: {
		title: string;
		description?: string;
		location?: string;
		address?: string;
		region?: string;
		audience?: string;
		cost?: string;
		eventUrl?: string;
		startDate?: string | Date;
		endDate?: string | Date;
		hostOrg?: string;
		lat?: number;
		lng?: number;
		type?: string;
		types?: string[];
		imageUrl?: string;
		imageUrls?: string[];
		organizationId?: string;
		venueId?: string;
		parentEventId?: string;
		pricingTiers?: PricingTier[];
		priceMin?: number;
		priceMax?: number;
		registrationUrl?: string;
		registrationDeadline?: string | Date;
		eventFormat?: string;
		timezone?: string;
		doorsOpenAt?: string | Date;
		capacity?: number;
		soldOut?: boolean;
		ageRestriction?: string;
		accessibilityNotes?: string;
		virtualEventUrl?: string;
		waitlistUrl?: string;
		tags?: string[];
		isAllDay?: boolean;
		contactEmail?: string;
		contactName?: string;
		contactPhone?: string;
		adminNotes?: string;
		submittedById?: string;
		reviewedById?: string;
		status?: string;
		source?: string;
		unlisted?: boolean;
		publishedAt?: Date;
	},
	database: DbExecutor = db
): Promise<EventItem> {
	const baseSlug = slugify(data.title);
	const slug = await uniqueSlug(baseSlug);
	const startDate = data.startDate ? new Date(data.startDate) : null;
	const endDate = data.endDate ? new Date(data.endDate) : null;
	const registrationDeadline = data.registrationDeadline
		? new Date(data.registrationDeadline)
		: null;
	const doorsOpenAt = data.doorsOpenAt ? new Date(data.doorsOpenAt) : null;

	const [row] = await database
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
			imageUrls: (data.imageUrls && data.imageUrls.length > 0 ? data.imageUrls : []) as string[],
			organizationId: data.organizationId || null,
			venueId: data.venueId || null,
			parentEventId: data.parentEventId || null,
			pricingTiers: data.pricingTiers ?? [],
			priceMin: data.priceMin ?? null,
			priceMax: data.priceMax ?? null,
			registrationUrl: data.registrationUrl ?? null,
			registrationDeadline,
			eventFormat: data.eventFormat ?? null,
			timezone: data.timezone ?? null,
			doorsOpenAt,
			capacity: data.capacity ?? null,
			soldOut: data.soldOut ?? false,
			ageRestriction: data.ageRestriction ?? null,
			accessibilityNotes: data.accessibilityNotes ?? null,
			virtualEventUrl: data.virtualEventUrl ?? null,
			waitlistUrl: data.waitlistUrl ?? null,
			tags: data.tags ?? null,
			isAllDay: data.isAllDay ?? false,
			contactEmail: data.contactEmail ?? null,
			contactName: data.contactName ?? null,
			contactPhone: data.contactPhone ?? null,
			adminNotes: data.adminNotes ?? null,
			submittedById: data.submittedById ?? null,
			reviewedById: data.reviewedById ?? null,
			status: data.status ?? 'pending',
			source: data.source ?? 'submission',
			unlisted: data.unlisted ?? false,
			publishedAt: data.publishedAt ?? null
		})
		.returning();
	if (!row) throw new Error('Insert did not return row');
	const item = rowToEventItem(row);
	if (row.status === 'published') await indexEvent(item);
	return item;
}

export async function updateEvent(
	id: string,
	data: Partial<Omit<EventInsert, 'id' | 'createdAt'>>,
	database: DbExecutor = db
): Promise<EventItem | null> {
	if (data.slug != null) {
		const [current] = await database
			.select({ slug: eventsTable.slug })
			.from(eventsTable)
			.where(eq(eventsTable.id, id))
			.limit(1);
		if (current && current.slug !== data.slug) {
			await database
				.insert(eventSlugRedirects)
				.values({ fromSlug: current.slug, toSlug: data.slug })
				.onConflictDoNothing({ target: eventSlugRedirects.fromSlug });
		}
	}
	const [row] = await database
		.update(eventsTable)
		.set(data)
		.where(eq(eventsTable.id, id))
		.returning();
	if (!row) return null;
	return rowToEventItem(row);
}

/** Clone an event as a new draft (new id, slug, clear moderation fields). */
export async function cloneEvent(sourceId: string): Promise<EventItem | null> {
	const [source] = await db.select().from(eventsTable).where(eq(eventsTable.id, sourceId)).limit(1);
	if (!source) return null;
	const baseSlug = slugify(source.title) + '-copy';
	const slug = await uniqueSlug(baseSlug);
	const {
		id: _id,
		createdAt: _c,
		updatedAt: _u,
		slug: _s,
		status: _st,
		publishedAt: _pa,
		rejectedAt: _ra,
		cancelledAt: _ca,
		reviewedById: _rb,
		submittedById: _sb,
		source: _sr,
		...rest
	} = source;
	const [row] = await db
		.insert(eventsTable)
		.values({
			...rest,
			slug,
			status: 'draft',
			publishedAt: null,
			rejectedAt: null,
			cancelledAt: null,
			reviewedById: null,
			submittedById: null,
			source: 'admin'
		})
		.returning();
	if (!row) return null;
	return rowToEventItem(row);
}

// ── Moderation ─────────────────────────────────────────────

export async function approveEvent(id: string, reviewerId: string): Promise<EventItem | null> {
	const [row] = await db
		.update(eventsTable)
		.set({
			status: 'published',
			publishedAt: new Date(),
			reviewedById: reviewerId,
			rejectedAt: null,
			rejectionReason: null
		})
		.where(eq(eventsTable.id, id))
		.returning();
	if (!row) return null;
	const item = rowToEventItem(row);
	await indexEvent(item);
	return item;
}

export async function rejectEvent(
	id: string,
	reviewerId: string,
	reason?: string
): Promise<EventItem | null> {
	const [row] = await db
		.update(eventsTable)
		.set({
			status: 'rejected',
			rejectedAt: new Date(),
			rejectionReason: reason ?? null,
			reviewedById: reviewerId
		})
		.where(eq(eventsTable.id, id))
		.returning();
	if (!row) return null;
	return rowToEventItem(row);
}

export async function cancelEvent(id: string): Promise<EventItem | null> {
	const [row] = await db
		.update(eventsTable)
		.set({ status: 'cancelled', cancelledAt: new Date() })
		.where(eq(eventsTable.id, id))
		.returning();
	if (!row) return null;
	return rowToEventItem(row);
}

export async function deleteEvent(id: string): Promise<boolean> {
	const result = await db.delete(eventsTable).where(eq(eventsTable.id, id)).returning();
	return result.length > 0;
}

// ── Bulk actions ───────────────────────────────────────────

export async function bulkApproveEvents(ids: string[], reviewerId: string): Promise<number> {
	const result = await db
		.update(eventsTable)
		.set({
			status: 'published',
			publishedAt: new Date(),
			reviewedById: reviewerId,
			rejectedAt: null,
			rejectionReason: null
		})
		.where(inArray(eventsTable.id, ids))
		.returning();
	return result.length;
}

export async function bulkRejectEvents(
	ids: string[],
	reviewerId: string,
	reason?: string
): Promise<number> {
	const result = await db
		.update(eventsTable)
		.set({
			status: 'rejected',
			rejectedAt: new Date(),
			rejectionReason: reason ?? null,
			reviewedById: reviewerId
		})
		.where(inArray(eventsTable.id, ids))
		.returning();
	return result.length;
}

export async function bulkDeleteEvents(ids: string[]): Promise<number> {
	if (ids.length === 0) return 0;
	const result = await db.delete(eventsTable).where(inArray(eventsTable.id, ids)).returning();
	return result.length;
}

// ── Series / child events ──────────────────────────────────

export async function getChildEvents(parentId: string): Promise<EventItem[]> {
	const rows = await db
		.select()
		.from(eventsTable)
		.where(eq(eventsTable.parentEventId, parentId))
		.orderBy(eventsTable.startDate);
	return rows.map((r) => rowToEventItem(r));
}

// ── Duplicate detection ────────────────────────────────────

function levenshtein(a: string, b: string): number {
	const m = a.length;
	const n = b.length;
	const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
	for (let i = 0; i <= m; i++) dp[i][0] = i;
	for (let j = 0; j <= n; j++) dp[0][j] = j;
	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			dp[i][j] =
				a[i - 1] === b[j - 1]
					? dp[i - 1][j - 1]
					: 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
		}
	}
	return dp[m][n];
}

export async function findDuplicates(
	threshold = 0.3
): Promise<{ group: EventItem[]; similarity: number }[]> {
	const rows = await db
		.select()
		.from(eventsTable)
		.where(or(eq(eventsTable.status, 'published'), eq(eventsTable.status, 'pending'))!)
		.orderBy(eventsTable.startDate);

	const items = rows.map((r) => rowToEventItem(r));
	const groups: { group: EventItem[]; similarity: number }[] = [];
	const used = new Set<string>();

	for (let i = 0; i < items.length; i++) {
		if (used.has(items[i].id)) continue;
		const group: EventItem[] = [items[i]];

		for (let j = i + 1; j < items.length; j++) {
			if (used.has(items[j].id)) continue;
			const titleA = items[i].title.toLowerCase();
			const titleB = items[j].title.toLowerCase();
			const maxLen = Math.max(titleA.length, titleB.length);
			if (maxLen === 0) continue;
			const dist = levenshtein(titleA, titleB);
			const similarity = 1 - dist / maxLen;

			if (similarity < 1 - threshold) continue;

			const dateA = items[i].startDate ? new Date(items[i].startDate!).getTime() : 0;
			const dateB = items[j].startDate ? new Date(items[j].startDate!).getTime() : 0;
			const daysDiff = Math.abs(dateA - dateB) / (1000 * 60 * 60 * 24);
			if (dateA && dateB && daysDiff > 3) continue;

			group.push(items[j]);
			used.add(items[j].id);
		}

		if (group.length > 1) {
			used.add(items[i].id);
			groups.push({ group, similarity: 1 });
		}
	}

	return groups;
}

export async function mergeEvents(keeperId: string, mergeIds: string[]): Promise<EventItem | null> {
	const [keeper] = await db.select().from(eventsTable).where(eq(eventsTable.id, keeperId)).limit(1);
	if (!keeper) return null;

	const mergeable = await db.select().from(eventsTable).where(inArray(eventsTable.id, mergeIds));

	const merged: Partial<EventInsert> = {};
	for (const row of mergeable) {
		if (!keeper.description && row.description) merged.description = row.description;
		if (!keeper.location && row.location) merged.location = row.location;
		if (!keeper.address && row.address) merged.address = row.address;
		if (!keeper.eventUrl && row.eventUrl) merged.eventUrl = row.eventUrl;
		if (!keeper.imageUrl && row.imageUrl) merged.imageUrl = row.imageUrl;
		if (!keeper.lat && row.lat) {
			merged.lat = row.lat;
			merged.lng = row.lng;
		}
		if (!keeper.contactEmail && row.contactEmail) merged.contactEmail = row.contactEmail;
		if (!keeper.contactName && row.contactName) merged.contactName = row.contactName;
		if (!keeper.contactPhone && row.contactPhone) merged.contactPhone = row.contactPhone;
		if (!keeper.registrationUrl && row.registrationUrl)
			merged.registrationUrl = row.registrationUrl;
		if ((!keeper.tags || keeper.tags.length === 0) && row.tags && row.tags.length > 0)
			merged.tags = row.tags;
	}

	if (Object.keys(merged).length > 0) {
		await db.update(eventsTable).set(merged).where(eq(eventsTable.id, keeperId));
	}

	await db.delete(eventsTable).where(inArray(eventsTable.id, mergeIds));

	const [updated] = await db
		.select()
		.from(eventsTable)
		.where(eq(eventsTable.id, keeperId))
		.limit(1);
	return updated ? rowToEventItem(updated) : null;
}

/**
 * Get all event rows from DB (for Meilisearch reindex). Includes only published.
 */
export async function getAllEventRowsForIndex(): Promise<EventRow[]> {
	return db.select().from(eventsTable).where(eq(eventsTable.status, 'published'));
}
