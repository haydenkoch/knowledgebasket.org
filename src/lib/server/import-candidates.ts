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
			eq(
				importedCandidates.dedupeResult,
				opts.dedupeResult as ImportedCandidateRow['dedupeResult']
			)
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
	reviewerId: string,
	opts?: { reviewNotes?: string }
): Promise<ImportedCandidateRow | null> {
	return db.transaction(async (tx) => {
		const [candidate] = await tx
			.select()
			.from(importedCandidates)
			.where(eq(importedCandidates.id, id))
			.limit(1);

		if (!candidate) return null;

		let canonical = await findCanonicalRecord(tx, candidate);
		const canonicalExisted = Boolean(canonical);
		const published = await publishCandidateRecord(tx, candidate, reviewerId, canonical);
		const normalized = asRecord(candidate.normalizedData);
		const compositeKey = readCompositeKey(candidate, normalized);
		const canonicalTitle = readCanonicalTitle(candidate, normalized);
		const canonicalUrl = readCanonicalUrl(candidate, normalized);
		const externalIds = buildExternalIds(candidate);

		if (canonical) {
			const [updatedCanonical] = await tx
				.update(canonicalRecords)
				.set({
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
				})
				.where(eq(canonicalRecords.id, canonical.id))
				.returning();
			canonical = updatedCanonical ?? canonical;
		} else {
			const [createdCanonical] = await tx
				.insert(canonicalRecords)
				.values({
					coil: candidate.coil,
					publishedRecordId: published.id,
					canonicalTitle,
					compositeKey,
					contentFingerprint: candidate.contentFingerprint,
					canonicalUrl,
					externalIds,
					sourceCount: 1,
					primarySourceId: candidate.sourceId
				})
				.returning();
			canonical = createdCanonical ?? null;
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
				status: 'approved',
				reviewedAt: new Date(),
				reviewedBy: reviewerId,
				reviewNotes: opts?.reviewNotes ?? candidate.reviewNotes,
				matchedCanonicalId: canonical.id
			})
			.where(eq(importedCandidates.id, id))
			.returning();

		await tx.insert(mergeHistory).values({
			canonicalRecordId: canonical.id,
			candidateId: candidate.id,
			sourceId: candidate.sourceId,
			mergeType: published.previousData ? 'field_update' : 'manual_merge',
			fieldsUpdated: Object.keys(normalized),
			previousData: published.previousData,
			newData: normalized,
			mergedBy: reviewerId,
			notes: opts?.reviewNotes ?? null
		});

		return updatedCandidate ?? null;
	});
}

async function findCanonicalRecord(
	tx: DatabaseExecutor,
	candidate: ImportedCandidateRow
): Promise<CanonicalRecordRow | null> {
	if (candidate.matchedCanonicalId) {
		const [matched] = await tx
			.select()
			.from(canonicalRecords)
			.where(eq(canonicalRecords.id, candidate.matchedCanonicalId))
			.limit(1);
		if (matched) return matched;
	}

	if (candidate.contentFingerprint) {
		const [matchedByFingerprint] = await tx
			.select()
			.from(canonicalRecords)
			.where(
				and(
					eq(canonicalRecords.coil, candidate.coil),
					eq(canonicalRecords.contentFingerprint, candidate.contentFingerprint)
				)
			)
			.limit(1);
		if (matchedByFingerprint) return matchedByFingerprint;
	}

	return null;
}

