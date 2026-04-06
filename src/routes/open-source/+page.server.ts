import type { PageServerLoad } from './$types';
import { getOpenSourcePageData } from '$lib/server/open-source';

export const load: PageServerLoad = async () => {
	return {
		openSource: await getOpenSourcePageData()
	};
};
