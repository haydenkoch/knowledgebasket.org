import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createJob, getJobsByOrganizationIdForWorkspace } from '$lib/server/jobs';
import {
	canManageOrganization,
	getOrganizationWorkspaceContext
} from '$lib/server/organization-access';

export const load: PageServerLoad = async ({ locals, params }) => {
	const context = await getOrganizationWorkspaceContext(params.slug, locals.user?.id);
	if (!canManageOrganization(context.membership.role)) {
		throw error(403, 'You do not have permission to manage organization jobs.');
	}

	return {
		...context,
		jobs: await getJobsByOrganizationIdForWorkspace(context.organization.id)
	};
};

export const actions: Actions = {
	create: async ({ locals, params, request }) => {
		const context = await getOrganizationWorkspaceContext(params.slug, locals.user?.id);
		if (!canManageOrganization(context.membership.role)) {
			return fail(403, { error: 'You do not have permission to create organization jobs.' });
		}

		const formData = await request.formData();
		const title = formData.get('title')?.toString().trim() ?? '';
		if (!title) return fail(400, { error: 'Job title is required.' });

		await createJob({
			title,
			description: formData.get('description')?.toString().trim() || null,
			employerName: context.organization.name,
			organizationId: context.organization.id,
			applyUrl: formData.get('applyUrl')?.toString().trim() || null,
			applicationDeadline: formData.get('applicationDeadline')?.toString()
				? new Date(`${formData.get('applicationDeadline')?.toString()}T00:00:00`)
				: null,
			location: formData.get('location')?.toString().trim() || null,
			status: 'pending',
			source: 'organization_workspace',
			submittedById: locals.user?.id ?? null,
			reviewedById: null
		});

		return { success: true };
	}
};
