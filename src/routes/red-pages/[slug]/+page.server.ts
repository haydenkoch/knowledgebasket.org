import { kbData } from '$lib/data/kb';
import { readSubmissions } from '$lib/server/submissions';
import type { RedPagesItem } from '$lib/data/kb';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	const submissions = (await readSubmissions('redpages')) as RedPagesItem[];
	const redpages = [...kbData.redpages, ...submissions];
	const item = redpages.find((r) => r.id === params.slug);
	if (!item) throw error(404, 'Vendor not found');
	return { item };
}
