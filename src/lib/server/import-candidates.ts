import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db, type DbExecutor } from '$lib/server/db';
import {
	canonicalRecords,
	events,
	funding,
	importBatches,
	importedCandidates,
	jobs,
	mergeHistory,
	redPagesBusinesses,
	sourceRecordLinks,
	sources,
	toolboxResources
} from '$lib/server/db/schema';
import { createEvent, updateEvent } from '$lib/server/events';
import { createFunding, updateFunding } from '$lib/server/funding';
import { compositeKey as buildCompositeKey } from '$lib/server/ingestion/dedupe';
import { createJob, updateJob } from '$lib/server/jobs';
import { createBusiness, updateBusiness } from '$lib/server/red-pages';
import { createResource, updateResource } from '$lib/server/toolbox';
import { createOrganization, suggestOrganizationMatches } from '$lib/server/organizations';
import { createVenue, suggestVenueMatches } from '$lib/server/venues';
import {
	hasCanonicalSourceSnapshotColumn,
	isMissingSourceOpsColumnError
} from '$lib/server/source-ops-schema';
import {
	mapCandidateToComparable,
	planCandidateMerge,
	type MergePreview
} from '$lib/server/import-candidate-merge';

export type ImportedCandidateRow = typeof importedCandidates.$inferSelect;
export type ImportedCandidateInsert = typeof importedCandidates.$inferInsert;

export type ImportCandidateListItem = ImportedCandidateRow & {
	sourceName: string;
	sourceSlug: string;
	batchStartedAt?: Date | null;
	matchedCanonicalTitle?: string | null;
};

type DatabaseExecutor = DbExecutor;
type CanonicalRecordRow = typeof canonicalRecords.$inferSelect;
type CanonicalRecordCompat = Omit<CanonicalRecordRow, 'sourceSnapshot'> & {
	sourceSnapshot?: Record<string, unknown> | null;
};

const canonicalRecordSelectWithoutSnapshot = {
	id: canonicalRecords.id,
	coil: canonicalRecords.coil,
	publishedRecordId: canonicalRecords.publishedRecordId,
	canonicalTitle: canonicalRecords.canonicalTitle,
	compositeKey: canonicalRecords.compositeKey,
	contentFingerprint: canonicalRecords.contentFingerprint,
	canonicalUrl: canonicalRecords.canonicalUrl,
	externalIds: canonicalRecords.externalIds,
	sourceCount: canonicalRecords.sourceCount,
	primarySourceId: canonicalRecords.primarySourceId,
	createdAt: canonicalRecords.createdAt,
	updatedAt: canonicalRecords.updatedAt
};

const canonicalRecordSelectWithSnapshot = {
	...canonicalRecordSelectWithoutSnapshot,
	sourceSnapshot: canonicalRecords.sourceSnapshot
};

function canonicalRecordSelection(includeSourceSnapshot: boolean) {
	return includeSourceSnapshot ? canonicalRecordSelectWithSnapshot : canonicalRecordSelectWithoutSnapshot;
}

function normalizeCanonicalRecord(row: CanonicalRecordCompat): CanonicalRecordRow {
	return {
		...row,
		sourceSnapshot: asRecord(row.sourceSnapshot)
	};
}

export async function getImportCandidatesForReview(opts?: {
	status?: string;
	coil?: string;
	priority?: string;
	dedupeResult?: string;
	sourceId?: string;
	search?: string;
	page?: number;
	limit?: number;
}): Promise<{ items: ImportCandidateListItem[]; total: number }> {
	const page = opts?.page ?? 1;
	const limit = opts?.limit ?? 25;
	const offset = (page - 1) * limit;

	const conditions = [];

	if (opts?.status && opts.status !== 'all') {
		if (opts.status === 'open') {
			conditions.push(
				sql`${importedCandidates.status} in ('pending_review', 'needs_info', 'auto_approved')`
			);
		} else {
			conditions.push(eq(importedCandidates.status, opts.status as ImportedCandidateRow['status']));
		}
	} else {
		conditions.push(
			sql`${importedCandidates.status} in ('pending_review', 'needs_info', 'auto_approved')`
		);
	}

	if (opts?.coil && opts.coil !== 'all') {
		conditions.push(eq(importedCandidates.coil, opts.coil as ImportedCandidateRow['coil']));
	}

	if (opts?.priority && opts.priority !== 'all') {
		conditions.push(
			eq(importedCandidates.priority, opts.priority as ImportedCandidateRow['priority'])
		);
	}

	if (opts?.dedupeResult && opts.dedupeResult !== 'all') {
		conditions.push(
			eq(importedCandidates.dedupeResult, opts.dedupeResult as ImportedCandidateRow['dedupeResult'])
		);
	}

	if (opts?.sourceId && opts.sourceId !== 'all') {
		conditions.push(eq(importedCandidates.sourceId, opts.sourceId));
	}

	if (opts?.search) {
		conditions.push(
			or(
				ilike(sources.name, `%${opts.search}%`),
				ilike(importedCandidates.sourceItemUrl, `%${opts.search}%`),
				ilike(importedCandidates.sourceAttribution, `%${opts.search}%`)
			)!
		);
	}

	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const [countResult] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(importedCandidates)
		.innerJoin(sources, eq(importedCandidates.sourceId, sources.id))
		.where(where);
	const total = countResult?.count ?? 0;

	const rows = await db
		.select({
			candidate: importedCandidates,
			sourceName: sources.name,
			sourceSlug: sources.slug,
			batchStartedAt: importBatches.startedAt,
			matchedCanonicalTitle: canonicalRecords.canonicalTitle
		})
		.from(importedCandidates)
		.innerJoin(sources, eq(importedCandidates.sourceId, sources.id))
		.innerJoin(importBatches, eq(importedCandidates.batchId, importBatches.id))
		.leftJoin(canonicalRecords, eq(importedCandidates.matchedCanonicalId, canonicalRecords.id))
		.where(where)
		.orderBy(desc(importedCandidates.importedAt), desc(importedCandidates.priority))
		.limit(limit)
		.offset(offset);

	return {
		items: rows.map((row) => ({
			...row.candidate,
			sourceName: row.sourceName,
			sourceSlug: row.sourceSlug,
			batchStartedAt: row.batchStartedAt,
			matchedCanonicalTitle: row.matchedCanonicalTitle
		})),
		total
	};
}

