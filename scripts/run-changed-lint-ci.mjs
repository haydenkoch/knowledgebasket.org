#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

const prettierExtensions = new Set([
	'.css',
	'.html',
	'.js',
	'.json',
	'.jsx',
	'.md',
	'.mjs',
	'.svelte',
	'.ts',
	'.tsx',
	'.yaml',
	'.yml'
]);

const eslintExtensions = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.svelte']);

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

function normalizeFiles(files) {
	return [...new Set(files)]
		.filter(Boolean)
		.filter((file) => existsSync(path.join(repoRoot, file)))
		.sort();
}

function selectByExtension(files, allowedExtensions) {
	return files.filter((file) => allowedExtensions.has(path.extname(file)));
}

function runCommand(command, args) {
	const result = spawnSync(command, args, {
		cwd: repoRoot,
		env: process.env,
		stdio: 'inherit'
	});

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

const changedFiles = normalizeFiles(getChangedFiles());

if (changedFiles.length === 0) {
	console.log('[lint-ci] No changed files detected; skipping.');
	process.exit(0);
}

console.log('[lint-ci] Changed files:');
for (const file of changedFiles) {
	console.log(`- ${file}`);
}

const prettierTargets = selectByExtension(changedFiles, prettierExtensions);
if (prettierTargets.length > 0) {
	runCommand('pnpm', ['exec', 'prettier', '--check', ...prettierTargets]);
}

const eslintTargets = selectByExtension(changedFiles, eslintExtensions);
if (eslintTargets.length > 0) {
	runCommand('pnpm', ['exec', 'eslint', ...eslintTargets]);
}
