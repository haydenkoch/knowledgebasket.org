export const DEPLOYMENT_ENVIRONMENTS = [
	'development',
	'test',
	'ci',
	'staging',
	'production'
] as const;

export type DeploymentEnvironment = (typeof DEPLOYMENT_ENVIRONMENTS)[number];

export type RuntimeConfigCategory =
	| 'platform'
	| 'core'
	| 'auth'
	| 'email'
	| 'search'
	| 'storage'
	| 'ops'
	| 'observability'
	| 'analytics'
	| 'maps'
	| 'ai';

export type RuntimeConfigVisibility = 'private' | 'public';
export type RuntimeConfigClassification = 'secret' | 'config';
export type RuntimeConfigSource = 'env' | 'file' | 'missing' | 'file_error';

export type RuntimeConfigCatalogEntry = {
	key: string;
	category: RuntimeConfigCategory;
	visibility: RuntimeConfigVisibility;
	classification: RuntimeConfigClassification;
	requiredIn: readonly DeploymentEnvironment[];
	description: string;
};

export const RUNTIME_CONFIG_CATALOG = [
	{
		key: 'KB_ENVIRONMENT',
		category: 'platform',
		visibility: 'private',
		classification: 'config',
		requiredIn: [],
		description: 'Explicit deployment environment name: development, ci, staging, or production.'
	},
	{
		key: 'DATABASE_URL',
		category: 'core',
		visibility: 'private',
		classification: 'secret',
		requiredIn: ['ci', 'staging', 'production'],
		description: 'Primary Postgres connection string.'
	},
	{
		key: 'BETTER_AUTH_SECRET',
		category: 'auth',
		visibility: 'private',
		classification: 'secret',
		requiredIn: ['ci', 'staging', 'production'],
		description: 'Application auth signing secret.'
	},
	{
		key: 'ORIGIN',
		category: 'core',
		visibility: 'private',
		classification: 'config',
		requiredIn: ['ci', 'staging', 'production'],
		description: 'Canonical application origin.'
	},
	{
		key: 'RAILWAY_PUBLIC_DOMAIN',
		category: 'platform',
		visibility: 'private',
		classification: 'config',
		requiredIn: [],
		description: 'Railway bootstrap origin fallback.'
	},
	{
		key: 'GOOGLE_CLIENT_ID',
		category: 'auth',
		visibility: 'private',
		classification: 'config',
		requiredIn: [],
		description: 'Google OAuth client ID.'
	},
	{
		key: 'GOOGLE_CLIENT_SECRET',
		category: 'auth',
		visibility: 'private',
		classification: 'secret',
		requiredIn: [],
		description: 'Google OAuth client secret.'
	},
	{
		key: 'SMTP_HOST',
		category: 'email',
		visibility: 'private',
		classification: 'config',
		requiredIn: ['staging', 'production'],
		description: 'SMTP host for transactional mail.'
	},
	{
		key: 'SMTP_PORT',
		category: 'email',
		visibility: 'private',
		classification: 'config',
		requiredIn: ['staging', 'production'],
		description: 'SMTP port.'
	},
	{
		key: 'SMTP_SECURE',
		category: 'email',
		visibility: 'private',
		classification: 'config',
		requiredIn: [],
		description: 'Whether SMTPS is enabled.'
	},
	{
		key: 'SMTP_REQUIRE_TLS',
		category: 'email',
		visibility: 'private',
		classification: 'config',
		requiredIn: [],
		description: 'Whether STARTTLS is enforced.'
	},
	{
		key: 'SMTP_USER',
		category: 'email',
		visibility: 'private',
		classification: 'config',
		requiredIn: [],
		description: 'SMTP username.'
	},
	{
		key: 'SMTP_PASS',
		category: 'email',
		visibility: 'private',
		classification: 'secret',
		requiredIn: [],
		description: 'SMTP password.'
	},
	{
		key: 'SMTP_FROM',
		category: 'email',
		visibility: 'private',
		classification: 'config',
		requiredIn: ['staging', 'production'],
		description: 'Default transactional sender.'
	},
	{
		key: 'PUBLIC_SENTRY_DSN',
		category: 'observability',
		visibility: 'public',
		classification: 'config',
		requiredIn: [],
		description: 'Client-side Sentry DSN.'
	},
	{
		key: 'SENTRY_DSN',
		category: 'observability',
		visibility: 'private',
		classification: 'config',
		requiredIn: [],
		description: 'Server-side Sentry DSN.'
	},
	{
		key: 'SENTRY_AUTH_TOKEN',
		category: 'observability',
		visibility: 'private',
		classification: 'secret',
		requiredIn: [],
		description: 'Build-time source map upload token.'
	},
	{
		key: 'SENTRY_ORG',
		category: 'observability',
		visibility: 'private',
		classification: 'config',
		requiredIn: [],
		description: 'Sentry organization slug.'
	},
	{
		key: 'SENTRY_PROJECT',
		category: 'observability',
		visibility: 'private',
		classification: 'config',
		requiredIn: [],
		description: 'Sentry project slug.'
	},
	{
		key: 'PUBLIC_POSTHOG_KEY',
		category: 'analytics',
		visibility: 'public',
		classification: 'config',
		requiredIn: [],
		description: 'Public PostHog project key.'
	},
	{
		key: 'PUBLIC_POSTHOG_HOST',
		category: 'analytics',
		visibility: 'public',
		classification: 'config',
		requiredIn: [],
		description: 'PostHog API host.'
	},
	{
		key: 'MINIO_ENDPOINT',
		category: 'storage',
		visibility: 'private',
		classification: 'config',
		requiredIn: ['staging', 'production'],
		description: 'S3-compatible object storage endpoint.'
	},
	{
		key: 'MINIO_ACCESS_KEY',
		category: 'storage',
		visibility: 'private',
		classification: 'secret',
		requiredIn: ['staging', 'production'],
		description: 'S3-compatible access key.'
	},
	{
		key: 'MINIO_SECRET_KEY',
		category: 'storage',
		visibility: 'private',
		classification: 'secret',
		requiredIn: ['staging', 'production'],
		description: 'S3-compatible secret key.'
	},
	{
		key: 'MINIO_BUCKET',
		category: 'storage',
		visibility: 'private',
		classification: 'config',
		requiredIn: ['staging', 'production'],
		description: 'Uploads bucket name.'
	},
	{
		key: 'PUBLIC_ASSET_BASE_URL',
		category: 'storage',
		visibility: 'public',
		classification: 'config',
		requiredIn: ['ci', 'staging', 'production'],
		description: 'Public asset origin or CDN base URL.'
	},
	{
		key: 'MEILISEARCH_HOST',
		category: 'search',
		visibility: 'private',
		classification: 'config',
		requiredIn: ['staging', 'production'],
		description: 'Meilisearch API host.'
	},
	{
		key: 'MEILISEARCH_API_KEY',
		category: 'search',
		visibility: 'private',
		classification: 'secret',
		requiredIn: ['staging', 'production'],
		description: 'Meilisearch API key.'
	},
	{
		key: 'REINDEX_SECRET',
		category: 'ops',
		visibility: 'private',
		classification: 'secret',
		requiredIn: ['ci', 'staging', 'production'],
		description: 'Secret header for search reindex automation.'
	},
	{
		key: 'SOURCE_OPS_SECRET',
		category: 'ops',
		visibility: 'private',
		classification: 'secret',
		requiredIn: ['ci', 'staging', 'production'],
		description: 'Secret header for source-ops automation.'
	},
	{
		key: 'LOG_LEVEL',
		category: 'observability',
		visibility: 'private',
		classification: 'config',
		requiredIn: [],
		description: 'Server log verbosity.'
	},
	{
		key: 'ERROR_WEBHOOK_URL',
		category: 'observability',
		visibility: 'private',
		classification: 'secret',
		requiredIn: [],
		description: 'Optional alert fan-out webhook.'
	},
	{
		key: 'MAPBOX_ACCESS_TOKEN',
		category: 'maps',
		visibility: 'private',
		classification: 'secret',
		requiredIn: [],
		description: 'Preferred Mapbox API token.'
	},
	{
		key: 'MAPBOX_TOKEN',
		category: 'maps',
		visibility: 'private',
		classification: 'secret',
		requiredIn: [],
		description: 'Legacy Mapbox API token alias.'
	},
	{
		key: 'OPENAI_API_KEY',
		category: 'ai',
		visibility: 'private',
		classification: 'secret',
		requiredIn: [],
		description: 'Optional OpenAI API key for ingestion enrichment.'
	},
	{
		key: 'OPENAI_INGESTION_MODEL',
		category: 'ai',
		visibility: 'private',
		classification: 'config',
		requiredIn: [],
		description: 'Optional OpenAI model override.'
	},
	{
		key: 'OPENAI_RESPONSES_URL',
		category: 'ai',
		visibility: 'private',
		classification: 'config',
		requiredIn: [],
		description: 'Optional OpenAI API base override.'
	}
] as const satisfies readonly RuntimeConfigCatalogEntry[];

