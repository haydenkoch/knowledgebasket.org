import { kbData } from '$lib/data/kb';
import { readSubmissions } from '$lib/server/submissions';
import type { RedPagesItem } from '$lib/data/kb';

export async function load() {
	const submissions = (await readSubmissions('redpages')) as RedPagesItem[];
	const redpages = [...kbData.redpages, ...submissions];
	return { redpages };
}
