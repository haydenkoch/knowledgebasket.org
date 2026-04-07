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
import {
	parseString,
	nullableString,
	parseDateValue,
	parseList,
	normalizeStatus,
	validateRequired,
	validateHttpUrl,
	buildModerationFields
} from '$lib/server/admin-content';
import { extractSubmissionContactFromNotes } from '$lib/server/submission-notes';

export const load: PageServerLoad = async ({ params }) => {
	const [resource, organizations] = await Promise.all([
		getResourceById(params.id),
		getAllOrganizations()
	]);
	if (!resource) throw error(404, 'Resource not found');
	const submissionContact = extractSubmissionContactFromNotes(resource.adminNotes);
	return {
		resource,
		submissionContext: {
			createdAt: resource.createdAt ?? null,
			submitterName: resource.submitterName ?? null,
			submitterEmail: resource.submitterEmail ?? null,
			contactName: submissionContact.name ?? null,
			contactEmail: submissionContact.email ?? null,
			contactPhone: submissionContact.phone ?? null
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

		const current = await getResourceById(params.id);
		if (!current) return fail(404, { error: 'Resource not found' });

		const status = normalizeStatus(
			formData.get('status'),
			['draft', 'pending', 'published', 'rejected'] as const,
			'draft'
		);
		const moderationFields = buildModerationFields(current, {
			status,
			reviewerId: locals.user?.id ?? null,
			rejectionReason: nullableString(formData, 'rejectionReason')
		});

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
			externalUrl,
			fileUrl,
			imageUrl,
			imageUrls: imageUrls.length > 0 ? imageUrls : null,
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
