import { kbData } from '$lib/data/kb';
import { readSubmissions } from '$lib/server/submissions';
import type { JobItem } from '$lib/data/kb';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	const submissions = (await readSubmissions('jobs')) as JobItem[];
	const jobs = [...kbData.jobs, ...submissions];
	const job = jobs.find((j) => j.id === params.slug);
	if (!job) throw error(404, 'Job not found');
	return { item: job };
}
