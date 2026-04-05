import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createBusiness } from '$lib/server/red-pages';
import { getAllOrganizations } from '$lib/server/organizations';

function parseString(formData: FormData, key: string) {
	return formData.get(key)?.toString().trim() ?? '';
}

function nullableString(formData: FormData, key: string) {
	const value = parseString(formData, key);
	return value ? value : null;
}

function parseList(formData: FormData, key: string) {
	const value = parseString(formData, key);
	const items = value
		.split(/\r?\n|,/)
		.map((entry) => entry.trim())
		.filter(Boolean);
	return items.length > 0 ? items : null;
}

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
		const name = parseString(formData, 'name');
		const tribalAffiliation = parseString(formData, 'tribalAffiliation');

		if (!name) return fail(400, { error: 'Business name is required' });
		if (!tribalAffiliation) return fail(400, { error: 'Tribal affiliation is required' });

		const serviceArea = nullableString(formData, 'serviceArea');
		const status = normalizeCreateStatus(formData.get('status'));
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
			status,
			source: 'admin',
			featured: formData.has('featured'),
			unlisted: formData.has('unlisted'),
			publishedAt: status === 'published' ? new Date() : null,
			adminNotes: nullableString(formData, 'adminNotes'),
			submittedById: locals.user?.id ?? null,
			reviewedById: status === 'published' ? (locals.user?.id ?? null) : null,
			verified,
			verifiedAt: verified ? new Date() : null
		});

		throw redirect(303, `/admin/red-pages/${business.id}`);
	}
};
