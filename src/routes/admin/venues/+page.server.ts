import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { getVenues, createVenue } from '$lib/server/venues';
import { getAllOrganizations } from '$lib/server/organizations';

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get('search') ?? '';
	const [venueResult, orgs] = await Promise.all([getVenues({ search }), getAllOrganizations()]);
	return {
		venues: venueResult.venues,
		total: venueResult.total,
		currentSearch: search,
		organizations: orgs.map((o) => ({ id: o.id, name: o.name }))
	};
};

export const actions: Actions = {
	createVenue: async ({ request }) => {
		const fd = await request.formData();
		const name = fd.get('name') as string;
		if (!name?.trim()) return fail(400, { error: 'Name is required' });

		await createVenue({
			name,
			description: (fd.get('description') as string) || undefined,
			address: (fd.get('address') as string) || undefined,
			city: (fd.get('city') as string) || undefined,
			state: (fd.get('state') as string) || undefined,
			zip: (fd.get('zip') as string) || undefined,
			website: (fd.get('website') as string) || undefined,
			venueType: (fd.get('venueType') as string) || undefined,
			organizationId: (fd.get('organizationId') as string) || undefined
		});

		return { success: true };
	}
};
