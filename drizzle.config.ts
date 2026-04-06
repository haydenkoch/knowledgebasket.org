import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const isDeployEnvironment =
	process.env.CI === 'true' ||
	Boolean(process.env.RAILWAY_ENVIRONMENT_NAME) ||
	Boolean(process.env.RAILWAY_SERVICE_NAME);

export default defineConfig({
	schema: './src/lib/server/db/schema/index.ts',
	dialect: 'postgresql',
	dbCredentials: { url: process.env.DATABASE_URL },
	verbose: !isDeployEnvironment,
	strict: true
});
