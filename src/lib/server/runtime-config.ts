import {
	inspectRuntimeConfig,
	resolveRuntimeOriginFromValues,
	type RuntimeConfigHealth,
	type RuntimeConfigOptions
} from '$lib/config/runtime-config-core';
import { getRuntimeConfigValues, readSecretFile } from '$lib/server/runtime-secrets';

export type {
	RuntimeConfigHealth,
	RuntimeConfigInventoryEntry,
	RuntimeConfigIssue,
	RuntimeConfigOptions
} from '$lib/config/runtime-config-core';

export function getRuntimeConfigHealth(options: RuntimeConfigOptions = {}): RuntimeConfigHealth {
	return inspectRuntimeConfig(getRuntimeConfigValues(), { ...options, readFile: readSecretFile });
}

export function resolveRuntimeOrigin(): string | undefined {
	const values = getRuntimeConfigValues();

	return resolveRuntimeOriginFromValues(
		{
			...values,
			ORIGIN: process.env.ORIGIN ?? values.ORIGIN,
			RAILWAY_PUBLIC_DOMAIN: process.env.RAILWAY_PUBLIC_DOMAIN ?? values.RAILWAY_PUBLIC_DOMAIN
		},
		{ readFile: readSecretFile }
	);
}

export function assertProductionRuntimeConfig(): void {
	if (process.env.SKIP_PRODUCTION_RUNTIME_CONFIG_ASSERTION === '1') {
		return;
	}

	const health = getRuntimeConfigHealth({ enforceProduction: true });
	if (health.ok) return;

	const lines = [
		'Production runtime configuration is invalid.',
		...health.missing.map((issue) => `Missing ${issue.key}: ${issue.message}`),
		...health.invalid.map((issue) => `Invalid ${issue.key}: ${issue.message}`)
	];

	throw new Error(lines.join(' '));
}

export function inspectRuntimeConfigForTests(
	values: Record<string, string | undefined>,
	options: RuntimeConfigOptions = {}
): RuntimeConfigHealth {
	return inspectRuntimeConfig(values, options);
}
