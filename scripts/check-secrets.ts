import { readFileSync } from 'node:fs';
import process from 'node:process';
import { config as loadDotenv } from 'dotenv';
import { inspectRuntimeConfig } from '../src/lib/config/runtime-config-core';
import { detectDeploymentEnvironment } from '../src/lib/config/runtime-secrets';

function parseArgs(argv: string[]) {
	const args = new Map<string, string>();

	for (const arg of argv) {
		if (!arg.startsWith('--')) continue;

		const [key, value] = arg.slice(2).split('=');
		if (key) args.set(key, value ?? 'true');
	}

	return {
		environment: args.get('environment'),
		envFile: args.get('env-file')
	};
}

function loadEnvironment(envFile: string | undefined) {
	if (envFile) {
		loadDotenv({ path: envFile, override: false });
		return;
	}

	loadDotenv({ override: false });
}

function printIssueGroup(label: string, issues: { key: string; message: string }[]) {
	if (issues.length === 0) return;

	console.log(`\n${label}:`);
	for (const issue of issues) {
		console.log(`- ${issue.key}: ${issue.message}`);
	}
}

const { environment, envFile } = parseArgs(process.argv.slice(2));
loadEnvironment(envFile);

const mergedValues = {
	...process.env,
	...(environment ? { KB_ENVIRONMENT: environment } : {})
};

const detectedEnvironment = detectDeploymentEnvironment(mergedValues);
const health = inspectRuntimeConfig(mergedValues, {
	enforceProduction: detectedEnvironment === 'staging' || detectedEnvironment === 'production',
	readFile: (path) => readFileSync(path, 'utf8')
});

console.log(`Secrets check for ${health.environment}`);

if (envFile) {
	console.log(`Loaded dotenv file: ${envFile}`);
}

const required = health.inventory.filter((entry) => entry.required);
const configured = required.filter((entry) => entry.configured);

console.log(`Required entries configured: ${configured.length}/${required.length}`);

console.log('\nResolved sources:');
for (const entry of required) {
	console.log(
		`- ${entry.key}: ${entry.configured ? 'configured' : 'missing'} via ${entry.source} (${entry.category}, ${entry.classification})`
	);
}

printIssueGroup('Missing', health.missing);
printIssueGroup('Invalid', health.invalid);
printIssueGroup('Warnings', health.warnings);

if (!health.ok) {
	process.exitCode = 1;
}
