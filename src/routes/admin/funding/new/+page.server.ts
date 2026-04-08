import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { requirePrivilegedApiUser } from '$lib/server/access-control';
import { createFunding } from '$lib/server/funding';
import { getAllOrganizations } from '$lib/server/organizations';
import {
	parseString,
	nullableString,
	parseDateValue,
	parseNumberValue,
	parseList,
	validateRequired,
	validateDateOrder,
	validateNumberOrder,
	validateHttpUrl
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
		const user = requirePrivilegedApiUser(locals);
		const formData = await request.formData();
		const title = parseString(formData, 'title');
		const funderName = parseString(formData, 'funderName');
		const issues: string[] = [];
		validateRequired(issues, title, 'Title is required');
		validateRequired(issues, funderName, 'Funder name is required');
		validateDateOrder(
			issues,
			parseDateValue(formData, 'openDate'),
			parseDateValue(formData, 'deadline'),
			'Open date must be before the deadline.'
		);
		validateNumberOrder(
			issues,
			parseNumberValue(formData, 'amountMin'),
			parseNumberValue(formData, 'amountMax'),
			'Minimum amount cannot be greater than maximum amount.'
		);
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
		if (issues.length > 0) return fail(400, { error: issues[0], issues });

		const funding = await createFunding({
			title,
			description: nullableString(formData, 'description'),
			funderName,
			organizationId: nullableString(formData, 'organizationId'),
			fundingType: nullableString(formData, 'fundingType'),
			fundingTypes: parseList(formData, 'fundingTypes'),
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
			imageUrls: imageUrls.length > 0 ? imageUrls : null,
			status: 'draft',
			source: 'admin',
			featured: formData.has('featured'),
			unlisted: formData.has('unlisted'),
			publishedAt: null,
			adminNotes: nullableString(formData, 'adminNotes'),
			submittedById: user.id,
			reviewedById: null
		});

		throw redirect(303, `/admin/funding/${funding.id}`);
	}
};
