/**
 * Reusable file upload: validate type/size, store under static/uploads/<scope>, return URL.
 */
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const EXT_MAP: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp'
};

export type UploadScope =
	| 'events'
	| 'organizations'
	| 'venues'
	| 'brand'
	| 'funding'
	| 'red-pages'
	| 'jobs'
	| 'toolbox';

/**
 * Upload an image file to static/uploads/<scope>. Returns the public URL path.
 * Validates type and size; throws if invalid.
 */
export async function uploadImage(file: File, scope: UploadScope): Promise<string> {
	if (file.size === 0) throw new Error('File is empty');
	if (file.size > MAX_IMAGE_SIZE) throw new Error('Image must be 5 MB or smaller');
	if (!ALLOWED_IMAGE_TYPES.includes(file.type)) throw new Error('Image must be JPG, PNG, or WebP');

	const ext = EXT_MAP[file.type] ?? 'jpg';
	const dir = join(process.cwd(), 'static', 'uploads', scope);
	await mkdir(dir, { recursive: true });
	const baseName = `${randomUUID().slice(0, 8)}-${Date.now()}`;
	const fileName = `${baseName}.${ext}`;
	const filePath = join(dir, fileName);
	const buf = Buffer.from(await file.arrayBuffer());
	await writeFile(filePath, buf);
	return `/uploads/${scope}/${fileName}`;
}
