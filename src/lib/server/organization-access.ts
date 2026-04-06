import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	organizationClaimRequests,
	organizationInvites,
	organizations,
	user,
	userOrgMemberships
} from '$lib/server/db/schema';
import {
	ORG_CLAIM_STATUSES,
	ORG_MEMBERSHIP_ROLES,
	ORG_MEMBERSHIP_STATUSES,
	type OrganizationClaimStatus,
	type OrganizationMembershipRole,
	type OrganizationMembershipStatus
} from '$lib/data/kb';
import { createNotification } from '$lib/server/personalization';

export const ORGANIZATION_ROLE_PRIORITY: Record<OrganizationMembershipRole, number> = {
	editor: 1,
	admin: 2,
	owner: 3
};

export type OrganizationMembershipRow = typeof userOrgMemberships.$inferSelect;
export type OrganizationClaimRequestRow = typeof organizationClaimRequests.$inferSelect;
export type OrganizationInviteRow = typeof organizationInvites.$inferSelect;

type ClaimStatusResult = OrganizationClaimStatus | null;

function normalizeEmailDomain(email: string): string | null {
	const [, domain] = email.toLowerCase().trim().split('@');
	return domain?.trim() || null;
}

function makeInviteToken(): string {
	return crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
}

function assertMembershipRole(role: string): asserts role is OrganizationMembershipRole {
	if (!(ORG_MEMBERSHIP_ROLES as readonly string[]).includes(role)) {
		throw new Error(`Unsupported organization membership role: ${role}`);
	}
}

function assertMembershipStatus(status: string): asserts status is OrganizationMembershipStatus {
	if (!(ORG_MEMBERSHIP_STATUSES as readonly string[]).includes(status)) {
		throw new Error(`Unsupported organization membership status: ${status}`);
	}
}

function assertClaimStatus(status: string): asserts status is OrganizationClaimStatus {
	if (!(ORG_CLAIM_STATUSES as readonly string[]).includes(status)) {
		throw new Error(`Unsupported organization claim status: ${status}`);
	}
}

export function canManageOrganization(role: string | null | undefined): boolean {
	return role === 'editor' || role === 'admin' || role === 'owner';
}

export function canManageOrganizationSettings(role: string | null | undefined): boolean {
	return role === 'admin' || role === 'owner';
}

export function canManageOrganizationTeam(role: string | null | undefined): boolean {
	return role === 'owner';
}

export async function getUserOrganizationMembership(userId: string, organizationId: string) {
	const [membership] = await db
		.select()
		.from(userOrgMemberships)
		.where(
			and(
				eq(userOrgMemberships.userId, userId),
				eq(userOrgMemberships.organizationId, organizationId),
				eq(userOrgMemberships.status, 'active')
			)
		)
		.limit(1);

	if (!membership) return null;
	assertMembershipRole(membership.role);
	assertMembershipStatus(membership.status);
	return membership;
}

export async function requireOrganizationRole(
	userId: string | undefined,
	organizationId: string,
	minimumRole: OrganizationMembershipRole
) {
	if (!userId) throw error(401, 'Authentication required');

	const membership = await getUserOrganizationMembership(userId, organizationId);
	if (!membership) throw error(403, 'Organization membership required');

	assertMembershipRole(membership.role);
	if (ORGANIZATION_ROLE_PRIORITY[membership.role] < ORGANIZATION_ROLE_PRIORITY[minimumRole]) {
		throw error(403, 'Insufficient organization permissions');
	}

	return membership;
}

export async function listOrganizationMembers(organizationId: string) {
	const rows = await db
		.select({
			membership: userOrgMemberships,
			userName: user.name,
			userEmail: user.email
		})
		.from(userOrgMemberships)
		.innerJoin(user, eq(userOrgMemberships.userId, user.id))
		.where(
			and(
				eq(userOrgMemberships.organizationId, organizationId),
				eq(userOrgMemberships.status, 'active')
			)
		)
		.orderBy(user.name);

	return rows.map((row) => ({
		...row.membership,
		userName: row.userName,
		userEmail: row.userEmail
	}));
}

