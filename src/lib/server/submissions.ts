/**
 * Server-only: read/write submissions per coil. Stores JSON files in data/submissions/.
 * For production serverless, replace with a database or external API.
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type { CoilKey } from '$lib/data/kb';
import type {
	EventItem,
	FundingItem,
	RedPagesItem,
	JobItem,
	ToolboxItem
} from '$lib/data/kb';

const COILS: CoilKey[] = ['events', 'funding', 'redpages', 'jobs', 'toolbox'];

function getSubmissionsDir(): string {
	return join(process.cwd(), 'data', 'submissions');
}

function getFilePath(coil: CoilKey): string {
	return join(getSubmissionsDir(), `${coil}.json`);
}

export type SubmissionItem =
	| EventItem
	| FundingItem
	| RedPagesItem
	| JobItem
	| ToolboxItem;

/** Read submissions for one coil. Returns [] if file missing or invalid. */
export async function readSubmissions(coil: CoilKey): Promise<SubmissionItem[]> {
	try {
		const path = getFilePath(coil);
		const raw = await readFile(path, 'utf-8');
		const arr = JSON.parse(raw) as SubmissionItem[];
		return Array.isArray(arr) ? arr : [];
	} catch {
		return [];
	}
}

/** Ensure data/submissions exists, then append one item and save. */
export async function appendSubmission(
	coil: CoilKey,
	item: SubmissionItem
): Promise<void> {
	const dir = getSubmissionsDir();
	await mkdir(dir, { recursive: true });
	const path = getFilePath(coil);
	const existing = await readSubmissions(coil);
	existing.push(item);
	await writeFile(path, JSON.stringify(existing, null, 2), 'utf-8');
}

/** Generate a URL-safe id from title and ensure uniqueness. */
export function generateSlug(title: string, existingIds: string[]): string {
	const base = title
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '') || 'item';
	let slug = base;
	let n = 0;
	while (existingIds.includes(slug)) {
		n += 1;
		slug = `${base}-${n}`;
	}
	return slug;
}

export function getExistingIds(items: { id: string }[]): string[] {
	return items.map((i) => i.id);
}
