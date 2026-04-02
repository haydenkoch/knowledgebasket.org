import { describe, expect, it, vi } from 'vitest';
import { _createInboxActions } from '../src/routes/admin/inbox/+page.server';

function makeRequest(formData: FormData): Request {
	return new Request('http://localhost/admin/inbox', {
		method: 'POST',
		body: formData
	});
}

describe('admin inbox actions', () => {
	it('routes event approvals to the event moderation service', async () => {
		const approveEvent = vi.fn(async () => null);
		const rejectEvent = vi.fn();
		const actions = _createInboxActions({
			approveEvent,
			rejectEvent,
			approveCandidate: vi.fn(),
			rejectCandidate: vi.fn(),
			markCandidateNeedsInfo: vi.fn(),
			archiveCandidate: vi.fn(),
			approveFunding: vi.fn(),
			rejectFunding: vi.fn(),
			approveJob: vi.fn(),
			rejectJob: vi.fn(),
			approveBusiness: vi.fn(),
			rejectBusiness: vi.fn(),
			approveResource: vi.fn(),
			rejectResource: vi.fn()
		});

		const form = new FormData();
		form.set('kind', 'events');
		form.set('id', 'event-1');
		form.set('decision', 'approve');

		const result = await actions.review({
			request: makeRequest(form),
			locals: { user: { id: 'moderator-1' } }
		} as never);

		expect(result).toEqual(expect.objectContaining({ success: true }));
		expect(approveEvent).toHaveBeenCalledWith('event-1', 'moderator-1');
		expect(rejectEvent).not.toHaveBeenCalled();
	});

	it('routes source needs-info actions with review notes', async () => {
		const markCandidateNeedsInfo = vi.fn(async () => null);
		const actions = _createInboxActions({
			approveEvent: vi.fn(),
			rejectEvent: vi.fn(),
			approveCandidate: vi.fn(),
			rejectCandidate: vi.fn(),
			markCandidateNeedsInfo,
			archiveCandidate: vi.fn(),
			approveFunding: vi.fn(),
			rejectFunding: vi.fn(),
			approveJob: vi.fn(),
			rejectJob: vi.fn(),
			approveBusiness: vi.fn(),
			rejectBusiness: vi.fn(),
			approveResource: vi.fn(),
			rejectResource: vi.fn()
		});

		const form = new FormData();
		form.set('kind', 'source_candidates');
		form.set('id', 'candidate-1');
		form.set('decision', 'needs_info');
		form.set('note', 'Need a clearer match before publishing');

		const result = await actions.review({
			request: makeRequest(form),
			locals: { user: { id: 'moderator-2' } }
		} as never);

		expect(result).toEqual(expect.objectContaining({ success: true }));
		expect(markCandidateNeedsInfo).toHaveBeenCalledWith('candidate-1', 'moderator-2', {
			reviewNotes: 'Need a clearer match before publishing'
		});
	});

	it('routes funding rejections to the funding moderation service', async () => {
		const rejectFunding = vi.fn(async () => null);
		const actions = _createInboxActions({
			approveEvent: vi.fn(),
			rejectEvent: vi.fn(),
			approveCandidate: vi.fn(),
			rejectCandidate: vi.fn(),
			markCandidateNeedsInfo: vi.fn(),
			archiveCandidate: vi.fn(),
			approveFunding: vi.fn(),
			rejectFunding,
			approveJob: vi.fn(),
			rejectJob: vi.fn(),
			approveBusiness: vi.fn(),
			rejectBusiness: vi.fn(),
			approveResource: vi.fn(),
			rejectResource: vi.fn()
		});

		const form = new FormData();
		form.set('kind', 'funding');
		form.set('id', 'funding-1');
		form.set('decision', 'reject');
		form.set('note', 'Deadline has already passed');

		const result = await actions.review({
			request: makeRequest(form),
			locals: { user: { id: 'moderator-3' } }
		} as never);

		expect(result).toEqual(expect.objectContaining({ success: true }));
		expect(rejectFunding).toHaveBeenCalledWith(
			'funding-1',
			'moderator-3',
			'Deadline has already passed'
		);
	});
});
