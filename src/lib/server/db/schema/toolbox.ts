import { pgTable, text, uuid, timestamp, boolean, index, jsonb } from 'drizzle-orm/pg-core';
import { user } from '../auth.schema';
import { organizations } from './organizations';

export const toolboxResources = pgTable(
	'toolbox_resources',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		slug: text('slug').notNull().unique(),
		title: text('title').notNull(),
		description: text('description'),
		body: text('body'),

		// Source
		sourceName: text('source_name'),
		organizationId: uuid('organization_id').references(() => organizations.id, {
			onDelete: 'set null'
		}),

		// Classification
		resourceType: text('resource_type').notNull(),
		mediaType: text('media_type'),
		category: text('category'),
		categories: text('categories').array(),
		tags: text('tags').array(),

		// Content
		contentMode: text('content_mode').notNull().default('link'),
		externalUrl: text('external_url'),
		fileUrl: text('file_url'),

		// Media
		imageUrl: text('image_url'),
		imageUrls: jsonb('image_urls').$type<string[]>().default([]),

		// Metadata
		author: text('author'),
		publishDate: timestamp('publish_date', { withTimezone: true }),
		lastReviewedAt: timestamp('last_reviewed_at', { withTimezone: true }),

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

		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(t) => [
		index('toolbox_status_idx').on(t.status),
		index('toolbox_resource_type_idx').on(t.resourceType),
		index('toolbox_category_idx').on(t.category),
		index('toolbox_organization_id_idx').on(t.organizationId),
		index('toolbox_content_mode_idx').on(t.contentMode),
		index('toolbox_submitted_by_id_idx').on(t.submittedById)
	]
);
