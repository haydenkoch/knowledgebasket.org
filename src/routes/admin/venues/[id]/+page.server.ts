import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import {
	deleteVenue,
	getVenueById,
	getVenueImpact,
	mergeVenues,
	suggestVenueMatches,
	updateVenue
} from '$lib/server/venues';
import { getAllOrganizations } from '$lib/server/organizations';
import { uploadImage } from '$lib/server/upload';

export const load: PageServerLoad = async ({ params }) => {
	const [venue, orgs] = await Promise.all([getVenueById(params.id), getAllOrganizations()]);
	if (!venue) throw error(404, 'Venue not found');
	const [impact, suggestedMatches] = await Promise.all([
		getVenueImpact(params.id),
		suggestVenueMatches({
			name: venue.name,
			address: venue.address,
			city: venue.city,
			state: venue.state,
			organizationId: venue.organizationId,
			limit: 6
		})
	]);
	return {
		venue,
		impact,
		suggestedMatches: suggestedMatches.filter((entry) => entry.venue.id !== params.id),
		organizations: orgs.map((o) => ({ id: o.id, name: o.name }))
	};
};

export const actions: Actions = {
	updateVenue: async ({ params, request }) => {
		const fd = await request.formData();
		const name = fd.get('name') as string;
		const aliases = ((fd.get('aliases') as string) || '')
			.split(/\r?\n|,/)
			.map((entry) => entry.trim())
			.filter(Boolean);
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
			aliases,
			description: (fd.get('description') as string) || null,
			address: (fd.get('address') as string) || null,
			city: (fd.get('city') as string) || null,
			state: (fd.get('state') as string) || null,
			zip: (fd.get('zip') as string) || null,
			website: (fd.get('website') as string) || null,
			venueType: (fd.get('venueType') as string) || null,
			organizationId: (fd.get('organizationId') as string) || null,
			...(imageUrl && { imageUrl })
		});

		return { success: true };
	},
	mergeVenues: async ({ params, request }) => {
		const fd = await request.formData();
		const mergeIds = fd
			.getAll('mergeId')
			.map((value) => String(value).trim())
			.filter(Boolean);
		if (mergeIds.length === 0) return fail(400, { error: 'Choose at least one venue to merge' });
		await mergeVenues(params.id, mergeIds);
		return { success: true };
	},
	deleteVenue: async ({ params }) => {
		await deleteVenue(params.id);
		throw redirect(303, '/admin/venues');
	}
};
