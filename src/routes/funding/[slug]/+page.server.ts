import { kbData } from '$lib/data/kb';
import { readSubmissions } from '$lib/server/submissions';
import type { FundingItem } from '$lib/data/kb';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	const submissions = (await readSubmissions('funding')) as FundingItem[];
	const funding = [...kbData.funding, ...submissions];
	const item = funding.find((f) => f.id === params.slug);
	if (!item) throw error(404, 'Funding opportunity not found');
	return { item };
}
