import { error } from '@sveltejs/kit';
import { getResourceBySlug } from '$lib/server/toolbox';

function isPdfUrl(value: string | null | undefined) {
	return Boolean(value && /\.pdf(?:$|[?#])/i.test(value));
}

export async function GET({ params, fetch }) {
	const item = await getResourceBySlug(params.slug);
	if (!item) throw error(404, 'Resource not found');

	if (isPdfUrl(item.fileUrl)) {
		return fetch(item.fileUrl!);
	}

	if (!isPdfUrl(item.externalUrl)) {
		throw error(404, 'Preview not available');
	}

	const upstream = await fetch(item.externalUrl!, {
		headers: {
			accept: 'application/pdf,application/octet-stream;q=0.9,*/*;q=0.8'
		}
	});

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
