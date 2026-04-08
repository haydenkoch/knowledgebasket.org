#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const testsRoot = path.join(repoRoot, 'tests');
const group = process.argv[2];
const listOnly = process.argv.includes('--list');

const serverBackedTests = new Set([
	'tests/admin-auth.test.ts',
	'tests/health-api.test.ts',
	'tests/manifest-route.test.ts',
	'tests/search-api.test.ts',
	'tests/smoke.test.ts',
	'tests/toolbox-document-viewer.test.ts'
]);

const searchTests = new Map([
	['search-indexed', ['tests/search-indexed-mode.test.ts']],
	['search-degraded', ['tests/search-degraded-mode.test.ts']]
]);

function getPnpmExecutable() {
	return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

function collectVitestFiles(dir) {
	const entries = readdirSync(dir, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const entryPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...collectVitestFiles(entryPath));
			continue;
		}

		if (!entry.name.endsWith('.test.ts')) continue;
		files.push(path.relative(repoRoot, entryPath).split(path.sep).join('/'));
	}

	return files.sort();
}

function parseShardValue(name, fallback) {
	const value = Number(process.env[name] ?? fallback);
	if (!Number.isInteger(value) || value < 1) {
		throw new Error(`${name} must be a positive integer. Received: ${process.env[name]}`);
	}
	return value;
}

function shardFiles(files) {
	const shardIndex = parseShardValue('CI_SHARD_INDEX', 1);
	const shardTotal = parseShardValue('CI_SHARD_TOTAL', 1);

	if (shardIndex > shardTotal) {
		throw new Error(
			`CI_SHARD_INDEX (${shardIndex}) cannot be greater than CI_SHARD_TOTAL (${shardTotal}).`
		);
	}

	return {
		shardIndex,
		shardTotal,
		files: files.filter((_, index) => index % shardTotal === shardIndex - 1)
	};
}

function resolveFiles(selectedGroup) {
	const allTests = collectVitestFiles(testsRoot);

	if (selectedGroup === 'unit') {
		return shardFiles(
			allTests.filter(
				(file) =>
					!serverBackedTests.has(file) &&
					!searchTests.get('search-indexed')?.includes(file) &&
					!searchTests.get('search-degraded')?.includes(file)
			)
		);
	}

	if (selectedGroup === 'http') {
		return shardFiles([...serverBackedTests].sort());
	}

	if (searchTests.has(selectedGroup)) {
		return {
			shardIndex: 1,
			shardTotal: 1,
			files: searchTests.get(selectedGroup) ?? []
		};
	}

	throw new Error(
		`Unknown Vitest CI group "${selectedGroup}". Use one of: unit, http, search-indexed, search-degraded.`
	);
}

function runVitest(files) {
	const result = spawnSync(
		getPnpmExecutable(),
		['exec', 'vitest', 'run', '--maxWorkers=1', ...files],
		{
			cwd: repoRoot,
			env: process.env,
			stdio: 'inherit'
		}
	);

	process.exit(result.status ?? 1);
}

if (!group) {
	throw new Error(
		'Usage: node scripts/run-vitest-ci.mjs <unit|http|search-indexed|search-degraded> [--list]'
	);
}

const { files, shardIndex, shardTotal } = resolveFiles(group);

if (files.length === 0) {
	throw new Error(
		`No test files selected for group "${group}" on shard ${shardIndex}/${shardTotal}.`
	);
}

console.log(`[vitest-ci] group=${group} shard=${shardIndex}/${shardTotal}`);
for (const file of files) {
	console.log(`- ${file}`);
}

if (!listOnly) {
	runVitest(files);
}
