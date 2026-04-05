import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { approveJob, deleteJob, getJobById, rejectJob, updateJob } from '$lib/server/jobs';
import { getAllOrganizations } from '$lib/server/organizations';

function parseString(formData: FormData, key: string) {
	return formData.get(key)?.toString().trim() ?? '';
}

function nullableString(formData: FormData, key: string) {
	const value = parseString(formData, key);
	return value ? value : null;
}

function parseDateValue(formData: FormData, key: string) {
	const value = parseString(formData, key);
	return value ? new Date(`${value}T00:00:00`) : null;
}

function parseNumberValue(formData: FormData, key: string) {
	const value = parseString(formData, key);
	if (!value) return null;
	const number = Number(value);
	return Number.isFinite(number) ? number : null;
}

function parseList(formData: FormData, key: string) {
	const value = parseString(formData, key);
	const items = value
		.split(/\r?\n|,/)
		.map((entry) => entry.trim())
		.filter(Boolean);
	return items.length > 0 ? items : null;
}

function normalizeEditStatus(
	raw: FormDataEntryValue | null
): 'draft' | 'pending' | 'published' | 'rejected' {
	const value = typeof raw === 'string' ? raw.trim() : '';
	if (value === 'pending' || value === 'published' || value === 'rejected') return value;
	return 'draft';
}

export const load: PageServerLoad = async ({ params }) => {
	const [job, organizations] = await Promise.all([getJobById(params.id), getAllOrganizations()]);
	if (!job) throw error(404, 'Job not found');
	return {
		job,
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
		if (!title) return fail(400, { error: 'Title is required' });
		if (!employerName) return fail(400, { error: 'Employer name is required' });

		const current = await getJobById(params.id);
		if (!current) return fail(404, { error: 'Job not found' });

		const status = normalizeEditStatus(formData.get('status'));
		const moderationFields =
			status === 'published'
				? {
						status,
						publishedAt: current.publishedAt ? new Date(current.publishedAt) : new Date(),
						rejectedAt: null,
						rejectionReason: null,
						reviewedById: locals.user?.id ?? current.reviewedById ?? null
					}
				: status === 'rejected'
					? {
							status,
							publishedAt: null,
							rejectedAt: current.rejectedAt ? new Date(current.rejectedAt) : new Date(),
							rejectionReason: nullableString(formData, 'rejectionReason'),
							reviewedById: locals.user?.id ?? current.reviewedById ?? null
						}
					: {
							status,
							publishedAt: null,
							rejectedAt: null,
							rejectionReason: null,
							reviewedById: current.reviewedById ?? null
						};

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
			sectors: parseList(formData, 'sector'),
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
