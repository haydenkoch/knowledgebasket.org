import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createFunding } from '$lib/server/funding';
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
		const funderName = parseString(formData, 'funderName');

		if (!title) return fail(400, { error: 'Title is required' });
		if (!funderName) return fail(400, { error: 'Funder name is required' });

		const status = normalizeCreateStatus(formData.get('status'));
		const funding = await createFunding({
			title,
			description: nullableString(formData, 'description'),
			funderName,
			organizationId: nullableString(formData, 'organizationId'),
			fundingType: nullableString(formData, 'fundingType'),
			fundingTypes: parseList(formData, 'fundingType'),
			eligibilityType: nullableString(formData, 'eligibilityType'),
			eligibilityTypes: parseList(formData, 'eligibilityTypes'),
			focusAreas: parseList(formData, 'focusAreas'),
			tags: parseList(formData, 'tags'),
			applicationStatus: parseString(formData, 'applicationStatus') || 'open',
			openDate: parseDateValue(formData, 'openDate'),
			deadline: parseDateValue(formData, 'deadline'),
			awardDate: parseDateValue(formData, 'awardDate'),
			fundingCycleNotes: nullableString(formData, 'fundingCycleNotes'),
			isRecurring: formData.has('isRecurring'),
			recurringSchedule: nullableString(formData, 'recurringSchedule'),
			amountMin: parseNumberValue(formData, 'amountMin'),
			amountMax: parseNumberValue(formData, 'amountMax'),
			amountDescription: nullableString(formData, 'amountDescription'),
			fundingTerm: nullableString(formData, 'fundingTerm'),
			matchRequired: formData.has('matchRequired'),
			matchRequirements: nullableString(formData, 'matchRequirements'),
			eligibleCosts: nullableString(formData, 'eligibleCosts'),
			region: nullableString(formData, 'region'),
			geographicRestrictions: nullableString(formData, 'geographicRestrictions'),
			applyUrl: nullableString(formData, 'applyUrl'),
			contactEmail: nullableString(formData, 'contactEmail'),
			contactName: nullableString(formData, 'contactName'),
			contactPhone: nullableString(formData, 'contactPhone'),
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

		throw redirect(303, `/admin/funding/${funding.id}`);
	}
};
