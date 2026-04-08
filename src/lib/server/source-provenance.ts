import { and, eq } from 'drizzle-orm';
import { db, type DbExecutor } from '$lib/server/db';
import { canonicalRecords, sourceRecordLinks, sources } from '$lib/server/db/schema';
import type { CoilKey, SourceProvenance } from '$lib/data/kb';
import { normalizePublicHttpUrl } from '$lib/server/url-safety';

type SourceOpsCoil = 'events' | 'funding' | 'jobs' | 'red_pages' | 'toolbox';

function toOpsCoil(coil: CoilKey): SourceOpsCoil {
	return coil === 'redpages' ? 'red_pages' : coil;
}

function toIso(value: Date | null | undefined) {
	return value instanceof Date ? value.toISOString() : undefined;
}

export async function getSourceProvenanceByPublishedRecord(
	coil: CoilKey,
	publishedRecordId: string,
	database: DbExecutor = db
): Promise<SourceProvenance | undefined> {
	const [canonical] = await database
		.select({
			id: canonicalRecords.id,
			primarySourceId: canonicalRecords.primarySourceId,
			sourceCount: canonicalRecords.sourceCount
		})
		.from(canonicalRecords)
		.where(
			and(
				eq(canonicalRecords.coil, toOpsCoil(coil)),
				eq(canonicalRecords.publishedRecordId, publishedRecordId)
			)
		)
		.limit(1);

	if (!canonical) return undefined;

	const links = await database
		.select({
			link: sourceRecordLinks,
			source: sources
		})
		.from(sourceRecordLinks)
		.innerJoin(sources, eq(sourceRecordLinks.sourceId, sources.id))
		.where(eq(sourceRecordLinks.canonicalRecordId, canonical.id));

	if (links.length === 0) return undefined;

	const primary =
		links.find((entry) => entry.source.id === canonical.primarySourceId) ??
		links.find((entry) => entry.link.isPrimary) ??
		links[0];

	if (!primary) return undefined;

	return {
		sourceName: primary.source.name,
		sourceSlug: primary.source.slug,
		sourceUrl:
			normalizePublicHttpUrl(primary.source.homepageUrl) ??
			normalizePublicHttpUrl(primary.source.sourceUrl) ??
			undefined,
		sourceItemUrl: normalizePublicHttpUrl(primary.link.sourceItemUrl ?? undefined) ?? undefined,
		attributionText:
			primary.link.sourceAttribution ?? primary.source.attributionText ?? primary.source.name,
		lastSyncedAt: toIso(primary.link.lastSyncAt ?? primary.link.lastSeenAt ?? null),
		sourceCount: Math.max(canonical.sourceCount ?? 1, links.length)
	};
}
