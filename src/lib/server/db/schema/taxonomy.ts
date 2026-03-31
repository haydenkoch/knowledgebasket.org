import { pgTable, text, uuid, timestamp, integer, index } from 'drizzle-orm/pg-core';

export const taxonomyTags = pgTable(
	'taxonomy_tags',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		slug: text('slug').notNull().unique(),
		label: text('label').notNull(),
		group: text('group').notNull(), // e.g. event_type | topic | custom
		sortOrder: integer('sort_order').default(0).notNull(),
		description: text('description'),
		color: text('color'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(t) => [index('taxonomy_tags_group_idx').on(t.group)]
);

export const taxonomyOptions = pgTable(
	'taxonomy_options',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		key: text('key').notNull(), // e.g. region | audience | cost
		value: text('value').notNull(),
		label: text('label').notNull(),
		sortOrder: integer('sort_order').default(0).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(t) => [index('taxonomy_options_key_idx').on(t.key)]
);
