#!/usr/bin/env node
import 'dotenv/config';
import postgres from 'postgres';
import { syncCuratedFunding } from './lib/curated-funding-sync.mjs';

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL is not set.');
	process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);

try {
	const summary = await syncCuratedFunding(sql, { prune: true });
	console.log(
		[
			'Curated funding sync complete.',
			`Created: ${summary.created}`,
			`Updated: ${summary.updated}`,
			`Deleted legacy rows: ${summary.deleted}`,
			`Published curated records: ${summary.total}`,
			summary.searchIndexed
				? `Funding search index rebuilt: ${summary.indexedCount} published records`
				: 'Funding search index rebuild skipped: Meilisearch not configured'
		].join('\n')
	);

	if (summary.removed.length > 0) {
		console.log('\nRemoved legacy published rows:');
		for (const row of summary.removed) {
			console.log(`- ${row.title} (${row.slug}) [${row.source}]`);
		}
	}
} catch (error) {
	console.error(error);
	process.exitCode = 1;
} finally {
	await sql.end();
}