export type RuntimeConfigKey = (typeof RUNTIME_CONFIG_CATALOG)[number]['key'];

export type ResolvedRuntimeConfigValue = {
	key: string;
	value?: string;
	source: RuntimeConfigSource;
	error?: string;
};

export type RuntimeConfigSnapshot = {
	environment: DeploymentEnvironment;
	values: Record<string, string | undefined>;
	resolved: Record<string, ResolvedRuntimeConfigValue>;
};

type ResolveValueOptions = {
	readFile?: (path: string) => string;
};

function normalizeEnvironmentValue(value: string | undefined): DeploymentEnvironment | null {
	if (!value) return null;

	switch (value.trim().toLowerCase()) {
		case 'dev':
		case 'development':
		case 'local':
			return 'development';
		case 'test':
			return 'test';
		case 'ci':
			return 'ci';
		case 'stage':
		case 'staging':
		case 'preview':
			return 'staging';
		case 'prod':
		case 'production':
			return 'production';
		default:
			return null;
	}
}

export function detectDeploymentEnvironment(
	values: Record<string, string | undefined>
): DeploymentEnvironment {
	return (
		normalizeEnvironmentValue(values.KB_ENVIRONMENT) ||
		normalizeEnvironmentValue(values.APP_ENV) ||
		normalizeEnvironmentValue(values.DEPLOY_ENV) ||
		normalizeEnvironmentValue(values.RAILWAY_ENVIRONMENT_NAME) ||
		(values.NODE_ENV === 'test' ? 'test' : null) ||
		(values.CI === 'true' ? 'ci' : null) ||
		(values.NODE_ENV === 'production' ? 'production' : null) ||
		'development'
	);
}

