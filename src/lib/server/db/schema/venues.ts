import { pgTable, text, uuid, real, timestamp, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const venues = pgTable(
	'venues',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		slug: text('slug').notNull().unique(),
		name: text('name').notNull(),
		aliases: text('aliases').array().notNull().default([]),
		description: text('description'),
		address: text('address'),
		city: text('city'),
		state: text('state'),
		zip: text('zip'),
		lat: real('lat'),
		lng: real('lng'),
		website: text('website'),
		imageUrl: text('image_url'),
		venueType: text('venue_type'),
		organizationId: uuid('organization_id').references(() => organizations.id, {
			onDelete: 'set null'
		}),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(t) => [
		index('venues_slug_idx').on(t.slug),
		index('venues_organization_id_idx').on(t.organizationId)
	]
);
