import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, extname, resolve, sep } from 'node:path';

export type ResourceClassification = 'document' | 'image' | 'web-save' | 'other';
export type ImportDecision = 'import' | 'review' | 'skip';

export interface ResourceInventoryItem {
	absolutePath: string;
	relativePath: string;
	fileName: string;
	title: string;
	extension: string;
	mimeType: string;
	bytes: number;
	sha256: string;
	classification: ResourceClassification;
	importDecision: ImportDecision;
	reasons: string[];
	topLevelFolder: string | null;
	suggestedCategory: string | null;
	suggestedTags: string[];
	suggestedMediaType: string | null;
	suggestedResourceType: string | null;
	suggestedSlug: string;
	suggestedDownloadPath: string;
	suggestedStorageKey: string;
}

export interface ResourceInventorySummary {
	totalFiles: number;
	importableCount: number;
	reviewCount: number;
	skippedCount: number;
	byExtension: Record<string, number>;
	byDecision: Record<ImportDecision, number>;
	byClassification: Record<ResourceClassification, number>;
	byTopLevelFolder: Record<string, number>;
}

const IMPORTABLE_DOCUMENT_EXTENSIONS = new Set(['pdf', 'docx']);
const REVIEW_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const SKIPPED_FILE_EXTENSIONS = new Set([
	'css',
	'download',
	'gif',
	'htm',
	'html',
	'js',
	'json',
	'map',
	'svg',
	'txt',
	'xml'
]);
const SKIPPED_DIRECTORY_SUFFIXES = ['_files'];

const MIME_TYPES: Record<string, string> = {
	pdf: 'application/pdf',
	docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
	html: 'text/html',
	htm: 'text/html',
	css: 'text/css',
	js: 'text/javascript',
	svg: 'image/svg+xml'
};

export function resolveToolboxResourcesDir(options?: {
	configuredPath?: string | null;
	cwd?: string;
}): string {
	const configuredPath = options?.configuredPath?.trim();
	if (configuredPath) return resolve(configuredPath);

	const cwd = options?.cwd ? resolve(options.cwd) : process.cwd();
	const primary = resolve(cwd, 'resources');
	const sibling = resolve(cwd, '..', 'resources');
	if (existsSync(primary)) return primary;
	if (existsSync(sibling)) return sibling;
	return primary;
}

export async function inventoryToolboxResources(resourcesDir: string) {
	const baseDir = resolve(resourcesDir);
	const files = await walkFiles(baseDir, baseDir);
	const items = await Promise.all(
		files.map((relativePath) => buildInventoryItem(baseDir, relativePath))
	);
	return {
		baseDir,
		items: items.sort((left, right) => left.relativePath.localeCompare(right.relativePath))
	};
}

export function summarizeInventory(items: ResourceInventoryItem[]): ResourceInventorySummary {
	const byExtension: Record<string, number> = {};
	const byTopLevelFolder: Record<string, number> = {};
	const byDecision: Record<ImportDecision, number> = {
		import: 0,
		review: 0,
		skip: 0
	};
	const byClassification: Record<ResourceClassification, number> = {
		document: 0,
		image: 0,
		'web-save': 0,
		other: 0
	};

	for (const item of items) {
		byExtension[item.extension] = (byExtension[item.extension] ?? 0) + 1;
		byDecision[item.importDecision] += 1;
		byClassification[item.classification] += 1;
		byTopLevelFolder[item.topLevelFolder ?? '(root)'] =
			(byTopLevelFolder[item.topLevelFolder ?? '(root)'] ?? 0) + 1;
	}

	return {
		totalFiles: items.length,
		importableCount: byDecision.import,
		reviewCount: byDecision.review,
		skippedCount: byDecision.skip,
		byExtension: sortRecordDescending(byExtension),
		byDecision,
		byClassification,
		byTopLevelFolder: sortRecordDescending(byTopLevelFolder)
	};
}

async function walkFiles(baseDir: string, currentDir: string): Promise<string[]> {
	const entries = await readdir(currentDir, { withFileTypes: true });
	const out: string[] = [];

	for (const entry of entries) {
		if (entry.name === '.DS_Store') continue;
		if (entry.isDirectory()) {
			if (SKIPPED_DIRECTORY_SUFFIXES.some((suffix) => entry.name.endsWith(suffix))) {
				continue;
			}
			out.push(...(await walkFiles(baseDir, resolve(currentDir, entry.name))));
			continue;
		}

		const absolutePath = resolve(currentDir, entry.name);
		const relativePath = absolutePath
			.slice(baseDir.length + 1)
			.split(sep)
			.join('/');
		out.push(relativePath);
	}

	return out;
}

