#!/usr/bin/env node
import 'dotenv/config';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const cwd = process.cwd();

const candidateSourceSeedPaths = [
	join(cwd, 'source-ops', 'data', 'seed-sources.json'),
	join(cwd, '..', 'source-ops', 'data', 'seed-sources.json'),
	join(cwd, '..', 'kb-data', 'source-ops', 'data', 'seed-sources.json'),
	join(cwd, '..', '..', 'kb-data', 'source-ops', 'data', 'seed-sources.json')
];

function runStep(label, command, args, { optional = false } = {}) {
	console.log(`\n== ${label} ==`);
	const result = spawnSync(command, args, {
		stdio: 'inherit',
		cwd,
		env: process.env
	});

	if (result.status === 0) return;
	if (optional) {
		console.warn(`${label} skipped.`);
		return;
	}

	process.exit(result.status ?? 1);
}

runStep('Seed events', process.execPath, ['scripts/seed-events.js']);
runStep('Seed non-event coils', process.execPath, ['scripts/seed-coils.js']);

const sourceSeedPath = candidateSourceSeedPaths.find((path) => existsSync(path));
if (sourceSeedPath) {
	runStep('Seed source registry', 'pnpm', ['exec', 'tsx', 'scripts/seed-sources.ts']);
} else {
	console.log('\n== Seed source registry ==');
	console.log(
		'No seed-sources.json found in the expected shared data locations. Skipping source seed.'
	);
}

console.log(
	'\nLaunch seed complete. Reindex search with `POST /api/reindex` or `/admin/settings/search` if Meilisearch is enabled.'
);
