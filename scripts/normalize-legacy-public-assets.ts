#!/usr/bin/env node

import 'dotenv/config';
import postgres from 'postgres';
import {
	normalizePublicAssetBaseUrl,
	rewriteLegacyLocalObjectStorageUrl,
	rewriteLegacyLocalObjectStorageUrlsInValue
} from '../src/lib/config/public-assets-core';

type FieldConfig = {
	column: string;
	kind: 'text' | 'jsonb';
};

type TableConfig = {
	table: string;
	fields: FieldConfig[];
	touchUpdatedAt?: boolean;
};

const TABLES: TableConfig[] = [
	{
		table: 'events',
		fields: [
			{ column: 'image_url', kind: 'text' },
			{ column: 'image_urls', kind: 'jsonb' }
		],
		touchUpdatedAt: true
	},
	{
		table: 'funding',
		fields: [
			{ column: 'image_url', kind: 'text' },
			{ column: 'image_urls', kind: 'jsonb' }
		],
		touchUpdatedAt: true
	},
	{
		table: 'jobs',
		fields: [
			{ column: 'image_url', kind: 'text' },
			{ column: 'image_urls', kind: 'jsonb' }
		],
		touchUpdatedAt: true
	},
	{
		table: 'toolbox_resources',
		fields: [
			{ column: 'image_url', kind: 'text' },
			{ column: 'image_urls', kind: 'jsonb' }
		],
		touchUpdatedAt: true
	},
	{
		table: 'red_pages_businesses',
		fields: [
			{ column: 'logo_url', kind: 'text' },
			{ column: 'image_url', kind: 'text' },
			{ column: 'image_urls', kind: 'jsonb' }
		],
		touchUpdatedAt: true
	},
	{
		table: 'organizations',
		fields: [{ column: 'logo_url', kind: 'text' }],
		touchUpdatedAt: true
	},
	{
		table: 'venues',
		fields: [{ column: 'image_url', kind: 'text' }],
		touchUpdatedAt: true
	}
];

const HOMEPAGE_SETTING_KEYS = ['homepage_config', 'homepage_config_draft'];

const { DATABASE_URL, PUBLIC_ASSET_BASE_URL } = process.env;

if (!DATABASE_URL) {
	console.error('DATABASE_URL is not set.');
	process.exit(1);
}

if (!PUBLIC_ASSET_BASE_URL) {
	console.error('PUBLIC_ASSET_BASE_URL is not set.');
	process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const baseUrl = normalizePublicAssetBaseUrl(PUBLIC_ASSET_BASE_URL);
const sql = postgres(DATABASE_URL);

function rewriteTextValue(value: unknown): { value: unknown; changes: number } {
	if (typeof value !== 'string') return { value, changes: 0 };
	const rewritten = rewriteLegacyLocalObjectStorageUrl(value, { baseUrl });
	return {
		value: rewritten ?? value,
		changes: rewritten && rewritten !== value ? 1 : 0
	};
}

async function rewriteTable(config: TableConfig) {
	const selectColumns = ['id', ...config.fields.map((field) => field.column)].join(', ');
	const rows = await sql.unsafe(`select ${selectColumns} from ${config.table} order by id`);

	const fieldChangeCounts = Object.fromEntries(config.fields.map((field) => [field.column, 0]));
	let rowsUpdated = 0;
	let valuesChanged = 0;

	for (const row of rows) {
		const updates: Array<{ column: string; kind: FieldConfig['kind']; value: unknown }> = [];

		for (const field of config.fields) {
			const result =
				field.kind === 'jsonb'
					? rewriteLegacyLocalObjectStorageUrlsInValue(row[field.column], { baseUrl })
					: rewriteTextValue(row[field.column]);

			if (result.changes === 0) continue;

			updates.push({
				column: field.column,
				kind: field.kind,
				value: result.value
			});
			fieldChangeCounts[field.column] += result.changes;
			valuesChanged += result.changes;
		}

		if (updates.length === 0) continue;
		rowsUpdated += 1;

		if (dryRun) continue;

		const params = updates.map((update) =>
			update.kind === 'jsonb' ? JSON.stringify(update.value) : update.value
		);
		const setClauses = updates.map((update, index) =>
			update.kind === 'jsonb'
				? `${update.column} = $${index + 1}::jsonb`
				: `${update.column} = $${index + 1}`
		);

		if (config.touchUpdatedAt) {
			setClauses.push('updated_at = NOW()');
		}

		params.push(row.id);

		await sql.unsafe(
			`update ${config.table} set ${setClauses.join(', ')} where id = $${params.length}`,
			params
		);
	}

	return {
		rowsScanned: rows.length,
		rowsUpdated,
		valuesChanged,
		fieldChangeCounts
	};
}

async function rewriteHomepageSettings() {
	const rows = await sql.unsafe(
		`select key, value from site_settings where key = any($1::text[]) order by key`,
		[HOMEPAGE_SETTING_KEYS]
	);

	const counts = Object.fromEntries(HOMEPAGE_SETTING_KEYS.map((key) => [key, 0]));
	let settingsUpdated = 0;

	for (const row of rows) {
		let parsed: unknown;
		try {
			parsed = JSON.parse(row.value);
		} catch (error) {
			console.warn(
				`Skipping ${row.key}: invalid JSON (${error instanceof Error ? error.message : error})`
			);
			continue;
		}

		const result = rewriteLegacyLocalObjectStorageUrlsInValue(parsed, { baseUrl });
		if (result.changes === 0) continue;

		counts[row.key] = result.changes;
		settingsUpdated += 1;

		if (dryRun) continue;

		await sql.unsafe(`update site_settings set value = $1 where key = $2`, [
			JSON.stringify(result.value),
			row.key
		]);
	}

	return {
		settingsScanned: rows.length,
		settingsUpdated,
		valueChangeCounts: counts
	};
}

async function main() {
	console.log(
		`Rewriting legacy local object-storage URLs to ${baseUrl}${dryRun ? ' (dry run)' : ''}.`
	);

	const tableResults = Object.fromEntries(
		await Promise.all(
			TABLES.map(async (config) => [config.table, await rewriteTable(config)] as const)
		)
	);
	const homepageSettings = await rewriteHomepageSettings();

	console.log(JSON.stringify({ tables: tableResults, homepageSettings }, null, 2));
	await sql.end();
}

main().catch(async (error) => {
	console.error(error);
	await sql.end({ timeout: 0 }).catch(() => undefined);
	process.exit(1);
});
