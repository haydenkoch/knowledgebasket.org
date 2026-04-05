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

function normalizeEditStatus(
	raw: FormDataEntryValue | null
): 'draft' | 'pending' | 'published' | 'rejected' {
	const value = typeof raw === 'string' ? raw.trim() : '';
	if (value === 'pending' || value === 'published' || value === 'rejected') return value;
	return 'draft';
}

export const load: PageServerLoad = async ({ params }) => {
	const [business, organizations] = await Promise.all([
		getBusinessById(params.id),
		getAllOrganizations()
	]);
	if (!business) throw error(404, 'Listing not found');
	return {
		business,
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
		if (!name) return fail(400, { error: 'Business name is required' });
		if (!tribalAffiliation) return fail(400, { error: 'Tribal affiliation is required' });

		const current = await getBusinessById(params.id);
		if (!current) return fail(404, { error: 'Listing not found' });

		const status = normalizeEditStatus(formData.get('status'));
		const verified = formData.has('verified');
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
			verifiedAt: verified ? new Date() : null,
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
