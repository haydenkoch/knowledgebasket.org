import { describe, expect, it } from 'vitest';
import { inspectRuntimeConfigForTests } from '../src/lib/server/runtime-config';

describe('runtime config validation', () => {
	it('accepts a complete production config and preserves optional observability warnings', () => {
		const result = inspectRuntimeConfigForTests(
			{
				DATABASE_URL: 'postgres://kb:secret@example.com:5432/kb',
				ORIGIN: 'https://kb.example.com',
				BETTER_AUTH_SECRET: '12345678901234567890123456789012',
				SMTP_HOST: 'smtp.example.com',
				SMTP_PORT: '465',
				SMTP_SECURE: 'true',
				SMTP_REQUIRE_TLS: 'false',
				SMTP_FROM: '"Knowledge Basket" <noreply@example.com>',
				MEILISEARCH_HOST: 'https://search.example.com',
				MEILISEARCH_API_KEY: 'search-secret',
				MINIO_ENDPOINT: 'https://s3.example.com',
				MINIO_ACCESS_KEY: 'access-key',
				MINIO_SECRET_KEY: 'secret-key',
				MINIO_BUCKET: 'kb-uploads',
				REINDEX_SECRET: '12345678901234567890123456789012',
				SOURCE_OPS_SECRET: '12345678901234567890123456789012',
				LOG_LEVEL: 'info',
				SENTRY_DSN: 'https://key@example.ingest.sentry.io/123'
			},
			{ enforceProduction: true }
		);

		expect(result.ok).toBe(true);
		expect(result.missing).toEqual([]);
		expect(result.invalid).toEqual([]);
	});

	it('accepts Railway public domain as an ORIGIN fallback in production', () => {
		const result = inspectRuntimeConfigForTests(
			{
				DATABASE_URL: 'postgres://kb:secret@example.com:5432/kb',
				RAILWAY_PUBLIC_DOMAIN: 'kb-production.up.railway.app',
				BETTER_AUTH_SECRET: '12345678901234567890123456789012',
				SMTP_HOST: 'smtp.example.com',
				SMTP_PORT: '465',
				SMTP_SECURE: 'true',
				SMTP_REQUIRE_TLS: 'false',
				SMTP_FROM: '"Knowledge Basket" <noreply@example.com>',
				MEILISEARCH_HOST: 'https://search.example.com',
				MEILISEARCH_API_KEY: 'search-secret',
				MINIO_ENDPOINT: 'https://s3.example.com',
				MINIO_ACCESS_KEY: 'access-key',
				MINIO_SECRET_KEY: 'secret-key',
				MINIO_BUCKET: 'kb-uploads',
				REINDEX_SECRET: '12345678901234567890123456789012',
				SOURCE_OPS_SECRET: '12345678901234567890123456789012',
				SENTRY_DSN: 'https://key@example.ingest.sentry.io/123'
			},
			{ enforceProduction: true }
		);

		expect(result.ok).toBe(true);
		expect(result.missing).toEqual([]);
		expect(result.invalid).toEqual([]);
		expect(result.warnings.map((issue) => issue.key)).toContain('ORIGIN');
	});

	it('fails production validation when core auth, search, storage, and email settings are missing', () => {
		const result = inspectRuntimeConfigForTests(
			{
				DATABASE_URL: 'postgres://kb:secret@example.com:5432/kb',
				ORIGIN: 'http://localhost:5173',
				BETTER_AUTH_SECRET: 'short',
				LOG_LEVEL: 'verbose'
			},
			{ enforceProduction: true }
		);

		expect(result.ok).toBe(false);
		expect(result.missing.map((issue) => issue.key)).toEqual(
			expect.arrayContaining([
				'SMTP_HOST',
				'SMTP_FROM',
				'MEILISEARCH_HOST',
				'MEILISEARCH_API_KEY',
				'MINIO_ENDPOINT',
				'REINDEX_SECRET',
				'SOURCE_OPS_SECRET'
			])
		);
		expect(result.invalid.map((issue) => issue.key)).toEqual(
			expect.arrayContaining(['ORIGIN', 'BETTER_AUTH_SECRET', 'SMTP_PORT', 'LOG_LEVEL'])
		);
	});
});
