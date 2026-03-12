import type { FundingItem } from '$lib/data/kb';

export async function load() {
	return { item: null as FundingItem | null };
}
