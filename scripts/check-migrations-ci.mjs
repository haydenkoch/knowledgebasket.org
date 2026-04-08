#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const repoRoot = process.cwd();

const schemaPatterns = ['src/lib/server/db/schema/', 'src/lib/server/db/auth.schema.ts'];

const migrationPatterns = ['drizzle/', 'drizzle/meta/'];

function runGit(args, { allowFailure = false } = {}) {
	try {
		return execFileSync('git', args, {
			cwd: repoRoot,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe']
		}).trim();
	} catch (error) {
		if (allowFailure) return '';
		throw error;
	}
}

function getChangedFiles() {
	const baseRef = process.env.CI_GIT_BASE_REF?.trim();
	if (baseRef) {
		const diff = runGit(['diff', '--name-only', `origin/${baseRef}...HEAD`], {
			allowFailure: true
		});
		if (diff) return diff.split('\n').filter(Boolean);
	}

	const baseSha = process.env.CI_GIT_BASE_SHA?.trim();
	if (baseSha && !/^0+$/.test(baseSha)) {
		const diff = runGit(['diff', '--name-only', `${baseSha}...HEAD`], { allowFailure: true });
		if (diff) return diff.split('\n').filter(Boolean);
	}

	const previousCommitDiff = runGit(['diff', '--name-only', 'HEAD^...HEAD'], {
		allowFailure: true
	});
	if (previousCommitDiff) return previousCommitDiff.split('\n').filter(Boolean);

	return runGit(['diff', '--name-only', '--cached'], { allowFailure: true })
		.split('\n')
		.filter(Boolean);
}

const changedFiles = [...new Set(getChangedFiles())].filter(Boolean);

if (changedFiles.length === 0) {
	console.log('[migrations-ci] No changed files detected; skipping.');
	process.exit(0);
}

const schemaChanged = changedFiles.some((file) =>
	schemaPatterns.some((pattern) => file === pattern || file.startsWith(pattern))
);

if (!schemaChanged) {
	console.log('[migrations-ci] No schema-affecting files changed.');
	process.exit(0);
}

const migrationChanged = changedFiles.some((file) =>
	migrationPatterns.some((pattern) => file === pattern || file.startsWith(pattern))
);

if (migrationChanged) {
	console.log('[migrations-ci] Schema changes include committed migration artifacts.');
	process.exit(0);
}

console.error(
	'[migrations-ci] Schema-affecting changes were detected without a committed migration.'
);
console.error('[migrations-ci] Update drizzle migrations before merging this change.');
process.exit(1);