export async function getCandidateById(id: string): Promise<ImportCandidateListItem | null> {
	const [row] = await db
		.select({
			candidate: importedCandidates,
			sourceName: sources.name,
			sourceSlug: sources.slug,
			batchStartedAt: importBatches.startedAt,
			matchedCanonicalTitle: canonicalRecords.canonicalTitle
		})
		.from(importedCandidates)
		.innerJoin(sources, eq(importedCandidates.sourceId, sources.id))
		.innerJoin(importBatches, eq(importedCandidates.batchId, importBatches.id))
		.leftJoin(canonicalRecords, eq(importedCandidates.matchedCanonicalId, canonicalRecords.id))
		.where(eq(importedCandidates.id, id))
		.limit(1);

	if (!row) return null;

	return {
		...row.candidate,
		sourceName: row.sourceName,
		sourceSlug: row.sourceSlug,
		batchStartedAt: row.batchStartedAt,
		matchedCanonicalTitle: row.matchedCanonicalTitle
	};
}

export async function approveCandidate(
	id: string,
	reviewerId: string | null,
	opts?: { reviewNotes?: string; allowAmbiguous?: boolean }
): Promise<ImportedCandidateRow | null> {
	const includeSourceSnapshot = await hasCanonicalSourceSnapshotColumn();
	try {
		return await db.transaction(async (tx) => {
			const [candidate] = await tx
				.select()
				.from(importedCandidates)
				.where(eq(importedCandidates.id, id))
				.limit(1);

			if (!candidate) return null;
			if (candidate.dedupeResult === 'ambiguous' && !opts?.allowAmbiguous) {
				throw new Error('This item still needs a match decision before it can be published.');
			}

			let canonical = await findCanonicalRecord(tx, candidate, includeSourceSnapshot);
			const canonicalExisted = Boolean(canonical);
			if (candidate.dedupeResult === 'update' && !canonical) {
				throw new Error(
					'Choose the existing listing this update should apply to before publishing.'
				);
			}
			const published = await publishCandidateRecord(tx, candidate, reviewerId, canonical);
			const normalized = asRecord(candidate.normalizedData);
			const compositeKey = readCompositeKey(candidate, normalized);
			const canonicalTitle = readCanonicalTitle(candidate, normalized);
			const canonicalUrl = readCanonicalUrl(candidate, normalized);
			const externalIds = buildExternalIds(candidate);

			if (canonical) {
				const [updatedCanonical] = await tx
					.update(canonicalRecords)
					.set(
						includeSourceSnapshot
							? {
									publishedRecordId: published.id,
									canonicalTitle,
									compositeKey,
									contentFingerprint: candidate.contentFingerprint ?? canonical.contentFingerprint,
									canonicalUrl,
									externalIds: {
										...asStringRecord(canonical.externalIds),
										...externalIds
									},
									primarySourceId: canonical.primarySourceId ?? candidate.sourceId,
									sourceSnapshot: published.nextSourceSnapshot
								}
							: {
									publishedRecordId: published.id,
									canonicalTitle,
									compositeKey,
									contentFingerprint: candidate.contentFingerprint ?? canonical.contentFingerprint,
									canonicalUrl,
									externalIds: {
										...asStringRecord(canonical.externalIds),
										...externalIds
									},
									primarySourceId: canonical.primarySourceId ?? candidate.sourceId
								}
					)
					.where(eq(canonicalRecords.id, canonical.id))
					.returning(canonicalRecordSelection(includeSourceSnapshot));
				canonical = updatedCanonical ? normalizeCanonicalRecord(updatedCanonical) : canonical;
			} else {
				const [createdCanonical] = await tx
					.insert(canonicalRecords)
					.values(
						includeSourceSnapshot
							? {
									coil: candidate.coil,
									publishedRecordId: published.id,
									canonicalTitle,
									compositeKey,
									contentFingerprint: candidate.contentFingerprint,
									canonicalUrl,
									externalIds,
									sourceSnapshot: published.nextSourceSnapshot,
									sourceCount: 1,
									primarySourceId: candidate.sourceId
								}
							: {
									coil: candidate.coil,
									publishedRecordId: published.id,
									canonicalTitle,
									compositeKey,
									contentFingerprint: candidate.contentFingerprint,
									canonicalUrl,
									externalIds,
									sourceCount: 1,
									primarySourceId: candidate.sourceId
								}
					)
					.returning(canonicalRecordSelection(includeSourceSnapshot));
				canonical = createdCanonical ? normalizeCanonicalRecord(createdCanonical) : null;
			}

			if (!canonical) throw new Error('Failed to resolve canonical record');

			const [existingLink] = await tx
				.select({ id: sourceRecordLinks.id })
				.from(sourceRecordLinks)
				.where(
					and(
						eq(sourceRecordLinks.sourceId, candidate.sourceId),
						eq(sourceRecordLinks.canonicalRecordId, canonical.id)
					)
				)
				.limit(1);

			if (canonicalExisted && !existingLink) {
				await tx
					.update(canonicalRecords)
					.set({
						sourceCount: sql`${canonicalRecords.sourceCount} + 1`
					})
					.where(eq(canonicalRecords.id, canonical.id));
			}

			await tx
				.insert(sourceRecordLinks)
				.values({
					sourceId: candidate.sourceId,
					canonicalRecordId: canonical.id,
					sourceItemId: candidate.sourceItemId,
					sourceItemUrl: candidate.sourceItemUrl,
					sourceAttribution: candidate.sourceAttribution,
					lastSeenAt: new Date(),
					lastSyncAt: new Date(),
					isPrimary: (canonical.primarySourceId ?? candidate.sourceId) === candidate.sourceId
				})
				.onConflictDoUpdate({
					target: [sourceRecordLinks.sourceId, sourceRecordLinks.canonicalRecordId],
					set: {
						sourceItemId: candidate.sourceItemId,
						sourceItemUrl: candidate.sourceItemUrl,
						sourceAttribution: candidate.sourceAttribution,
						lastSeenAt: new Date(),
						lastSyncAt: new Date(),
						isPrimary: (canonical.primarySourceId ?? candidate.sourceId) === candidate.sourceId
					}
				});

			const [updatedCandidate] = await tx
				.update(importedCandidates)
				.set({
					status: reviewerId ? 'approved' : 'auto_approved',
					reviewedAt: new Date(),
					reviewedBy: reviewerId,
					reviewNotes:
						opts?.reviewNotes ??
						(reviewerId ? candidate.reviewNotes : 'Auto-approved by source-ops'),
					matchedCanonicalId: canonical.id
				})
				.where(eq(importedCandidates.id, id))
				.returning();

			await tx.insert(mergeHistory).values({
				canonicalRecordId: canonical.id,
				candidateId: candidate.id,
				sourceId: candidate.sourceId,
				mergeType: published.previousData ? 'field_update' : 'manual_merge',
				fieldsUpdated: published.fieldsUpdated,
				previousData: published.previousData,
				newData: normalized,
				mergedBy: reviewerId,
				notes: opts?.reviewNotes ?? (reviewerId ? null : 'Auto-approved by source-ops')
			});

			return updatedCandidate ?? null;
		});
	} catch (error) {
		if (isMissingSourceOpsColumnError(error)) {
			throw new Error(
				'Source review needs a database update before it can publish changes. Run the latest migration and try again.'
			);
		}
		throw error;
	}
}

