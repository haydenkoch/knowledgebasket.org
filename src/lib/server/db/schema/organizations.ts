import { pgTable, text, uuid, real, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { user } from '../auth.schema';

export const organizations = pgTable(
	'organizations',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		slug: text('slug').notNull().unique(),
		name: text('name').notNull(),
		aliases: text('aliases').array().notNull().default([]),
		description: text('description'),
		website: text('website'),
		email: text('email'),
		phone: text('phone'),
		logoUrl: text('logo_url'),
		orgType: text('org_type'),
		orgTypes: text('org_types').array(),
		region: text('region'),

		// Location / geocoding
		address: text('address'),
		city: text('city'),
		state: text('state'),
		zip: text('zip'),
		lat: real('lat'),
		lng: real('lng'),

		// Indigenous identity
		tribalAffiliation: text('tribal_affiliation'),
		tribalAffiliations: text('tribal_affiliations').array(),

		// Social
		socialLinks: jsonb('social_links').default({}),

		// Verification
		verified: boolean('verified').default(false),
		verifiedAt: timestamp('verified_at', { withTimezone: true }),
		verifiedById: text('verified_by_id').references(() => user.id, { onDelete: 'set null' }),
		verificationNotes: text('verification_notes'),

		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(t) => [index('organizations_slug_idx').on(t.slug)]
);
