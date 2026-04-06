import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { createJob } from '$lib/server/jobs';
import { RATE_LIMIT_POLICIES, consumeRateLimit } from '$lib/server/rate-limit';
import { uploadImage } from '$lib/server/upload';
import { buildSubmissionAdminNotes, parseDateInput } from '$lib/server/submission-notes';

type JobSubmitDeps = {
	createJob: (data: Parameters<typeof createJob>[0]) => Promise<unknown>;
	uploadImage: (file: File, scope: 'jobs') => Promise<string>;
};

export function _createJobSubmitActions(deps: JobSubmitDeps = { createJob, uploadImage }): Actions {
	return {
		default: async (event) => {
			const rateLimit = consumeRateLimit(event, RATE_LIMIT_POLICIES.publicSubmit, '/jobs/submit');
			if (!rateLimit.allowed) {
				return fail(429, {
					error: `Too many submissions. Please wait ${rateLimit.retryAfterSeconds} seconds and try again.`
				});
			}

			const { request, locals } = event;
			const formData = await request.formData();
			const job_title = formData.get('job_title')?.toString().trim() ?? '';
			const employer = formData.get('employer')?.toString().trim() ?? '';
			const job_type = formData.get('job_type')?.toString().trim() ?? '';
			const location = formData.get('location')?.toString().trim() ?? '';
			const region = formData.get('region')?.toString().trim() ?? '';
			const sector = formData.get('sector')?.toString().trim() ?? '';
			const level = formData.get('level')?.toString().trim() ?? '';
			const work_arrangement = formData.get('work_arrangement')?.toString().trim() ?? '';
			const application_deadline_raw =
				formData.get('application_deadline')?.toString().trim() ?? '';
			const apply_url = formData.get('apply_url')?.toString().trim() ?? '';
			const description = formData.get('description')?.toString().trim() ?? '';
			const compensation = formData.get('compensation')?.toString().trim() ?? '';
			const benefits = formData.get('benefits')?.toString().trim() ?? '';
			const indigenous_priority = formData.get('indigenous_priority') != null;
			const contact_name = formData.get('contact_name')?.toString().trim() ?? '';
			const email = formData.get('email')?.toString().trim() ?? '';
			const contact_phone = formData.get('contact_phone')?.toString().trim() ?? '';
			const image = formData.get('image');

			const values = {
				job_title,
				employer,
				job_type,
				location,
				region,
				sector,
				level,
				work_arrangement,
				application_deadline: application_deadline_raw,
				apply_url,
				description,
				compensation,
				benefits,
				indigenous_priority: indigenous_priority ? 'yes' : '',
				contact_name,
				email,
				contact_phone
			};

			if (
				!job_title ||
				!employer ||
				!job_type ||
				!sector ||
				!apply_url ||
				!description ||
				!contact_name ||
				!email
			) {
				return fail(400, {
					error:
						'Please fill in all required fields: Job title, Hiring organization, Job type, Sector, Apply URL, Description, Your name, and Your email.',
					values
				});
			}

			let imageUrl: string | null = null;
			if (image instanceof File && image.size > 0) {
				imageUrl = await deps.uploadImage(image, 'jobs');
			}

			await deps.createJob({
				title: job_title,
				description,
				employerName: employer,
				jobType: job_type,
				sector,
				sectors: sector ? [sector] : null,
				seniority: level || null,
				workArrangement: work_arrangement || null,
				location: location || null,
				region: region || null,
				applicationDeadline: parseDateInput(application_deadline_raw),
				applyUrl: apply_url,
				compensationDescription: compensation || null,
				benefits: benefits || null,
				indigenousPriority: indigenous_priority,
				imageUrl,
				adminNotes: buildSubmissionAdminNotes({
					name: contact_name,
					email,
					phone: contact_phone
				}),
				submittedById: locals.user?.id ?? null,
				status: 'pending',
				source: 'submission'
			});

			return {
				success: true,
				message:
					'Thank you! Your job posting has been submitted for review. Our moderation team will review it shortly.'
			};
		}
	};
}

export const actions = _createJobSubmitActions();
