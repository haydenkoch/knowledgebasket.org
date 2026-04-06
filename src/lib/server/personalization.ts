import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	bookmarks,
	events,
	notificationPreferences,
	notifications,
	orgFollows,
	organizations,
	personalCalendarFeeds
} from '$lib/server/db/schema';
import { BOOKMARK_ITEM_TYPES, type BookmarkItemType } from '$lib/data/kb';
import { getBusinessById } from '$lib/server/red-pages';
import { getEventById } from '$lib/server/events';
import { getFundingById } from '$lib/server/funding';
import { getJobById } from '$lib/server/jobs';
import { getResourceById } from '$lib/server/toolbox';

type NotificationPreferencesInsert = typeof notificationPreferences.$inferInsert;
type NotificationPreferencesRow = typeof notificationPreferences.$inferSelect;

function assertBookmarkItemType(itemType: string): asserts itemType is BookmarkItemType {
	if (!(BOOKMARK_ITEM_TYPES as readonly string[]).includes(itemType)) {
		throw new Error(`Unsupported bookmark item type: ${itemType}`);
	}
}

function makeCalendarToken(): string {
	return crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
}

export async function followOrganization(userId: string, organizationId: string) {
	const [existing] = await db
		.select()
		.from(orgFollows)
		.where(and(eq(orgFollows.userId, userId), eq(orgFollows.organizationId, organizationId)))
		.limit(1);

	if (existing) return existing;

	const [created] = await db.insert(orgFollows).values({ userId, organizationId }).returning();
	return created ?? null;
}

export async function unfollowOrganization(userId: string, organizationId: string) {
	const [removed] = await db
		.delete(orgFollows)
		.where(and(eq(orgFollows.userId, userId), eq(orgFollows.organizationId, organizationId)))
		.returning();
	return removed ?? null;
}

export async function isFollowingOrganization(userId: string | undefined, organizationId: string) {
	if (!userId) return false;
	const [row] = await db
		.select({ id: orgFollows.id })
		.from(orgFollows)
		.where(and(eq(orgFollows.userId, userId), eq(orgFollows.organizationId, organizationId)))
		.limit(1);
	return Boolean(row);
}

export async function getFollowedOrganizations(userId: string) {
	const rows = await db
		.select({
			followedAt: orgFollows.createdAt,
			organization: organizations
		})
		.from(orgFollows)
		.innerJoin(organizations, eq(orgFollows.organizationId, organizations.id))
		.where(eq(orgFollows.userId, userId))
		.orderBy(organizations.name);

	return rows;
}

export async function toggleBookmark(userId: string, itemType: BookmarkItemType, itemId: string) {
	assertBookmarkItemType(itemType);
	const [existing] = await db
		.select()
		.from(bookmarks)
		.where(
			and(
				eq(bookmarks.userId, userId),
				eq(bookmarks.itemType, itemType),
				eq(bookmarks.itemId, itemId)
			)
		)
		.limit(1);

	if (existing) {
		await db.delete(bookmarks).where(eq(bookmarks.id, existing.id));
		return { bookmarked: false };
	}

	await db.insert(bookmarks).values({ userId, itemType, itemId });
	return { bookmarked: true };
}

export async function isBookmarked(
	userId: string | undefined,
	itemType: BookmarkItemType,
	itemId: string
) {
	if (!userId) return false;
	const [bookmark] = await db
		.select({ id: bookmarks.id })
		.from(bookmarks)
		.where(
			and(
				eq(bookmarks.userId, userId),
				eq(bookmarks.itemType, itemType),
				eq(bookmarks.itemId, itemId)
			)
		)
		.limit(1);
	return Boolean(bookmark);
}

export async function getUserBookmarks(userId: string) {
	const rows = await db
		.select()
		.from(bookmarks)
		.where(eq(bookmarks.userId, userId))
		.orderBy(desc(bookmarks.createdAt));

	const resolved = await Promise.all(
		rows.map(async (bookmark) => {
			assertBookmarkItemType(bookmark.itemType);

			switch (bookmark.itemType) {
				case 'event':
					return {
						bookmark,
						itemType: bookmark.itemType,
						item: await getEventById(bookmark.itemId)
					};
				case 'funding':
					return {
						bookmark,
						itemType: bookmark.itemType,
						item: await getFundingById(bookmark.itemId)
					};
				case 'job':
					return {
						bookmark,
						itemType: bookmark.itemType,
						item: await getJobById(bookmark.itemId)
					};
				case 'redpage':
					return {
						bookmark,
						itemType: bookmark.itemType,
						item: await getBusinessById(bookmark.itemId)
					};
				case 'toolbox':
					return {
						bookmark,
						itemType: bookmark.itemType,
						item: await getResourceById(bookmark.itemId)
					};
			}
		})
	);

	return resolved.filter((entry) => entry.item);
}

export async function getUserNotificationPreferences(
	userId: string
): Promise<NotificationPreferencesRow> {
	const [existing] = await db
		.select()
		.from(notificationPreferences)
		.where(eq(notificationPreferences.userId, userId))
		.limit(1);
	if (existing) return existing;

	const [created] = await db.insert(notificationPreferences).values({ userId }).returning();
	if (!created) throw new Error('Unable to create notification preferences');
	return created;
}

export async function updateUserNotificationPreferences(
	userId: string,
	input: Partial<NotificationPreferencesInsert>
) {
	await getUserNotificationPreferences(userId);
	const [updated] = await db
		.update(notificationPreferences)
		.set({ ...input, updatedAt: new Date() })
		.where(eq(notificationPreferences.userId, userId))
		.returning();
	if (!updated) throw new Error('Unable to update notification preferences');
	return updated;
}

