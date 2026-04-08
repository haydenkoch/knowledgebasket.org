import { beforeEach, describe, expect, it, vi } from 'vitest';

const organization = { id: 'org-1', slug: 'river-house', name: 'River House' };

const getOrganizationBySlug = vi.fn(async () => organization);
const getUpcomingEventsByOrganizationId = vi.fn(async () => []);
const getFundingByOrganizationId = vi.fn(async () => []);
const getJobsByOrganizationId = vi.fn(async () => []);
const getBusinessesByOrganizationId = vi.fn(async () => []);
const getResourcesByOrganizationId = vi.fn(async () => []);
const getVenuesByOrganizationId = vi.fn(async () => []);
const getUserOrganizationMembership = vi.fn<
	(args: string, organizationId: string) => Promise<{ role: string } | null>
>(async () => null);
const getUserOrganizationClaimStatus = vi.fn<
	(userId: string | undefined, organizationId: string) => Promise<string | null>
>(async () => null);
const createOrganizationClaimRequest = vi.fn(async () => ({ id: 'claim-1' }));
const cancelOrganizationClaimRequest = vi.fn(async () => ({ id: 'claim-1' }));
const followOrganization = vi.fn(async () => ({ id: 'follow-1' }));
const unfollowOrganization = vi.fn(async () => ({ id: 'follow-1' }));
const isFollowingOrganization = vi.fn(async () => false);

vi.mock('../src/lib/server/organizations', () => ({
	getOrganizationBySlug
}));

vi.mock('../src/lib/server/events', () => ({
	getUpcomingEventsByOrganizationId
}));

vi.mock('../src/lib/server/funding', () => ({
	getFundingByOrganizationId
}));

vi.mock('../src/lib/server/jobs', () => ({
	getJobsByOrganizationId
}));

vi.mock('../src/lib/server/red-pages', () => ({
	getBusinessesByOrganizationId
}));

vi.mock('../src/lib/server/toolbox', () => ({
	getResourcesByOrganizationId
}));

vi.mock('../src/lib/server/venues', () => ({
	getVenuesByOrganizationId
}));

vi.mock('../src/lib/server/organization-access', () => ({
	canManageOrganization: (role: string | null | undefined) =>
		role === 'editor' || role === 'admin' || role === 'owner',
	getUserOrganizationMembership,
	getUserOrganizationClaimStatus,
	createOrganizationClaimRequest,
	cancelOrganizationClaimRequest
}));

vi.mock('../src/lib/server/personalization', () => ({
	followOrganization,
	unfollowOrganization,
	isFollowingOrganization
}));

describe('organization public page actions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('loads viewer relationship flags for signed-in users', async () => {
		getUserOrganizationMembership.mockResolvedValueOnce({
			role: 'admin'
		});
		getUserOrganizationClaimStatus.mockResolvedValueOnce('approved');
		isFollowingOrganization.mockResolvedValueOnce(true);

		const mod = await import('../src/routes/o/[slug]/+page.server');
		const result = await mod.load({
			params: { slug: 'river-house' },
			locals: { user: { id: 'user-1', email: 'hello@example.com' } }
		} as never);

		expect(result.viewerMembershipRole).toBe('admin');
		expect(result.viewerClaimStatus).toBe('approved');
		expect(result.isFollowing).toBe(true);
		expect(result.canManageOrganization).toBe(true);
	});

	it('creates claim requests for signed-in users', async () => {
		const mod = await import('../src/routes/o/[slug]/+page.server');
		const form = new FormData();
		form.set('evidence', 'I run programs here.');

		const result = await mod.actions.createClaim({
			locals: { user: { id: 'user-1', email: 'hello@example.com' } },
			params: { slug: 'river-house' },
			request: new Request('http://localhost', { method: 'POST', body: form })
		} as never);

		expect(createOrganizationClaimRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: 'org-1',
				requesterUserId: 'user-1',
				requestedEmail: 'hello@example.com'
			})
		);
		expect(result).toEqual({ success: true });
	});

	it('toggles follows based on current state', async () => {
		isFollowingOrganization.mockResolvedValueOnce(true);
		const mod = await import('../src/routes/o/[slug]/+page.server');

		const result = await mod.actions.toggleFollow({
			locals: { user: { id: 'user-1', email: 'hello@example.com' } },
			params: { slug: 'river-house' }
		} as never);

		expect(unfollowOrganization).toHaveBeenCalledWith('user-1', 'org-1');
		expect(followOrganization).not.toHaveBeenCalled();
		expect(result).toEqual({ success: true, following: false });
	});
});
