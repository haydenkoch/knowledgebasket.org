import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createJob } from '$lib/server/jobs';
import { getAllOrganizations } from '$lib/server/organizations';
import {
	parseString,
	nullableString,
	parseDateValue,
	parseNumberValue,
	parseList,
	validateRequired,
	validateHttpUrl,
	validateNumberOrder
} from '$lib/server/admin-content';

export const load: PageServerLoad = async () => {
	const organizations = await getAllOrganizations();
	return {
		organizations: organizations.map((organization) => ({
			id: organization.id,
			name: organization.name
		}))
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
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

		const job = await createJob({
			title,
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
			imageUrls: imageUrls.length > 0 ? imageUrls : null,
			status: 'draft',
			source: 'admin',
			featured: formData.has('featured'),
			unlisted: formData.has('unlisted'),
			publishedAt: null,
			adminNotes: nullableString(formData, 'adminNotes'),
			submittedById: locals.user?.id ?? null,
			reviewedById: null
		});

		throw redirect(303, `/admin/jobs/${job.id}`);
	}
};
