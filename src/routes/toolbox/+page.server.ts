import { kbData } from '$lib/data/kb';
import { readSubmissions } from '$lib/server/submissions';
import type { ToolboxItem } from '$lib/data/kb';

export async function load() {
	const submissions = (await readSubmissions('toolbox')) as ToolboxItem[];
	const toolbox = [...kbData.toolbox, ...submissions];
	return { toolbox };
}
