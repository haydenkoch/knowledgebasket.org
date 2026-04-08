import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { inspectRuntimeConfigForTests } from '../src/lib/server/runtime-config';

describe('runtime config validation', () => {
	it('accepts a complete production config and preserves optional observability warnings', () => {
		const result = inspectRuntimeConfigForTests(
			{
				KB_ENVIRONMENT: 'production',
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
				PUBLIC_ASSET_BASE_URL: 'https://assets.example.com/kb-uploads',
				REINDEX_SECRET: '12345678901234567890123456789012',
				SOURCE_OPS_SECRET: '12345678901234567890123456789012',
				LOG_LEVEL: 'info',
				SENTRY_DSN: 'https://key@example.ingest.sentry.io/123'
			},
			{ enforceProduction: true }
		);

		expect(result.ok).toBe(true);
		expect(result.environment).toBe('production');
		expect(result.missing).toEqual([]);
		expect(result.invalid).toEqual([]);
	});

	it('accepts Railway public domain as an ORIGIN fallback in production', () => {
		const result = inspectRuntimeConfigForTests(
			{
				KB_ENVIRONMENT: 'production',
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
				PUBLIC_ASSET_BASE_URL: 'https://assets.example.com/kb-uploads',
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
				KB_ENVIRONMENT: 'production',
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
				'PUBLIC_ASSET_BASE_URL',
				'REINDEX_SECRET',
				'SOURCE_OPS_SECRET'
			])
		);
		expect(result.invalid.map((issue) => issue.key)).toEqual(
			expect.arrayContaining(['ORIGIN', 'BETTER_AUTH_SECRET', 'SMTP_PORT', 'LOG_LEVEL'])
		);
	});

	it('fails when PUBLIC_ASSET_BASE_URL is not an absolute URL without a trailing slash', () => {
		const result = inspectRuntimeConfigForTests(
			{
				KB_ENVIRONMENT: 'production',
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
				PUBLIC_ASSET_BASE_URL: 'https://assets.example.com/kb-uploads/',
				REINDEX_SECRET: '12345678901234567890123456789012',
				SOURCE_OPS_SECRET: '12345678901234567890123456789012'
			},
			{ enforceProduction: true }
		);

		expect(result.ok).toBe(false);
		expect(result.invalid).toEqual(
			expect.arrayContaining([expect.objectContaining({ key: 'PUBLIC_ASSET_BASE_URL' })])
		);
	});

	it('flags partial Google OAuth configuration and missing PostHog analytics in production', () => {
		const result = inspectRuntimeConfigForTests(
			{
				KB_ENVIRONMENT: 'production',
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
				PUBLIC_ASSET_BASE_URL: 'https://assets.example.com/kb-uploads',
				REINDEX_SECRET: '12345678901234567890123456789012',
				SOURCE_OPS_SECRET: '12345678901234567890123456789012',
				SENTRY_DSN: 'https://key@example.ingest.sentry.io/123',
				GOOGLE_CLIENT_ID: 'google-client-id'
			},
			{ enforceProduction: true }
		);

		expect(result.ok).toBe(false);
		expect(result.invalid).toEqual(
			expect.arrayContaining([expect.objectContaining({ key: 'GOOGLE_CLIENT_SECRET' })])
		);
		expect(result.warnings).toEqual(
			expect.arrayContaining([expect.objectContaining({ key: 'PUBLIC_POSTHOG_KEY' })])
		);
	});

	it('accepts file-backed secrets for staging and records file sources', () => {
		const tempDir = mkdtempSync(join(tmpdir(), 'kb-runtime-config-'));
		const authSecretPath = join(tempDir, 'better-auth-secret');
		const reindexSecretPath = join(tempDir, 'reindex-secret');
		const sourceOpsSecretPath = join(tempDir, 'source-ops-secret');
		const minioSecretPath = join(tempDir, 'minio-secret');
		const meiliSecretPath = join(tempDir, 'meili-secret');

		writeFileSync(authSecretPath, '12345678901234567890123456789012\n');
		writeFileSync(reindexSecretPath, 'abcdefghijklmnopqrstuvwxyz123456\n');
		writeFileSync(sourceOpsSecretPath, 'abcdefghijklmnopqrstuvwxyz654321\n');
		writeFileSync(minioSecretPath, 'abcdefghijklmnopqrstuvwxyz1234567890\n');
		writeFileSync(meiliSecretPath, 'abcdefghijklmno1234567890\n');

		const result = inspectRuntimeConfigForTests(
			{
				KB_ENVIRONMENT: 'staging',
				DATABASE_URL: 'postgres://kb:secret@db.staging.internal:5432/kb',
				ORIGIN: 'https://staging.kb.example.com',
				BETTER_AUTH_SECRET_FILE: authSecretPath,
				SMTP_HOST: 'smtp.example.com',
				SMTP_PORT: '587',
				SMTP_SECURE: 'false',
				SMTP_REQUIRE_TLS: 'true',
				SMTP_FROM: '"Knowledge Basket" <noreply@example.com>',
				MEILISEARCH_HOST: 'https://search-staging.example.com',
				MEILISEARCH_API_KEY_FILE: meiliSecretPath,
				MINIO_ENDPOINT: 'https://s3-staging.example.com',
				MINIO_ACCESS_KEY: 'staging-access-key',
				MINIO_SECRET_KEY_FILE: minioSecretPath,
				MINIO_BUCKET: 'kb-staging-uploads',
				PUBLIC_ASSET_BASE_URL: 'https://assets-staging.example.com/kb-staging-uploads',
				REINDEX_SECRET_FILE: reindexSecretPath,
				SOURCE_OPS_SECRET_FILE: sourceOpsSecretPath
			},
			{
				readFile: (path) => readFileSync(path, 'utf8')
			}
		);

		expect(result.ok).toBe(true);
		expect(result.environment).toBe('staging');
		expect(result.inventory.find((entry) => entry.key === 'BETTER_AUTH_SECRET')?.source).toBe(
			'file'
		);
		expect(result.invalid).toEqual([]);
	});

	it('accepts the slimmer CI contract', () => {
		const result = inspectRuntimeConfigForTests({
			KB_ENVIRONMENT: 'ci',
			DATABASE_URL: 'postgres://kb:secret@127.0.0.1:5432/kb',
			ORIGIN: 'http://127.0.0.1:4173',
			BETTER_AUTH_SECRET: '12345678901234567890123456789012',
			PUBLIC_ASSET_BASE_URL: 'http://127.0.0.1:4173/assets',
			REINDEX_SECRET: '12345678901234567890123456789012',
			SOURCE_OPS_SECRET: '12345678901234567890123456789012'
		});

		expect(result.ok).toBe(true);
		expect(result.environment).toBe('ci');
		expect(result.missing).toEqual([]);
	});
});
