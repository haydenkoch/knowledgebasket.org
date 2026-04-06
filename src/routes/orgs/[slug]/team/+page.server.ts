import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	canManageOrganizationTeam,
	getOrganizationWorkspaceContext,
	inviteOrganizationMember,
	listOrganizationClaimRequests,
	listOrganizationInvites,
	listOrganizationMembers,
	revokeOrganizationMembership
} from '$lib/server/organization-access';

export const load: PageServerLoad = async ({ locals, params }) => {
	const context = await getOrganizationWorkspaceContext(params.slug, locals.user?.id);
	if (!canManageOrganizationTeam(context.membership.role)) {
		throw error(403, 'Only organization owners can manage team access.');
	}

	const [members, invites, claims] = await Promise.all([
		listOrganizationMembers(context.organization.id),
		listOrganizationInvites(context.organization.id),
		listOrganizationClaimRequests(context.organization.id)
	]);

	return { ...context, members, invites, claims };
};

export const actions: Actions = {
	invite: async ({ locals, params, request, url }) => {
		const context = await getOrganizationWorkspaceContext(params.slug, locals.user?.id);
		if (!canManageOrganizationTeam(context.membership.role)) {
			return fail(403, { error: 'Only organization owners can invite teammates.' });
		}

		const formData = await request.formData();
		const email = formData.get('email')?.toString().trim() ?? '';
		const role = formData.get('role')?.toString().trim() ?? 'editor';
		if (!email) return fail(400, { error: 'Invite email is required.' });

		const invite = await inviteOrganizationMember({
			organizationId: context.organization.id,
			email,
			role: role === 'admin' || role === 'owner' ? role : 'editor',
			invitedById: locals.user!.id
		});

		return {
			success: true,
			inviteLink: `${url.origin}/org-invites/${invite.token}`
		};
	},
	revoke: async ({ locals, params, request }) => {
		const context = await getOrganizationWorkspaceContext(params.slug, locals.user?.id);
		if (!canManageOrganizationTeam(context.membership.role)) {
			return fail(403, { error: 'Only organization owners can remove teammates.' });
		}

		const formData = await request.formData();
		const memberUserId = formData.get('memberUserId')?.toString().trim() ?? '';
		if (!memberUserId) return fail(400, { error: 'Member is required.' });

		await revokeOrganizationMembership({
			organizationId: context.organization.id,
			memberUserId,
			reviewerRole: context.membership.role as 'editor' | 'admin' | 'owner'
		});

		return { success: true };
	}
};