export async function getCandidateReviewDetail(id: string) {
	const candidate = await getCandidateById(id);
	if (!candidate) return null;

	const includeSourceSnapshot = await hasCanonicalSourceSnapshotColumn();
	const canonical = candidate.matchedCanonicalId
		? ((
				await db
					.select(canonicalRecordSelection(includeSourceSnapshot))
					.from(canonicalRecords)
					.where(eq(canonicalRecords.id, candidate.matchedCanonicalId))
					.limit(1)
			).map((row) => normalizeCanonicalRecord(row))[0] ?? null)
		: null;
	const publishedRecord = canonical?.publishedRecordId
		? await getPublishedRecordById(db, candidate.coil, canonical.publishedRecordId)
		: null;

	const suggestedMatches = await getSuggestedCanonicalMatches(candidate);
	const comparableCandidateRecord = mapCandidateToComparable(
		candidate.coil,
		asRecord(candidate.normalizedData)
	);
	const comparablePublishedRecord = publishedRecord
		? mapPublishedRecordToComparable(candidate.coil, publishedRecord)
		: null;
	const mergePreview =
		canonical && comparablePublishedRecord
			? planCandidateMerge(
					candidate.coil,
					asRecord(candidate.normalizedData),
					comparablePublishedRecord,
					asRecord(canonical.sourceSnapshot)
				)
			: null;
	const normalized = asRecord(candidate.normalizedData);
	const suggestedOrganizations = await getSuggestedOrganizations(candidate.coil, normalized);
	const suggestedVenues = candidate.coil === 'events' ? await getSuggestedVenues(normalized) : [];

	return {
		candidate,
		canonical,
		publishedRecord,
		comparableCandidateRecord,
		comparablePublishedRecord,
		mergePreview,
		suggestedMatches,
		suggestedOrganizations,
		suggestedVenues
	};
}

export async function resolveCandidateMatch(
	id: string,
	options: {
		dedupeResult: ImportedCandidateRow['dedupeResult'];
		matchedCanonicalId?: string | null;
		reviewNotes?: string;
	}
): Promise<ImportedCandidateRow | null> {
	const [row] = await db
		.update(importedCandidates)
		.set({
			dedupeResult: options.dedupeResult,
			matchedCanonicalId: options.matchedCanonicalId ?? null,
			reviewNotes: options.reviewNotes ?? null
		})
		.where(eq(importedCandidates.id, id))
		.returning();
	return row ?? null;
}

export async function updateCandidateEntityLinks(
	id: string,
	options: {
		organizationId?: string | null;
		organizationName?: string | null;
		venueId?: string | null;
		venueName?: string | null;
	}
): Promise<ImportedCandidateRow | null> {
	const candidate = await getCandidateById(id);
	if (!candidate) return null;

	const normalized = asRecord(candidate.normalizedData);
	if (options.organizationId !== undefined) {
		normalized.organization_id = options.organizationId;
	}
	if (options.organizationName !== undefined) {
		normalized.organization_name = options.organizationName;
	}
	if (options.venueId !== undefined) {
		normalized.venue_id = options.venueId;
	}
	if (options.venueName !== undefined) {
		normalized.location_name = options.venueName;
	}

	const [row] = await db
		.update(importedCandidates)
		.set({ normalizedData: normalized })
		.where(eq(importedCandidates.id, id))
		.returning();
	return row ?? null;
}