async function publishCandidateRecord(
	tx: DatabaseExecutor,
	candidate: ImportedCandidateRow,
	reviewerId: string,
	canonical: CanonicalRecordRow | null
): Promise<{ id: string; previousData: unknown | null }> {
	const normalized = asRecord(candidate.normalizedData);
	const publishedRecordId = canonical?.publishedRecordId ?? null;
	const previousData = publishedRecordId ? await getPublishedRecordById(tx, candidate.coil, publishedRecordId) : null;

	switch (candidate.coil) {
		case 'events': {
			const payload = mapEventCandidate(normalized, reviewerId);
			if (publishedRecordId && previousData) {
				const updated = await updateEvent(publishedRecordId, payload, tx);
				if (updated) return { id: updated.id, previousData };
			}
			const created = await createEvent(payload, tx);
			return { id: created.id, previousData };
		}
		case 'funding': {
			const payload = mapFundingCandidate(normalized, reviewerId);
			if (publishedRecordId && previousData) {
				const updated = await updateFunding(publishedRecordId, payload, tx);
				if (updated) return { id: updated.id, previousData };
			}
			const created = await createFunding(payload, tx);
			return { id: created.id, previousData };
		}
		case 'jobs': {
			const payload = mapJobCandidate(normalized, reviewerId);
			if (publishedRecordId && previousData) {
				const updated = await updateJob(publishedRecordId, payload, tx);
				if (updated) return { id: updated.id, previousData };
			}
			const created = await createJob(payload, tx);
			return { id: created.id, previousData };
		}
		case 'red_pages': {
			const payload = mapRedPagesCandidate(normalized, reviewerId);
			if (publishedRecordId && previousData) {
				const updated = await updateBusiness(publishedRecordId, payload, tx);
				if (updated) return { id: updated.id, previousData };
			}
			const created = await createBusiness(payload, tx);
			return { id: created.id, previousData };
		}
		case 'toolbox': {
			const payload = mapToolboxCandidate(normalized, reviewerId);
			if (publishedRecordId && previousData) {
				const updated = await updateResource(publishedRecordId, payload, tx);
				if (updated) return { id: updated.id, previousData };
			}
			const created = await createResource(payload, tx);
			return { id: created.id, previousData };
		}
		default:
			throw new Error(`Unsupported coil ${candidate.coil}`);
	}
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
			const [row] = await tx.select().from(redPagesBusinesses).where(eq(redPagesBusinesses.id, id)).limit(1);
			return row ?? null;
		}
		case 'toolbox': {
			const [row] = await tx.select().from(toolboxResources).where(eq(toolboxResources.id, id)).limit(1);
			return row ?? null;
		}
		default:
			return null;
	}
}

function mapEventCandidate(normalized: Record<string, unknown>, reviewerId: string) {
	const publishedAt = new Date();
	return {
		title: readString(normalized, 'title') ?? 'Untitled event',
		description: readString(normalized, 'description') ?? undefined,
		location: buildEventLocation(normalized),
		address: readString(normalized, 'location_address') ?? undefined,
		region: readString(normalized, 'region') ?? readString(normalized, 'location_state') ?? undefined,
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
		reviewedById: reviewerId,
		publishedAt
	};
}

function mapFundingCandidate(normalized: Record<string, unknown>, reviewerId: string) {
	return {
		title: readString(normalized, 'title') ?? 'Untitled funding',
		description: readString(normalized, 'description') ?? null,
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
		reviewedById: reviewerId
	};
}

function mapJobCandidate(normalized: Record<string, unknown>, reviewerId: string) {
	return {
		title: readString(normalized, 'title') ?? 'Untitled job',
		description: readString(normalized, 'description') ?? null,
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
		reviewedById: reviewerId
	};
}

function mapRedPagesCandidate(normalized: Record<string, unknown>, reviewerId: string) {
	return {
		name: readString(normalized, 'title') ?? 'Untitled listing',
		description: readString(normalized, 'description') ?? null,
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
		reviewedById: reviewerId
	};
}

function mapToolboxCandidate(normalized: Record<string, unknown>, reviewerId: string) {
	return {
		title: readString(normalized, 'title') ?? 'Untitled resource',
		description: readString(normalized, 'description') ?? null,
		sourceName: readString(normalized, 'publisher') ?? readString(normalized, 'organization_name') ?? null,
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
		reviewedById: reviewerId
	};
}

function buildExternalIds(candidate: ImportedCandidateRow): Record<string, string> {
	const externalIds: Record<string, string> = {};
	if (candidate.sourceItemId) externalIds[candidate.sourceId] = candidate.sourceItemId;
	return externalIds;
}

function readCanonicalTitle(candidate: ImportedCandidateRow, normalized: Record<string, unknown>) {
	return readString(normalized, 'title') ?? candidate.sourceItemId ?? `Candidate ${candidate.id.slice(0, 8)}`;
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
		const items = value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
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
	const parts = [readString(normalized, 'location_city'), readString(normalized, 'location_state')].filter(Boolean);
	return parts.length > 0 ? parts.join(', ') : null;
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
