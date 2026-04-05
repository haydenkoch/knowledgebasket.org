/**
 * Schema barrel: re-exports all domain tables and defines all cross-domain relations.
 * Relations are centralised here to avoid circular imports between domain files.
 */
import { relations } from 'drizzle-orm';

// ── Re-export all tables ──────────────────────────────────

export * from '../auth.schema';
export * from './taxonomy';
export * from './settings';
export * from './organizations';
export * from './venues';
export * from './events';
export * from './funding';
export * from './red-pages';
export * from './jobs';
export * from './toolbox';
export * from './content';
export * from './sources';

// ── Import tables for relation definitions ────────────────

import { user } from '../auth.schema';
import { organizations } from './organizations';
import { venues } from './venues';
import { events, eventLists, eventListItems } from './events';
import { funding } from './funding';
import { redPagesBusinesses } from './red-pages';
import { jobs, jobInterests } from './jobs';
import { toolboxResources } from './toolbox';
import {
	userOrgMemberships,
	orgFollows,
	bookmarks,
	notifications,
	notificationPreferences,
	contentLists,
	contentListItems
} from './content';
import {
	sources,
	sourceTags,
	sourceFetchLog,
	importBatches,
	sourceRuns,
	sourceRunStages,
	importedCandidates,
	canonicalRecords,
	sourceRecordLinks,
	recordLinks,
	recordImages,
	mergeHistory
} from './sources';

// ── Relations ─────────────────────────────────────────────

export const eventsRelations = relations(events, ({ one, many }) => ({
	venue: one(venues, { fields: [events.venueId], references: [venues.id] }),
	organization: one(organizations, {
		fields: [events.organizationId],
		references: [organizations.id]
	}),
	parentEvent: one(events, {
		fields: [events.parentEventId],
		references: [events.id],
		relationName: 'parentChild'
	}),
	childEvents: many(events, { relationName: 'parentChild' }),
	submittedBy: one(user, {
		fields: [events.submittedById],
		references: [user.id],
		relationName: 'submitter'
	}),
	reviewedBy: one(user, {
		fields: [events.reviewedById],
		references: [user.id],
		relationName: 'reviewer'
	})
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
	events: many(events),
	venues: many(venues),
	funding: many(funding),
	jobs: many(jobs),
	redPagesListings: many(redPagesBusinesses),
	toolboxResources: many(toolboxResources),
	members: many(userOrgMemberships),
	followers: many(orgFollows)
}));

export const venuesRelations = relations(venues, ({ one, many }) => ({
	organization: one(organizations, {
		fields: [venues.organizationId],
		references: [organizations.id]
	}),
	events: many(events)
}));

export const eventListsRelations = relations(eventLists, ({ many }) => ({
	items: many(eventListItems)
}));

export const eventListItemsRelations = relations(eventListItems, ({ one }) => ({
	list: one(eventLists, { fields: [eventListItems.listId], references: [eventLists.id] }),
	event: one(events, { fields: [eventListItems.eventId], references: [events.id] })
}));

export const fundingRelations = relations(funding, ({ one }) => ({
	organization: one(organizations, {
		fields: [funding.organizationId],
		references: [organizations.id]
	}),
	submittedBy: one(user, {
		fields: [funding.submittedById],
		references: [user.id],
		relationName: 'fundingSubmitter'
	}),
	reviewedBy: one(user, {
		fields: [funding.reviewedById],
		references: [user.id],
		relationName: 'fundingReviewer'
	})
}));

export const redPagesBusinessesRelations = relations(redPagesBusinesses, ({ one }) => ({
	organization: one(organizations, {
		fields: [redPagesBusinesses.organizationId],
		references: [organizations.id]
	}),
	submittedBy: one(user, {
		fields: [redPagesBusinesses.submittedById],
		references: [user.id],
		relationName: 'redPagesSubmitter'
	}),
	reviewedBy: one(user, {
		fields: [redPagesBusinesses.reviewedById],
		references: [user.id],
		relationName: 'redPagesReviewer'
	})
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
	organization: one(organizations, {
		fields: [jobs.organizationId],
		references: [organizations.id]
	}),
	submittedBy: one(user, {
		fields: [jobs.submittedById],
		references: [user.id],
		relationName: 'jobSubmitter'
	}),
	reviewedBy: one(user, {
		fields: [jobs.reviewedById],
		references: [user.id],
		relationName: 'jobReviewer'
	}),
	interests: many(jobInterests)
}));

export const jobInterestsRelations = relations(jobInterests, ({ one }) => ({
	job: one(jobs, { fields: [jobInterests.jobId], references: [jobs.id] }),
	user: one(user, { fields: [jobInterests.userId], references: [user.id] })
}));

export const toolboxResourcesRelations = relations(toolboxResources, ({ one }) => ({
	organization: one(organizations, {
		fields: [toolboxResources.organizationId],
		references: [organizations.id]
	}),
	submittedBy: one(user, {
		fields: [toolboxResources.submittedById],
		references: [user.id],
		relationName: 'toolboxSubmitter'
	}),
	reviewedBy: one(user, {
		fields: [toolboxResources.reviewedById],
		references: [user.id],
		relationName: 'toolboxReviewer'
	})
}));

export const userOrgMembershipsRelations = relations(userOrgMemberships, ({ one }) => ({
	user: one(user, { fields: [userOrgMemberships.userId], references: [user.id] }),
	organization: one(organizations, {
		fields: [userOrgMemberships.organizationId],
		references: [organizations.id]
	})
}));

