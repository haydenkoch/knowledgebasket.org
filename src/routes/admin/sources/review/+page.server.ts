import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import {
	approveCandidate,
	archiveCandidate,
	bulkApproveCandidates,
	bulkRejectCandidates,
	getImportCandidatesForReview,
	markCandidateNeedsInfo,
	rejectCandidate
} from '$lib/server/import-candidates';
import { getSourcesForAdmin } from '$lib/server/sources';

export const load: PageServerLoad = async ({ url }) => {
	const status = url.searchParams.get('status') ?? 'open';
	const coil = url.searchParams.get('coil') ?? 'all';
	const priority = url.searchParams.get('priority') ?? 'all';
	const dedupeResult = url.searchParams.get('dedupeResult') ?? 'all';
	const sourceId = url.searchParams.get('sourceId') ?? 'all';
	const search = url.searchParams.get('search') ?? '';
	const page = parseInt(url.searchParams.get('page') ?? '1', 10);

	const [{ items, total }, sourceOptions] = await Promise.all([
		getImportCandidatesForReview({
			status,
			coil,
			priority,
			dedupeResult,
			sourceId,
			search,
			page,
			limit: 25
		}),
		getSourcesForAdmin({ limit: 200, sort: 'name', order: 'asc' })
	]);

	return {
		candidates: items,
		total,
		sourceOptions: sourceOptions.items.map((source) => ({
			id: source.id,
			name: source.name
		})),
		currentStatus: status,
		currentCoil: coil,
		currentPriority: priority,
		currentDedupeResult: dedupeResult,
		currentSourceId: sourceId,
		currentSearch: search,
		currentPage: page
	};
};

export const actions: Actions = {
	bulkApprove: async ({ request, locals }) => {
		const fd = await request.formData();
		const ids = fd
			.getAll('candidateId')
			.map((value) => String(value).trim())
			.filter(Boolean);
		if (ids.length === 0) return fail(400, { error: 'Select at least one candidate' });
		const count = await bulkApproveCandidates(ids, locals.user!.id);
		return { success: true, count };
	},
	bulkReject: async ({ request, locals }) => {
		const fd = await request.formData();
		const ids = fd
			.getAll('candidateId')
			.map((value) => String(value).trim())
			.filter(Boolean);
		if (ids.length === 0) return fail(400, { error: 'Select at least one candidate' });
		const count = await bulkRejectCandidates(ids, locals.user!.id, {
			rejectionReason: ((fd.get('rejectionReason') as string) || 'other') as
				| 'duplicate'
				| 'irrelevant'
				| 'expired'
				| 'low_quality'
				| 'inaccurate'
				| 'incomplete'
				| 'out_of_scope'
				| 'spam'
				| 'other',
			reviewNotes: ((fd.get('reviewNotes') as string) || '').trim() || undefined
		});
		return { success: true, count };
	},
	approve: async ({ request, locals }) => {
		const fd = await request.formData();
		const id = (fd.get('id') as string)?.trim();
		if (!id) return fail(400, { error: 'Candidate ID is required' });
		await approveCandidate(id, locals.user!.id, {
			reviewNotes: ((fd.get('reviewNotes') as string) || '').trim() || undefined
		});
		return { success: true };
	},
	reject: async ({ request, locals }) => {
		const fd = await request.formData();
		const id = (fd.get('id') as string)?.trim();
		if (!id) return fail(400, { error: 'Candidate ID is required' });
		await rejectCandidate(id, locals.user!.id, {
			rejectionReason: ((fd.get('rejectionReason') as string) || 'other') as
				| 'duplicate'
				| 'irrelevant'
				| 'expired'
				| 'low_quality'
				| 'inaccurate'
				| 'incomplete'
				| 'out_of_scope'
				| 'spam'
				| 'other',
			reviewNotes: ((fd.get('reviewNotes') as string) || '').trim() || undefined
		});
		return { success: true };
	},
	needsInfo: async ({ request, locals }) => {
		const fd = await request.formData();
		const id = (fd.get('id') as string)?.trim();
		if (!id) return fail(400, { error: 'Candidate ID is required' });
		await markCandidateNeedsInfo(id, locals.user!.id, {
			reviewNotes: ((fd.get('reviewNotes') as string) || '').trim() || undefined
		});
		return { success: true };
	},
	archive: async ({ request, locals }) => {
		const fd = await request.formData();
		const id = (fd.get('id') as string)?.trim();
		if (!id) return fail(400, { error: 'Candidate ID is required' });
		await archiveCandidate(id, locals.user!.id, {
			reviewNotes: ((fd.get('reviewNotes') as string) || '').trim() || undefined
		});
		return { success: true };
	}
};
