import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import {
	approveResource,
	deleteResource,
	getResourceById,
	rejectResource,
	updateResource
} from '$lib/server/toolbox';
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
): 'draft' | 'pending' | 'published' | 'rejected' {
	const value = typeof raw === 'string' ? raw.trim() : '';
	if (value === 'pending' || value === 'published' || value === 'rejected') return value;
	return 'draft';
}

export const load: PageServerLoad = async ({ params }) => {
	const [resource, organizations] = await Promise.all([
		getResourceById(params.id),
		getAllOrganizations()
	]);
	if (!resource) throw error(404, 'Resource not found');
	return {
		resource,
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
		const resourceType = parseString(formData, 'resourceType');
		const contentMode = parseString(formData, 'contentMode') || 'link';

		if (!title) return fail(400, { error: 'Title is required' });
		if (!resourceType) return fail(400, { error: 'Resource type is required' });

		const current = await getResourceById(params.id);
		if (!current) return fail(404, { error: 'Resource not found' });

		const status = normalizeEditStatus(formData.get('status'));
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

		const primaryCategory = nullableString(formData, 'category');
		const extraCategories = parseList(formData, 'categories');
		const categories = [
			...(primaryCategory ? [primaryCategory] : []),
			...(extraCategories ?? [])
		].filter((value, index, array) => array.indexOf(value) === index);

		await updateResource(params.id, {
			title,
			slug: nullableString(formData, 'slug') ?? current.slug ?? undefined,
			description: nullableString(formData, 'description'),
			body: nullableString(formData, 'body'),
			sourceName: nullableString(formData, 'sourceName'),
			organizationId: nullableString(formData, 'organizationId'),
			resourceType,
			mediaType: nullableString(formData, 'mediaType') ?? resourceType,
			category: primaryCategory,
			categories: categories.length > 0 ? categories : null,
			tags: parseList(formData, 'tags'),
			contentMode,
			externalUrl: nullableString(formData, 'externalUrl'),
			fileUrl: nullableString(formData, 'fileUrl'),
			imageUrl: nullableString(formData, 'imageUrl'),
			author: nullableString(formData, 'author'),
			publishDate: parseDateValue(formData, 'publishDate'),
			lastReviewedAt: parseDateValue(formData, 'lastReviewedAt'),
			adminNotes: nullableString(formData, 'adminNotes'),
			featured: formData.has('featured'),
			unlisted: formData.has('unlisted'),
			...moderationFields
		});

		return { success: true };
	},
	approve: async ({ params, locals }) => {
		await approveResource(params.id, locals.user!.id);
		return { success: true };
	},
	reject: async ({ params, request, locals }) => {
		const formData = await request.formData();
		const reason = formData.get('reason') as string | null;
		await rejectResource(params.id, locals.user!.id, reason ?? undefined);
		return { success: true };
	},
	delete: async ({ params }) => {
		await deleteResource(params.id);
		throw redirect(303, '/admin/toolbox');
	}
};
