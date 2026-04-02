import type { Actions, PageServerLoad } from './$types';
import { getAllLists, createList } from '$lib/server/event-lists';

export const load: PageServerLoad = async () => {
	const lists = await getAllLists();
	return { lists };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const fd = await request.formData();
		const title = (fd.get('title') as string)?.trim();
		const slug =
			(fd.get('slug') as string)
				?.trim()
				?.toLowerCase()
				.replace(/[^a-z0-9-]/g, '-') || 'list';
		if (!title) return { success: false, error: 'Title is required' };
		await createList({ title, slug });
		return { success: true };
	}
};
