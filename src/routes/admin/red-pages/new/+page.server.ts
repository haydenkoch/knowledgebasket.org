import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createBusiness } from '$lib/server/red-pages';
import { getAllOrganizations } from '$lib/server/organizations';
import {
	parseString,
	nullableString,
	parseList,
	validateRequired,
	validateHttpUrl
} from '$lib/server/admin-content';

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

		const serviceArea = nullableString(formData, 'serviceArea');
		const verified = formData.has('verified');
		const business = await createBusiness({
			name,
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
			status: 'draft',
			source: 'admin',
			featured: formData.has('featured'),
			unlisted: formData.has('unlisted'),
			publishedAt: null,
			adminNotes: nullableString(formData, 'adminNotes'),
			submittedById: locals.user?.id ?? null,
			reviewedById: null,
			verified,
			verifiedAt: verified ? new Date() : null
		});

		throw redirect(303, `/admin/red-pages/${business.id}`);
	}
};
