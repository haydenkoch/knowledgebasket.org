import { getOrganizationBySlug } from '$lib/server/organizations';
import { getUpcomingEventsByOrganizationId } from '$lib/server/events';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	const organization = await getOrganizationBySlug(params.slug);
	if (!organization) throw error(404, 'Organization not found');
	const events = await getUpcomingEventsByOrganizationId(organization.id);
	return { organization, events };
}
