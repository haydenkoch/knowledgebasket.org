import { error } from '@sveltejs/kit';
import { getResourceBySlug } from '$lib/server/toolbox';
import { fetchSafeOutboundResource, normalizePublicHttpUrl } from '$lib/server/url-safety';

function isPdfUrl(value: string | null | undefined) {
	return Boolean(value && /\.pdf(?:$|[?#])/i.test(value));
}

function isLocalPreviewPath(value: string | null | undefined) {
	return Boolean(value && /^\/(?:uploads|resources)\//.test(value));
}

export async function GET({ params, fetch }) {
	const item = await getResourceBySlug(params.slug);
	if (!item) throw error(404, 'Resource not found');

	const fileUrl = item.fileUrl?.trim() ?? null;
	const publicFileUrl = normalizePublicHttpUrl(fileUrl);
	const externalUrl = normalizePublicHttpUrl(item.externalUrl);

	if (!isPdfUrl(fileUrl) && !isPdfUrl(externalUrl)) {
		throw error(404, 'Preview not available');
	}

	let upstream: Response;
	try {
		const headers = {
			accept: 'application/pdf,application/octet-stream;q=0.9,*/*;q=0.8'
		};

		if (fileUrl && isLocalPreviewPath(fileUrl) && isPdfUrl(fileUrl)) {
			upstream = await fetch(fileUrl, { headers });
		} else {
			upstream = await fetchSafeOutboundResource(fetch, publicFileUrl ?? externalUrl!, {
				headers
			});
		}
	} catch {
		throw error(404, 'Preview not available');
	}

	if (!upstream.ok) {
		throw error(502, 'Preview unavailable');
	}

	const body = await upstream.arrayBuffer();
	const contentType = upstream.headers.get('content-type') ?? 'application/pdf';

	return new Response(body, {
		headers: {
			'Content-Type': contentType,
			'Content-Disposition': 'inline',
			'Cache-Control': 'public, max-age=3600'
		}
	});
}
