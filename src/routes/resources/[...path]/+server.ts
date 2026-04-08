import { error } from '@sveltejs/kit';
import { resolve } from 'path';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { env } from '$env/dynamic/private';

/** Project resources (PDFs etc.). Set KB_RESOURCES_PATH in .env for a fixed path; otherwise uses cwd/resources or ../resources. */
function getResourcesDir(): string {
	const fromEnv = env.KB_RESOURCES_PATH;
	if (fromEnv) return resolve(fromEnv);
	const cwd = process.cwd();
	const primary = resolve(cwd, 'resources');
	const alt = resolve(cwd, '..', 'resources');
	if (existsSync(primary)) return primary;
	if (existsSync(alt)) return alt;
	return primary;
}

export async function GET({ params }) {
	const pathSegments = params.path || '';
	const decoded = pathSegments
		.split('/')
		.map((s) => decodeURIComponent(s))
		.join('/');
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
	if (ext === 'html') {
		throw error(403, 'HTML resources are not served inline');
	}
	const contentType =
		ext === 'pdf'
			? 'application/pdf'
			: ext === 'jpg' || ext === 'jpeg'
				? 'image/jpeg'
				: ext === 'png'
					? 'image/png'
					: 'application/octet-stream';
	const buf = await readFile(fullPath);
	return new Response(buf, {
		headers: {
			'Content-Type': contentType,
			'Content-Length': String(buf.length),
			...(contentType === 'application/pdf' ? { 'Content-Disposition': 'inline' } : {})
		}
	});
}
