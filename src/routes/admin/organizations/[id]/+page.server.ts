import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import {
	getOrganizationImpact,
	getOrganizationById,
	mergeOrganizations,
	suggestOrganizationMatches,
	updateOrganization,
	deleteOrganization
} from '$lib/server/organizations';
import {
	listOrganizationClaimRequests,
	reviewOrganizationClaimRequest
} from '$lib/server/organization-access';
import { uploadImage } from '$lib/server/upload';

export const load: PageServerLoad = async ({ params }) => {
	const org = await getOrganizationById(params.id);
	if (!org) throw error(404, 'Organization not found');
	const [impact, suggestedMatches, claimRequests] = await Promise.all([
		getOrganizationImpact(params.id),
		suggestOrganizationMatches({
			name: org.name,
			website: org.website,
			city: org.city,
			state: org.state,
			address: org.address,
			limit: 6
		}),
		listOrganizationClaimRequests(params.id)
	]);
	return {
		organization: org,
		impact,
		claimRequests,
		suggestedMatches: suggestedMatches.filter((entry) => entry.organization.id !== params.id)
	};
};

export const actions: Actions = {
	updateOrganization: async ({ params, request }) => {
		const fd = await request.formData();
		const name = fd.get('name') as string;
		const aliases = ((fd.get('aliases') as string) || '')
			.split(/\r?\n|,/)
			.map((entry) => entry.trim())
			.filter(Boolean);
		if (!name?.trim()) return fail(400, { error: 'Name is required' });

		let logoUrl: string | undefined;
		const logo = fd.get('logo') as File | null;
		if (logo && logo.size > 0) {
			try {
				logoUrl = await uploadImage(logo, 'organizations');
			} catch (e) {
				return fail(400, { error: e instanceof Error ? e.message : 'Logo upload failed' });
			}
		}

		await updateOrganization(params.id, {
			name,
			aliases,
			description: (fd.get('description') as string) || null,
			website: (fd.get('website') as string) || null,
			email: (fd.get('email') as string) || null,
			phone: (fd.get('phone') as string) || null,
			orgType: (fd.get('orgType') as string) || null,
			region: (fd.get('region') as string) || null,
			...(logoUrl && { logoUrl })
		});

		return { success: true };
	},
	mergeOrganizations: async ({ params, request }) => {
		const fd = await request.formData();
		const mergeIds = fd
			.getAll('mergeId')
			.map((value) => String(value).trim())
			.filter(Boolean);
		if (mergeIds.length === 0)
			return fail(400, { error: 'Choose at least one organization to merge' });
		await mergeOrganizations(params.id, mergeIds);
		return { success: true };
	},
	reviewClaim: async ({ locals, request }) => {
		const fd = await request.formData();
		const claimRequestId = String(fd.get('claimRequestId') ?? '').trim();
		const status = String(fd.get('status') ?? '').trim();
		const reviewNotes = String(fd.get('reviewNotes') ?? '').trim();
		if (!claimRequestId) return fail(400, { error: 'Claim request is required.' });
		if (status !== 'approved' && status !== 'denied') {
			return fail(400, { error: 'Choose an approval decision.' });
		}

		await reviewOrganizationClaimRequest({
			claimRequestId,
			reviewerId: locals.user!.id,
			status,
			reviewNotes,
			membershipRole: 'owner'
		});

		return { success: true };
	},
	deleteOrganization: async ({ params }) => {
		await deleteOrganization(params.id);
		throw redirect(303, '/admin/organizations');
	}
};
