import { PUBLIC_ASSET_BASE_URL } from '$env/static/public';

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
	return normalizePublicAssetBaseUrl(PUBLIC_ASSET_BASE_URL);
}

export function buildPublicAssetUrlFromBase(baseUrl: string, objectKey: string): string {
	return `${normalizePublicAssetBaseUrl(baseUrl)}/${normalizeObjectKey(objectKey)}`;
}

export function buildPublicAssetUrl(
	objectKey: string,
	options?: { baseUrl?: string }
): string {
	return buildPublicAssetUrlFromBase(options?.baseUrl ?? getPublicAssetBaseUrl(), objectKey);
}
