import { error } from '@sveltejs/kit';
import { getUploadObject } from '$lib/server/object-storage';
import { captureServerError } from '$lib/server/observability';

function fallbackContentType(pathname: string): string {
	const ext = pathname.split('.').pop()?.toLowerCase();
	switch (ext) {
		case 'jpg':
		case 'jpeg':
			return 'image/jpeg';
		case 'png':
			return 'image/png';
		case 'webp':
			return 'image/webp';
		default:
			return 'application/octet-stream';
	}
}

export async function GET({ params }) {
	const pathSegments = params.path || '';
	const decoded = pathSegments
		.split('/')
		.map((segment) => decodeURIComponent(segment))
		.join('/');

	if (!decoded || decoded.includes('..')) {
		throw error(400, 'Invalid path');
	}

	try {
		const object = await getUploadObject(decoded);
		return new Response(Buffer.from(object.body), {
			headers: {
				'Content-Type': object.contentType ?? fallbackContentType(decoded),
				'Content-Length': object.contentLength
					? String(object.contentLength)
					: String(object.body.length),
				'Cache-Control': 'public, max-age=31536000, immutable',
				...(object.lastModified ? { 'Last-Modified': object.lastModified.toUTCString() } : {}),
				...(object.etag ? { ETag: object.etag } : {})
			}
		});
	} catch (cause) {
		await captureServerError('uploads.read_failed', cause, {
			objectKey: decoded
		});
		throw error(404, 'Not found');
	}
}
