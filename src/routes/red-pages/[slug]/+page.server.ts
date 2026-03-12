import type { RedPagesItem } from '$lib/data/kb';

export async function load() {
	return { item: null as RedPagesItem | null };
}
