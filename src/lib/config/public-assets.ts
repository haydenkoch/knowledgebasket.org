import { env } from '$env/dynamic/public';
import {
	buildPublicAssetUrlFromBase,
	normalizePublicAssetBaseUrl,
	rewriteLegacyLocalObjectStorageUrl,
	rewriteLegacyLocalObjectStorageUrlsInValue as rewriteLegacyLocalObjectStorageUrlsInValueWithBase
} from './public-assets-core';

export const DEFAULT_LOGO_OBJECT_KEY = 'system/logo.png';
export const LANDSCAPE_OBJECT_PREFIX = 'placeholders/landscapes';

export { buildPublicAssetUrlFromBase, normalizePublicAssetBaseUrl };

export function getPublicAssetBaseUrl(): string {
	return normalizePublicAssetBaseUrl(env.PUBLIC_ASSET_BASE_URL ?? '');
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

export function rewriteLegacyLocalObjectStorageUrlsInValue<T>(
	value: T,
	options?: { baseUrl?: string | null }
): { value: T; changes: number } {
	return rewriteLegacyLocalObjectStorageUrlsInValueWithBase(value, {
		baseUrl: options?.baseUrl ?? getPublicAssetBaseUrlSafely()
	});
}

export function resolveAbsoluteUrl(
	value: string | null | undefined,
	options?: { origin?: string | null; baseUrl?: string | null }
): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (!trimmed) return null;

	if (isAbsoluteHttpUrl(trimmed)) {
		return (
			rewriteLegacyLocalObjectStorageUrl(trimmed, {
				baseUrl: options?.baseUrl ?? getPublicAssetBaseUrlSafely()
			}) ?? trimmed
		);
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

function getPublicAssetBaseUrlSafely(): string | null {
	try {
		return getPublicAssetBaseUrl();
	} catch {
		return null;
	}
}
