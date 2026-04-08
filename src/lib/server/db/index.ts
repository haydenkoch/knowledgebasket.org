import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { readRuntimeConfigValue } from '$lib/server/runtime-secrets';

const databaseUrl = readRuntimeConfigValue('DATABASE_URL');
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

const client = postgres(databaseUrl);

export const db = drizzle(client, { schema });

export type DbExecutor = Pick<typeof db, 'select' | 'insert' | 'update' | 'delete'>;