export async function createOrganizationFromCandidate(id: string) {
	const candidate = await getCandidateById(id);
	if (!candidate) return null;
	const normalized = asRecord(candidate.normalizedData);
	const name = readString(normalized, 'organization_name');
	if (!name) throw new Error('This imported item does not include an organization name yet.');

	const organization = await createOrganization({
		name,
		description: null,
		website: readString(normalized, 'url'),
		email: null,
		phone: null,
		orgType: null,
		region: readString(normalized, 'region'),
		address: readString(normalized, 'location_address') ?? null,
		city: readString(normalized, 'location_city') ?? null,
		state: readString(normalized, 'location_state') ?? null,
		zip: readString(normalized, 'location_zip') ?? null
	});

	await updateCandidateEntityLinks(id, {
		organizationId: organization.id,
		organizationName: organization.name
	});

	return organization;
}

export async function createVenueFromCandidate(id: string) {
	const candidate = await getCandidateById(id);
	if (!candidate) return null;
	const normalized = asRecord(candidate.normalizedData);
	const name =
		readString(normalized, 'location_name') ??
		readString(normalized, 'location_address') ??
		readString(normalized, 'title');
	if (!name) throw new Error('This imported item does not include enough venue information yet.');

	const venue = await createVenue({
		name,
		description: null,
		address: readString(normalized, 'location_address') ?? null,
		city: readString(normalized, 'location_city') ?? null,
		state: readString(normalized, 'location_state') ?? null,
		zip: readString(normalized, 'location_zip') ?? null,
		website: readString(normalized, 'url') ?? null,
		imageUrl: readString(normalized, 'image_url') ?? null,
		venueType: null,
		organizationId: readString(normalized, 'organization_id') ?? null
	});

	await updateCandidateEntityLinks(id, {
		venueId: venue.id,
		venueName: venue.name
	});

	return venue;
}

export async function bulkApproveCandidates(ids: string[], reviewerId: string): Promise<number> {
	let count = 0;
	for (const id of ids) {
		const candidate = await getCandidateById(id);
		if (!candidate) continue;
		if (candidate.dedupeResult !== 'new' || candidate.matchedCanonicalId) continue;
		const approved = await approveCandidate(id, reviewerId);
		if (approved) count += 1;
	}
	return count;
}

export async function bulkRejectCandidates(
	ids: string[],
	reviewerId: string,
	opts?: {
		rejectionReason?: ImportedCandidateRow['rejectionReason'];
		reviewNotes?: string;
	}
): Promise<number> {
	let count = 0;
	for (const id of ids) {
		const rejected = await rejectCandidate(id, reviewerId, opts);
		if (rejected) count += 1;
	}
	return count;
}

async function findCanonicalRecord(
	tx: DatabaseExecutor,
	candidate: ImportedCandidateRow,
	includeSourceSnapshot: boolean
): Promise<CanonicalRecordRow | null> {
	if (candidate.matchedCanonicalId) {
		const [matched] = await tx
			.select(canonicalRecordSelection(includeSourceSnapshot))
			.from(canonicalRecords)
			.where(eq(canonicalRecords.id, candidate.matchedCanonicalId))
			.limit(1);
		if (matched) return normalizeCanonicalRecord(matched);
	}

	if (candidate.contentFingerprint) {
		const [matchedByFingerprint] = await tx
			.select(canonicalRecordSelection(includeSourceSnapshot))
			.from(canonicalRecords)
			.where(
				and(
					eq(canonicalRecords.coil, candidate.coil),
					eq(canonicalRecords.contentFingerprint, candidate.contentFingerprint)
				)
			)
			.limit(1);
		if (matchedByFingerprint) return normalizeCanonicalRecord(matchedByFingerprint);
	}

	return null;
}

