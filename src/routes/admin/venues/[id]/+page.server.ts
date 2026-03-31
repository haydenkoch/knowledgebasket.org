import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { getVenueById, updateVenue, deleteVenue } from '$lib/server/venues';
import { getAllOrganizations } from '$lib/server/organizations';
import { uploadImage } from '$lib/server/upload';

export const load: PageServerLoad = async ({ params }) => {
	const [venue, orgs] = await Promise.all([
		getVenueById(params.id),
		getAllOrganizations()
	]);
	if (!venue) throw error(404, 'Venue not found');
	return {
		venue,
		organizations: orgs.map((o) => ({ id: o.id, name: o.name }))
	};
};

export const actions: Actions = {
	updateVenue: async ({ params, request }) => {
		const fd = await request.formData();
		const name = fd.get('name') as string;
		if (!name?.trim()) return fail(400, { error: 'Name is required' });

		let imageUrl: string | undefined;
		const image = fd.get('image') as File | null;
		if (image && image.size > 0) {
			try {
				imageUrl = await uploadImage(image, 'venues');
			} catch (e) {
				return fail(400, { error: e instanceof Error ? e.message : 'Image upload failed' });
			}
		}

		await updateVenue(params.id, {
			name,
			description: fd.get('description') as string || null,
			address: fd.get('address') as string || null,
			city: fd.get('city') as string || null,
			state: fd.get('state') as string || null,
			zip: fd.get('zip') as string || null,
			website: fd.get('website') as string || null,
			venueType: fd.get('venueType') as string || null,
			organizationId: fd.get('organizationId') as string || null,
			...(imageUrl && { imageUrl })
		});

		return { success: true };
	},
	deleteVenue: async ({ params }) => {
		await deleteVenue(params.id);
		throw redirect(303, '/admin/venues');
	}
};
