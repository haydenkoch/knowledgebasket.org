import { readFileSync } from 'node:fs';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import {
	resolveRuntimeConfigSnapshot,
	resolveRuntimeConfigValue,
	type RuntimeConfigKey
} from '$lib/config/runtime-secrets';

export function readSecretFile(path: string): string {
	return readFileSync(path, 'utf8');
}

export function getRuntimeConfigValues(): Record<string, string | undefined> {
	return { ...process.env, ...env, ...publicEnv };
}

export function getResolvedRuntimeConfigSnapshot(
	values: Record<string, string | undefined> = getRuntimeConfigValues()
) {
	return resolveRuntimeConfigSnapshot(values, { readFile: readSecretFile });
}

export function readRuntimeConfigValue(
	key: RuntimeConfigKey,
	values: Record<string, string | undefined> = getRuntimeConfigValues()
): string | undefined {
	return resolveRuntimeConfigValue(values, key, { readFile: readSecretFile }).value;
}