export async function createNotification(input: {
	userId: string;
	type: string;
	title: string;
	message?: string | null;
	link?: string | null;
}) {
	const [created] = await db
		.insert(notifications)
		.values({
			userId: input.userId,
			type: input.type,
			title: input.title,
			message: input.message ?? null,
			link: input.link ?? null
		})
		.returning();
	return created ?? null;
}

export async function getUserNotifications(userId: string, limit = 50) {
	return db
		.select()
		.from(notifications)
		.where(eq(notifications.userId, userId))
		.orderBy(desc(notifications.createdAt))
		.limit(limit);
}

export async function getUnreadNotificationCount(userId: string) {
	const [result] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(notifications)
		.where(and(eq(notifications.userId, userId), eq(notifications.read, false)));

	return result?.count ?? 0;
}

export async function markNotificationRead(userId: string, notificationId: string) {
	const [updated] = await db
		.update(notifications)
		.set({ read: true, readAt: new Date() })
		.where(and(eq(notifications.userId, userId), eq(notifications.id, notificationId)))
		.returning();
	return updated ?? null;
}

export async function markAllNotificationsRead(userId: string) {
	await db
		.update(notifications)
		.set({ read: true, readAt: new Date() })
		.where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
}

async function getOrCreatePersonalCalendarFeedRecord(userId: string) {
	const [existing] = await db
		.select()
		.from(personalCalendarFeeds)
		.where(eq(personalCalendarFeeds.userId, userId))
		.limit(1);
	if (existing) return existing;

	const [created] = await db
		.insert(personalCalendarFeeds)
		.values({ userId, token: makeCalendarToken() })
		.returning();
	if (!created) throw new Error('Unable to create personal calendar feed');
	return created;
}

export async function getPersonalCalendarFeed(userId: string) {
	return getOrCreatePersonalCalendarFeedRecord(userId);
}

export async function rotatePersonalCalendarToken(userId: string) {
	await getOrCreatePersonalCalendarFeedRecord(userId);
	const [updated] = await db
		.update(personalCalendarFeeds)
		.set({
			token: makeCalendarToken(),
			rotatedAt: new Date()
		})
		.where(eq(personalCalendarFeeds.userId, userId))
		.returning();
	if (!updated) throw new Error('Unable to rotate personal calendar token');
	return updated;
}

export async function getPersonalCalendarFeedByToken(token: string) {
	const [feed] = await db
		.select()
		.from(personalCalendarFeeds)
		.where(eq(personalCalendarFeeds.token, token))
		.limit(1);
	return feed ?? null;
}

export async function getPersonalCalendarFeedEvents(userId: string) {
	const [follows, eventBookmarks] = await Promise.all([
		db
			.select({ organizationId: orgFollows.organizationId })
			.from(orgFollows)
			.where(eq(orgFollows.userId, userId)),
		db
			.select({ itemId: bookmarks.itemId })
			.from(bookmarks)
			.where(and(eq(bookmarks.userId, userId), eq(bookmarks.itemType, 'event')))
	]);

	const organizationIds = follows.map((row) => row.organizationId);
	const bookmarkedEventIds = eventBookmarks.map((row) => row.itemId);

	if (organizationIds.length === 0 && bookmarkedEventIds.length === 0) return [];

	const conditions = [eq(events.status, 'published')];
	if (organizationIds.length > 0 && bookmarkedEventIds.length > 0) {
		conditions.push(
			or(inArray(events.organizationId, organizationIds), inArray(events.id, bookmarkedEventIds))!
		);
	} else if (organizationIds.length > 0) {
		conditions.push(inArray(events.organizationId, organizationIds));
	} else if (bookmarkedEventIds.length > 0) {
		conditions.push(inArray(events.id, bookmarkedEventIds));
	}

	const rows = await db
		.select({
			event: events,
			orgName: organizations.name
		})
		.from(events)
		.leftJoin(organizations, eq(events.organizationId, organizations.id))
		.where(and(...conditions))
		.orderBy(events.startDate);

	const seen = new Set<string>();
	return rows
		.filter((row) => {
			if (seen.has(row.event.id)) return false;
			seen.add(row.event.id);
			return true;
		})
		.map((row) => ({
			id: row.event.id,
			slug: row.event.slug,
			title: row.event.title,
			description: row.event.description,
			location: row.event.location,
			startDate: row.event.startDate,
			endDate: row.event.endDate,
			organizationName: row.orgName ?? undefined
		}));
}

export async function getAccountQuickCounts(userId: string) {
	const [bookmarkCount, followCount, unreadCount] = await Promise.all([
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(bookmarks)
			.where(eq(bookmarks.userId, userId)),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(orgFollows)
			.where(eq(orgFollows.userId, userId)),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(notifications)
			.where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
	]);

	return {
		bookmarks: bookmarkCount[0]?.count ?? 0,
		follows: followCount[0]?.count ?? 0,
		unreadNotifications: unreadCount[0]?.count ?? 0
	};
}

export async function getBookmarkedItemRoute(
	itemType: BookmarkItemType,
	slug: string | undefined,
	_id: string
) {
	switch (itemType) {
		case 'event':
			return slug ? `/events/${slug}` : `/events`;
		case 'funding':
			return slug ? `/funding/${slug}` : `/funding`;
		case 'job':
			return slug ? `/jobs/${slug}` : `/jobs`;
		case 'redpage':
			return slug ? `/red-pages/${slug}` : `/red-pages`;
		case 'toolbox':
			return slug ? `/toolbox/${slug}` : `/toolbox`;
		default:
			return `/`;
	}
}
