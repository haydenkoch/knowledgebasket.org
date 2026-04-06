import type { PageServerLoad } from './$types';
import { getPublishedFunding } from '$lib/server/funding';
import { withPublicDataFallback } from '$lib/server/public-load';

export const load: PageServerLoad = async ({ url }) => {
	const futureOnly = url.searchParams.get('future') === '1';
	const { data: allFunding, unavailable } = await withPublicDataFallback(
		'funding collection',
		() => getPublishedFunding(),
		[]
	);
	const now = new Date();
	const funding = futureOnly
		? allFunding.filter((item) => {
				if (item.applicationStatus === 'open' || item.applicationStatus === 'rolling') {
					return true;
				}
				if (!item.deadline) return true;
				const deadlineTs = new Date(item.deadline).getTime();
				return Number.isFinite(deadlineTs) && deadlineTs >= now.getTime();
			})
		: allFunding;
	return { funding, dataUnavailable: unavailable, origin: url.origin };
};
