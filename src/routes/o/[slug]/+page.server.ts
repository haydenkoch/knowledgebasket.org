import { getOrganizationBySlug } from '$lib/server/organizations';
import { getUpcomingEventsByOrganizationId } from '$lib/server/events';
import { getFundingByOrganizationId } from '$lib/server/funding';
import { getJobsByOrganizationId } from '$lib/server/jobs';
import { getBusinessesByOrganizationId } from '$lib/server/red-pages';
import { getResourcesByOrganizationId } from '$lib/server/toolbox';
import { getVenuesByOrganizationId } from '$lib/server/venues';
import {
	canManageOrganization,
	cancelOrganizationClaimRequest,
	createOrganizationClaimRequest,
	getUserOrganizationClaimStatus,
	getUserOrganizationMembership
} from '$lib/server/organization-access';
import {
	followOrganization,
	isFollowingOrganization,
	unfollowOrganization
} from '$lib/server/personalization';
import { error, fail } from '@sveltejs/kit';

export async function load({ params, locals }) {
	const organization = await getOrganizationBySlug(params.slug);
	if (!organization) throw error(404, 'Organization not found');
	const user = locals?.user ?? null;

	const [
		events,
		funding,
		jobs,
		redpages,
		toolbox,
		venues,
		membership,
		viewerClaimStatus,
		isFollowing
	] = await Promise.all([
		getUpcomingEventsByOrganizationId(organization.id),
		getFundingByOrganizationId(organization.id),
		getJobsByOrganizationId(organization.id),
		getBusinessesByOrganizationId(organization.id),
		getResourcesByOrganizationId(organization.id),
		getVenuesByOrganizationId(organization.id),
		user ? getUserOrganizationMembership(user.id, organization.id) : Promise.resolve(null),
		getUserOrganizationClaimStatus(user?.id, organization.id),
		isFollowingOrganization(user?.id, organization.id)
	]);

	return {
		organization,
		viewerMembershipRole: membership?.role ?? null,
		viewerClaimStatus,
		isFollowing,
		canManageOrganization: canManageOrganization(membership?.role),
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

export const actions = {
	toggleFollow: async ({ locals, params }) => {
		if (!locals.user) {
			return fail(401, { error: 'Sign in to follow organizations.' });
		}

		const organization = await getOrganizationBySlug(params.slug);
		if (!organization) return fail(404, { error: 'Organization not found.' });

		const currentlyFollowing = await isFollowingOrganization(locals.user.id, organization.id);
		if (currentlyFollowing) {
			await unfollowOrganization(locals.user.id, organization.id);
		} else {
			await followOrganization(locals.user.id, organization.id);
		}

		return { success: true };
	},
	createClaim: async ({ locals, params, request }) => {
		if (!locals.user) {
			return fail(401, { error: 'Sign in to claim an organization.' });
		}

		const organization = await getOrganizationBySlug(params.slug);
		if (!organization) return fail(404, { error: 'Organization not found.' });

		const formData = await request.formData();
		const evidence = formData.get('evidence')?.toString().trim() ?? '';

		try {
			await createOrganizationClaimRequest({
				organizationId: organization.id,
				requesterUserId: locals.user.id,
				requestedEmail: locals.user.email,
				evidence
			});
		} catch (err) {
			return fail(400, {
				error: err instanceof Error ? err.message : 'Unable to create claim request.'
			});
		}

		return { success: true };
	},
	cancelClaim: async ({ locals, params }) => {
		if (!locals.user) {
			return fail(401, { error: 'Sign in to manage organization claims.' });
		}

		const organization = await getOrganizationBySlug(params.slug);
		if (!organization) return fail(404, { error: 'Organization not found.' });

		await cancelOrganizationClaimRequest({
			organizationId: organization.id,
			requesterUserId: locals.user.id
		});

		return { success: true };
	}
};
