import { createHash } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { canonicalRecords, sourceRecordLinks } from '$lib/server/db/schema';
import type {
	DedupeCheckResult,
	DedupeLookup,
	DedupeMatch,
	DedupeStrategy,
	NormalizedEvent,
	NormalizedFunding,
	NormalizedJob,
	NormalizedRecord,
	NormalizedRedPagesEntry,
	NormalizedToolboxItem
} from './types';

const VOLATILE_FIELDS = new Set([
	'organization_id',
	'image_url',
	'last_verified_at',
	'link_healthy'
]);

export function contentFingerprint(record: NormalizedRecord): string {
	const cleaned = stripVolatileFields(record as unknown as Record<string, unknown>);
	const canonical = stableStringify(cleaned);
	return createHash('sha256').update(canonical).digest('hex');
}

export function compositeKey(record: NormalizedRecord): { raw: string; hash: string } {
	let parts: string[];

	switch (record.coil) {
		case 'events':
			parts = eventCompositeKey(record);
			break;
		case 'funding':
			parts = fundingCompositeKey(record);
			break;
		case 'jobs':
			parts = jobCompositeKey(record);
			break;
		case 'red_pages':
			parts = redPagesCompositeKey(record);
			break;
		case 'toolbox':
			parts = toolboxCompositeKey(record);
			break;
		default:
			parts = [normalize((record as unknown as { title: string }).title)];
	}

	const raw = parts.join('|');
	return {
		raw,
		hash: createHash('sha256').update(raw).digest('hex').slice(0, 32)
	};
}

export async function runDedupeStrategies(
	strategies: DedupeStrategy[],
	record: NormalizedRecord,
	sourceId: string,
	lookup: DedupeLookup,
	options?: { externalId?: string | null }
): Promise<DedupeCheckResult> {
	const fingerprint = contentFingerprint(record);
	const key = compositeKey(record);
	const normalizedUrl = normalizeUrl(record.url);

	for (const strategy of strategies) {
		let match: DedupeMatch | null = null;

		switch (strategy) {
			case 'content_hash':
				match = await lookup.byFingerprint(record.coil, fingerprint);
				break;
			case 'composite_key':
				match = await lookup.byCompositeKey(record.coil, key.hash);
				break;
			case 'url_match':
				if (normalizedUrl) {
					match = await lookup.byUrl(record.coil, normalizedUrl);
				}
				break;
			case 'external_id':
				if (options?.externalId) {
					match = await lookup.byExternalId(sourceId, options.externalId);
				}
				break;
			case 'title_fuzzy':
				match = await lookup.byTitleSimilarity(record.coil, record.title, 0.85);
				break;
		}

		if (!match) continue;

		if (match.confidence >= 0.995) {
			return { result: 'duplicate', match, strategyUsed: strategy };
		}
		if (match.confidence >= 0.85) {
			return { result: 'update', match, strategyUsed: strategy };
		}
		return { result: 'ambiguous', match, strategyUsed: strategy };
	}

	return { result: 'new', match: null, strategyUsed: null };
}

export function createDedupeLookup(): DedupeLookup {
	return {
		async byFingerprint(coil, fingerprint) {
			const [row] = await db
				.select({
					id: canonicalRecords.id,
					canonicalTitle: canonicalRecords.canonicalTitle,
					publishedRecordId: canonicalRecords.publishedRecordId
				})
				.from(canonicalRecords)
				.where(
					and(eq(canonicalRecords.coil, coil), eq(canonicalRecords.contentFingerprint, fingerprint))
				)
				.limit(1);

			return row
				? {
						strategy: 'content_hash',
						canonicalRecordId: row.id,
						confidence: 1,
						canonicalTitle: row.canonicalTitle,
						publishedRecordId: row.publishedRecordId
					}
				: null;
		},

		async byCompositeKey(coil, compositeHash) {
			const [row] = await db
				.select({
					id: canonicalRecords.id,
					canonicalTitle: canonicalRecords.canonicalTitle,
					publishedRecordId: canonicalRecords.publishedRecordId
				})
				.from(canonicalRecords)
				.where(
					and(eq(canonicalRecords.coil, coil), eq(canonicalRecords.compositeKey, compositeHash))
				)
				.limit(1);

			return row
				? {
						strategy: 'composite_key',
						canonicalRecordId: row.id,
						confidence: 0.92,
						canonicalTitle: row.canonicalTitle,
						publishedRecordId: row.publishedRecordId
					}
				: null;
		},

		async byUrl(coil, url) {
			const [row] = await db
				.select({
					id: canonicalRecords.id,
					canonicalTitle: canonicalRecords.canonicalTitle,
					publishedRecordId: canonicalRecords.publishedRecordId
				})
				.from(canonicalRecords)
				.where(and(eq(canonicalRecords.coil, coil), eq(canonicalRecords.canonicalUrl, url)))
				.limit(1);

			return row
				? {
						strategy: 'url_match',
						canonicalRecordId: row.id,
						confidence: 1,
						canonicalTitle: row.canonicalTitle,
						publishedRecordId: row.publishedRecordId
					}
				: null;
		},

		async byExternalId(sourceId, externalId) {
			const [row] = await db
				.select({
					id: canonicalRecords.id,
					canonicalTitle: canonicalRecords.canonicalTitle,
					publishedRecordId: canonicalRecords.publishedRecordId
				})
				.from(sourceRecordLinks)
				.innerJoin(canonicalRecords, eq(sourceRecordLinks.canonicalRecordId, canonicalRecords.id))
				.where(
					and(
						eq(sourceRecordLinks.sourceId, sourceId),
						eq(sourceRecordLinks.sourceItemId, externalId)
					)
				)
				.limit(1);

			return row
				? {
						strategy: 'external_id',
						canonicalRecordId: row.id,
						confidence: 1,
						canonicalTitle: row.canonicalTitle,
						publishedRecordId: row.publishedRecordId
					}
				: null;
		},

		async byTitleSimilarity(coil, title, threshold = 0.85) {
			const rows = await db
				.select({
					id: canonicalRecords.id,
					canonicalTitle: canonicalRecords.canonicalTitle,
					publishedRecordId: canonicalRecords.publishedRecordId
				})
				.from(canonicalRecords)
				.where(eq(canonicalRecords.coil, coil))
				.limit(100);

			const normalizedTitle = normalize(title);
			let best: DedupeMatch | null = null;
			for (const row of rows) {
				const confidence = titleSimilarity(normalizedTitle, normalize(row.canonicalTitle));
				if (confidence < threshold) continue;
				if (!best || confidence > best.confidence) {
					best = {
						strategy: 'title_fuzzy',
						canonicalRecordId: row.id,
						confidence,
						canonicalTitle: row.canonicalTitle,
						publishedRecordId: row.publishedRecordId
					};
				}
			}

			return best;
		}
	};
}

