import { error } from '@sveltejs/kit';
import { join, resolve } from 'path';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

/** Project resources (PDFs etc.): from site/ use ../resources, from repo root use resources */
const RESOURCES_DIR = resolve(process.cwd(), 'resources');
const RESOURCES_DIR_ALT = resolve(process.cwd(), '..', 'resources');

function getResourcesDir(): string {
	if (existsSync(RESOURCES_DIR)) return RESOURCES_DIR;
	if (existsSync(RESOURCES_DIR_ALT)) return RESOURCES_DIR_ALT;
	return RESOURCES_DIR;
}

export async function GET({ params }) {
	const pathSegments = params.path || '';
	const decoded = pathSegments.split('/').map((s) => decodeURIComponent(s)).join('/');
	if (!decoded || decoded.includes('..')) {
		throw error(400, 'Invalid path');
	}
	const base = getResourcesDir();
	const fullPath = resolve(base, decoded);
	if (!fullPath.startsWith(base)) {
		throw error(403, 'Forbidden');
	}
	if (!existsSync(fullPath)) {
		throw error(404, 'Not found');
	}
	const ext = (decoded.split('.').pop() || '').toLowerCase();
	const contentType =
		ext === 'pdf'
			? 'application/pdf'
			: ext === 'html'
				? 'text/html'
				: ext === 'jpg' || ext === 'jpeg'
					? 'image/jpeg'
					: ext === 'png'
						? 'image/png'
						: 'application/octet-stream';
	const buf = await readFile(fullPath);
	return new Response(buf, {
		headers: {
			'Content-Type': contentType,
			'Content-Length': String(buf.length)
		}
	});
}