export async function listOrganizationInvites(organizationId: string) {
	return db
		.select()
		.from(organizationInvites)
		.where(
			and(
				eq(organizationInvites.organizationId, organizationId),
				isNull(organizationInvites.revokedAt),
				isNull(organizationInvites.acceptedAt)
			)
		)
		.orderBy(desc(organizationInvites.createdAt));
}

export async function listOrganizationClaimRequests(organizationId: string) {
	const rows = await db
		.select({
			claim: organizationClaimRequests,
			requesterName: user.name,
			requesterEmail: user.email
		})
		.from(organizationClaimRequests)
		.innerJoin(user, eq(organizationClaimRequests.requesterUserId, user.id))
		.where(eq(organizationClaimRequests.organizationId, organizationId))
		.orderBy(desc(organizationClaimRequests.createdAt));

	return rows.map((row) => ({
		...row.claim,
		requesterName: row.requesterName,
		requesterEmail: row.requesterEmail
	}));
}

export async function listUserOrganizations(userId: string) {
	const rows = await db
		.select({
			membership: userOrgMemberships,
			organization: organizations
		})
		.from(userOrgMemberships)
		.innerJoin(organizations, eq(userOrgMemberships.organizationId, organizations.id))
		.where(and(eq(userOrgMemberships.userId, userId), eq(userOrgMemberships.status, 'active')))
		.orderBy(organizations.name);

	return rows.map((row) => ({
		...row.membership,
		organization: row.organization
	}));
}

export async function listUserOrganizationClaims(userId: string) {
	const rows = await db
		.select({
			claim: organizationClaimRequests,
			organization: organizations
		})
		.from(organizationClaimRequests)
		.innerJoin(organizations, eq(organizationClaimRequests.organizationId, organizations.id))
		.where(eq(organizationClaimRequests.requesterUserId, userId))
		.orderBy(desc(organizationClaimRequests.createdAt));

	return rows.map((row) => ({
		...row.claim,
		organization: row.organization
	}));
}

export async function getUserOrganizationClaimStatus(
	userId: string | undefined,
	organizationId: string
): Promise<ClaimStatusResult> {
	if (!userId) return null;

	const [claim] = await db
		.select({ status: organizationClaimRequests.status })
		.from(organizationClaimRequests)
		.where(
			and(
				eq(organizationClaimRequests.requesterUserId, userId),
				eq(organizationClaimRequests.organizationId, organizationId)
			)
		)
		.orderBy(desc(organizationClaimRequests.createdAt))
		.limit(1);

	if (!claim) return null;
	assertClaimStatus(claim.status);
	return claim.status;
}

export async function createOrganizationClaimRequest(input: {
	organizationId: string;
	requesterUserId: string;
	requestedEmail: string;
	evidence?: string | null;
}) {
	const existingMembership = await getUserOrganizationMembership(
		input.requesterUserId,
		input.organizationId
	);
	if (existingMembership) {
		throw new Error('You already manage this organization.');
	}

	const [pendingClaim] = await db
		.select()
		.from(organizationClaimRequests)
		.where(
			and(
				eq(organizationClaimRequests.organizationId, input.organizationId),
				eq(organizationClaimRequests.requesterUserId, input.requesterUserId),
				eq(organizationClaimRequests.status, 'pending')
			)
		)
		.limit(1);

	if (pendingClaim) {
		return pendingClaim;
	}

	const emailDomain = normalizeEmailDomain(input.requestedEmail);
	const [created] = await db
		.insert(organizationClaimRequests)
		.values({
			organizationId: input.organizationId,
			requesterUserId: input.requesterUserId,
			status: 'pending',
			requestedEmail: input.requestedEmail,
			emailDomain,
			evidence: input.evidence?.trim() || null
		})
		.returning();

	if (!created) throw new Error('Unable to create organization claim request');
	return created;
}

