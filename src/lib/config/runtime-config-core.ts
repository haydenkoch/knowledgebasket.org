import {
	type DeploymentEnvironment,
	type RuntimeConfigCategory,
	type RuntimeConfigClassification,
	type RuntimeConfigKey,
	type RuntimeConfigSource,
	type RuntimeConfigVisibility,
	RUNTIME_CONFIG_CATALOG,
	isProductionLikeEnvironment,
	resolveRuntimeConfigSnapshot
} from './runtime-secrets';

export type RuntimeConfigIssue = {
	key: string;
	message: string;
};

export type RuntimeConfigInventoryEntry = {
	key: RuntimeConfigKey;
	category: RuntimeConfigCategory;
	visibility: RuntimeConfigVisibility;
	classification: RuntimeConfigClassification;
	description: string;
	required: boolean;
	configured: boolean;
	source: RuntimeConfigSource;
};

export type RuntimeConfigHealth = {
	ok: boolean;
	environment: DeploymentEnvironment;
	enforceProduction: boolean;
	missing: RuntimeConfigIssue[];
	invalid: RuntimeConfigIssue[];
	warnings: RuntimeConfigIssue[];
	inventory: RuntimeConfigInventoryEntry[];
};

export type RuntimeConfigOptions = {
	enforceProduction?: boolean;
	readFile?: (path: string) => string;
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

export function readBoolean(value: string | undefined, fallback = false): boolean {
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

function looksLikePlaceholder(value: string | undefined): boolean {
	if (!value) return false;

	const normalized = value.trim().toLowerCase();
	if (!normalized) return false;

	return (
		[
			'change-me',
			'changeme',
			'replace-me',
			'placeholder',
			'generate-a-random-32-plus-character-secret',
			'generate-a-random-secret',
			'your-app.up.railway.app',
			'phc_your_project_api_key',
			'pk_your_production_token'
		].includes(normalized) || /(replace[-_ ]me|changeme|placeholder)/i.test(normalized)
	);
}

export function resolveRuntimeOriginFromValues(
	rawValues: Record<string, string | undefined>,
	options: RuntimeConfigOptions = {}
): string | undefined {
	const snapshot = resolveRuntimeConfigSnapshot(rawValues, { readFile: options.readFile });
	const values = snapshot.values;

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

function validateOrigin(
	values: Record<string, string | undefined>,
	environment: DeploymentEnvironment,
	options: RuntimeConfigOptions
): string | null {
	const origin = resolveRuntimeOriginFromValues(values, options);
	if (isBlank(origin)) {
		return 'ORIGIN is required unless Railway provides RAILWAY_PUBLIC_DOMAIN.';
	}

	try {
		const parsed = new URL(origin!);
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
			return 'ORIGIN must use http or https.';
		}
		if (
			environment !== 'development' &&
			environment !== 'test' &&
			environment !== 'ci' &&
			isLikelyLocalhost(parsed.hostname)
		) {
			return 'ORIGIN must not point at localhost outside development or test.';
		}
		return null;
	} catch {
		return 'ORIGIN must be a valid absolute URL.';
	}
}

function validateOpaqueSecret(
	secret: string | undefined,
	key: string,
	environment: DeploymentEnvironment,
	minLength = 32
): string | null {
	if (isBlank(secret)) return `${key} is required.`;
	if (secret!.trim().length < minLength) return `${key} must be at least ${minLength} characters.`;
	if (isProductionLikeEnvironment(environment) && looksLikePlaceholder(secret)) {
		return `${key} must be replaced with a real secret before ${environment}.`;
	}
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

function validateAbsoluteUrl(
	value: string | undefined,
	key: string,
	{ allowLocalhost = true }: { allowLocalhost?: boolean } = {}
): string | null {
	if (isBlank(value)) return `${key} is required.`;

	try {
		const parsed = new URL(value!.trim());
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
			return `${key} must use http or https.`;
		}
		if (!allowLocalhost && isLikelyLocalhost(parsed.hostname)) {
			return `${key} must not point at localhost outside development or test.`;
		}
		if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
			return `${key} must not include a trailing slash.`;
		}
		if (value!.trim().endsWith('/')) {
			return `${key} must not include a trailing slash.`;
		}
		if (!allowLocalhost && looksLikePlaceholder(value)) {
			return `${key} must be replaced with a real ${key.toLowerCase()} before deploy.`;
		}
		return null;
	} catch {
		return `${key} must be a valid absolute URL.`;
	}
}

function validateDatabaseUrl(
	value: string | undefined,
	environment: DeploymentEnvironment
): string | null {
	if (isBlank(value)) return 'DATABASE_URL is required.';

	try {
		const parsed = new URL(value!.trim());
		if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
			return 'DATABASE_URL must use postgres or postgresql.';
		}
		if (isProductionLikeEnvironment(environment) && isLikelyLocalhost(parsed.hostname)) {
			return 'DATABASE_URL must not point at localhost in staging or production.';
		}
		if (isProductionLikeEnvironment(environment) && looksLikePlaceholder(value)) {
			return 'DATABASE_URL must be replaced with a real database connection string before deploy.';
		}
		return null;
	} catch {
		return 'DATABASE_URL must be a valid connection string.';
	}
}

