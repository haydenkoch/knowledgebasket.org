function stripTrailingSlash(value: string): string {
	return value.replace(/\/+$/, '');
}

function stripLeadingSlash(value: string): string {
	return value.replace(/^\/+/, '');
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

export function buildPublicAssetUrlFromBase(baseUrl: string, objectKey: string): string {
	return `${normalizePublicAssetBaseUrl(baseUrl)}/${normalizeObjectKey(objectKey)}`;
}

function normalizeOptionalPublicAssetBaseUrl(value?: string | null): string | null {
	const normalized = value?.trim();
	return normalized ? normalizePublicAssetBaseUrl(normalized) : null;
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

function resolveObjectKeyFromCandidatePath(candidatePath: string, basePath: string): string | null {
	if (!basePath) return stripLeadingSlash(candidatePath);

	if (candidatePath.startsWith(`${basePath}/`)) {
		return stripLeadingSlash(candidatePath.slice(basePath.length));
	}

	// Support legacy MinIO bucket-style URLs like `/kb-uploads/...` even when the
	// public origin now serves the same objects from `/uploads/...`.
	if (candidatePath.startsWith('/kb-uploads/')) {
		return stripLeadingSlash(candidatePath.slice('/kb-uploads'.length));
	}

	return null;
}

export function rewriteLegacyLocalObjectStorageUrl(
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
		const objectKey = resolveObjectKeyFromCandidatePath(candidatePath, basePath);

		if (!objectKey) return null;
		return `${buildPublicAssetUrlFromBase(baseUrl, objectKey)}${candidate.search}${candidate.hash}`;
	} catch {
		return null;
	}
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (!value || typeof value !== 'object') return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

export function rewriteLegacyLocalObjectStorageUrlsInValue<T>(
	value: T,
	options?: { baseUrl?: string | null }
): { value: T; changes: number } {
	if (typeof value === 'string') {
		const rewritten = rewriteLegacyLocalObjectStorageUrl(value, options);
		return {
			value: (rewritten ?? value) as T,
			changes: rewritten && rewritten !== value ? 1 : 0
		};
	}

	if (Array.isArray(value)) {
		let changes = 0;
		const nextValue = value.map((entry) => {
			const result = rewriteLegacyLocalObjectStorageUrlsInValue(entry, options);
			changes += result.changes;
			return result.value;
		});
		return {
			value: (changes > 0 ? nextValue : value) as T,
			changes
		};
	}

	if (isPlainObject(value)) {
		let changes = 0;
		const nextValue: Record<string, unknown> = {};

		for (const [key, entry] of Object.entries(value)) {
			const result = rewriteLegacyLocalObjectStorageUrlsInValue(entry, options);
			nextValue[key] = result.value;
			changes += result.changes;
		}

		return {
			value: (changes > 0 ? nextValue : value) as T,
			changes
		};
	}

	return { value, changes: 0 };
}
