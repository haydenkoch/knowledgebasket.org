import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createResource } from '$lib/server/toolbox';
import { getAllOrganizations } from '$lib/server/organizations';
import {
	parseString,
	nullableString,
	parseDateValue,
	parseList,
	validateRequired,
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
		const formData = await request.formData();
		const title = parseString(formData, 'title');
		const resourceType = parseString(formData, 'resourceType');
		const contentMode = parseString(formData, 'contentMode') || 'link';

		const issues: string[] = [];
		validateRequired(issues, title, 'Title is required');
		validateRequired(issues, resourceType, 'Resource type is required');
		const externalUrl = nullableString(formData, 'externalUrl');
		const fileUrl = nullableString(formData, 'fileUrl');
		const imageUrl = nullableString(formData, 'imageUrl');
		validateHttpUrl(issues, imageUrl, 'Image URL must be a valid http or https URL.');
		const imageUrlsRaw = (formData.get('imageUrls') as string) ?? '';
		const imageUrls = imageUrlsRaw
			? imageUrlsRaw
					.split(/\r?\n/)
					.map((s) => s.trim())
					.filter(Boolean)
			: [];
		if (contentMode === 'link') {
			validateRequired(issues, externalUrl, 'External URL is required for link resources.');
			validateHttpUrl(issues, externalUrl, 'External URL must be a valid http or https URL.');
		}
		if (contentMode === 'file') {
			validateRequired(issues, fileUrl, 'File URL is required for file resources.');
			validateHttpUrl(issues, fileUrl, 'File URL must be a valid http or https URL.');
		}
		if (contentMode === 'hosted' && !nullableString(formData, 'body')) {
			issues.push('Hosted resources need body content.');
		}
		if (issues.length > 0) return fail(400, { error: issues[0], issues });

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
			externalUrl,
			fileUrl,
			imageUrl,
			imageUrls: imageUrls.length > 0 ? imageUrls : null,
			author: nullableString(formData, 'author'),
			publishDate: parseDateValue(formData, 'publishDate'),
			lastReviewedAt: parseDateValue(formData, 'lastReviewedAt'),
			status: 'draft',
			source: 'admin',
			featured: formData.has('featured'),
			unlisted: formData.has('unlisted'),
			publishedAt: null,
			adminNotes: nullableString(formData, 'adminNotes'),
			submittedById: locals.user?.id ?? null,
			reviewedById: null
		});

		throw redirect(303, `/admin/toolbox/${resource.id}`);
	}
};