function buildInventory(
	values: Record<string, string | undefined>,
	environment: DeploymentEnvironment,
	options: RuntimeConfigOptions
): RuntimeConfigInventoryEntry[] {
	const snapshot = resolveRuntimeConfigSnapshot(values, { readFile: options.readFile });

	return RUNTIME_CONFIG_CATALOG.map((entry) => ({
		key: entry.key,
		category: entry.category,
		visibility: entry.visibility,
		classification: entry.classification,
		description: entry.description,
		required: (entry.requiredIn as readonly DeploymentEnvironment[]).includes(environment),
		configured: !isBlank(snapshot.values[entry.key]),
		source: snapshot.resolved[entry.key].source
	}));
}

export function inspectRuntimeConfig(
	rawValues: Record<string, string | undefined>,
	options: RuntimeConfigOptions = {}
): RuntimeConfigHealth {
	const snapshot = resolveRuntimeConfigSnapshot(rawValues, { readFile: options.readFile });
	const values = snapshot.values;
	const environment = snapshot.environment;
	const enforceProduction = options.enforceProduction ?? false;
	const strictEnvironment = enforceProduction || isProductionLikeEnvironment(environment);

	const missing: RuntimeConfigIssue[] = [];
	const invalid: RuntimeConfigIssue[] = [];
	const warnings: RuntimeConfigIssue[] = [];

	for (const entry of Object.values(snapshot.resolved)) {
		if (entry.source === 'file_error' && entry.error) {
			addInvalid(invalid, entry.key, entry.error);
		}
	}

	if (strictEnvironment || environment === 'ci') {
		const databaseUrlIssue = validateDatabaseUrl(values.DATABASE_URL, environment);
		if (databaseUrlIssue) addInvalid(invalid, 'DATABASE_URL', databaseUrlIssue);

		const originIssue = validateOrigin(values, environment, options);
		if (originIssue) addInvalid(invalid, 'ORIGIN', originIssue);
		if (isBlank(values.ORIGIN) && !isBlank(values.RAILWAY_PUBLIC_DOMAIN)) {
			addWarning(
				warnings,
				'ORIGIN',
				'Using Railway public domain as the runtime origin fallback. Set ORIGIN explicitly before switching domains or configuring OAuth callbacks.'
			);
		}

		const authSecretIssue = validateOpaqueSecret(
			values.BETTER_AUTH_SECRET,
			'BETTER_AUTH_SECRET',
			environment
		);
		if (authSecretIssue) addInvalid(invalid, 'BETTER_AUTH_SECRET', authSecretIssue);
	}

	if (strictEnvironment) {
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
		] as const) {
			if (isBlank(values[key])) {
				addMissing(missing, key, `${key} is required.`);
			}
		}

		if (isBlank(values.PUBLIC_ASSET_BASE_URL)) {
			addMissing(missing, 'PUBLIC_ASSET_BASE_URL', 'PUBLIC_ASSET_BASE_URL is required.');
		}

		for (const [key, value] of [
			['MINIO_ENDPOINT', values.MINIO_ENDPOINT],
			['MEILISEARCH_HOST', values.MEILISEARCH_HOST],
			['PUBLIC_ASSET_BASE_URL', values.PUBLIC_ASSET_BASE_URL]
		] as const) {
			if (!isBlank(value)) {
				const issue = validateAbsoluteUrl(value, key, { allowLocalhost: false });
				if (issue) addInvalid(invalid, key, issue);
			}
		}

		for (const [key, value, minLength] of [
			['REINDEX_SECRET', values.REINDEX_SECRET, 32],
			['SOURCE_OPS_SECRET', values.SOURCE_OPS_SECRET, 32],
			['MEILISEARCH_API_KEY', values.MEILISEARCH_API_KEY, 12],
			['MINIO_ACCESS_KEY', values.MINIO_ACCESS_KEY, 8],
			['MINIO_SECRET_KEY', values.MINIO_SECRET_KEY, 8]
		] as const) {
			if (!isBlank(value)) {
				const issue = validateOpaqueSecret(value, key, environment, minLength);
				if (issue) addInvalid(invalid, key, issue);
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

	if (environment === 'ci') {
		for (const key of [
			'DATABASE_URL',
			'BETTER_AUTH_SECRET',
			'ORIGIN',
			'PUBLIC_ASSET_BASE_URL',
			'REINDEX_SECRET',
			'SOURCE_OPS_SECRET'
		] as const) {
			if (isBlank(values[key])) {
				addMissing(missing, key, `${key} is required for CI app/test boot.`);
			}
		}

		if (!isBlank(values.PUBLIC_ASSET_BASE_URL)) {
			const publicAssetBaseUrlIssue = validateAbsoluteUrl(
				values.PUBLIC_ASSET_BASE_URL,
				'PUBLIC_ASSET_BASE_URL'
			);
			if (publicAssetBaseUrlIssue) {
				addInvalid(invalid, 'PUBLIC_ASSET_BASE_URL', publicAssetBaseUrlIssue);
			}
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

	const googleClientIdConfigured = !isBlank(values.GOOGLE_CLIENT_ID);
	const googleClientSecretConfigured = !isBlank(values.GOOGLE_CLIENT_SECRET);

	if (googleClientIdConfigured !== googleClientSecretConfigured) {
		addInvalid(
			invalid,
			googleClientIdConfigured ? 'GOOGLE_CLIENT_SECRET' : 'GOOGLE_CLIENT_ID',
			'Google sign-in requires both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.'
		);
	}

	if (googleClientSecretConfigured && strictEnvironment) {
		const googleSecretIssue = validateOpaqueSecret(
			values.GOOGLE_CLIENT_SECRET,
			'GOOGLE_CLIENT_SECRET',
			environment,
			12
		);
		if (googleSecretIssue) addInvalid(invalid, 'GOOGLE_CLIENT_SECRET', googleSecretIssue);
	}

	if (!googleClientIdConfigured) {
		addWarning(
			warnings,
			'GOOGLE_CLIENT_ID',
			'Google sign-in is not configured; authentication will be limited to email and password.'
		);
	}

	if (!!values.SMTP_USER?.trim() !== !!values.SMTP_PASS?.trim()) {
		addInvalid(
			invalid,
			values.SMTP_USER?.trim() ? 'SMTP_PASS' : 'SMTP_USER',
			'Authenticated SMTP requires both SMTP_USER and SMTP_PASS.'
		);
	}

	if (values.SMTP_PASS?.trim() && strictEnvironment) {
		const smtpPassIssue = validateOpaqueSecret(values.SMTP_PASS, 'SMTP_PASS', environment, 12);
		if (smtpPassIssue) addInvalid(invalid, 'SMTP_PASS', smtpPassIssue);
	}

	if (isBlank(values.PUBLIC_POSTHOG_KEY)) {
		addWarning(
			warnings,
			'PUBLIC_POSTHOG_KEY',
			'PostHog is not configured; product analytics and session replay are disabled.'
		);
	}

	if (isBlank(values.ERROR_WEBHOOK_URL)) {
		addWarning(
			warnings,
			'ERROR_WEBHOOK_URL',
			'ERROR_WEBHOOK_URL is not configured; structured server errors will not fan out to an alerting endpoint.'
		);
	}

	if (strictEnvironment && isBlank(values.KB_ENVIRONMENT)) {
		addWarning(
			warnings,
			'KB_ENVIRONMENT',
			'Set KB_ENVIRONMENT explicitly to staging or production so deploy validation is unambiguous.'
		);
	}

	return {
		ok: missing.length === 0 && invalid.length === 0,
		environment,
		enforceProduction,
		missing,
		invalid,
		warnings,
		inventory: buildInventory(rawValues, environment, options)
	};
}
