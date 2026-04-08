import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { requirePrivilegedApiUser } from '$lib/server/access-control';
import {
	approveFunding,
	deleteFunding,
	getFundingById,
	rejectFunding,
	updateFunding
} from '$lib/server/funding';
import { getAllOrganizations } from '$lib/server/organizations';
import {
	parseString,
	nullableString,
	parseDateValue,
	parseNumberValue,
	parseList,
	normalizeStatus,
	validateRequired,
	validateDateOrder,
	validateNumberOrder,
	validateHttpUrl,
	buildModerationFields
} from '$lib/server/admin-content';
import { extractSubmissionContactFromNotes } from '$lib/server/submission-notes';

export const load: PageServerLoad = async ({ params }) => {
	const [funding, organizations] = await Promise.all([
		getFundingById(params.id),
		getAllOrganizations()
	]);
	if (!funding) throw error(404, 'Funding item not found');
	const submissionContact = extractSubmissionContactFromNotes(funding.adminNotes);
	return {
		funding,
		submissionContext: {
			createdAt: funding.createdAt ?? null,
			submitterName: funding.submitterName ?? null,
			submitterEmail: funding.submitterEmail ?? null,
			contactName: funding.contactName ?? submissionContact.name ?? null,
			contactEmail: funding.contactEmail ?? submissionContact.email ?? null,
			contactPhone: funding.contactPhone ?? submissionContact.phone ?? null
		},
		organizations: organizations.map((organization) => ({
			id: organization.id,
			name: organization.name
		}))
	};
};

export const actions: Actions = {
	update: async ({ params, request, locals }) => {
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

		const current = await getFundingById(params.id);
		if (!current) return fail(404, { error: 'Funding item not found' });

		const status = normalizeStatus(
			formData.get('status'),
			['draft', 'pending', 'published', 'rejected', 'cancelled'] as const,
			'draft'
		);
		const moderationFields = buildModerationFields(current, {
			status,
			reviewerId: user.id,
			rejectionReason: nullableString(formData, 'rejectionReason'),
			allowCancelled: true,
			preservePublishedOnCancel: true
		});

		await updateFunding(params.id, {
			title,
			slug: nullableString(formData, 'slug') ?? current.slug ?? undefined,
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
			adminNotes: nullableString(formData, 'adminNotes'),
			featured: formData.has('featured'),
			unlisted: formData.has('unlisted'),
			...moderationFields
		});

		return { success: true };
	},
	approve: async ({ params, locals }) => {
		const user = requirePrivilegedApiUser(locals);
		await approveFunding(params.id, user.id);
		return { success: true };
	},
	reject: async ({ params, request, locals }) => {
		const user = requirePrivilegedApiUser(locals);
		const formData = await request.formData();
		const reason = formData.get('reason') as string | null;
		await rejectFunding(params.id, user.id, reason ?? undefined);
		return { success: true };
	},
	delete: async ({ params, locals }) => {
		requirePrivilegedApiUser(locals);
		await deleteFunding(params.id);
		throw redirect(303, '/admin/funding');
	}
};
