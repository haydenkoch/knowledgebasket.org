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

	if (isAbsoluteHttpUrl(trimmed)) return trimmed;

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
