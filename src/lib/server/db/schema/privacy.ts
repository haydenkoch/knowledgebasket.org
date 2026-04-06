import { pgTable, text, uuid, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { user } from '../auth.schema';

export const privacyRequests = pgTable(
	'privacy_requests',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
		requestType: text('request_type').notNull(),
		channel: text('channel').notNull().default('account'),
		status: text('status').notNull().default('submitted'),
		verificationStatus: text('verification_status').notNull().default('verified'),
		subject: text('subject'),
		details: jsonb('details').default({}).notNull(),
		resolutionNotes: text('resolution_notes'),
		requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
		fulfilledAt: timestamp('fulfilled_at', { withTimezone: true }),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		index('privacy_requests_user_id_idx').on(table.userId),
		index('privacy_requests_type_idx').on(table.requestType),
		index('privacy_requests_status_idx').on(table.status),
		index('privacy_requests_requested_at_idx').on(table.requestedAt)
	]
);
