#!/usr/bin/env node
import 'dotenv/config';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sources } from '../src/lib/server/db/schema/sources';

type SeedSource = {
	name: string;
	slug?: string;
	description?: string;
	sourceUrl?: string;
	source_url?: string;
	homepageUrl?: string;
	homepage_url?: string;
	coils?: Array<'events' | 'funding' | 'jobs' | 'red_pages' | 'toolbox'>;
	ingestionMethod?: typeof sources.$inferInsert.ingestionMethod;
	ingestion_method?: typeof sources.$inferInsert.ingestionMethod;
	sourceCategory?: typeof sources.$inferInsert.sourceCategory;
	source_category?: typeof sources.$inferInsert.sourceCategory;
	adapterType?: string;
	adapter_type?: string;
	adapterConfig?: Record<string, unknown>;
	adapter_config?: Record<string, unknown>;
	fetchCadence?: typeof sources.$inferInsert.fetchCadence;
	fetch_cadence?: typeof sources.$inferInsert.fetchCadence;
	fetchUrl?: string;
	fetch_url?: string;
	status?: typeof sources.$inferInsert.status;
	healthStatus?: typeof sources.$inferInsert.healthStatus;
	health_status?: typeof sources.$inferInsert.healthStatus;
	enabled?: boolean;
	stewardNotes?: string;
	steward_notes?: string;
	attributionRequired?: boolean;
	attribution_required?: boolean;
	attributionText?: string;
	attribution_text?: string;
	reviewRequired?: boolean;
	review_required?: boolean;
	autoApprove?: boolean;
	auto_approve?: boolean;
	confidenceScore?: number;
	confidence_score?: number;
	riskProfile?: Record<string, unknown>;
	risk_profile?: Record<string, unknown>;
	dedupeStrategies?: typeof sources.$inferInsert.dedupeStrategies;
	dedupe_strategies?: typeof sources.$inferInsert.dedupeStrategies;
	dedupeConfig?: Record<string, unknown>;
	dedupe_config?: Record<string, unknown>;
};

const candidateSeedPaths = [
	join(process.cwd(), 'source-ops', 'data', 'seed-sources.json'),
	join(process.cwd(), '..', 'source-ops', 'data', 'seed-sources.json'),
	join(process.cwd(), '..', 'kb-data', 'source-ops', 'data', 'seed-sources.json'),
	join(process.cwd(), '..', '..', 'kb-data', 'source-ops', 'data', 'seed-sources.json')
];

const seedPath = candidateSeedPaths.find((path) => existsSync(path));

function slugify(text: string): string {
	return (
		text
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '') || 'source'
	);
}

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL is not set. Set it in .env or the environment.');
	process.exit(1);
}

if (!seedPath) {
	console.error(
		`Seed file not found. Checked:\n${candidateSeedPaths.map((path) => `- ${path}`).join('\n')}`
	);
	process.exit(1);
}

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

async function run() {
	const seedData = JSON.parse(readFileSync(seedPath, 'utf-8')) as SeedSource[];
	const seenSlugs = new Set<string>();
	const rows = seedData.map((item) => {
		const baseSlug = slugify(item.slug ?? item.name);
		let slug = baseSlug;
		let n = 0;
		while (seenSlugs.has(slug)) slug = `${baseSlug.slice(0, 90)}-${++n}`;
		seenSlugs.add(slug);

		return {
			name: item.name,
			slug,
			description: item.description ?? null,
			sourceUrl: item.sourceUrl ?? item.source_url ?? '',
			homepageUrl: item.homepageUrl ?? item.homepage_url ?? null,
			coils: item.coils ?? [],
			ingestionMethod: item.ingestionMethod ?? item.ingestion_method ?? 'manual_only',
			sourceCategory: item.sourceCategory ?? item.source_category ?? null,
			adapterType: item.adapterType ?? item.adapter_type ?? null,
			adapterConfig: item.adapterConfig ?? item.adapter_config ?? {},
			fetchCadence: item.fetchCadence ?? item.fetch_cadence ?? 'manual',
			fetchUrl: item.fetchUrl ?? item.fetch_url ?? null,
			status: item.status ?? 'discovered',
				healthStatus: item.healthStatus ?? item.health_status ?? 'unknown',
				enabled: item.enabled ?? false,
				stewardNotes: item.stewardNotes ?? item.steward_notes ?? null,
				attributionRequired: item.attributionRequired ?? item.attribution_required ?? true,
				attributionText: item.attributionText ?? item.attribution_text ?? null,
				reviewRequired: item.reviewRequired ?? item.review_required ?? true,
				autoApprove: item.autoApprove ?? item.auto_approve ?? false,
				confidenceScore: item.confidenceScore ?? item.confidence_score ?? null,
				riskProfile:
					item.riskProfile ??
					item.risk_profile ?? {
						freshness: 'medium',
						duplication: 'medium',
						legal: 'low',
						normalization: 'medium',
						maintenance: 'medium',
						moderation: 'medium'
					},
				dedupeStrategies: item.dedupeStrategies ?? item.dedupe_strategies ?? ['url_match'],
				dedupeConfig: item.dedupeConfig ?? item.dedupe_config ?? {}
			};
		});

	const validRows = rows.filter((row) => row.sourceUrl.trim().length > 0);

	await db
		.insert(sources)
		.values(validRows)
		.onConflictDoUpdate({
			target: sources.slug,
			set: {
				name: sql`excluded.name`,
				description: sql`excluded.description`,
				sourceUrl: sql`excluded.source_url`,
				homepageUrl: sql`excluded.homepage_url`,
				coils: sql`excluded.coils`,
				ingestionMethod: sql`excluded.ingestion_method`,
				sourceCategory: sql`excluded.source_category`,
				adapterType: sql`excluded.adapter_type`,
				adapterConfig: sql`excluded.adapter_config`,
				fetchCadence: sql`excluded.fetch_cadence`,
				fetchUrl: sql`excluded.fetch_url`,
				status: sql`excluded.status`,
				healthStatus: sql`excluded.health_status`,
				enabled: sql`excluded.enabled`,
				stewardNotes: sql`excluded.steward_notes`,
				attributionRequired: sql`excluded.attribution_required`,
				attributionText: sql`excluded.attribution_text`,
				reviewRequired: sql`excluded.review_required`,
				autoApprove: sql`excluded.auto_approve`,
				confidenceScore: sql`excluded.confidence_score`,
				riskProfile: sql`excluded.risk_profile`,
				dedupeStrategies: sql`excluded.dedupe_strategies`,
				dedupeConfig: sql`excluded.dedupe_config`,
				updatedAt: sql`now()`
			}
		});

	console.log(`Upserted ${validRows.length} sources from seed data.`);
	await client.end();
}

run().catch(async (error) => {
	console.error(error);
	await client.end();
	process.exit(1);
});