export function normalizeUrl(url: string | null | undefined): string | null {
	if (!url) return null;
	try {
		const parsed = new URL(url.trim());
		parsed.hash = '';
		for (const key of [...parsed.searchParams.keys()]) {
			if (key.toLowerCase().startsWith('utm_')) parsed.searchParams.delete(key);
		}
		const normalized = parsed.toString().replace(/\/$/, '');
		return normalized || null;
	} catch {
		return url.trim() || null;
	}
}

function stripVolatileFields(obj: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj)) {
		if (VOLATILE_FIELDS.has(key)) continue;
		if (value === null || value === undefined) continue;

		if (typeof value === 'string') {
			const normalized = value.replace(/\s+/g, ' ').trim().toLowerCase();
			if (normalized) result[key] = normalized;
			continue;
		}

		if (Array.isArray(value)) {
			const sorted = value
				.map((entry) => (typeof entry === 'string' ? entry.toLowerCase().trim() : entry))
				.filter((entry) => entry !== null && entry !== undefined)
				.sort();
			if (sorted.length > 0) result[key] = sorted;
			continue;
		}

		if (typeof value === 'object') {
			const nested = stripVolatileFields(value as Record<string, unknown>);
			if (Object.keys(nested).length > 0) result[key] = nested;
			continue;
		}

		result[key] = value;
	}

	return result;
}

function stableStringify(value: unknown): string {
	if (value === null || value === undefined) return '';
	if (typeof value !== 'object') return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;

	const keys = Object.keys(value as Record<string, unknown>).sort();
	const pairs = keys.map((key) => {
		const entry = (value as Record<string, unknown>)[key];
		return `${JSON.stringify(key)}:${stableStringify(entry)}`;
	});
	return `{${pairs.join(',')}}`;
}

function eventCompositeKey(record: NormalizedEvent): string[] {
	return [
		normalize(record.title),
		record.start_date ?? '',
		record.is_virtual ? 'virtual' : normalize(record.location_city ?? record.location_name ?? '')
	];
}

function fundingCompositeKey(record: NormalizedFunding): string[] {
	return [
		normalize(record.title),
		record.is_rolling ? 'rolling' : (record.deadline ?? ''),
		normalize(record.funder_name ?? '')
	];
}

function jobCompositeKey(record: NormalizedJob): string[] {
	return [
		normalize(record.title),
		normalize(record.organization_name ?? ''),
		record.is_remote ? 'remote' : normalize(record.location_state ?? '')
	];
}

function redPagesCompositeKey(record: NormalizedRedPagesEntry): string[] {
	return [normalize(record.title), normalize(record.city ?? ''), normalize(record.state ?? '')];
}

function toolboxCompositeKey(record: NormalizedToolboxItem): string[] {
	return [normalize(record.title), normalize(record.publisher ?? ''), record.resource_type];
}

function normalize(value: string): string {
	return value
		.toLowerCase()
		.replace(/&/g, ' and ')
		.replace(/[^a-z0-9]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function titleSimilarity(left: string, right: string): number {
	if (!left || !right) return 0;
	if (left === right) return 1;

	const leftTokens = new Set(left.split(' ').filter(Boolean));
	const rightTokens = new Set(right.split(' ').filter(Boolean));
	if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

	let intersection = 0;
	for (const token of leftTokens) {
		if (rightTokens.has(token)) intersection += 1;
	}

	return (2 * intersection) / (leftTokens.size + rightTokens.size);
}
