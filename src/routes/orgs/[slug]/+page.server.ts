import type { PageServerLoad } from './$types';
import { getEventsByOrganizationIdForWorkspace } from '$lib/server/events';
import { getJobsByOrganizationIdForWorkspace } from '$lib/server/jobs';
import { getResourcesByOrganizationIdForWorkspace } from '$lib/server/toolbox';
import { listOrganizationMembers, listOrganizationInvites } from '$lib/server/organization-access';

export const load: PageServerLoad = async ({ parent }) => {
	const { organization } = await parent();
	const [events, jobs, resources, members, invites] = await Promise.all([
		getEventsByOrganizationIdForWorkspace(organization.id),
		getJobsByOrganizationIdForWorkspace(organization.id),
		getResourcesByOrganizationIdForWorkspace(organization.id),
		listOrganizationMembers(organization.id),
		listOrganizationInvites(organization.id)
	]);

	return {
		events,
		jobs,
		resources,
		members,
		invites
	};
};
