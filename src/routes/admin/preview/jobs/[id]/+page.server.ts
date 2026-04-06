import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getJobById } from '$lib/server/jobs';

export const load: PageServerLoad = async ({ params }) => {
	const job = await getJobById(params.id);
	if (!job) throw error(404, 'Job not found');
	return { job };
};
