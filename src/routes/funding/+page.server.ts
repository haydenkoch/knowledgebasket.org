import { kbData } from '$lib/data/kb';
import { readSubmissions } from '$lib/server/submissions';
import type { FundingItem } from '$lib/data/kb';

export async function load() {
	const submissions = (await readSubmissions('funding')) as FundingItem[];
	const funding = [...kbData.funding, ...submissions];
	return { funding };
}
