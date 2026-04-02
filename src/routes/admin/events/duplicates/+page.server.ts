import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { findDuplicates, mergeEvents } from '$lib/server/events';

export const load: PageServerLoad = async () => {
	const groups = await findDuplicates(0.3);
	return { groups };
};

export const actions: Actions = {
	merge: async ({ request }) => {
		const fd = await request.formData();
		const keeperId = fd.get('keeperId') as string;
		const mergeIds = (fd.getAll('mergeIds') as string[]).filter((id) => id !== keeperId);

		if (!keeperId) return fail(400, { error: 'Select a keeper event' });
		if (mergeIds.length === 0)
			return fail(400, { error: 'Select at least one other event to merge' });

		const result = await mergeEvents(keeperId, mergeIds);
		if (!result) return fail(400, { error: 'Merge failed' });

		return { success: true };
	}
};
