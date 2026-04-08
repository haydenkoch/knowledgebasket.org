import { defineConfig } from 'drizzle-kit';
import { readFileSync } from 'node:fs';
import { resolveRuntimeConfigValue } from './src/lib/config/runtime-secrets';

const databaseUrl = resolveRuntimeConfigValue(process.env, 'DATABASE_URL', {
	readFile: (path) => readFileSync(path, 'utf8')
}).value;

if (!databaseUrl) throw new Error('DATABASE_URL is not set');

const isDeployEnvironment =
	process.env.CI === 'true' ||
	Boolean(process.env.RAILWAY_ENVIRONMENT_NAME) ||
	Boolean(process.env.RAILWAY_SERVICE_NAME);

export default defineConfig({
	schema: './src/lib/server/db/schema/index.ts',
	dialect: 'postgresql',
	dbCredentials: { url: databaseUrl },
	verbose: !isDeployEnvironment,
	strict: true
});
