import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';

export type SchemaRequirement =
	| {
			type: 'table';
			tableName: string;
	  }
	| {
			type: 'column';
			tableName: string;
			columnName: string;
	  };

export type SchemaHealth = {
	ok: boolean;
	missing: string[];
	message: string | null;
};

type SchemaHealthConfig = {
	cacheKey: string;
	requirements: readonly SchemaRequirement[];
	buildMessage: (missing: string[]) => string;
};

const schemaHealthCache = new Map<string, Promise<SchemaHealth>>();

function requirementKey(requirement: SchemaRequirement): string {
	return requirement.type === 'table'
		? requirement.tableName
		: `${requirement.tableName}.${requirement.columnName}`;
}

export function clearSchemaHealthCache(cacheKey?: string) {
	if (cacheKey) {
		schemaHealthCache.delete(cacheKey);
		return;
	}

	schemaHealthCache.clear();
}

export async function getSchemaHealth(config: SchemaHealthConfig): Promise<SchemaHealth> {
	const cached = schemaHealthCache.get(config.cacheKey);
	if (cached) return cached;

	const promise = (async () => {
		const tableRequirements = config.requirements.filter(
			(requirement): requirement is Extract<SchemaRequirement, { type: 'table' }> =>
				requirement.type === 'table'
		);
		const columnRequirements = config.requirements.filter(
			(requirement): requirement is Extract<SchemaRequirement, { type: 'column' }> =>
				requirement.type === 'column'
		);

		const [tableRows, columnRows] = await Promise.all([
			tableRequirements.length > 0
				? db.execute(
						sql<{ table_name: string }[]>`
							select table_name
							from information_schema.tables
							where table_schema = 'public'
								and (${sql.join(
									tableRequirements.map(
										(requirement) => sql`table_name = ${requirement.tableName}`
									),
									sql` or `
								)})
						`
					)
				: Promise.resolve([] as Array<{ table_name: string }>),
			columnRequirements.length > 0
				? db.execute(
						sql<{ table_name: string; column_name: string }[]>`
							select table_name, column_name
							from information_schema.columns
							where table_schema = 'public'
								and (${sql.join(
									columnRequirements.map(
										(requirement) =>
											sql`(table_name = ${requirement.tableName} and column_name = ${requirement.columnName})`
									),
									sql` or `
								)})
						`
					)
				: Promise.resolve([] as Array<{ table_name: string; column_name: string }>)
		]);

		const existingTables = (tableRows as Array<{ table_name: string }>).map(
			(row) => row.table_name
		);
		const existingColumns = (columnRows as Array<{ table_name: string; column_name: string }>).map(
			(row) => `${row.table_name}.${row.column_name}`
		);

		const existing = new Set<string>([...existingTables, ...existingColumns]);

		const missing = config.requirements
			.map((requirement) => requirementKey(requirement))
			.filter((key) => !existing.has(key));

		return {
			ok: missing.length === 0,
			missing,
			message: missing.length > 0 ? config.buildMessage(missing) : null
		};
	})();

	schemaHealthCache.set(config.cacheKey, promise);

	try {
		return await promise;
	} catch (error) {
		schemaHealthCache.delete(config.cacheKey);
		throw error;
	}
}
