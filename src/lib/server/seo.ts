import { resolveRuntimeOrigin } from '$lib/server/runtime-config';

const NOINDEX_SERVER_PATTERNS = [
	/^\/api\//,
	/\/feed\.ics$/i,
	/^\/account\/calendar\/feed\//,
	/^\/toolbox\/[^/]+\/preview$/,
	/^\/uploads\//,
	/^\/resources\//,
	/^\/manifest\.webmanifest$/
];

function isLocalOrigin(origin: string): boolean {
	try {
		const { hostname } = new URL(origin);
		return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
	} catch {
		return false;
	}
}

export function resolveSeoOrigin(url: URL): string {
	const runtimeOrigin = resolveRuntimeOrigin();

	if (!runtimeOrigin) {
		return url.origin;
	}

	if (isLocalOrigin(runtimeOrigin) && !isLocalOrigin(url.origin)) {
		return url.origin;
	}

	return runtimeOrigin;
}

export function isIndexableBrowseRequest(url: URL): boolean {
	return url.searchParams.size === 0;
}

export function getServerRobotsDirective(pathname: string): string | null {
	return NOINDEX_SERVER_PATTERNS.some((pattern) => pattern.test(pathname))
		? 'noindex, nofollow'
		: null;
}
