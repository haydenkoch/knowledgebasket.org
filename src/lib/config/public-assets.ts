import { env } from '$env/dynamic/public';

export const DEFAULT_LOGO_OBJECT_KEY = 'system/logo.png';
export const LANDSCAPE_OBJECT_PREFIX = 'placeholders/landscapes';

function stripTrailingSlash(value: string): string {
	return value.replace(/\/+$/, '');
}

function normalizeObjectKey(objectKey: string): string {
	const normalized = objectKey.trim().replace(/^\/+/, '');
	if (!normalized) throw new Error('Object key is required');
	return normalized;
}

export function normalizePublicAssetBaseUrl(value: string): string {
	const normalized = stripTrailingSlash(value.trim());
	if (!normalized) throw new Error('PUBLIC_ASSET_BASE_URL is required');

	try {
		const parsed = new URL(normalized);
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
			throw new Error('PUBLIC_ASSET_BASE_URL must use http or https.');
		}
	} catch (error) {
		if (error instanceof Error && error.message.includes('PUBLIC_ASSET_BASE_URL must use')) {
			throw error;
		}
		throw new Error('PUBLIC_ASSET_BASE_URL must be a valid absolute URL.');
	}

	return normalized;
}

export function getPublicAssetBaseUrl(): string {
	return normalizePublicAssetBaseUrl(env.PUBLIC_ASSET_BASE_URL ?? '');
}

export function buildPublicAssetUrlFromBase(baseUrl: string, objectKey: string): string {
	return `${normalizePublicAssetBaseUrl(baseUrl)}/${normalizeObjectKey(objectKey)}`;
}

export function buildPublicAssetUrl(objectKey: string, options?: { baseUrl?: string }): string {
	return buildPublicAssetUrlFromBase(options?.baseUrl ?? getPublicAssetBaseUrl(), objectKey);
}

function stripLeadingSlash(value: string): string {
	return value.replace(/^\/+/, '');
}

function normalizeOptionalPublicAssetBaseUrl(value?: string | null): string | null {
	const normalized = value?.trim();
	if (normalized) return normalizePublicAssetBaseUrl(normalized);

	try {
		return getPublicAssetBaseUrl();
	} catch {
		return null;
	}
}

function isLocalNetworkHostname(hostname: string): boolean {
	const normalized = hostname.trim().toLowerCase();
	if (!normalized) return false;

	if (
		normalized === 'localhost' ||
		normalized === '127.0.0.1' ||
		normalized === '0.0.0.0' ||
		normalized === '::1' ||
		normalized === '[::1]' ||
		normalized.endsWith('.local')
	) {
		return true;
	}

	if (/^10(?:\.\d{1,3}){3}$/.test(normalized)) return true;
	if (/^192\.168(?:\.\d{1,3}){2}$/.test(normalized)) return true;
	return /^172\.(1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}$/.test(normalized);
}

function resolveLegacyLocalObjectStorageUrl(
	value: string,
	options?: { baseUrl?: string | null }
): string | null {
	const baseUrl = normalizeOptionalPublicAssetBaseUrl(options?.baseUrl);
	if (!baseUrl) return null;

	try {
		const candidate = new URL(value);
		if (!isLocalNetworkHostname(candidate.hostname)) return null;

		const base = new URL(baseUrl);
		const basePath = stripTrailingSlash(base.pathname);
		const candidatePath = candidate.pathname;

		const objectKey = basePath
			? candidatePath.startsWith(`${basePath}/`)
				? stripLeadingSlash(candidatePath.slice(basePath.length))
				: null
			: stripLeadingSlash(candidatePath);

		if (!objectKey) return null;
		return `${buildPublicAssetUrlFromBase(baseUrl, objectKey)}${candidate.search}${candidate.hash}`;
	} catch {
		return null;
	}
}

export function isAbsoluteHttpUrl(value: string | null | undefined): boolean {
	return Boolean(value && /^https?:\/\//i.test(value));
}

export function resolveAbsoluteUrl(
	value: string | null | undefined,
	options?: { origin?: string | null; baseUrl?: string | null }
): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (!trimmed) return null;

	if (isAbsoluteHttpUrl(trimmed)) {
		return resolveLegacyLocalObjectStorageUrl(trimmed, options) ?? trimmed;
	}

	const normalizedOrigin = options?.origin?.trim().replace(/\/+$/, '') ?? '';
	const uploadPath = trimmed.startsWith('/uploads/')
		? stripLeadingSlash(trimmed.slice('/uploads/'.length))
		: trimmed.startsWith('uploads/')
			? stripLeadingSlash(trimmed.slice('uploads/'.length))
			: null;

	if (uploadPath) {
		try {
			return buildPublicAssetUrl(uploadPath, {
				baseUrl: options?.baseUrl ?? undefined
			});
		} catch {
			// Fall back to the site origin when public asset storage is unavailable.
		}
	}

	if (!normalizedOrigin) return trimmed;
	if (trimmed.startsWith('/')) return `${normalizedOrigin}${trimmed}`;
	return `${normalizedOrigin}/${stripLeadingSlash(trimmed)}`;
}
