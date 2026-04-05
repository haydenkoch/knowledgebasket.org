import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import {
	approveFunding,
	deleteFunding,
	getFundingById,
	rejectFunding,
	updateFunding
} from '$lib/server/funding';
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
): 'draft' | 'pending' | 'published' | 'rejected' | 'cancelled' {
	const value = typeof raw === 'string' ? raw.trim() : '';
	if (
		value === 'pending' ||
		value === 'published' ||
		value === 'rejected' ||
		value === 'cancelled'
	) {
		return value;
	}
	return 'draft';
}

export const load: PageServerLoad = async ({ params }) => {
	const [funding, organizations] = await Promise.all([
		getFundingById(params.id),
		getAllOrganizations()
	]);
	if (!funding) throw error(404, 'Funding item not found');
	return {
		funding,
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
		const funderName = parseString(formData, 'funderName');
		if (!title) return fail(400, { error: 'Title is required' });
		if (!funderName) return fail(400, { error: 'Funder name is required' });

		const current = await getFundingById(params.id);
		if (!current) return fail(404, { error: 'Funding item not found' });

		const status = normalizeEditStatus(formData.get('status'));
		const moderationFields =
			status === 'published'
				? {
						status,
						publishedAt: current.publishedAt ? new Date(current.publishedAt) : new Date(),
						rejectedAt: null,
						rejectionReason: null,
						cancelledAt: null,
						reviewedById: locals.user?.id ?? current.reviewedById ?? null
					}
				: status === 'rejected'
					? {
							status,
							publishedAt: null,
							rejectedAt: current.rejectedAt ? new Date(current.rejectedAt) : new Date(),
							rejectionReason: nullableString(formData, 'rejectionReason'),
							cancelledAt: null,
							reviewedById: locals.user?.id ?? current.reviewedById ?? null
						}
					: status === 'cancelled'
						? {
								status,
								publishedAt: current.publishedAt ? new Date(current.publishedAt) : null,
								rejectedAt: null,
								rejectionReason: null,
								cancelledAt: new Date(),
								reviewedById: locals.user?.id ?? current.reviewedById ?? null
							}
						: {
								status,
								publishedAt: null,
								rejectedAt: null,
								rejectionReason: null,
								cancelledAt: null,
								reviewedById: current.reviewedById ?? null
							};

		await updateFunding(params.id, {
			title,
			slug: nullableString(formData, 'slug') ?? current.slug ?? undefined,
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
			adminNotes: nullableString(formData, 'adminNotes'),
			featured: formData.has('featured'),
			unlisted: formData.has('unlisted'),
			...moderationFields
		});

		return { success: true };
	},
	approve: async ({ params, locals }) => {
		await approveFunding(params.id, locals.user!.id);
		return { success: true };
	},
	reject: async ({ params, request, locals }) => {
		const formData = await request.formData();
		const reason = formData.get('reason') as string | null;
		await rejectFunding(params.id, locals.user!.id, reason ?? undefined);
		return { success: true };
	},
	delete: async ({ params }) => {
		await deleteFunding(params.id);
		throw redirect(303, '/admin/funding');
	}
};
