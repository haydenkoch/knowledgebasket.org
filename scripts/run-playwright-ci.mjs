#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

function getPnpmExecutable() {
	return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

const project = process.env.PLAYWRIGHT_PROJECT?.trim();
const args = ['exec', 'playwright', 'test'];

if (project) {
	args.push('--project', project);
}

console.log(`[playwright-ci] project=${project || 'all'}`);

const result = spawnSync(getPnpmExecutable(), args, {
	cwd: process.cwd(),
	env: process.env,
	stdio: 'inherit'
});

process.exit(result.status ?? 1);