async function publishCandidateRecord(
	tx: DatabaseExecutor,
	candidate: ImportedCandidateRow,
	reviewerId: string | null,
	canonical: CanonicalRecordRow | null
): Promise<{
	id: string;
	previousData: unknown | null;
	fieldsUpdated: string[];
	nextSourceSnapshot: Record<string, unknown>;
}> {
	const normalized = asRecord(candidate.normalizedData);
	const publishedRecordId = canonical?.publishedRecordId ?? null;
	const previousData = publishedRecordId
		? await getPublishedRecordById(tx, candidate.coil, publishedRecordId)
		: null;
	const previousComparable = previousData
		? mapPublishedRecordToComparable(candidate.coil, previousData)
		: null;
	const mergePreview =
		previousComparable && canonical
			? planCandidateMerge(
					candidate.coil,
					normalized,
					previousComparable,
					asRecord(canonical.sourceSnapshot)
				)
			: null;

	switch (candidate.coil) {
		case 'events': {
			const payload = mapEventCandidate(normalized, reviewerId);
			if (publishedRecordId && previousData) {
				const updated = await updateEvent(
					publishedRecordId,
					buildManagedPatch(payload, mergePreview, [
						'status',
						'source',
						'reviewedById',
						'organizationId',
						'venueId'
					]),
					tx
				);
				if (updated) {
					return {
						id: updated.id,
						previousData,
						fieldsUpdated: mergePreview?.appliedFields.map((field) => field.field) ?? [],
						nextSourceSnapshot:
							mergePreview?.nextSnapshot ?? mapCandidateToComparable(candidate.coil, normalized)
					};
				}
			}
			const created = await createEvent(payload, tx);
			return {
				id: created.id,
				previousData,
				fieldsUpdated: Object.keys(mapCandidateToComparable(candidate.coil, normalized)),
				nextSourceSnapshot: mapCandidateToComparable(candidate.coil, normalized)
			};
		}
		case 'funding': {
			const payload = mapFundingCandidate(normalized, reviewerId);
			if (publishedRecordId && previousData) {
				const updated = await updateFunding(
					publishedRecordId,
					buildManagedPatch(payload, mergePreview, [
						'status',
						'source',
						'reviewedById',
						'organizationId'
					]),
					tx
				);
				if (updated) {
					return {
						id: updated.id,
						previousData,
						fieldsUpdated: mergePreview?.appliedFields.map((field) => field.field) ?? [],
						nextSourceSnapshot:
							mergePreview?.nextSnapshot ?? mapCandidateToComparable(candidate.coil, normalized)
					};
				}
			}
			const created = await createFunding(payload, tx);
			return {
				id: created.id,
				previousData,
				fieldsUpdated: Object.keys(mapCandidateToComparable(candidate.coil, normalized)),
				nextSourceSnapshot: mapCandidateToComparable(candidate.coil, normalized)
			};
		}
		case 'jobs': {
			const payload = mapJobCandidate(normalized, reviewerId);
			if (publishedRecordId && previousData) {
				const updated = await updateJob(
					publishedRecordId,
					buildManagedPatch(payload, mergePreview, [
						'status',
						'source',
						'reviewedById',
						'organizationId'
					]),
					tx
				);
				if (updated) {
					return {
						id: updated.id,
						previousData,
						fieldsUpdated: mergePreview?.appliedFields.map((field) => field.field) ?? [],
						nextSourceSnapshot:
							mergePreview?.nextSnapshot ?? mapCandidateToComparable(candidate.coil, normalized)
					};
				}
			}
			const created = await createJob(payload, tx);
			return {
				id: created.id,
				previousData,
				fieldsUpdated: Object.keys(mapCandidateToComparable(candidate.coil, normalized)),
				nextSourceSnapshot: mapCandidateToComparable(candidate.coil, normalized)
			};
		}
		case 'red_pages': {
			const payload = mapRedPagesCandidate(normalized, reviewerId);
			if (publishedRecordId && previousData) {
				const updated = await updateBusiness(
					publishedRecordId,
					buildManagedPatch(payload, mergePreview, [
						'status',
						'source',
						'reviewedById',
						'organizationId'
					]),
					tx
				);
				if (updated) {
					return {
						id: updated.id,
						previousData,
						fieldsUpdated: mergePreview?.appliedFields.map((field) => field.field) ?? [],
						nextSourceSnapshot:
							mergePreview?.nextSnapshot ?? mapCandidateToComparable(candidate.coil, normalized)
					};
				}
			}
			const created = await createBusiness(payload, tx);
			return {
				id: created.id,
				previousData,
				fieldsUpdated: Object.keys(mapCandidateToComparable(candidate.coil, normalized)),
				nextSourceSnapshot: mapCandidateToComparable(candidate.coil, normalized)
			};
		}
		case 'toolbox': {
			const payload = mapToolboxCandidate(normalized, reviewerId);
			if (publishedRecordId && previousData) {
				const updated = await updateResource(
					publishedRecordId,
					buildManagedPatch(payload, mergePreview, [
						'status',
						'source',
						'reviewedById',
						'lastReviewedAt',
						'organizationId'
					]),
					tx
				);
				if (updated) {
					return {
						id: updated.id,
						previousData,
						fieldsUpdated: mergePreview?.appliedFields.map((field) => field.field) ?? [],
						nextSourceSnapshot:
							mergePreview?.nextSnapshot ?? mapCandidateToComparable(candidate.coil, normalized)
					};
				}
			}
			const created = await createResource(payload, tx);
			return {
				id: created.id,
				previousData,
				fieldsUpdated: Object.keys(mapCandidateToComparable(candidate.coil, normalized)),
				nextSourceSnapshot: mapCandidateToComparable(candidate.coil, normalized)
			};
		}
		default:
			throw new Error(`Unsupported coil ${candidate.coil}`);
	}
}

function buildManagedPatch(
	basePayload: Record<string, unknown>,
	mergePreview: MergePreview | null,
	metaKeys: string[]
) {
	const patch = Object.fromEntries(
		Object.entries(basePayload).filter(([key]) => metaKeys.includes(key))
	) as Record<string, unknown>;
	Object.assign(patch, mergePreview?.patch ?? {});
	return patch;
}

async function getPublishedRecordById(
	tx: DatabaseExecutor,
	coil: ImportedCandidateRow['coil'],
	id: string
): Promise<unknown | null> {
	switch (coil) {
		case 'events': {
			const [row] = await tx.select().from(events).where(eq(events.id, id)).limit(1);
			return row ?? null;
		}
		case 'funding': {
			const [row] = await tx.select().from(funding).where(eq(funding.id, id)).limit(1);
			return row ?? null;
		}
		case 'jobs': {
			const [row] = await tx.select().from(jobs).where(eq(jobs.id, id)).limit(1);
			return row ?? null;
		}
		case 'red_pages': {
			const [row] = await tx
				.select()
				.from(redPagesBusinesses)
				.where(eq(redPagesBusinesses.id, id))
				.limit(1);
			return row ?? null;
		}
		case 'toolbox': {
			const [row] = await tx
				.select()
				.from(toolboxResources)
				.where(eq(toolboxResources.id, id))
				.limit(1);
			return row ?? null;
		}
		default:
			return null;
	}
}

