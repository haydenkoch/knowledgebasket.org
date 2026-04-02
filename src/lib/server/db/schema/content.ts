import {
	pgTable,
	text,
	uuid,
	timestamp,
	boolean,
	integer,
	index,
	unique
} from 'drizzle-orm/pg-core';
import { user } from '../auth.schema';
import { organizations } from './organizations';

export const userOrgMemberships = pgTable(
	'user_org_memberships',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		role: text('role').notNull().default('member'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [
		index('user_org_memberships_user_id_idx').on(t.userId),
		index('user_org_memberships_org_id_idx').on(t.organizationId),
		unique('user_org_memberships_unique').on(t.userId, t.organizationId)
	]
);

export const orgFollows = pgTable(
	'org_follows',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [
		index('org_follows_user_id_idx').on(t.userId),
		index('org_follows_org_id_idx').on(t.organizationId),
		unique('org_follows_unique').on(t.userId, t.organizationId)
	]
);

export const bookmarks = pgTable(
	'bookmarks',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		itemType: text('item_type').notNull(),
		itemId: uuid('item_id').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [
		index('bookmarks_user_id_idx').on(t.userId),
		index('bookmarks_item_type_idx').on(t.itemType),
		unique('bookmarks_unique').on(t.userId, t.itemType, t.itemId)
	]
);

export const notifications = pgTable(
	'notifications',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		type: text('type').notNull(),
		title: text('title').notNull(),
		message: text('message'),
		link: text('link'),
		read: boolean('read').default(false),
		readAt: timestamp('read_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [
		index('notifications_user_id_idx').on(t.userId),
		index('notifications_read_idx').on(t.read)
	]
);

export const notificationPreferences = pgTable('notification_preferences', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: text('user_id')
		.notNull()
		.unique()
		.references(() => user.id, { onDelete: 'cascade' }),
	emailSubmissionUpdates: boolean('email_submission_updates').default(true),
	emailOrgActivity: boolean('email_org_activity').default(true),
	emailFollowedOrgs: boolean('email_followed_orgs').default(true),
	emailBookmarkReminders: boolean('email_bookmark_reminders').default(true),
	emailNewsletter: boolean('email_newsletter').default(true),
	inAppSubmissionUpdates: boolean('in_app_submission_updates').default(true),
	inAppOrgActivity: boolean('in_app_org_activity').default(true),
	inAppFollowedOrgs: boolean('in_app_followed_orgs').default(true),
	inAppBookmarkReminders: boolean('in_app_bookmark_reminders').default(true),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull()
});

export const contentLists = pgTable(
	'content_lists',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		slug: text('slug').notNull().unique(),
		title: text('title').notNull(),
		coil: text('coil').notNull(),
		sortOrder: integer('sort_order').default(0).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(t) => [index('content_lists_slug_idx').on(t.slug), index('content_lists_coil_idx').on(t.coil)]
);

export const contentListItems = pgTable(
	'content_list_items',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		listId: uuid('list_id')
			.notNull()
			.references(() => contentLists.id, { onDelete: 'cascade' }),
		itemType: text('item_type').notNull(),
		itemId: uuid('item_id').notNull(),
		sortOrder: integer('sort_order').default(0).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [
		index('content_list_items_list_id_idx').on(t.listId),
		index('content_list_items_item_id_idx').on(t.itemId)
	]
);

export const contentViews = pgTable(
	'content_views',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		itemType: text('item_type').notNull(),
		itemId: uuid('item_id').notNull(),
		viewedAt: timestamp('viewed_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [
		index('content_views_item_type_idx').on(t.itemType),
		index('content_views_item_id_idx').on(t.itemId),
		index('content_views_viewed_at_idx').on(t.viewedAt)
	]
);
