import type { PageServerLoad, Actions } from './$types';
import {
	getEventsForAdmin,
	bulkApproveEvents,
	bulkRejectEvents,
	bulkDeleteEvents,
	getEventStatusCounts
} from '$lib/server/events';

export const load: PageServerLoad = async ({ url }) => {
	const status = url.searchParams.get('status') ?? 'all';
	const search = url.searchParams.get('search') ?? '';
	const page = parseInt(url.searchParams.get('page') ?? '1', 10);
	const sort = (url.searchParams.get('sort') ?? 'updated') as 'updated' | 'start' | 'title';
	const order = (url.searchParams.get('order') ?? 'desc') as 'asc' | 'desc';

	const [{ events, total }, statusCounts] = await Promise.all([
		getEventsForAdmin({
			status,
			search,
			page,
			limit: 25,
			sort,
			order
		}),
		getEventStatusCounts()
	]);
	return {
		events,
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
		const formData = await request.formData();
		const ids = formData.getAll('ids') as string[];
		if (ids.length === 0) return { success: false };
		const count = await bulkApproveEvents(ids, locals.user!.id);
		return { success: true, count };
	},
	bulkReject: async ({ request, locals }) => {
		const formData = await request.formData();
		const ids = formData.getAll('ids') as string[];
		const reason = formData.get('reason') as string | null;
		if (ids.length === 0) return { success: false };
		const count = await bulkRejectEvents(ids, locals.user!.id, reason ?? undefined);
		return { success: true, count };
	},
	bulkDelete: async ({ request }) => {
		const formData = await request.formData();
		const ids = formData.getAll('ids') as string[];
		if (ids.length === 0) return { success: false };
		const count = await bulkDeleteEvents(ids);
		return { success: true, count };
	}
};
