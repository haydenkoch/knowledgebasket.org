import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

type RuntimeConfigIssue = {
	key: string;
	message: string;
};

export type RuntimeConfigHealth = {
	ok: boolean;
	enforceProduction: boolean;
	missing: RuntimeConfigIssue[];
	invalid: RuntimeConfigIssue[];
	warnings: RuntimeConfigIssue[];
};

type RuntimeConfigOptions = {
	enforceProduction: boolean;
};

function isBlank(value: string | undefined): boolean {
	return !value?.trim();
}

function stripTrailingSlash(value: string): string {
	return value.replace(/\/+$/, '');
}

function addMissing(target: RuntimeConfigIssue[], key: string, message: string) {
	target.push({ key, message });
}

function addInvalid(target: RuntimeConfigIssue[], key: string, message: string) {
	target.push({ key, message });
}

function addWarning(target: RuntimeConfigIssue[], key: string, message: string) {
	target.push({ key, message });
}

function readBoolean(value: string | undefined, fallback = false): boolean {
	if (!value) return fallback;

	switch (value.trim().toLowerCase()) {
		case '1':
		case 'true':
		case 'yes':
		case 'on':
			return true;
		case '0':
		case 'false':
		case 'no':
		case 'off':
			return false;
		default:
			return fallback;
	}
}

function isLikelyLocalhost(hostname: string): boolean {
	return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
}

function resolveRuntimeOriginFromValues(
	values: Record<string, string | undefined>
): string | undefined {
	if (!isBlank(values.ORIGIN)) {
		return stripTrailingSlash(values.ORIGIN!.trim());
	}

	if (isBlank(values.RAILWAY_PUBLIC_DOMAIN)) {
		return undefined;
	}

	const railwayPublicDomain = stripTrailingSlash(values.RAILWAY_PUBLIC_DOMAIN!.trim());
	return /^https?:\/\//i.test(railwayPublicDomain)
		? railwayPublicDomain
		: `https://${railwayPublicDomain}`;
}

function validateOrigin(values: Record<string, string | undefined>): string | null {
	const origin = resolveRuntimeOriginFromValues(values);
	if (isBlank(origin)) {
		return 'ORIGIN is required unless Railway provides RAILWAY_PUBLIC_DOMAIN.';
	}

	try {
		const parsed = new URL(origin!);
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
			return 'ORIGIN must use http or https.';
		}
		if (isLikelyLocalhost(parsed.hostname)) {
			return 'ORIGIN must not point at localhost in production.';
		}
		return null;
	} catch {
		return 'ORIGIN must be a valid absolute URL.';
	}
}

function validateSecret(secret: string | undefined, key: string): string | null {
	if (isBlank(secret)) return `${key} is required.`;
	if (secret!.trim().length < 32) return `${key} must be at least 32 characters.`;
	return null;
}

function validatePort(port: string | undefined, key: string): string | null {
	if (isBlank(port)) return `${key} is required.`;
	const parsed = Number.parseInt(port!, 10);
	if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
		return `${key} must be a valid TCP port.`;
	}
	return null;
}

function validateLogLevel(logLevel: string | undefined): string | null {
	if (isBlank(logLevel)) return null;
	const normalized = logLevel!.trim().toLowerCase();
	return ['debug', 'info', 'warn', 'error'].includes(normalized)
		? null
		: 'LOG_LEVEL must be one of debug, info, warn, or error.';
}

function validateAbsoluteUrl(value: string | undefined, key: string): string | null {
	if (isBlank(value)) return `${key} is required.`;

	try {
		const parsed = new URL(value!.trim());
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
			return `${key} must use http or https.`;
		}
		if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
			return `${key} must not include a trailing slash.`;
		}
		if (value!.trim().endsWith('/')) {
			return `${key} must not include a trailing slash.`;
		}
		return null;
	} catch {
		return `${key} must be a valid absolute URL.`;
	}
}

