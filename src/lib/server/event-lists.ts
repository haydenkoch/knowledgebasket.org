/**
 * Curated event lists (e.g. Featured): CRUD and list items.
 */
import { eq, asc, and, sql, isNull, or } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { eventLists, eventListItems, events } from '$lib/server/db/schema';

export type EventListRow = typeof eventLists.$inferSelect;
export type EventListInsert = typeof eventLists.$inferInsert;
export type EventListItemRow = typeof eventListItems.$inferSelect;
export type EventListSummary = EventListRow & { itemCount: number };

export async function getAllLists(): Promise<EventListRow[]> {
	return db.select().from(eventLists).orderBy(asc(eventLists.sortOrder), asc(eventLists.title));
}

export async function getAllListsWithCounts(): Promise<EventListSummary[]> {
	const rows = await db
		.select({
			id: eventLists.id,
			slug: eventLists.slug,
			title: eventLists.title,
			sortOrder: eventLists.sortOrder,
			createdAt: eventLists.createdAt,
			updatedAt: eventLists.updatedAt,
			itemCount: sql<number>`count(${eventListItems.id})::int`
		})
		.from(eventLists)
		.leftJoin(eventListItems, eq(eventListItems.listId, eventLists.id))
		.groupBy(eventLists.id)
		.orderBy(asc(eventLists.sortOrder), asc(eventLists.title));

	return rows.map((row) => ({
		...row,
		itemCount: Number(row.itemCount ?? 0)
	}));
}

export async function getListBySlug(slug: string): Promise<EventListRow | null> {
	const rows = await db.select().from(eventLists).where(eq(eventLists.slug, slug)).limit(1);
	return rows[0] ?? null;
}

export async function getListById(id: string): Promise<EventListRow | null> {
	const rows = await db.select().from(eventLists).where(eq(eventLists.id, id)).limit(1);
	return rows[0] ?? null;
}

export async function createList(data: {
	slug: string;
	title: string;
	sortOrder?: number;
}): Promise<EventListRow> {
	const [row] = await db
		.insert(eventLists)
		.values({
			slug: data.slug,
			title: data.title,
			sortOrder: data.sortOrder ?? 0
		})
		.returning();
	if (!row) throw new Error('Failed to create list');
	return row;
}

export async function updateList(
	id: string,
	data: Partial<Pick<EventListRow, 'slug' | 'title' | 'sortOrder'>>
): Promise<EventListRow | null> {
	const [row] = await db.update(eventLists).set(data).where(eq(eventLists.id, id)).returning();
	return row ?? null;
}

export async function deleteList(id: string): Promise<boolean> {
	const deleted = await db
		.delete(eventLists)
		.where(eq(eventLists.id, id))
		.returning({ id: eventLists.id });
	return deleted.length > 0;
}

/** Get event IDs in a list (ordered). */
export async function getListEventIds(listId: string): Promise<string[]> {
	const rows = await db
		.select({ eventId: eventListItems.eventId })
		.from(eventListItems)
		.where(eq(eventListItems.listId, listId))
		.orderBy(asc(eventListItems.sortOrder));
	return rows.map((r) => r.eventId);
}

/** Get full event rows for a list in admin order. */
export async function getListEvents(listId: string) {
	const rows = await db
		.select({
			event: events,
			sortOrder: eventListItems.sortOrder
		})
		.from(eventListItems)
		.innerJoin(events, eq(eventListItems.eventId, events.id))
		.where(eq(eventListItems.listId, listId))
		.orderBy(asc(eventListItems.sortOrder));
	return rows.map((r) => r.event);
}

/** Get public-safe event IDs for a list (published and not unlisted, ordered). */
export async function getPublicListEventIds(listId: string): Promise<string[]> {
	const rows = await db
		.select({ eventId: eventListItems.eventId })
		.from(eventListItems)
		.innerJoin(events, eq(eventListItems.eventId, events.id))
		.where(
			and(
				eq(eventListItems.listId, listId),
				eq(events.status, 'published'),
				or(eq(events.unlisted, false), isNull(events.unlisted))
			)
		)
		.orderBy(asc(eventListItems.sortOrder));
	return rows.map((row) => row.eventId);
}

export async function addEventToList(
	listId: string,
	eventId: string,
	sortOrder?: number
): Promise<EventListItemRow | null> {
	const [existing] = await db
		.select()
		.from(eventListItems)
		.where(and(eq(eventListItems.listId, listId), eq(eventListItems.eventId, eventId)))
		.limit(1);
	if (existing) return existing;

	const [sortRow] = await db
		.select({ maxSortOrder: sql<number>`coalesce(max(${eventListItems.sortOrder}), -1)` })
		.from(eventListItems)
		.where(eq(eventListItems.listId, listId));
	const resolvedSortOrder = sortOrder ?? Number(sortRow?.maxSortOrder ?? -1) + 1;

	const [row] = await db
		.insert(eventListItems)
		.values({
			listId,
			eventId,
			sortOrder: resolvedSortOrder
		})
		.returning();
	return row ?? null;
}

export async function removeEventFromList(listId: string, eventId: string): Promise<boolean> {
	const deleted = await db
		.delete(eventListItems)
		.where(and(eq(eventListItems.listId, listId), eq(eventListItems.eventId, eventId)))
		.returning({ eventId: eventListItems.eventId });
	return deleted.length > 0;
}

export async function setListEventOrder(listId: string, eventIds: string[]): Promise<void> {
	await db.delete(eventListItems).where(eq(eventListItems.listId, listId));
	for (let i = 0; i < eventIds.length; i++) {
		await db.insert(eventListItems).values({ listId, eventId: eventIds[i], sortOrder: i });
	}
}
