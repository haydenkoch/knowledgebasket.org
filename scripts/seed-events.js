#!/usr/bin/env node
/**
 * Seed events table from data/Tribal Events - Knowledge Basket.csv
 * Run from site/: pnpm run db:seed (ensure DATABASE_URL is set and docker compose up)
 * CSV path: ../data/ when in site/, or data/ when in repo root
 */
import 'dotenv/config';
import postgres from 'postgres';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const csvPath =
	existsSync(join(process.cwd(), '..', 'data', 'Tribal Events - Knowledge Basket.csv'))
		? join(process.cwd(), '..', 'data', 'Tribal Events - Knowledge Basket.csv')
		: join(process.cwd(), 'data', 'Tribal Events - Knowledge Basket.csv');

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL is not set. Set it in .env or the environment.');
	process.exit(1);
}

if (!existsSync(csvPath)) {
	console.error('CSV not found at', csvPath);
	process.exit(1);
}

function parseCSV(content) {
	const rows = [];
	let row = [];
	let field = '';
	let inQuotes = false;
	for (let i = 0; i < content.length; i++) {
		const c = content[i];
		if (inQuotes) {
			if (c === '"') inQuotes = false;
			else field += c;
		} else {
			if (c === '"') inQuotes = true;
			else if (c === ',' || c === '\n') {
				row.push(field.trim());
				field = '';
				if (c === '\n') {
					rows.push(row);
					row = [];
				}
			} else field += c;
		}
	}
	if (field || row.length) {
		row.push(field.trim());
		rows.push(row);
	}
	return rows;
}

function slugify(text) {
	if (!text || typeof text !== 'string') return 'event';
	return text
		.trim()
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 100) || 'event';
}

function normType(s) {
	if (!s) return '';
	return s.replace(/\//g, ' / ').trim();
}

/** Parse MM/DD/YYYY to Date or null */
function parseDate(str) {
	if (!str || typeof str !== 'string') return null;
	const parts = str.trim().split(/[/-]/);
	if (parts.length !== 3) return null;
	const [a, b, c] = parts;
	const month = parseInt(a, 10);
	const day = parseInt(b, 10);
	const year = parseInt(c, 10);
	if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year > 1900) {
		return new Date(year, month - 1, day);
	}
	return null;
}

const csv = readFileSync(csvPath, 'utf-8');
const rows = parseCSV(csv);
const headers = rows[0] || [];
const col = (row, name) => {
	const i = headers.indexOf(name);
	return i >= 0 ? (row[i] || '').trim() : '';
};

const events = [];
const seenSlugs = new Set();
for (let i = 1; i < rows.length; i++) {
	const row = rows[i];
	const title = col(row, 'Event Name');
	if (!title) continue;
	const baseSlug = slugify(title);
	let slug = baseSlug;
	let n = 0;
	while (seenSlugs.has(slug)) slug = `${baseSlug.slice(0, 90)}-${++n}`;
	seenSlugs.add(slug);

	const startDate = parseDate(col(row, 'Start Date'));
	const endDate = parseDate(col(row, 'End Date'));
	events.push({
		slug,
		title: title.replace(/\n/g, ' ').trim(),
		description: col(row, 'Event Description').replace(/\n/g, '\n').trim() || null,
		location: col(row, 'Location') || null,
		region: col(row, 'Filter - Geography') || null,
		type: normType(col(row, 'Filter - Type')) || null,
		audience: col(row, 'Audience') || null,
		cost: col(row, 'Filter - Cost Required') || null,
		eventUrl: col(row, 'Link') || null,
		startDate,
		endDate,
		hostOrg: col(row, 'Entity') || null,
		status: 'published',
		source: 'seed'
	});
}

const sql = postgres(process.env.DATABASE_URL);

async function run() {
	for (const e of events) {
		await sql`
			INSERT INTO events (slug, title, description, location, region, type, audience, cost, event_url, start_date, end_date, host_org, status, source)
			VALUES (${e.slug}, ${e.title}, ${e.description}, ${e.location}, ${e.region}, ${e.type}, ${e.audience}, ${e.cost}, ${e.eventUrl}, ${e.startDate}, ${e.endDate}, ${e.hostOrg}, ${e.status}, ${e.source})
			ON CONFLICT (slug) DO NOTHING
		`;
	}
	console.log('Seeded', events.length, 'events (existing slugs skipped).');
	await sql.end();
}

run().catch((err) => {
	console.error(err);
	process.exit(1);
});
