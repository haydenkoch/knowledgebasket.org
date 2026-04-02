import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { getOrganizations, createOrganization } from '$lib/server/organizations';

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get('search') ?? '';
	const { orgs, total } = await getOrganizations({ search });
	return { organizations: orgs, total, currentSearch: search };
};

export const actions: Actions = {
	createOrganization: async ({ request }) => {
		const fd = await request.formData();
		const name = fd.get('name') as string;
		if (!name?.trim()) return fail(400, { error: 'Name is required' });

		await createOrganization({
			name,
			description: (fd.get('description') as string) || undefined,
			website: (fd.get('website') as string) || undefined,
			email: (fd.get('email') as string) || undefined,
			phone: (fd.get('phone') as string) || undefined,
			orgType: (fd.get('orgType') as string) || undefined,
			region: (fd.get('region') as string) || undefined
		});

		return { success: true };
	}
};