function mapEventCandidate(normalized: Record<string, unknown>, reviewerId: string | null) {
	const publishedAt = new Date();
	return {
		title: readString(normalized, 'title') ?? 'Untitled event',
		description: readString(normalized, 'description') ?? undefined,
		organizationId: readString(normalized, 'organization_id') ?? undefined,
		venueId: readString(normalized, 'venue_id') ?? undefined,
		location: buildEventLocation(normalized),
		address: readString(normalized, 'location_address') ?? undefined,
		region:
			readString(normalized, 'region') ?? readString(normalized, 'location_state') ?? undefined,
		eventUrl: readString(normalized, 'url') ?? undefined,
		startDate: readDate(normalized, 'start_date') ?? undefined,
		endDate: readDate(normalized, 'end_date') ?? undefined,
		hostOrg: readString(normalized, 'organization_name') ?? undefined,
		type: readString(normalized, 'event_type') ?? undefined,
		registrationUrl: readString(normalized, 'registration_url') ?? undefined,
		timezone: readString(normalized, 'timezone') ?? undefined,
		virtualEventUrl: readBoolean(normalized, 'is_virtual')
			? (readString(normalized, 'virtual_url') ?? readString(normalized, 'url') ?? undefined)
			: undefined,
		eventFormat: readBoolean(normalized, 'is_virtual') ? 'online' : undefined,
		cost: readString(normalized, 'cost') ?? undefined,
		tags: readStringArray(normalized, 'tags'),
		imageUrl: readString(normalized, 'image_url') ?? undefined,
		status: 'published',
		source: 'source-import',
		reviewedById: reviewerId ?? undefined,
		publishedAt
	};
}

function mapFundingCandidate(normalized: Record<string, unknown>, reviewerId: string | null) {
	return {
		title: readString(normalized, 'title') ?? 'Untitled funding',
		description: readString(normalized, 'description') ?? null,
		organizationId: readString(normalized, 'organization_id') ?? null,
		funderName:
			readString(normalized, 'funder_name') ?? readString(normalized, 'organization_name') ?? null,
		fundingType: readString(normalized, 'funding_type') ?? null,
		tags: readStringArray(normalized, 'tags') ?? null,
		applicationStatus: readString(normalized, 'status') ?? 'open',
		deadline: readDate(normalized, 'deadline'),
		amountMin: readNumber(normalized, 'amount_min'),
		amountMax: readNumber(normalized, 'amount_max'),
		amountDescription: readString(normalized, 'amount_description') ?? null,
		region: readString(normalized, 'region') ?? null,
		eligibilityType: readString(normalized, 'eligibility') ?? null,
		applyUrl: readString(normalized, 'application_url') ?? readString(normalized, 'url') ?? null,
		imageUrl: readString(normalized, 'image_url') ?? null,
		status: 'published',
		source: 'source-import',
		publishedAt: new Date(),
		reviewedById: reviewerId ?? undefined
	};
}

function mapJobCandidate(normalized: Record<string, unknown>, reviewerId: string | null) {
	return {
		title: readString(normalized, 'title') ?? 'Untitled job',
		description: readString(normalized, 'description') ?? null,
		organizationId: readString(normalized, 'organization_id') ?? null,
		employerName: readString(normalized, 'organization_name') ?? null,
		jobType: readString(normalized, 'job_type') ?? null,
		tags: readStringArray(normalized, 'tags') ?? null,
		workArrangement: readBoolean(normalized, 'is_remote')
			? 'remote'
			: readBoolean(normalized, 'is_hybrid')
				? 'hybrid'
				: 'on_site',
		location: buildJobLocation(normalized),
		city: readString(normalized, 'location_city') ?? null,
		state: readString(normalized, 'location_state') ?? null,
		region: readString(normalized, 'region') ?? readString(normalized, 'location_state') ?? null,
		compensationMin: readNumber(normalized, 'salary_min'),
		compensationMax: readNumber(normalized, 'salary_max'),
		compensationType: readString(normalized, 'salary_period') ?? null,
		compensationDescription: readString(normalized, 'salary_description') ?? null,
		applyUrl: readString(normalized, 'application_url') ?? readString(normalized, 'url') ?? null,
		applicationDeadline: readDate(normalized, 'closing_date'),
		indigenousPriority: readBoolean(normalized, 'indian_preference'),
		department: readString(normalized, 'department') ?? null,
		imageUrl: readString(normalized, 'image_url') ?? null,
		status: 'published',
		source: 'source-import',
		publishedAt: new Date(),
		reviewedById: reviewerId ?? undefined
	};
}

function mapRedPagesCandidate(normalized: Record<string, unknown>, reviewerId: string | null) {
	return {
		name: readString(normalized, 'title') ?? 'Untitled listing',
		description: readString(normalized, 'description') ?? null,
		organizationId: readString(normalized, 'organization_id') ?? null,
		ownerName: readString(normalized, 'organization_name') ?? null,
		serviceType: readString(normalized, 'organization_type') ?? null,
		serviceArea: readString(normalized, 'service_area') ?? null,
		tags: readStringArray(normalized, 'tags') ?? null,
		tribalAffiliation: readString(normalized, 'tribal_affiliation') ?? null,
		website: readString(normalized, 'website') ?? readString(normalized, 'url') ?? null,
		email: readString(normalized, 'email') ?? null,
		phone: readString(normalized, 'phone') ?? null,
		address: readString(normalized, 'address') ?? null,
		city: readString(normalized, 'city') ?? null,
		state: readString(normalized, 'state') ?? null,
		zip: readString(normalized, 'zip') ?? null,
		region: readString(normalized, 'region') ?? readString(normalized, 'state') ?? null,
		imageUrl: readString(normalized, 'image_url') ?? null,
		status: 'published',
		source: 'source-import',
		publishedAt: new Date(),
		reviewedById: reviewerId ?? undefined
	};
}

