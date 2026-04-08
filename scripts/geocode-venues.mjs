#!/usr/bin/env node

/**
 * Backfill venues.lat / venues.lng via Mapbox forward geocoding.
 *
 * Usage:
 *   node scripts/geocode-venues.mjs            # geocode venues with null lat/lng
 *   node scripts/geocode-venues.mjs --all      # re-geocode every venue
 *   node scripts/geocode-venues.mjs --dry-run  # print, don't write
 *   node scripts/geocode-venues.mjs --limit 10
 */

import 'dotenv/config';
import postgres from 'postgres';

const { DATABASE_URL, MAPBOX_ACCESS_TOKEN, MAPBOX_TOKEN } = process.env;
const token = MAPBOX_ACCESS_TOKEN ?? MAPBOX_TOKEN;

if (!DATABASE_URL) {
	console.error('DATABASE_URL is not set.');
	process.exit(1);
}
if (!token) {
	console.error('MAPBOX_ACCESS_TOKEN is not set.');
	process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const all = args.includes('--all');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : null;

const MAPBOX_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
const REQUEST_DELAY_MS = 120; // ~8 req/s, well under Mapbox's 600/min limit

const sql = postgres(DATABASE_URL);

function buildQuery(venue) {
	const parts = [venue.address, venue.city, venue.state, venue.zip].filter(
		(p) => p && String(p).trim().length > 0
	);
	if (parts.length === 0) return null;
	return parts.join(', ');
}

async function geocode(query) {
	const url = new URL(`${MAPBOX_URL}/${encodeURIComponent(query)}.json`);
	url.searchParams.set('access_token', token);
	url.searchParams.set('limit', '1');
	url.searchParams.set('country', 'us');
	url.searchParams.set('types', 'address,poi,place');

	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`Mapbox ${res.status}: ${await res.text()}`);
	}
	const json = await res.json();
	const feat = json.features?.[0];
	if (!feat?.center) return null;
	const [lng, lat] = feat.center;
	return { lat, lng, placeName: feat.place_name ?? null };
}

function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms));
}

async function main() {
	const rows = all
		? await sql`
				SELECT id, slug, name, address, city, state, zip
				FROM venues
				ORDER BY name
				${limit ? sql`LIMIT ${limit}` : sql``}
			`
		: await sql`
				SELECT id, slug, name, address, city, state, zip
				FROM venues
				WHERE lat IS NULL OR lng IS NULL
				ORDER BY name
				${limit ? sql`LIMIT ${limit}` : sql``}
			`;

	console.log(`Found ${rows.length} venue(s) to geocode${dryRun ? ' (dry run)' : ''}.`);

	let ok = 0;
	let skipped = 0;
	let failed = 0;

	for (const venue of rows) {
		const query = buildQuery(venue);
		if (!query) {
			console.warn(`- SKIP ${venue.slug}: no address fields`);
			skipped++;
			continue;
		}
		try {
			const result = await geocode(query);
			if (!result) {
				console.warn(`- MISS ${venue.slug}: "${query}"`);
				skipped++;
			} else {
				console.log(
					`- OK   ${venue.slug}: ${result.lat.toFixed(5)}, ${result.lng.toFixed(5)}  (${result.placeName ?? query})`
				);
				if (!dryRun) {
					await sql`
						UPDATE venues
						SET lat = ${result.lat}, lng = ${result.lng}, updated_at = NOW()
						WHERE id = ${venue.id}
					`;
				}
				ok++;
			}
		} catch (err) {
			console.error(`- FAIL ${venue.slug}: ${err.message}`);
			failed++;
		}
		await sleep(REQUEST_DELAY_MS);
	}

	console.log(`\nDone. ok=${ok} skipped=${skipped} failed=${failed}`);
	await sql.end();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
