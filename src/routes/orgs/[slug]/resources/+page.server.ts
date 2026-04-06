import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getResourcesByOrganizationIdForWorkspace, createResource } from '$lib/server/toolbox';
import {
	canManageOrganization,
	getOrganizationWorkspaceContext
} from '$lib/server/organization-access';

export const load: PageServerLoad = async ({ locals, params }) => {
	const context = await getOrganizationWorkspaceContext(params.slug, locals.user?.id);
	if (!canManageOrganization(context.membership.role)) {
		throw error(403, 'You do not have permission to manage organization resources.');
	}

	return {
		...context,
		resources: await getResourcesByOrganizationIdForWorkspace(context.organization.id)
	};
};

export const actions: Actions = {
	create: async ({ locals, params, request }) => {
		const context = await getOrganizationWorkspaceContext(params.slug, locals.user?.id);
		if (!canManageOrganization(context.membership.role)) {
			return fail(403, { error: 'You do not have permission to create organization resources.' });
		}

		const formData = await request.formData();
		const title = formData.get('title')?.toString().trim() ?? '';
		const resourceType = formData.get('resourceType')?.toString().trim() ?? 'guide';
		if (!title) return fail(400, { error: 'Resource title is required.' });

		await createResource({
			title,
			description: formData.get('description')?.toString().trim() || null,
			sourceName: context.organization.name,
			organizationId: context.organization.id,
			resourceType,
			mediaType: resourceType,
			contentMode: formData.get('contentMode')?.toString().trim() || 'link',
			externalUrl: formData.get('externalUrl')?.toString().trim() || null,
			status: 'pending',
			source: 'organization_workspace',
			submittedById: locals.user?.id ?? null,
			reviewedById: null
		});

		return { success: true };
	}
};
