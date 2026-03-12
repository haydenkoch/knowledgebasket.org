import { kbData } from '$lib/data/kb';
import { readSubmissions } from '$lib/server/submissions';
import type { JobItem } from '$lib/data/kb';

export async function load() {
	const submissions = (await readSubmissions('jobs')) as JobItem[];
	const jobs = [...kbData.jobs, ...submissions];
	return { jobs };
}
