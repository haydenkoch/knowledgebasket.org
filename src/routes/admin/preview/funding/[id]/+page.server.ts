import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getFundingById } from '$lib/server/funding';

export const load: PageServerLoad = async ({ params }) => {
	const funding = await getFundingById(params.id);
	if (!funding) throw error(404, 'Funding item not found');
	return { funding };
};