export const orgFollowsRelations = relations(orgFollows, ({ one }) => ({
	user: one(user, { fields: [orgFollows.userId], references: [user.id] }),
	organization: one(organizations, {
		fields: [orgFollows.organizationId],
		references: [organizations.id]
	})
}));

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
	user: one(user, { fields: [bookmarks.userId], references: [user.id] })
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
	user: one(user, { fields: [notifications.userId], references: [user.id] })
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
	user: one(user, { fields: [notificationPreferences.userId], references: [user.id] })
}));

export const contentListsRelations = relations(contentLists, ({ many }) => ({
	items: many(contentListItems)
}));

export const contentListItemsRelations = relations(contentListItems, ({ one }) => ({
	list: one(contentLists, { fields: [contentListItems.listId], references: [contentLists.id] })
}));

export const sourcesRelations = relations(sources, ({ one, many }) => ({
	owner: one(user, { fields: [sources.ownerUserId], references: [user.id] }),
	tags: many(sourceTags),
	fetchLogs: many(sourceFetchLog),
	runs: many(sourceRuns),
	batches: many(importBatches),
	candidates: many(importedCandidates),
	recordLinks: many(sourceRecordLinks),
	publishedLinks: many(recordLinks),
	publishedImages: many(recordImages)
}));

export const sourceTagsRelations = relations(sourceTags, ({ one }) => ({
	source: one(sources, { fields: [sourceTags.sourceId], references: [sources.id] })
}));

export const sourceFetchLogRelations = relations(sourceFetchLog, ({ one }) => ({
	source: one(sources, { fields: [sourceFetchLog.sourceId], references: [sources.id] })
}));

export const importBatchesRelations = relations(importBatches, ({ one, many }) => ({
	source: one(sources, { fields: [importBatches.sourceId], references: [sources.id] }),
	sourceRun: one(sourceRuns, {
		fields: [importBatches.sourceRunId],
		references: [sourceRuns.id]
	}),
	fetchLog: one(sourceFetchLog, {
		fields: [importBatches.fetchLogId],
		references: [sourceFetchLog.id]
	}),
	candidates: many(importedCandidates)
}));

export const sourceRunsRelations = relations(sourceRuns, ({ one, many }) => ({
	source: one(sources, { fields: [sourceRuns.sourceId], references: [sources.id] }),
	triggeredByUser: one(user, {
		fields: [sourceRuns.triggeredBy],
		references: [user.id]
	}),
	stages: many(sourceRunStages),
	batches: many(importBatches)
}));

export const sourceRunStagesRelations = relations(sourceRunStages, ({ one }) => ({
	sourceRun: one(sourceRuns, {
		fields: [sourceRunStages.sourceRunId],
		references: [sourceRuns.id]
	})
}));

export const importedCandidatesRelations = relations(importedCandidates, ({ one }) => ({
	source: one(sources, { fields: [importedCandidates.sourceId], references: [sources.id] }),
	batch: one(importBatches, {
		fields: [importedCandidates.batchId],
		references: [importBatches.id]
	}),
	matchedCanonical: one(canonicalRecords, {
		fields: [importedCandidates.matchedCanonicalId],
		references: [canonicalRecords.id]
	})
}));

export const canonicalRecordsRelations = relations(canonicalRecords, ({ one, many }) => ({
	primarySource: one(sources, {
		fields: [canonicalRecords.primarySourceId],
		references: [sources.id]
	}),
	sourceLinks: many(sourceRecordLinks),
	recordLinks: many(recordLinks),
	recordImages: many(recordImages),
	mergeHistory: many(mergeHistory)
}));

export const sourceRecordLinksRelations = relations(sourceRecordLinks, ({ one }) => ({
	source: one(sources, { fields: [sourceRecordLinks.sourceId], references: [sources.id] }),
	canonical: one(canonicalRecords, {
		fields: [sourceRecordLinks.canonicalRecordId],
		references: [canonicalRecords.id]
	})
}));

export const recordLinksRelations = relations(recordLinks, ({ one }) => ({
	source: one(sources, { fields: [recordLinks.sourceId], references: [sources.id] }),
	canonical: one(canonicalRecords, {
		fields: [recordLinks.canonicalRecordId],
		references: [canonicalRecords.id]
	}),
	candidate: one(importedCandidates, {
		fields: [recordLinks.candidateId],
		references: [importedCandidates.id]
	})
}));

export const recordImagesRelations = relations(recordImages, ({ one }) => ({
	source: one(sources, { fields: [recordImages.sourceId], references: [sources.id] }),
	canonical: one(canonicalRecords, {
		fields: [recordImages.canonicalRecordId],
		references: [canonicalRecords.id]
	}),
	candidate: one(importedCandidates, {
		fields: [recordImages.candidateId],
		references: [importedCandidates.id]
	})
}));

export const mergeHistoryRelations = relations(mergeHistory, ({ one }) => ({
	canonical: one(canonicalRecords, {
		fields: [mergeHistory.canonicalRecordId],
		references: [canonicalRecords.id]
	}),
	candidate: one(importedCandidates, {
		fields: [mergeHistory.candidateId],
		references: [importedCandidates.id]
	}),
	source: one(sources, { fields: [mergeHistory.sourceId], references: [sources.id] })
}));