async function buildInventoryItem(
	baseDir: string,
	relativePath: string
): Promise<ResourceInventoryItem> {
	const absolutePath = resolve(baseDir, relativePath);
	const fileName = basename(relativePath);
	const extension = extname(fileName).replace(/^\./, '').toLowerCase() || 'unknown';
	const fileStat = await stat(absolutePath);
	const bytes = fileStat.size;
	const sha256 = await hashFile(absolutePath);
	const title = humanizeFileName(fileName);
	const pathSegments = relativePath.split('/');
	const topLevelFolder = pathSegments.length > 1 ? pathSegments[0] : null;
	const classification = classifyByExtension(extension);
	const { decision, reasons } = classifyImportDecision(relativePath, extension, classification);
	const suggestedCategory = topLevelFolder && topLevelFolder !== 'Images' ? topLevelFolder : null;
	const suggestedTags = inferTags(pathSegments, title);
	const suggestedResourceType = inferResourceType(title, extension);
	const suggestedMediaType = inferMediaType(extension, classification);
	const suggestedSlug = slugify(title);
	const suggestedDownloadPath = `/resources/${pathSegments.map(encodeURIComponent).join('/')}`;
	const suggestedStorageKey = `toolbox/original/${sha256}.${extension}`;

	return {
		absolutePath,
		relativePath,
		fileName,
		title,
		extension,
		mimeType: MIME_TYPES[extension] ?? 'application/octet-stream',
		bytes,
		sha256,
		classification,
		importDecision: decision,
		reasons,
		topLevelFolder,
		suggestedCategory,
		suggestedTags,
		suggestedMediaType,
		suggestedResourceType,
		suggestedSlug,
		suggestedDownloadPath,
		suggestedStorageKey
	};
}

function classifyByExtension(extension: string): ResourceClassification {
	if (IMPORTABLE_DOCUMENT_EXTENSIONS.has(extension)) return 'document';
	if (REVIEW_IMAGE_EXTENSIONS.has(extension)) return 'image';
	if (SKIPPED_FILE_EXTENSIONS.has(extension)) return 'web-save';
	return 'other';
}

function classifyImportDecision(
	relativePath: string,
	extension: string,
	classification: ResourceClassification
) {
	const reasons: string[] = [];

	if (SKIPPED_FILE_EXTENSIONS.has(extension)) {
		reasons.push('Web-save asset or page snapshot, not a primary resource record.');
		return { decision: 'skip' as const, reasons };
	}

	if (relativePath.includes('_files/')) {
		reasons.push('Saved browser asset directory, not a primary resource record.');
		return { decision: 'skip' as const, reasons };
	}

	if (classification === 'document') {
		reasons.push('Primary document type suitable for toolbox import and document extraction.');
		return { decision: 'import' as const, reasons };
	}

	if (classification === 'image') {
		reasons.push(
			'Image asset may be useful as supporting media, but not as a default toolbox document.'
		);
		return { decision: 'review' as const, reasons };
	}

	reasons.push('Unsupported or unknown file type needs manual review before import.');
	return { decision: 'skip' as const, reasons };
}

function inferMediaType(extension: string, classification: ResourceClassification): string | null {
	if (extension === 'pdf') return 'PDF';
	if (extension === 'docx') return 'DOCX';
	if (classification === 'image') return 'Image';
	return null;
}

function inferResourceType(title: string, extension: string): string | null {
	const lower = title.toLowerCase();
	if (lower.includes('toolkit')) return 'Toolkit';
	if (lower.includes('guide') || lower.includes('guidance') || lower.includes('handbook'))
		return 'Guide';
	if (lower.includes('report') || lower.includes('study') || lower.includes('white paper'))
		return 'Report / White Paper';
	if (lower.includes('map') || lower.includes('mapping')) return 'Map / GIS';
	if (lower.includes('policy') || lower.includes('declaration') || lower.includes('rule'))
		return 'Policy Document';
	if (extension === 'pdf' || extension === 'docx') return 'Other';
	return null;
}

function inferTags(pathSegments: string[], title: string): string[] {
	const tags = new Set<string>();

	for (const segment of pathSegments.slice(0, -1)) {
		if (!segment || segment.endsWith('_files')) continue;
		tags.add(normalizeTag(segment));
	}

	for (const keyword of ['land back', 'co-management', 'guardians', 'food', 'climate', 'fire']) {
		if (title.toLowerCase().includes(keyword)) {
			tags.add(normalizeTag(keyword));
		}
	}

	return Array.from(tags).filter(Boolean);
}

function normalizeTag(value: string): string {
	return value.replace(/[+_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function humanizeFileName(fileName: string): string {
	return basename(fileName, extname(fileName))
		.replace(/[+_]+/g, ' ')
		.replace(/\s+/g, ' ')
		.replace(/\s*\(\d+\)\s*$/g, '')
		.trim();
}

function slugify(value: string): string {
	return (
		value
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'resource'
	);
}

async function hashFile(absolutePath: string): Promise<string> {
	const buffer = await readFile(absolutePath);
	return createHash('sha256').update(buffer).digest('hex');
}

function sortRecordDescending(record: Record<string, number>) {
	return Object.fromEntries(Object.entries(record).sort((left, right) => right[1] - left[1]));
}