function mapToolboxCandidate(normalized: Record<string, unknown>, reviewerId: string | null) {
	return {
		title: readString(normalized, 'title') ?? 'Untitled resource',
		description: readString(normalized, 'description') ?? null,
		organizationId: readString(normalized, 'organization_id') ?? null,
		sourceName:
			readString(normalized, 'publisher') ?? readString(normalized, 'organization_name') ?? null,
		resourceType: readString(normalized, 'resource_type') ?? 'other',
		mediaType: readString(normalized, 'format') ?? null,
		categories: readStringArray(normalized, 'topics') ?? null,
		tags: readStringArray(normalized, 'tags') ?? null,
		contentMode: 'link',
		externalUrl: readString(normalized, 'url') ?? null,
		imageUrl: readString(normalized, 'image_url') ?? null,
		publishDate: readDate(normalized, 'publication_date'),
		lastReviewedAt: new Date(),
		status: 'published',
		source: 'source-import',
		publishedAt: new Date(),
		reviewedById: reviewerId ?? undefined
	};
}

function buildExternalIds(candidate: ImportedCandidateRow): Record<string, string> {
	const externalIds: Record<string, string> = {};
	if (candidate.sourceItemId) externalIds[candidate.sourceId] = candidate.sourceItemId;
	return externalIds;
}

function readCanonicalTitle(candidate: ImportedCandidateRow, normalized: Record<string, unknown>) {
	return (
		readString(normalized, 'title') ??
		candidate.sourceItemId ??
		`Candidate ${candidate.id.slice(0, 8)}`
	);
}

function readCanonicalUrl(candidate: ImportedCandidateRow, normalized: Record<string, unknown>) {
	return readString(normalized, 'url') ?? candidate.sourceItemUrl ?? null;
}

function readCompositeKey(candidate: ImportedCandidateRow, normalized: Record<string, unknown>) {
	return buildCompositeKey(normalized as any).hash ?? candidate.contentFingerprint;
}

function asRecord(data: unknown): Record<string, unknown> {
	return data && typeof data === 'object' && !Array.isArray(data)
		? (data as Record<string, unknown>)
		: {};
}

function asStringRecord(data: unknown): Record<string, string> {
	if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
	return Object.fromEntries(
		Object.entries(data).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
	);
}

