import { fail, type RequestEvent } from '@sveltejs/kit';
import { approveEvent, rejectEvent } from '$lib/server/events';
import {
	approveCandidate,
	archiveCandidate,
	markCandidateNeedsInfo,
	rejectCandidate
} from '$lib/server/import-candidates';
import { approveFunding, rejectFunding } from '$lib/server/funding';
import { approveJob, rejectJob } from '$lib/server/jobs';
import { approveBusiness, rejectBusiness } from '$lib/server/red-pages';
import { approveResource, rejectResource } from '$lib/server/toolbox';

type AdminWorkQueueActionDeps = {
	approveEvent: typeof approveEvent;
	rejectEvent: typeof rejectEvent;
	approveCandidate: typeof approveCandidate;
	rejectCandidate: typeof rejectCandidate;
	markCandidateNeedsInfo: typeof markCandidateNeedsInfo;
	archiveCandidate: typeof archiveCandidate;
	approveFunding: typeof approveFunding;
	rejectFunding: typeof rejectFunding;
	approveJob: typeof approveJob;
	rejectJob: typeof rejectJob;
	approveBusiness: typeof approveBusiness;
	rejectBusiness: typeof rejectBusiness;
	approveResource: typeof approveResource;
	rejectResource: typeof rejectResource;
};

export function _createInboxActions(
	deps: AdminWorkQueueActionDeps = {
		approveEvent,
		rejectEvent,
		approveCandidate,
		rejectCandidate,
		markCandidateNeedsInfo,
		archiveCandidate,
		approveFunding,
		rejectFunding,
		approveJob,
		rejectJob,
		approveBusiness,
		rejectBusiness,
		approveResource,
		rejectResource
	}
) {
	return {
		review: async ({ request, locals }: RequestEvent) => {
			const formData = await request.formData();
			const kind = String(formData.get('kind') ?? '').trim();
			const id = String(formData.get('id') ?? '').trim();
			const decision = String(formData.get('decision') ?? '').trim();
			const note = String(formData.get('note') ?? '').trim() || undefined;

			if (!kind || !id || !decision) {
				return fail(400, { error: 'Missing moderation payload' });
			}

			const reviewerId = locals.user?.id;
			if (!reviewerId) {
				return fail(401, { error: 'You must be signed in to moderate content' });
			}

			try {
				switch (kind) {
					case 'events':
						if (decision === 'approve') await deps.approveEvent(id, reviewerId);
						else if (decision === 'reject') await deps.rejectEvent(id, reviewerId, note);
						else return fail(400, { error: 'Unsupported event decision' });
						break;

					case 'source_candidates':
						if (decision === 'approve') {
							await deps.approveCandidate(id, reviewerId, { reviewNotes: note });
						} else if (decision === 'reject') {
							await deps.rejectCandidate(id, reviewerId, {
								rejectionReason: 'other',
								reviewNotes: note
							});
						} else if (decision === 'needs_info') {
							await deps.markCandidateNeedsInfo(id, reviewerId, { reviewNotes: note });
						} else if (decision === 'archive') {
							await deps.archiveCandidate(id, reviewerId, { reviewNotes: note });
						} else {
							return fail(400, { error: 'Unsupported source decision' });
						}
						break;

					case 'funding':
						if (decision === 'approve') await deps.approveFunding(id, reviewerId);
						else if (decision === 'reject') await deps.rejectFunding(id, reviewerId, note);
						else return fail(400, { error: 'Unsupported funding decision' });
						break;

					case 'jobs':
						if (decision === 'approve') await deps.approveJob(id, reviewerId);
						else if (decision === 'reject') await deps.rejectJob(id, reviewerId, note);
						else return fail(400, { error: 'Unsupported job decision' });
						break;

					case 'redpages':
						if (decision === 'approve') await deps.approveBusiness(id, reviewerId);
						else if (decision === 'reject') await deps.rejectBusiness(id, reviewerId, note);
						else return fail(400, { error: 'Unsupported Red Pages decision' });
						break;

					case 'toolbox':
						if (decision === 'approve') await deps.approveResource(id, reviewerId);
						else if (decision === 'reject') await deps.rejectResource(id, reviewerId, note);
						else return fail(400, { error: 'Unsupported toolbox decision' });
						break;

					default:
						return fail(400, { error: 'Unsupported review item kind' });
				}
			} catch (error) {
				return fail(400, {
					error: error instanceof Error ? error.message : 'Unable to complete review action'
				});
			}

			return { success: true };
		}
	};
}
