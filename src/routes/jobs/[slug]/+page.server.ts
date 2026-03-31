import { getJobBySlug } from '$lib/server/jobs';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	const item = await getJobBySlug(params.slug);
	if (!item) throw error(404, 'Job not found');
	return { item };
}
