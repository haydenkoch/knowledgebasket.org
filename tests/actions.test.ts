import { describe, expect, it, vi } from 'vitest';
import { _createFundingSubmitActions } from '../src/routes/funding/submit/+page.server';
import { _createJobSubmitActions } from '../src/routes/jobs/submit/+page.server';
import { _createRedPagesSubmitActions } from '../src/routes/red-pages/submit/+page.server';
import { _createToolboxSubmitActions } from '../src/routes/toolbox/submit/+page.server';
import { _createEventSubmitActions } from '../src/routes/events/submit/+page.server';

function makeRequest(formData: FormData): Request {
	return new Request('http://localhost/form', {
		method: 'POST',
		body: formData
	});
}

describe('public submission actions', () => {
	it('creates a pending funding submission with private submitter notes', async () => {
		const createFunding = vi.fn(async () => ({ id: 'funding-1' }));
		const form = new FormData();
		form.set('opportunity_name', 'Forest Stewardship Grant');
		form.set('funder', 'Tribal Futures Fund');
		form.set('status', 'open');
		form.set('description', 'Funding description');
		form.set('contact_name', 'River James');
		form.set('email', 'river@example.com');

		const result = await _createFundingSubmitActions({ createFunding }).default({
			request: makeRequest(form),
			locals: { user: { id: 'user-1' } }
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				success: true
			})
		);
		expect(createFunding).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Forest Stewardship Grant',
				status: 'pending',
				source: 'submission',
				submittedById: 'user-1',
				adminNotes: expect.stringContaining('river@example.com')
			})
		);
	});

	it('creates a pending job submission and stores uploaded media through the shared helper', async () => {
		const createJob = vi.fn(async () => ({ id: 'job-1' }));
		const uploadImage = vi.fn(async () => '/uploads/jobs/job-image.webp');
		const form = new FormData();
		form.set('job_title', 'Community Coordinator');
		form.set('employer', 'Indigenous Futures Society');
		form.set('job_type', 'full_time');
		form.set('sector', 'community_development');
		form.set('apply_url', 'https://example.com/jobs/community-coordinator');
		form.set('description', 'Job description');
		form.set('contact_name', 'Avery Sky');
		form.set('email', 'avery@example.com');
		form.set('image', new File(['image'], 'logo.webp', { type: 'image/webp' }));

		const result = await _createJobSubmitActions({ createJob, uploadImage }).default({
			request: makeRequest(form),
			locals: { user: null }
		} as never);

		expect(result).toEqual(expect.objectContaining({ success: true }));
		expect(uploadImage).toHaveBeenCalledOnce();
		expect(createJob).toHaveBeenCalledWith(
			expect.objectContaining({
				status: 'pending',
				source: 'submission',
				imageUrl: '/uploads/jobs/job-image.webp',
				adminNotes: expect.stringContaining('avery@example.com')
			})
		);
	});

	it('creates a pending Red Pages submission', async () => {
		const createBusiness = vi.fn(async () => ({ id: 'business-1' }));
		const form = new FormData();
		form.set('business_name', 'Numa Design Studio');
		form.set('tribal_affiliation', 'Paiute');
		form.set('service_type', 'Design');
		form.set('description', 'Business description');
		form.set('contact_name', 'Sky Reader');
		form.set('email', 'sky@example.com');

		const result = await _createRedPagesSubmitActions({ createBusiness }).default({
			request: makeRequest(form),
			locals: { user: null }
		} as never);

		expect(result).toEqual(expect.objectContaining({ success: true }));
		expect(createBusiness).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'Numa Design Studio',
				status: 'pending',
				source: 'submission',
				adminNotes: expect.stringContaining('sky@example.com')
			})
		);
	});

	it('creates a pending toolbox submission with link content defaults', async () => {
		const createResource = vi.fn(async () => ({ id: 'resource-1' }));
		const form = new FormData();
		form.set('resource_title', 'Tribal Economic Toolkit');
		form.set('url', 'https://example.com/toolkit');
		form.set('media_type', 'Toolkit');
		form.set('description', 'Resource description');
		form.set('contact_name', 'Mika Stone');
		form.set('email', 'mika@example.com');

		const result = await _createToolboxSubmitActions({ createResource }).default({
			request: makeRequest(form),
			locals: { user: { id: 'user-2' } }
		} as never);

		expect(result).toEqual(expect.objectContaining({ success: true }));
		expect(createResource).toHaveBeenCalledWith(
			expect.objectContaining({
				resourceType: 'Toolkit',
				contentMode: 'link',
				externalUrl: 'https://example.com/toolkit',
				submittedById: 'user-2',
				status: 'pending'
			})
		);
	});

	it('uses the shared upload helper for event images so duplicate titles do not collide', async () => {
		const createEvent = vi.fn(async () => ({ id: 'event-1' }));
		const uploadImage = vi
			.fn()
			.mockResolvedValueOnce('/uploads/events/a.webp')
			.mockResolvedValueOnce('/uploads/events/b.webp');

		const buildForm = () => {
			const form = new FormData();
			form.set('event_name', 'Knowledge Gathering');
			form.set('host_org', 'Knowledge Basket');
			form.set('event_type', 'Workshop');
			form.set('geography', 'Sierra Nevada');
			form.set('audience', 'Community');
			form.set('cost', 'Free');
			form.set('description', 'Event description');
			form.set('start_date', '2026-04-10');
			form.set('city_state', 'Bishop, CA');
			form.set('event_url', 'https://example.com/events/knowledge-gathering');
			form.set('contact_name', 'Taylor Moss');
			form.set('email', 'taylor@example.com');
			form.set('image', new File(['image'], 'event.webp', { type: 'image/webp' }));
			return form;
		};

		const actions = _createEventSubmitActions({ createEvent, uploadImage });
		await actions.default({
			request: makeRequest(buildForm()),
			locals: { user: null }
		} as never);
		await actions.default({
			request: makeRequest(buildForm()),
			locals: { user: null }
		} as never);

		expect(uploadImage).toHaveBeenCalledTimes(2);
		expect(createEvent).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({ imageUrl: '/uploads/events/a.webp' })
		);
		expect(createEvent).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({ imageUrl: '/uploads/events/b.webp' })
		);
	});
});
