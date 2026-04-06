import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createEvent, getEventsByOrganizationIdForWorkspace } from '$lib/server/events';
import {
	canManageOrganization,
	getOrganizationWorkspaceContext
} from '$lib/server/organization-access';

export const load: PageServerLoad = async ({ locals, params }) => {
	const context = await getOrganizationWorkspaceContext(params.slug, locals.user?.id);
	if (!canManageOrganization(context.membership.role)) {
		throw error(403, 'You do not have permission to manage organization events.');
	}

	return {
		...context,
		events: await getEventsByOrganizationIdForWorkspace(context.organization.id)
	};
};

export const actions: Actions = {
	create: async ({ locals, params, request }) => {
		const context = await getOrganizationWorkspaceContext(params.slug, locals.user?.id);
		if (!canManageOrganization(context.membership.role)) {
			return fail(403, { error: 'You do not have permission to create organization events.' });
		}

		const formData = await request.formData();
		const title = formData.get('title')?.toString().trim() ?? '';
		if (!title) return fail(400, { error: 'Event title is required.' });

		await createEvent({
			title,
			description: formData.get('description')?.toString().trim() || undefined,
			location: formData.get('location')?.toString().trim() || undefined,
			eventUrl: formData.get('eventUrl')?.toString().trim() || undefined,
			startDate: formData.get('startDate')?.toString() || undefined,
			endDate: formData.get('endDate')?.toString() || undefined,
			hostOrg: context.organization.name,
			organizationId: context.organization.id,
			contactEmail: locals.user?.email,
			contactName: locals.user?.name ?? undefined,
			submittedById: locals.user?.id,
			status: 'pending',
			source: 'organization_workspace'
		});

		return { success: true };
	}
};
