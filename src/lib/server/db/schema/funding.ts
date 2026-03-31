import { pgTable, text, uuid, real, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { user } from '../auth.schema';
import { organizations } from './organizations';

export const funding = pgTable(
	'funding',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		slug: text('slug').notNull().unique(),
		title: text('title').notNull(),
		description: text('description'),

		// Funder info
		funderName: text('funder_name'),
		organizationId: uuid('organization_id').references(() => organizations.id, {
			onDelete: 'set null'
		}),

		// Classification
		fundingType: text('funding_type'),
		fundingTypes: text('funding_types').array(),
		eligibilityType: text('eligibility_type'),
		eligibilityTypes: text('eligibility_types').array(),
		focusAreas: text('focus_areas').array(),
		tags: text('tags').array(),

		// Status & timing
		applicationStatus: text('application_status').notNull().default('open'),
		openDate: timestamp('open_date', { withTimezone: true }),
		deadline: timestamp('deadline', { withTimezone: true }),
		awardDate: timestamp('award_date', { withTimezone: true }),
		fundingCycleNotes: text('funding_cycle_notes'),
		isRecurring: boolean('is_recurring').default(false),
		recurringSchedule: text('recurring_schedule'),

		// Amounts
		amountMin: real('amount_min'),
		amountMax: real('amount_max'),
		amountDescription: text('amount_description'),
		fundingTerm: text('funding_term'),
		matchRequired: boolean('match_required').default(false),
		matchRequirements: text('match_requirements'),

		// Eligible costs
		eligibleCosts: text('eligible_costs'),

		// Geography
		region: text('region'),
		geographicRestrictions: text('geographic_restrictions'),

		// Application
		applyUrl: text('apply_url'),
		contactEmail: text('contact_email'),
		contactName: text('contact_name'),
		contactPhone: text('contact_phone'),

		// Media
		imageUrl: text('image_url'),

		// Moderation
		status: text('status').notNull().default('pending'),
		source: text('source').notNull().default('seed'),
		featured: boolean('featured').default(false),
		unlisted: boolean('unlisted').default(false),
		publishedAt: timestamp('published_at', { withTimezone: true }),
		cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
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
		index('funding_status_idx').on(t.status),
		index('funding_deadline_idx').on(t.deadline),
		index('funding_organization_id_idx').on(t.organizationId),
		index('funding_application_status_idx').on(t.applicationStatus),
		index('funding_submitted_by_id_idx').on(t.submittedById)
	]
);
