import { kbData } from '$lib/data/kb';
import { readSubmissions } from '$lib/server/submissions';
import type { ToolboxItem } from '$lib/data/kb';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	const submissions = (await readSubmissions('toolbox')) as ToolboxItem[];
	const toolbox = [...kbData.toolbox, ...submissions];
	const item = toolbox.find((t) => t.id === params.slug);
	if (!item) throw error(404, 'Resource not found');
	return { item };
}
