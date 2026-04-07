import { pgTable, text, uuid, real, timestamp, boolean, index, unique, jsonb } from 'drizzle-orm/pg-core';
import { user } from '../auth.schema';
import { organizations } from './organizations';

export const jobs = pgTable(
	'jobs',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		slug: text('slug').notNull().unique(),
		title: text('title').notNull(),
		description: text('description'),
		qualifications: text('qualifications'),

		// Employer info
		employerName: text('employer_name'),
		organizationId: uuid('organization_id').references(() => organizations.id, {
			onDelete: 'set null'
		}),

		// Classification
		jobType: text('job_type'),
		seniority: text('seniority'),
		sector: text('sector'),
		sectors: text('sectors').array(),
		department: text('department'),
		tags: text('tags').array(),

		// Location & arrangement
		workArrangement: text('work_arrangement'),
		location: text('location'),
		address: text('address'),
		city: text('city'),
		state: text('state'),
		zip: text('zip'),
		lat: real('lat'),
		lng: real('lng'),
		region: text('region'),

		// Compensation
		compensationType: text('compensation_type'),
		compensationMin: real('compensation_min'),
		compensationMax: real('compensation_max'),
		compensationDescription: text('compensation_description'),
		benefits: text('benefits'),

		// Application
		applyUrl: text('apply_url'),
		applicationDeadline: timestamp('application_deadline', { withTimezone: true }),
		applicationInstructions: text('application_instructions'),

		// Indigenous priority
		indigenousPriority: boolean('indigenous_priority').default(false),
		tribalPreference: text('tribal_preference'),

		// Media
		imageUrl: text('image_url'),
		imageUrls: jsonb('image_urls').$type<string[]>().default([]),

		// Moderation
		status: text('status').notNull().default('pending'),
		source: text('source').notNull().default('seed'),
		featured: boolean('featured').default(false),
		unlisted: boolean('unlisted').default(false),
		publishedAt: timestamp('published_at', { withTimezone: true }),
		closedAt: timestamp('closed_at', { withTimezone: true }),
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
		index('jobs_status_idx').on(t.status),
		index('jobs_application_deadline_idx').on(t.applicationDeadline),
		index('jobs_organization_id_idx').on(t.organizationId),
		index('jobs_job_type_idx').on(t.jobType),
		index('jobs_region_idx').on(t.region),
		index('jobs_submitted_by_id_idx').on(t.submittedById)
	]
);

export const jobInterests = pgTable(
	'job_interests',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		jobId: uuid('job_id')
			.notNull()
			.references(() => jobs.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [
		index('job_interests_job_id_idx').on(t.jobId),
		index('job_interests_user_id_idx').on(t.userId),
		unique('job_interests_unique').on(t.jobId, t.userId)
	]
);