export function isProductionLikeEnvironment(environment: DeploymentEnvironment): boolean {
	return environment === 'staging' || environment === 'production';
}

export function resolveRuntimeConfigValue(
	values: Record<string, string | undefined>,
	key: string,
	options: ResolveValueOptions = {}
): ResolvedRuntimeConfigValue {
	const directValue = values[key]?.trim();

	if (directValue) {
		return { key, value: directValue, source: 'env' };
	}

	const secretFilePath = values[`${key}_FILE`]?.trim();
	if (!secretFilePath) {
		return { key, source: 'missing' };
	}

	if (!options.readFile) {
		return {
			key,
			source: 'file_error',
			error: `${key}_FILE is set but no file reader was provided.`
		};
	}

	try {
		const fileValue = options.readFile(secretFilePath).trim();
		if (!fileValue) {
			return {
				key,
				source: 'file_error',
				error: `${key}_FILE points to an empty file.`
			};
		}

		return { key, value: fileValue, source: 'file' };
	} catch (error) {
		return {
			key,
			source: 'file_error',
			error:
				error instanceof Error
					? `${key}_FILE could not be read: ${error.message}`
					: `${key}_FILE could not be read.`
		};
	}
}

export function resolveRuntimeConfigSnapshot(
	values: Record<string, string | undefined>,
	options: ResolveValueOptions = {}
): RuntimeConfigSnapshot {
	const resolvedEntries = Object.fromEntries(
		RUNTIME_CONFIG_CATALOG.map((entry) => {
			const resolved = resolveRuntimeConfigValue(values, entry.key, options);
			return [entry.key, resolved];
		})
	);

	const resolvedValues = Object.fromEntries(
		Object.entries(resolvedEntries).map(([key, resolved]) => [key, resolved.value])
	);

	return {
		environment: detectDeploymentEnvironment({ ...values, ...resolvedValues }),
		values: { ...values, ...resolvedValues },
		resolved: resolvedEntries
	};
}