export async function cancelOrganizationClaimRequest(input: {
	organizationId: string;
	requesterUserId: string;
}) {
	const [updated] = await db
		.update(organizationClaimRequests)
		.set({
			status: 'cancelled',
			updatedAt: new Date()
		})
		.where(
			and(
				eq(organizationClaimRequests.organizationId, input.organizationId),
				eq(organizationClaimRequests.requesterUserId, input.requesterUserId),
				eq(organizationClaimRequests.status, 'pending')
			)
		)
		.returning();

	return updated ?? null;
}

export async function reviewOrganizationClaimRequest(input: {
	claimRequestId: string;
	reviewerId: string;
	status: Extract<OrganizationClaimStatus, 'approved' | 'denied'>;
	reviewNotes?: string | null;
	membershipRole?: OrganizationMembershipRole;
}) {
	const membershipRole = input.membershipRole ?? 'owner';
	assertMembershipRole(membershipRole);

	return db.transaction(async (tx) => {
		const [claim] = await tx
			.select()
			.from(organizationClaimRequests)
			.where(eq(organizationClaimRequests.id, input.claimRequestId))
			.limit(1);

		if (!claim) throw new Error('Claim request not found');
		if (claim.status !== 'pending') return claim;

		const [updatedClaim] = await tx
			.update(organizationClaimRequests)
			.set({
				status: input.status,
				reviewNotes: input.reviewNotes?.trim() || null,
				reviewedById: input.reviewerId,
				reviewedAt: new Date(),
				updatedAt: new Date()
			})
			.where(eq(organizationClaimRequests.id, input.claimRequestId))
			.returning();

		if (!updatedClaim) throw new Error('Unable to update claim request');

		if (input.status === 'approved') {
			const [existingMembership] = await tx
				.select()
				.from(userOrgMemberships)
				.where(
					and(
						eq(userOrgMemberships.organizationId, claim.organizationId),
						eq(userOrgMemberships.userId, claim.requesterUserId)
					)
				)
				.limit(1);

			if (existingMembership) {
				await tx
					.update(userOrgMemberships)
					.set({
						role: membershipRole,
						status: 'active',
						acceptedAt: existingMembership.acceptedAt ?? new Date(),
						revokedAt: null
					})
					.where(eq(userOrgMemberships.id, existingMembership.id));
			} else {
				await tx.insert(userOrgMemberships).values({
					userId: claim.requesterUserId,
					organizationId: claim.organizationId,
					role: membershipRole,
					status: 'active',
					acceptedAt: new Date()
				});
			}
		}

		const [orgRow] = await tx
			.select({ name: organizations.name })
			.from(organizations)
			.where(eq(organizations.id, claim.organizationId))
			.limit(1);

		const orgName = orgRow?.name ?? 'this organization';
		await createNotification({
			userId: claim.requesterUserId,
			type: `organization_claim_${input.status}`,
			title:
				input.status === 'approved'
					? `Claim approved for ${orgName}`
					: `Claim update for ${orgName}`,
			message:
				input.status === 'approved'
					? `You can now manage ${orgName} as part of your organization workspace.`
					: `Your organization claim request for ${orgName} was not approved.`,
			link: `/account/organizations`
		});

		return updatedClaim;
	});
}

export async function inviteOrganizationMember(input: {
	organizationId: string;
	email: string;
	role: OrganizationMembershipRole;
	invitedById: string;
}) {
	assertMembershipRole(input.role);
	const normalizedEmail = input.email.trim().toLowerCase();
	const token = makeInviteToken();
	const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

	const [invite] = await db
		.insert(organizationInvites)
		.values({
			organizationId: input.organizationId,
			email: normalizedEmail,
			role: input.role,
			token,
			invitedById: input.invitedById,
			expiresAt
		})
		.returning();

	if (!invite) throw new Error('Unable to create organization invite');

	const [existingUser] = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.email, normalizedEmail))
		.limit(1);

	if (existingUser) {
		const [organizationRow] = await db
			.select({ name: organizations.name })
			.from(organizations)
			.where(eq(organizations.id, input.organizationId))
			.limit(1);

		await createNotification({
			userId: existingUser.id,
			type: 'organization_invite',
			title: `Invitation to join ${organizationRow?.name ?? 'an organization'}`,
			message: 'You have been invited to join an organization workspace.',
			link: `/org-invites/${token}`
		});
	}

	return invite;
}