function readString(data: Record<string, unknown>, key: string): string | null {
	const value = data[key];
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readStringArray(data: Record<string, unknown>, key: string): string[] | undefined {
	const value = data[key];
	if (Array.isArray(value)) {
		const items = value.filter(
			(entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
		);
		return items.length > 0 ? items : undefined;
	}
	return undefined;
}

function readBoolean(data: Record<string, unknown>, key: string): boolean {
	return data[key] === true;
}

function readNumber(data: Record<string, unknown>, key: string): number | null {
	const value = data[key];
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readDate(data: Record<string, unknown>, key: string): Date | null {
	const value = readString(data, key);
	if (!value) return null;
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildEventLocation(normalized: Record<string, unknown>): string | undefined {
	const parts = [
		readString(normalized, 'location_name'),
		readString(normalized, 'location_address'),
		readString(normalized, 'location_city'),
		readString(normalized, 'location_state')
	].filter(Boolean);
	return parts.length > 0 ? parts.join(', ') : undefined;
}

function buildJobLocation(normalized: Record<string, unknown>): string | null {
	const parts = [
		readString(normalized, 'location_city'),
		readString(normalized, 'location_state')
	].filter(Boolean);
	return parts.length > 0 ? parts.join(', ') : null;
}

async function getSuggestedCanonicalMatches(candidate: ImportCandidateListItem) {
	const normalized = asRecord(candidate.normalizedData);
	const title = readString(normalized, 'title');
	if (!title) return [];

	return db
		.select({
			id: canonicalRecords.id,
			canonicalTitle: canonicalRecords.canonicalTitle,
			publishedRecordId: canonicalRecords.publishedRecordId
		})
		.from(canonicalRecords)
		.where(
			and(
				eq(canonicalRecords.coil, candidate.coil),
				ilike(canonicalRecords.canonicalTitle, `%${title}%`)
			)
		)
		.limit(10);
}

async function getSuggestedOrganizations(
	coil: ImportedCandidateRow['coil'],
	normalized: Record<string, unknown>
) {
	if (!['events', 'funding', 'jobs', 'red_pages', 'toolbox'].includes(coil)) return [];
	const organizationName = readString(normalized, 'organization_name');
	if (!organizationName) return [];

	return suggestOrganizationMatches({
		name: organizationName,
		website:
			readString(normalized, 'organization_url') ??
			readString(normalized, 'funder_url') ??
			readString(normalized, 'url'),
		city: readString(normalized, 'location_city') ?? readString(normalized, 'city'),
		state: readString(normalized, 'location_state') ?? readString(normalized, 'state'),
		address: readString(normalized, 'location_address') ?? readString(normalized, 'address'),
		limit: 6
	});
}

async function getSuggestedVenues(normalized: Record<string, unknown>) {
	const name =
		readString(normalized, 'location_name') ?? readString(normalized, 'location_address');
	if (!name) return [];
	return suggestVenueMatches({
		name,
		address: readString(normalized, 'location_address'),
		city: readString(normalized, 'location_city'),
		state: readString(normalized, 'location_state'),
		organizationId: readString(normalized, 'organization_id'),
		limit: 6
	});
}

function mapPublishedRecordToComparable(
	coil: ImportedCandidateRow['coil'],
	publishedRecord: unknown
) {
	const record = asRecord(publishedRecord);
	switch (coil) {
		case 'events':
			return {
				title: readString(record, 'title'),
				description: readString(record, 'description'),
				url: readString(record, 'eventUrl'),
				start_date: toIso(record.startDate),
				end_date: toIso(record.endDate),
				location_name: readString(record, 'location'),
				location_address: readString(record, 'address'),
				location_state: readString(record, 'region'),
				organization_name: readString(record, 'hostOrg'),
				event_type: readString(record, 'type'),
				registration_url: readString(record, 'registrationUrl'),
				timezone: readString(record, 'timezone'),
				is_virtual:
					readString(record, 'eventFormat') === 'online' ||
					Boolean(readString(record, 'virtualEventUrl')),
				virtual_url: readString(record, 'virtualEventUrl'),
				cost: readString(record, 'cost'),
				tags: readStringArray(record, 'tags'),
				image_url: readString(record, 'imageUrl')
			};
		case 'funding':
			return {
				title: readString(record, 'title'),
				description: readString(record, 'description'),
				url: readString(record, 'applyUrl'),
				deadline: toIso(record.deadline),
				funder_name: readString(record, 'funderName'),
				funding_type: readString(record, 'fundingType'),
				amount_min: readNumber(record, 'amountMin'),
				amount_max: readNumber(record, 'amountMax'),
				amount_description: readString(record, 'amountDescription'),
				region: readString(record, 'region'),
				eligibility: readString(record, 'eligibilityType'),
				status: readString(record, 'applicationStatus'),
				tags: readStringArray(record, 'tags'),
				image_url: readString(record, 'imageUrl')
			};
		case 'jobs':
			return {
				title: readString(record, 'title'),
				description: readString(record, 'description'),
				url: readString(record, 'applyUrl'),
				organization_name: readString(record, 'employerName'),
				job_type: readString(record, 'jobType'),
				is_remote: readString(record, 'workArrangement') === 'remote',
				is_hybrid: readString(record, 'workArrangement') === 'hybrid',
				closing_date: toIso(record.applicationDeadline),
				location_city: readString(record, 'city'),
				location_state: readString(record, 'state'),
				region: readString(record, 'region'),
				salary_min: readNumber(record, 'compensationMin'),
				salary_max: readNumber(record, 'compensationMax'),
				salary_period: readString(record, 'compensationType'),
				salary_description: readString(record, 'compensationDescription'),
				department: readString(record, 'department'),
				tags: readStringArray(record, 'tags'),
				image_url: readString(record, 'imageUrl')
			};
		case 'red_pages':
			return {
				title: readString(record, 'name'),
				description: readString(record, 'description'),
				url: readString(record, 'website'),
				organization_name: readString(record, 'ownerName'),
				organization_type: readString(record, 'serviceType'),
				service_area: readString(record, 'serviceArea'),
				tribal_affiliation: readString(record, 'tribalAffiliation'),
				address: readString(record, 'address'),
				city: readString(record, 'city'),
				state: readString(record, 'state'),
				region: readString(record, 'region'),
				zip: readString(record, 'zip'),
				email: readString(record, 'email'),
				phone: readString(record, 'phone'),
				tags: readStringArray(record, 'tags'),
				image_url: readString(record, 'imageUrl')
			};
		case 'toolbox':
			return {
				title: readString(record, 'title'),
				description: readString(record, 'description'),
				url: readString(record, 'externalUrl'),
				publisher: readString(record, 'sourceName'),
				resource_type: readString(record, 'resourceType'),
				format: readString(record, 'mediaType'),
				publication_date: toIso(record.publishDate),
				topics: readStringArray(record, 'categories'),
				tags: readStringArray(record, 'tags'),
				image_url: readString(record, 'imageUrl')
			};
		default:
			return record;
	}
}

function toIso(value: unknown) {
	if (value instanceof Date) return value.toISOString();
	if (typeof value === 'string' && value.trim()) {
		const parsed = new Date(value);
		return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
	}
	return null;
}

export async function rejectCandidate(
	id: string,
	reviewerId: string,
	opts?: {
		rejectionReason?: ImportedCandidateRow['rejectionReason'];
		reviewNotes?: string;
	}
): Promise<ImportedCandidateRow | null> {
	const [row] = await db
		.update(importedCandidates)
		.set({
			status: 'rejected',
			reviewedAt: new Date(),
			reviewedBy: reviewerId,
			reviewNotes: opts?.reviewNotes ?? null,
			rejectionReason: opts?.rejectionReason ?? 'other'
		})
		.where(eq(importedCandidates.id, id))
		.returning();
	return row ?? null;
}

export async function markCandidateNeedsInfo(
	id: string,
	reviewerId: string,
	opts?: { reviewNotes?: string }
): Promise<ImportedCandidateRow | null> {
	const [row] = await db
		.update(importedCandidates)
		.set({
			status: 'needs_info',
			reviewedAt: new Date(),
			reviewedBy: reviewerId,
			reviewNotes: opts?.reviewNotes ?? null
		})
		.where(eq(importedCandidates.id, id))
		.returning();
	return row ?? null;
}

export async function archiveCandidate(
	id: string,
	reviewerId: string,
	opts?: { reviewNotes?: string }
): Promise<ImportedCandidateRow | null> {
	const [row] = await db
		.update(importedCandidates)
		.set({
			status: 'archived',
			reviewedAt: new Date(),
			reviewedBy: reviewerId,
			reviewNotes: opts?.reviewNotes ?? null
		})
		.where(eq(importedCandidates.id, id))
		.returning();
	return row ?? null;
}

export async function getRecentCandidatesForSource(
	sourceId: string,
	limit = 10
): Promise<ImportedCandidateRow[]> {
	return db
		.select()
		.from(importedCandidates)
		.where(eq(importedCandidates.sourceId, sourceId))
		.orderBy(desc(importedCandidates.importedAt), asc(importedCandidates.priority))
		.limit(limit);
}
