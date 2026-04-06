import {
	pgTable,
	text,
	uuid,
	real,
	timestamp,
	boolean,
	jsonb,
	integer,
	index,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { user } from '../auth.schema';
import { organizations } from './organizations';
import { venues } from './venues';

export const events = pgTable(
	'events',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		slug: text('slug').notNull().unique(),
		title: text('title').notNull(),
		description: text('description'),
		location: text('location'),
		address: text('address'),
		region: text('region'),
		audience: text('audience'),
		cost: text('cost'),
		eventUrl: text('event_url'),
		hostOrg: text('host_org'),
		lat: real('lat'),
		lng: real('lng'),
		type: text('type'),
		types: text('types').array(),
		startDate: timestamp('start_date', { withTimezone: true }),
		endDate: timestamp('end_date', { withTimezone: true }),
		imageUrl: text('image_url'),
		imageUrls: jsonb('image_urls').default([]), // secondary gallery URLs
		status: text('status').notNull().default('published'),
		source: text('source').notNull().default('seed'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),

		organizationId: uuid('organization_id').references(() => organizations.id, {
			onDelete: 'set null'
		}),
		venueId: uuid('venue_id').references(() => venues.id, { onDelete: 'set null' }),
		parentEventId: uuid('parent_event_id'),
		submittedById: text('submitted_by_id').references(() => user.id, { onDelete: 'set null' }),
		reviewedById: text('reviewed_by_id').references(() => user.id, { onDelete: 'set null' }),

		pricingTiers: jsonb('pricing_tiers').default([]),
		priceMin: real('price_min'),
		priceMax: real('price_max'),

		registrationUrl: text('registration_url'),
		registrationDeadline: timestamp('registration_deadline', { withTimezone: true }),

		eventFormat: text('event_format'), // in_person | online | hybrid
		timezone: text('timezone'), // IANA
		doorsOpenAt: timestamp('doors_open_at', { withTimezone: true }),
		capacity: integer('capacity'),
		soldOut: boolean('sold_out').default(false),
		ageRestriction: text('age_restriction'),
		accessibilityNotes: text('accessibility_notes'),
		virtualEventUrl: text('virtual_event_url'),
		waitlistUrl: text('waitlist_url'),

		contactEmail: text('contact_email'),
		contactName: text('contact_name'),
		contactPhone: text('contact_phone'),

		tags: text('tags').array(),

		isAllDay: boolean('is_all_day').default(false),

		featured: boolean('featured').default(false),
		unlisted: boolean('unlisted').default(false),
		publishedAt: timestamp('published_at', { withTimezone: true }),
		cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
		rejectedAt: timestamp('rejected_at', { withTimezone: true }),
		rejectionReason: text('rejection_reason'),
		adminNotes: text('admin_notes')
	},
	(table) => [
		index('events_status_idx').on(table.status),
		index('events_start_date_idx').on(table.startDate),
		index('events_organization_id_idx').on(table.organizationId),
		index('events_venue_id_idx').on(table.venueId),
		index('events_parent_event_id_idx').on(table.parentEventId),
		index('events_submitted_by_id_idx').on(table.submittedById)
	]
);

export const eventLists = pgTable(
	'event_lists',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		slug: text('slug').notNull().unique(),
		title: text('title').notNull(),
		sortOrder: integer('sort_order').default(0).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(t) => [index('event_lists_slug_idx').on(t.slug)]
);

export const eventListItems = pgTable(
	'event_list_items',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		listId: uuid('list_id')
			.notNull()
			.references(() => eventLists.id, { onDelete: 'cascade' }),
		eventId: uuid('event_id')
			.notNull()
			.references(() => events.id, { onDelete: 'cascade' }),
		sortOrder: integer('sort_order').default(0).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [
		index('event_list_items_list_id_idx').on(t.listId),
		index('event_list_items_event_id_idx').on(t.eventId),
		uniqueIndex('event_list_items_list_event_unique').on(t.listId, t.eventId)
	]
);

export const eventSlugRedirects = pgTable(
	'event_slug_redirects',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		fromSlug: text('from_slug').notNull().unique(),
		toSlug: text('to_slug').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [index('event_slug_redirects_from_idx').on(t.fromSlug)]
);
