import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import {
	approveCandidate,
	archiveCandidate,
	createOrganizationFromCandidate,
	createVenueFromCandidate,
	getCandidateReviewDetail,
	markCandidateNeedsInfo,
	rejectCandidate,
	resolveCandidateMatch,
	updateCandidateEntityLinks
} from '$lib/server/import-candidates';
import { getOrganizationById } from '$lib/server/organizations';
import { getSourceOpsSchemaHealth } from '$lib/server/source-ops-schema';
import { getVenueById } from '$lib/server/venues';

export const load: PageServerLoad = async ({ params }) => {
	const [detail, schemaHealth] = await Promise.all([
		getCandidateReviewDetail(params.id),
		getSourceOpsSchemaHealth()
	]);
	if (!detail) throw error(404, 'Candidate not found');
	return { detail, schemaHealth };
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
		if (!matchedCanonicalId)
			return fail(400, { error: 'Choose the existing listing this import should use' });
		await resolveCandidateMatch(params.id, {
			dedupeResult: 'update',
			matchedCanonicalId,
			reviewNotes: ((fd.get('reviewNotes') as string) || '').trim() || undefined
		});
		return { success: true };
	},
	linkOrganization: async ({ params, request }) => {
		const fd = await request.formData();
		const organizationId = (fd.get('organizationId') as string | null)?.trim() || null;
		if (!organizationId) return fail(400, { error: 'Choose an organization to link' });
		const organization = await getOrganizationById(organizationId);
		if (!organization) return fail(404, { error: 'Organization not found' });
		await updateCandidateEntityLinks(params.id, {
			organizationId: organization.id,
			organizationName: organization.name
		});
		return { success: true };
	},
	linkVenue: async ({ params, request }) => {
		const fd = await request.formData();
		const venueId = (fd.get('venueId') as string | null)?.trim() || null;
		if (!venueId) return fail(400, { error: 'Choose a venue to link' });
		const venue = await getVenueById(venueId);
		if (!venue) return fail(404, { error: 'Venue not found' });
		await updateCandidateEntityLinks(params.id, {
			venueId: venue.id,
			venueName: venue.name
		});
		return { success: true };
	},
	createOrganization: async ({ params }) => {
		const organization = await createOrganizationFromCandidate(params.id);
		if (!organization) return fail(404, { error: 'Candidate not found' });
		return { success: true, organizationId: organization.id };
	},
	createVenue: async ({ params }) => {
		const venue = await createVenueFromCandidate(params.id);
		if (!venue) return fail(404, { error: 'Candidate not found' });
		return { success: true, venueId: venue.id };
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
