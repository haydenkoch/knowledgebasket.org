import { getVenueBySlug } from '$lib/server/venues';
import { getUpcomingEventsByVenueId } from '$lib/server/events';
import { getOrganizationById } from '$lib/server/organizations';
import { getFundingByOrganizationId } from '$lib/server/funding';
import { getJobsByOrganizationId } from '$lib/server/jobs';
import { getBusinessesByOrganizationId } from '$lib/server/red-pages';
import { getResourcesByOrganizationId } from '$lib/server/toolbox';
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	const venue = await getVenueBySlug(params.slug);
	if (!venue) throw error(404, 'Venue not found');
	const events = await getUpcomingEventsByVenueId(venue.id);
	const organization = venue.organizationId
		? await getOrganizationById(venue.organizationId)
		: null;

	const [funding, jobs, redpages, toolbox] = organization
		? await Promise.all([
				getFundingByOrganizationId(organization.id),
				getJobsByOrganizationId(organization.id),
				getBusinessesByOrganizationId(organization.id),
				getResourcesByOrganizationId(organization.id)
			])
		: [[], [], [], []];

	return {
		venue,
		organization,
		mapboxToken: env.MAPBOX_ACCESS_TOKEN ?? env.MAPBOX_TOKEN ?? null,
		collections: {
			events,
			funding,
			jobs,
			redpages,
			toolbox
		}
	};
}
