import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireAuthenticatedUser } from '$lib/server/access-control';
import { db } from '$lib/server/db';
import { organizationInvites, organizations } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { acceptOrganizationInvite } from '$lib/server/organization-access';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	if (!locals.user) {
		throw redirect(303, `/auth/login?redirect=${encodeURIComponent(url.pathname)}`);
	}

	const [invite] = await db
		.select({
			invite: organizationInvites,
			organizationName: organizations.name,
			organizationSlug: organizations.slug
		})
		.from(organizationInvites)
		.innerJoin(organizations, eq(organizationInvites.organizationId, organizations.id))
		.where(eq(organizationInvites.token, params.token))
		.limit(1);

	if (!invite) throw error(404, 'Invite not found');

	return invite;
};

export const actions: Actions = {
	accept: async ({ locals, params }) => {
		const user = requireAuthenticatedUser(locals);
		const invite = await acceptOrganizationInvite(params.token, user.id);
		throw redirect(303, `/account/organizations?inviteAccepted=${invite.organizationId}`);
	}
};
