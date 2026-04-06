import { getOrganizationBySlug } from '$lib/server/organizations';
import { getUpcomingEventsByOrganizationId } from '$lib/server/events';
import { getFundingByOrganizationId } from '$lib/server/funding';
import { getJobsByOrganizationId } from '$lib/server/jobs';
import { getBusinessesByOrganizationId } from '$lib/server/red-pages';
import { getResourcesByOrganizationId } from '$lib/server/toolbox';
import { getVenuesByOrganizationId } from '$lib/server/venues';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	const organization = await getOrganizationBySlug(params.slug);
	if (!organization) throw error(404, 'Organization not found');

	const [events, funding, jobs, redpages, toolbox, venues] = await Promise.all([
		getUpcomingEventsByOrganizationId(organization.id),
		getFundingByOrganizationId(organization.id),
		getJobsByOrganizationId(organization.id),
		getBusinessesByOrganizationId(organization.id),
		getResourcesByOrganizationId(organization.id),
		getVenuesByOrganizationId(organization.id)
	]);

	return {
		organization,
		collections: {
			events,
			funding,
			jobs,
			redpages,
			toolbox,
			venues
		}
	};
}
