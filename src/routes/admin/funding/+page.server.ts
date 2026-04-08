import type { Actions, PageServerLoad } from './$types';
import { requirePrivilegedApiUser } from '$lib/server/access-control';
import {
	bulkApproveFunding,
	bulkDeleteFunding,
	bulkRejectFunding,
	getFundingForAdmin,
	getFundingStatusCounts
} from '$lib/server/funding';

export const load: PageServerLoad = async ({ url }) => {
	const status = url.searchParams.get('status') ?? 'all';
	const search = url.searchParams.get('search') ?? '';
	const page = parseInt(url.searchParams.get('page') ?? '1', 10);
	const sort = (url.searchParams.get('sort') ?? 'updated') as 'updated' | 'deadline' | 'title';
	const order = (url.searchParams.get('order') ?? 'desc') as 'asc' | 'desc';

	const [{ items, total }, statusCounts] = await Promise.all([
		getFundingForAdmin({
			status,
			search,
			page,
			limit: 25,
			sort,
			order
		}),
		getFundingStatusCounts()
	]);

	return {
		funding: items,
		total,
		statusCounts,
		currentStatus: status,
		currentSearch: search,
		currentPage: page,
		currentSort: sort,
		currentOrder: order
	};
};

export const actions: Actions = {
	bulkApprove: async ({ request, locals }) => {
		const user = requirePrivilegedApiUser(locals);
		const formData = await request.formData();
		const ids = formData.getAll('ids') as string[];
		if (ids.length === 0) return { success: false };
		const count = await bulkApproveFunding(ids, user.id);
		return { success: true, count };
	},
	bulkReject: async ({ request, locals }) => {
		const user = requirePrivilegedApiUser(locals);
		const formData = await request.formData();
		const ids = formData.getAll('ids') as string[];
		const reason = formData.get('reason') as string | null;
		if (ids.length === 0) return { success: false };
		const count = await bulkRejectFunding(ids, user.id, reason ?? undefined);
		return { success: true, count };
	},
	bulkDelete: async ({ request, locals }) => {
		requirePrivilegedApiUser(locals);
		const formData = await request.formData();
		const ids = formData.getAll('ids') as string[];
		if (ids.length === 0) return { success: false };
		const count = await bulkDeleteFunding(ids);
		return { success: true, count };
	}
};