export async function acceptOrganizationInvite(token: string, userId: string) {
	return db.transaction(async (tx) => {
		const [invite] = await tx
			.select()
			.from(organizationInvites)
			.where(eq(organizationInvites.token, token))
			.limit(1);

		if (!invite) throw new Error('Invite not found');
		if (invite.revokedAt) throw new Error('Invite has been revoked');
		if (invite.acceptedAt) throw new Error('Invite has already been accepted');
		if (invite.expiresAt.getTime() < Date.now()) throw new Error('Invite has expired');

		const [invitee] = await tx.select().from(user).where(eq(user.id, userId)).limit(1);
		if (!invitee) throw new Error('User not found');
		if (invitee.email.toLowerCase() !== invite.email.toLowerCase()) {
			throw new Error('Invite email does not match the signed-in account');
		}

		const [existingMembership] = await tx
			.select()
			.from(userOrgMemberships)
			.where(
				and(
					eq(userOrgMemberships.userId, userId),
					eq(userOrgMemberships.organizationId, invite.organizationId)
				)
			)
			.limit(1);

		if (existingMembership) {
			await tx
				.update(userOrgMemberships)
				.set({
					role: invite.role,
					status: 'active',
					invitedById: invite.invitedById,
					acceptedAt: new Date(),
					revokedAt: null
				})
				.where(eq(userOrgMemberships.id, existingMembership.id));
		} else {
			await tx.insert(userOrgMemberships).values({
				userId,
				organizationId: invite.organizationId,
				role: invite.role,
				status: 'active',
				invitedById: invite.invitedById,
				acceptedAt: new Date()
			});
		}

		const [acceptedInvite] = await tx
			.update(organizationInvites)
			.set({ acceptedAt: new Date() })
			.where(eq(organizationInvites.id, invite.id))
			.returning();

		return acceptedInvite ?? invite;
	});
}

export async function revokeOrganizationMembership(input: {
	organizationId: string;
	memberUserId: string;
	reviewerRole: OrganizationMembershipRole;
}) {
	const [membership] = await db
		.select()
		.from(userOrgMemberships)
		.where(
			and(
				eq(userOrgMemberships.organizationId, input.organizationId),
				eq(userOrgMemberships.userId, input.memberUserId),
				eq(userOrgMemberships.status, 'active')
			)
		)
		.limit(1);
	if (!membership) return null;

	if (input.reviewerRole !== 'owner') {
		throw new Error('Only organization owners can revoke memberships');
	}

	const [updated] = await db
		.update(userOrgMemberships)
		.set({
			status: 'revoked',
			revokedAt: new Date()
		})
		.where(
			and(
				eq(userOrgMemberships.organizationId, input.organizationId),
				eq(userOrgMemberships.userId, input.memberUserId)
			)
		)
		.returning();

	return updated ?? null;
}

export async function getOrganizationsForUserBySlugs(userId: string, slugs: string[]) {
	if (slugs.length === 0) return [];

	const rows = await db
		.select({
			membership: userOrgMemberships,
			organization: organizations
		})
		.from(userOrgMemberships)
		.innerJoin(organizations, eq(userOrgMemberships.organizationId, organizations.id))
		.where(
			and(
				eq(userOrgMemberships.userId, userId),
				eq(userOrgMemberships.status, 'active'),
				inArray(organizations.slug, slugs)
			)
		);

	return rows;
}

export async function getOrganizationWorkspaceContext(slug: string, userId: string | undefined) {
	const [organization] = await db
		.select()
		.from(organizations)
		.where(eq(organizations.slug, slug))
		.limit(1);
	if (!organization) throw error(404, 'Organization not found');

	const membership = userId ? await getUserOrganizationMembership(userId, organization.id) : null;
	if (!membership) throw error(403, 'Organization membership required');

	return { organization, membership };
}
