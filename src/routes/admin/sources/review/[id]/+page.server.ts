import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import {
	approveCandidate,
	archiveCandidate,
	getCandidateReviewDetail,
	markCandidateNeedsInfo,
	rejectCandidate,
	resolveCandidateMatch
} from '$lib/server/import-candidates';

export const load: PageServerLoad = async ({ params }) => {
	const detail = await getCandidateReviewDetail(params.id);
	if (!detail) throw error(404, 'Candidate not found');
	return { detail };
};

export const actions: Actions = {
	approveAsNew: async ({ params, request, locals }) => {
		const fd = await request.formData();
		const reviewNotes = ((fd.get('reviewNotes') as string) || '').trim() || undefined;
		await resolveCandidateMatch(params.id, {
			dedupeResult: 'new',
			matchedCanonicalId: null,
			reviewNotes
		});
		await approveCandidate(params.id, locals.user!.id, {
			reviewNotes,
			allowAmbiguous: true
		});
		throw redirect(303, '/admin/sources/review');
	},
	resolveMatch: async ({ params, request }) => {
		const fd = await request.formData();
		const matchedCanonicalId = (fd.get('matchedCanonicalId') as string | null)?.trim() || null;
		if (!matchedCanonicalId) return fail(400, { error: 'Choose a canonical record to attach' });
		await resolveCandidateMatch(params.id, {
			dedupeResult: 'update',
			matchedCanonicalId,
			reviewNotes: ((fd.get('reviewNotes') as string) || '').trim() || undefined
		});
		return { success: true };
	},
	approveAsUpdate: async ({ params, request, locals }) => {
		const fd = await request.formData();
		const matchedCanonicalId = (fd.get('matchedCanonicalId') as string | null)?.trim() || null;
		const reviewNotes = ((fd.get('reviewNotes') as string) || '').trim() || undefined;
		if (matchedCanonicalId) {
			await resolveCandidateMatch(params.id, {
				dedupeResult: 'update',
				matchedCanonicalId,
				reviewNotes
			});
		}
		await approveCandidate(params.id, locals.user!.id, {
			reviewNotes,
			allowAmbiguous: true
		});
		throw redirect(303, '/admin/sources/review');
	},
	reject: async ({ params, request, locals }) => {
		const fd = await request.formData();
		await rejectCandidate(params.id, locals.user!.id, {
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
		throw redirect(303, '/admin/sources/review');
	},
	needsInfo: async ({ params, request, locals }) => {
		const fd = await request.formData();
		await markCandidateNeedsInfo(params.id, locals.user!.id, {
			reviewNotes: ((fd.get('reviewNotes') as string) || '').trim() || undefined
		});
		throw redirect(303, '/admin/sources/review');
	},
	archive: async ({ params, request, locals }) => {
		const fd = await request.formData();
		await archiveCandidate(params.id, locals.user!.id, {
			reviewNotes: ((fd.get('reviewNotes') as string) || '').trim() || undefined
		});
		throw redirect(303, '/admin/sources/review');
	}
};
