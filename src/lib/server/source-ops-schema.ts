import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';

export type SourceOpsSchemaHealth = {
	ok: boolean;
	missing: string[];
	message: string | null;
};

const REQUIRED_COLUMNS = [
	{
		tableName: 'canonical_records',
		columnName: 'source_snapshot'
	}
] as const;

let sourceOpsSchemaHealthPromise: Promise<SourceOpsSchemaHealth> | null = null;

export async function getSourceOpsSchemaHealth(): Promise<SourceOpsSchemaHealth> {
	if (!sourceOpsSchemaHealthPromise) {
		sourceOpsSchemaHealthPromise = (async () => {
			const requiredColumnPredicates = REQUIRED_COLUMNS.map(
				(entry) => sql`(table_name = ${entry.tableName} and column_name = ${entry.columnName})`
			);

			const rows = await db.execute(
				sql<{ table_name: string; column_name: string }[]>`
					select table_name, column_name
					from information_schema.columns
					where table_schema = 'public'
						and (${sql.join(requiredColumnPredicates, sql` or `)})
				`
			);

			const existing = new Set(rows.map((row) => `${row.table_name}.${row.column_name}`));
			const missing = REQUIRED_COLUMNS.map(
				(entry) => `${entry.tableName}.${entry.columnName}`
			).filter((key) => !existing.has(key));

			return {
				ok: missing.length === 0,
				missing,
				message:
					missing.length > 0
						? `Source review is running in compatibility mode until the latest database migration is applied. Missing: ${missing.join(', ')}. Merge history will use current published content as its fallback baseline in the meantime.`
						: null
			};
		})();
	}

	return sourceOpsSchemaHealthPromise;
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
