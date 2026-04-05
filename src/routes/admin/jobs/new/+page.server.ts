import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createJob } from '$lib/server/jobs';
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

function normalizeCreateStatus(raw: FormDataEntryValue | null): 'draft' | 'pending' | 'published' {
	const value = typeof raw === 'string' ? raw.trim() : '';
	if (value === 'pending' || value === 'published') return value;
	return 'draft';
}

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

		if (!title) return fail(400, { error: 'Title is required' });
		if (!employerName) return fail(400, { error: 'Employer name is required' });

		const status = normalizeCreateStatus(formData.get('status'));
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
			status,
			source: 'admin',
			featured: formData.has('featured'),
			unlisted: formData.has('unlisted'),
			publishedAt: status === 'published' ? new Date() : null,
			adminNotes: nullableString(formData, 'adminNotes'),
			submittedById: locals.user?.id ?? null,
			reviewedById: status === 'published' ? (locals.user?.id ?? null) : null
		});

		throw redirect(303, `/admin/jobs/${job.id}`);
	}
};
