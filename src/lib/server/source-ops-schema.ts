import {
	clearSchemaHealthCache,
	getSchemaHealth,
	type SchemaHealth,
	type SchemaRequirement
} from '$lib/server/schema-health';

export type SourceOpsSchemaHealth = SchemaHealth;

const REQUIRED_COLUMNS = [
	{
		type: 'column',
		tableName: 'canonical_records',
		columnName: 'source_snapshot'
	}
] as const satisfies readonly SchemaRequirement[];

export async function getSourceOpsSchemaHealth(): Promise<SourceOpsSchemaHealth> {
	return getSchemaHealth({
		cacheKey: 'source-ops',
		requirements: REQUIRED_COLUMNS,
		buildMessage: (missing) =>
			`Source review is running in compatibility mode until the latest database migration is applied. Missing: ${missing.join(', ')}. Merge history will use current published content as its fallback baseline in the meantime.`
	});
}

export async function hasCanonicalSourceSnapshotColumn(): Promise<boolean> {
	const health = await getSourceOpsSchemaHealth();
	return !health.missing.includes('canonical_records.source_snapshot');
}

export async function assertSourceOpsSchemaHealthy(): Promise<void> {
	const health = await getSourceOpsSchemaHealth();
	if (!health.ok) {
		throw new Error(
			health.message ?? 'Source review needs a database update before it can publish changes.'
		);
	}
}

export function isMissingSourceOpsColumnError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error ?? '');
	return (
		message.includes('source_snapshot') &&
		(message.includes('does not exist') || message.includes('column'))
	);
}

export function clearSourceOpsSchemaHealthCache() {
	clearSchemaHealthCache('source-ops');
}
