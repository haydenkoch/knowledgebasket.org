import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { approveJob, deleteJob, getJobById, rejectJob, updateJob } from '$lib/server/jobs';
import { getAllOrganizations } from '$lib/server/organizations';
import {
	parseString,
	nullableString,
	parseDateValue,
	parseNumberValue,
	parseList,
	normalizeStatus,
	validateRequired,
	validateHttpUrl,
	validateNumberOrder,
	buildModerationFields
} from '$lib/server/admin-content';
import { extractSubmissionContactFromNotes } from '$lib/server/submission-notes';

export const load: PageServerLoad = async ({ params }) => {
	const [job, organizations] = await Promise.all([getJobById(params.id), getAllOrganizations()]);
	if (!job) throw error(404, 'Job not found');
	const submissionContact = extractSubmissionContactFromNotes(job.adminNotes);
	return {
		job,
		submissionContext: {
			createdAt: job.createdAt ?? null,
			submitterName: job.submitterName ?? null,
			submitterEmail: job.submitterEmail ?? null,
			contactName: submissionContact.name ?? null,
			contactEmail: submissionContact.email ?? null,
			contactPhone: submissionContact.phone ?? null
		},
		organizations: organizations.map((organization) => ({
			id: organization.id,
			name: organization.name
		}))
	};
};

export const actions: Actions = {
	update: async ({ params, request, locals }) => {
		const formData = await request.formData();
		const title = parseString(formData, 'title');
		const employerName = parseString(formData, 'employerName');
		const issues: string[] = [];
		validateRequired(issues, title, 'Title is required');
		validateRequired(issues, employerName, 'Employer name is required');
		validateHttpUrl(
			issues,
			nullableString(formData, 'applyUrl'),
			'Apply URL must be a valid http or https URL.'
		);
		validateHttpUrl(
			issues,
			nullableString(formData, 'imageUrl'),
			'Image URL must be a valid http or https URL.'
		);
		const imageUrlsRaw = (formData.get('imageUrls') as string) ?? '';
		const imageUrls = imageUrlsRaw
			? imageUrlsRaw
					.split(/\r?\n/)
					.map((s) => s.trim())
					.filter(Boolean)
			: [];
		validateNumberOrder(
			issues,
			parseNumberValue(formData, 'compensationMin'),
			parseNumberValue(formData, 'compensationMax'),
			'Minimum compensation cannot be greater than maximum compensation.'
		);
		if (issues.length > 0) return fail(400, { error: issues[0], issues });

		const current = await getJobById(params.id);
		if (!current) return fail(404, { error: 'Job not found' });

		const status = normalizeStatus(
			formData.get('status'),
			['draft', 'pending', 'published', 'rejected'] as const,
			'draft'
		);
		const moderationFields = buildModerationFields(current, {
			status,
			reviewerId: locals.user?.id ?? null,
			rejectionReason: nullableString(formData, 'rejectionReason')
		});

		await updateJob(params.id, {
			title,
			slug: nullableString(formData, 'slug') ?? current.slug ?? undefined,
			description: nullableString(formData, 'description'),
			qualifications: nullableString(formData, 'qualifications'),
			employerName,
			organizationId: nullableString(formData, 'organizationId'),
			jobType: nullableString(formData, 'jobType'),
			seniority: nullableString(formData, 'seniority'),
			sector: nullableString(formData, 'sector'),
			sectors: parseList(formData, 'sectors') ?? current.sectors ?? null,
			department: nullableString(formData, 'department'),
			tags: parseList(formData, 'tags'),
			workArrangement: nullableString(formData, 'workArrangement'),
			location: nullableString(formData, 'location'),
			address: nullableString(formData, 'address'),
			city: nullableString(formData, 'city'),
			state: nullableString(formData, 'state'),
			zip: nullableString(formData, 'zip'),
			region: nullableString(formData, 'region'),
			compensationType: nullableString(formData, 'compensationType'),
			compensationMin: parseNumberValue(formData, 'compensationMin'),
			compensationMax: parseNumberValue(formData, 'compensationMax'),
			compensationDescription: nullableString(formData, 'compensationDescription'),
			benefits: nullableString(formData, 'benefits'),
			applyUrl: nullableString(formData, 'applyUrl'),
			applicationDeadline: parseDateValue(formData, 'applicationDeadline'),
			applicationInstructions: nullableString(formData, 'applicationInstructions'),
			indigenousPriority: formData.has('indigenousPriority'),
			tribalPreference: nullableString(formData, 'tribalPreference'),
			imageUrl: nullableString(formData, 'imageUrl'),
			imageUrls: imageUrls.length > 0 ? imageUrls : null,
			adminNotes: nullableString(formData, 'adminNotes'),
			featured: formData.has('featured'),
			unlisted: formData.has('unlisted'),
			...moderationFields
		});

		return { success: true };
	},
	approve: async ({ params, locals }) => {
		await approveJob(params.id, locals.user!.id);
		return { success: true };
	},
	reject: async ({ params, request, locals }) => {
		const formData = await request.formData();
		const reason = formData.get('reason') as string | null;
		await rejectJob(params.id, locals.user!.id, reason ?? undefined);
		return { success: true };
	},
	delete: async ({ params }) => {
		await deleteJob(params.id);
		throw redirect(303, '/admin/jobs');
	}
};
