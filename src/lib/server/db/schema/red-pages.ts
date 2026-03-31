import { pgTable, text, uuid, real, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { user } from '../auth.schema';
import { organizations } from './organizations';

export const redPagesBusinesses = pgTable(
	'red_pages_businesses',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		slug: text('slug').notNull().unique(),
		name: text('name').notNull(),
		description: text('description'),

		// Business details
		organizationId: uuid('organization_id').references(() => organizations.id, {
			onDelete: 'set null'
		}),
		ownerName: text('owner_name'),

		// Classification
		serviceType: text('service_type'),
		serviceTypes: text('service_types').array(),
		serviceArea: text('service_area'),
		tags: text('tags').array(),

		// Indigenous identity
		tribalAffiliation: text('tribal_affiliation'),
		tribalAffiliations: text('tribal_affiliations').array(),
		ownershipIdentity: text('ownership_identity').array(),

		// Contact & location
		website: text('website'),
		email: text('email'),
		phone: text('phone'),
		address: text('address'),
		city: text('city'),
		state: text('state'),
		zip: text('zip'),
		lat: real('lat'),
		lng: real('lng'),
		region: text('region'),

		// Business hours
		businessHours: jsonb('business_hours').default([]),

		// Media
		logoUrl: text('logo_url'),
		imageUrl: text('image_url'),
		imageUrls: jsonb('image_urls').default([]),

		// Certifications
		certifications: text('certifications').array(),

		// Social
		socialLinks: jsonb('social_links').default({}),

		// Moderation
		status: text('status').notNull().default('pending'),
		source: text('source').notNull().default('seed'),
		featured: boolean('featured').default(false),
		unlisted: boolean('unlisted').default(false),
		publishedAt: timestamp('published_at', { withTimezone: true }),
		rejectedAt: timestamp('rejected_at', { withTimezone: true }),
		rejectionReason: text('rejection_reason'),
		adminNotes: text('admin_notes'),
		submittedById: text('submitted_by_id').references(() => user.id, { onDelete: 'set null' }),
		reviewedById: text('reviewed_by_id').references(() => user.id, { onDelete: 'set null' }),
		verified: boolean('verified').default(false),
		verifiedAt: timestamp('verified_at', { withTimezone: true }),

		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(t) => [
		index('red_pages_status_idx').on(t.status),
		index('red_pages_slug_idx').on(t.slug),
		index('red_pages_organization_id_idx').on(t.organizationId),
		index('red_pages_region_idx').on(t.region),
		index('red_pages_service_type_idx').on(t.serviceType),
		index('red_pages_submitted_by_id_idx').on(t.submittedById)
	]
);
