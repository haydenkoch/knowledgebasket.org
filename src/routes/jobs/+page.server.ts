import { getPublishedJobs } from '$lib/server/jobs';

export async function load() {
	const jobs = await getPublishedJobs();
	return { jobs };
}