function validateProductionRuntimeConfig(
	values: Record<string, string | undefined>,
	options: RuntimeConfigOptions
): RuntimeConfigHealth {
	const missing: RuntimeConfigIssue[] = [];
	const invalid: RuntimeConfigIssue[] = [];
	const warnings: RuntimeConfigIssue[] = [];

	if (options.enforceProduction) {
		if (isBlank(values.DATABASE_URL)) {
			addMissing(missing, 'DATABASE_URL', 'DATABASE_URL is required.');
		}

		const originIssue = validateOrigin(values);
		if (originIssue) addInvalid(invalid, 'ORIGIN', originIssue);
		if (isBlank(values.ORIGIN) && !isBlank(values.RAILWAY_PUBLIC_DOMAIN)) {
			addWarning(
				warnings,
				'ORIGIN',
				'Using Railway public domain as the runtime origin fallback. Set ORIGIN explicitly before switching to a custom domain or configuring OAuth callbacks.'
			);
		}

		const authSecretIssue = validateSecret(values.BETTER_AUTH_SECRET, 'BETTER_AUTH_SECRET');
		if (authSecretIssue) addInvalid(invalid, 'BETTER_AUTH_SECRET', authSecretIssue);

		for (const key of [
			'SMTP_HOST',
			'SMTP_FROM',
			'MEILISEARCH_HOST',
			'MEILISEARCH_API_KEY',
			'MINIO_ENDPOINT',
			'MINIO_ACCESS_KEY',
			'MINIO_SECRET_KEY',
			'MINIO_BUCKET',
			'REINDEX_SECRET',
			'SOURCE_OPS_SECRET'
		]) {
			if (isBlank(values[key])) {
				addMissing(missing, key, `${key} is required.`);
			}
		}

		if (isBlank(values.PUBLIC_ASSET_BASE_URL)) {
			addMissing(missing, 'PUBLIC_ASSET_BASE_URL', 'PUBLIC_ASSET_BASE_URL is required.');
		} else {
			const publicAssetBaseUrlIssue = validateAbsoluteUrl(
				values.PUBLIC_ASSET_BASE_URL,
				'PUBLIC_ASSET_BASE_URL'
			);
			if (publicAssetBaseUrlIssue) {
				addInvalid(invalid, 'PUBLIC_ASSET_BASE_URL', publicAssetBaseUrlIssue);
			}
		}

		const smtpPortIssue = validatePort(values.SMTP_PORT, 'SMTP_PORT');
		if (smtpPortIssue) addInvalid(invalid, 'SMTP_PORT', smtpPortIssue);

		if (!readBoolean(values.SMTP_SECURE) && !readBoolean(values.SMTP_REQUIRE_TLS)) {
			addWarning(
				warnings,
				'SMTP_SECURE',
				'Production email should enable SMTPS (`SMTP_SECURE=true`) or STARTTLS (`SMTP_REQUIRE_TLS=true`).'
			);
		}
	}

	const logLevelIssue = validateLogLevel(values.LOG_LEVEL);
	if (logLevelIssue) addInvalid(invalid, 'LOG_LEVEL', logLevelIssue);

	if (isBlank(values.SENTRY_DSN) && isBlank(values.PUBLIC_SENTRY_DSN)) {
		addWarning(
			warnings,
			'SENTRY_DSN',
			'Sentry is not configured; production error tracking will rely on stdout and webhooks only.'
		);
	}

	if (isBlank(values.ERROR_WEBHOOK_URL)) {
		addWarning(
			warnings,
			'ERROR_WEBHOOK_URL',
			'ERROR_WEBHOOK_URL is not configured; structured server errors will not fan out to an alerting endpoint.'
		);
	}

	return {
		ok: missing.length === 0 && invalid.length === 0,
		enforceProduction: options.enforceProduction,
		missing,
		invalid,
		warnings
	};
}

export function getRuntimeConfigHealth(options: RuntimeConfigOptions): RuntimeConfigHealth {
	return validateProductionRuntimeConfig({ ...env, ...publicEnv }, options);
}

export function resolveRuntimeOrigin(): string | undefined {
	return resolveRuntimeOriginFromValues(env);
}

export function assertProductionRuntimeConfig(): void {
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
	options: RuntimeConfigOptions
): RuntimeConfigHealth {
	return validateProductionRuntimeConfig(values, options);
}
