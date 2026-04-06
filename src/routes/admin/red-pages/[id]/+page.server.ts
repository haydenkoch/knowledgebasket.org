import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import {
	approveBusiness,
	deleteBusiness,
	getBusinessById,
	rejectBusiness,
	updateBusiness
} from '$lib/server/red-pages';
import { getAllOrganizations } from '$lib/server/organizations';
import {
	parseString,
	nullableString,
	parseList,
	normalizeStatus,
	validateRequired,
	validateHttpUrl,
	buildModerationFields
} from '$lib/server/admin-content';
import { extractSubmissionContactFromNotes } from '$lib/server/submission-notes';

function parseSocialLinks(formData: FormData, key: string) {
	const value = parseString(formData, key);
	if (!value) return {};
	return Object.fromEntries(
		value
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter(Boolean)
			.map((line) => {
				const [platform, ...rest] = line.split(':');
				return [platform.trim().toLowerCase(), rest.join(':').trim()];
			})
			.filter(([platform, url]) => platform && url)
	);
}

export const load: PageServerLoad = async ({ params }) => {
	const [business, organizations] = await Promise.all([
		getBusinessById(params.id),
		getAllOrganizations()
	]);
	if (!business) throw error(404, 'Listing not found');
	const submissionContact = extractSubmissionContactFromNotes(business.adminNotes);
	return {
		business,
		submissionContext: {
			createdAt: business.createdAt ?? null,
			submitterName: business.submitterName ?? null,
			submitterEmail: business.submitterEmail ?? null,
			contactName: submissionContact.name ?? null,
			contactEmail: business.email ?? submissionContact.email ?? null,
			contactPhone: business.phone ?? submissionContact.phone ?? null
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
		const name = parseString(formData, 'name');
		const tribalAffiliation = parseString(formData, 'tribalAffiliation');
		const issues: string[] = [];
		validateRequired(issues, name, 'Business name is required');
		validateRequired(issues, tribalAffiliation, 'Tribal affiliation is required');
		validateHttpUrl(
			issues,
			nullableString(formData, 'website'),
			'Website must be a valid http or https URL.'
		);
		validateHttpUrl(
			issues,
			nullableString(formData, 'logoUrl'),
			'Logo URL must be a valid http or https URL.'
		);
		validateHttpUrl(
			issues,
			nullableString(formData, 'imageUrl'),
			'Image URL must be a valid http or https URL.'
		);
		if (issues.length > 0) return fail(400, { error: issues[0], issues });

		const current = await getBusinessById(params.id);
		if (!current) return fail(404, { error: 'Listing not found' });

		const status = normalizeStatus(
			formData.get('status'),
			['draft', 'pending', 'published', 'rejected'] as const,
			'draft'
		);
		const verified = formData.has('verified');
		const moderationFields = buildModerationFields(current, {
			status,
			reviewerId: locals.user?.id ?? null,
			rejectionReason: nullableString(formData, 'rejectionReason')
		});
		const becomingVerified = verified && !current.verified;

		const serviceArea = nullableString(formData, 'serviceArea');
		await updateBusiness(params.id, {
			name,
			slug: nullableString(formData, 'slug') ?? current.slug ?? undefined,
			description: nullableString(formData, 'description'),
			organizationId: nullableString(formData, 'organizationId'),
			ownerName: nullableString(formData, 'ownerName'),
			serviceType: nullableString(formData, 'serviceType'),
			serviceTypes: parseList(formData, 'serviceTypes'),
			serviceArea,
			tags: parseList(formData, 'tags'),
			tribalAffiliation,
			tribalAffiliations: parseList(formData, 'tribalAffiliations') ?? [tribalAffiliation],
			ownershipIdentity: parseList(formData, 'ownershipIdentity'),
			website: nullableString(formData, 'website'),
			email: nullableString(formData, 'email'),
			phone: nullableString(formData, 'phone'),
			address: nullableString(formData, 'address'),
			city: nullableString(formData, 'city'),
			state: nullableString(formData, 'state'),
			zip: nullableString(formData, 'zip'),
			region: nullableString(formData, 'region') ?? serviceArea,
			logoUrl: nullableString(formData, 'logoUrl'),
			imageUrl: nullableString(formData, 'imageUrl'),
			certifications: parseList(formData, 'certifications'),
			socialLinks: parseSocialLinks(formData, 'socialLinks'),
			adminNotes: nullableString(formData, 'adminNotes'),
			featured: formData.has('featured'),
			unlisted: formData.has('unlisted'),
			verified,
			verifiedAt: verified
				? becomingVerified
					? new Date()
					: current.verifiedAt
						? new Date(current.verifiedAt)
						: null
				: null,
			...moderationFields
		});

		return { success: true };
	},
	approve: async ({ params, locals }) => {
		await approveBusiness(params.id, locals.user!.id);
		return { success: true };
	},
	reject: async ({ params, request, locals }) => {
		const formData = await request.formData();
		const reason = formData.get('reason') as string | null;
		await rejectBusiness(params.id, locals.user!.id, reason ?? undefined);
		return { success: true };
	},
	delete: async ({ params }) => {
		await deleteBusiness(params.id);
		throw redirect(303, '/admin/red-pages');
	}
};
