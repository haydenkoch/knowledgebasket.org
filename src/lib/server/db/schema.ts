import { pgTable, text, uuid, real, timestamp, index } from 'drizzle-orm/pg-core';

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
		types: text('types').array(), // e.g. ["Powwow", "Big Time"]
		startDate: timestamp('start_date', { withTimezone: true }),
		endDate: timestamp('end_date', { withTimezone: true }),
		imageUrl: text('image_url'),
		organizationId: uuid('organization_id'),
		status: text('status').notNull().default('published'), // draft | pending | published
		source: text('source').notNull().default('seed'), // seed | submission | ical
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		index('events_status_idx').on(table.status),
		index('events_start_date_idx').on(table.startDate),
		index('events_organization_id_idx').on(table.organizationId)
	]
);

export * from './auth.schema';
