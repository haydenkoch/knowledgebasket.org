import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createResource } from '$lib/server/toolbox';
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
		const resourceType = parseString(formData, 'resourceType');
		const contentMode = parseString(formData, 'contentMode') || 'link';

		if (!title) return fail(400, { error: 'Title is required' });
		if (!resourceType) return fail(400, { error: 'Resource type is required' });

		const status = normalizeCreateStatus(formData.get('status'));
		const primaryCategory = nullableString(formData, 'category');
		const extraCategories = parseList(formData, 'categories');
		const categories = [
			...(primaryCategory ? [primaryCategory] : []),
			...(extraCategories ?? [])
		].filter((value, index, array) => array.indexOf(value) === index);
		const resource = await createResource({
			title,
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
			status,
			source: 'admin',
			featured: formData.has('featured'),
			unlisted: formData.has('unlisted'),
			publishedAt: status === 'published' ? new Date() : null,
			adminNotes: nullableString(formData, 'adminNotes'),
			submittedById: locals.user?.id ?? null,
			reviewedById: status === 'published' ? (locals.user?.id ?? null) : null
		});

		throw redirect(303, `/admin/toolbox/${resource.id}`);
	}
};
