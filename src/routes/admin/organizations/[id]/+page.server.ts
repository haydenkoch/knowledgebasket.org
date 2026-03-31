import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { getOrganizationById, updateOrganization, deleteOrganization } from '$lib/server/organizations';
import { uploadImage } from '$lib/server/upload';

export const load: PageServerLoad = async ({ params }) => {
	const org = await getOrganizationById(params.id);
	if (!org) throw error(404, 'Organization not found');
	return { organization: org };
};

export const actions: Actions = {
	updateOrganization: async ({ params, request }) => {
		const fd = await request.formData();
		const name = fd.get('name') as string;
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
			description: fd.get('description') as string || null,
			website: fd.get('website') as string || null,
			email: fd.get('email') as string || null,
			phone: fd.get('phone') as string || null,
			orgType: fd.get('orgType') as string || null,
			region: fd.get('region') as string || null,
			...(logoUrl && { logoUrl })
		});

		return { success: true };
	},
	deleteOrganization: async ({ params }) => {
		await deleteOrganization(params.id);
		throw redirect(303, '/admin/organizations');
	}
};
