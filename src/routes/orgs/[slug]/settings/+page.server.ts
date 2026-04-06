import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	canManageOrganizationSettings,
	getOrganizationWorkspaceContext
} from '$lib/server/organization-access';
import { updateOrganization } from '$lib/server/organizations';

export const load: PageServerLoad = async ({ locals, params }) => {
	const context = await getOrganizationWorkspaceContext(params.slug, locals.user?.id);
	if (!canManageOrganizationSettings(context.membership.role)) {
		throw error(403, 'You do not have permission to edit organization settings.');
	}

	return context;
};

export const actions: Actions = {
	save: async ({ locals, params, request }) => {
		const context = await getOrganizationWorkspaceContext(params.slug, locals.user?.id);
		if (!canManageOrganizationSettings(context.membership.role)) {
			return fail(403, { error: 'You do not have permission to edit organization settings.' });
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim() ?? '';
		if (!name) return fail(400, { error: 'Organization name is required.' });

		await updateOrganization(context.organization.id, {
			name,
			description: formData.get('description')?.toString().trim() || null,
			website: formData.get('website')?.toString().trim() || null,
			email: formData.get('email')?.toString().trim() || null,
			phone: formData.get('phone')?.toString().trim() || null,
			region: formData.get('region')?.toString().trim() || null
		});

		return { success: true };
	}
};
