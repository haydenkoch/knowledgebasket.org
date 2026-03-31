import type { Actions, PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import {
	getListById,
	getListEvents,
	addEventToList,
	removeEventFromList,
	updateList,
	deleteList
} from '$lib/server/event-lists';
import { getEventById } from '$lib/server/events';

export const load: PageServerLoad = async ({ params }) => {
	const list = await getListById(params.id);
	if (!list) throw error(404, 'List not found');
	const listEvents = await getListEvents(params.id);
	return { list, listEvents };
};

export const actions: Actions = {
	addEvent: async ({ params, request }) => {
		const fd = await request.formData();
		const eventId = (fd.get('eventId') as string)?.trim();
		if (!eventId) return { success: false, error: 'Event ID required' };
		const event = await getEventById(eventId);
		if (!event) return { success: false, error: 'Event not found' };
		await addEventToList(params.id, eventId);
		return { success: true };
	},
	removeEvent: async ({ params, request }) => {
		const fd = await request.formData();
		const eventId = fd.get('eventId') as string;
		if (!eventId) return { success: false, error: 'Event ID required' };
		await removeEventFromList(params.id, eventId);
		return { success: true };
	},
	updateList: async ({ params, request }) => {
		const fd = await request.formData();
		const title = (fd.get('title') as string)?.trim();
		const slug = (fd.get('slug') as string)?.trim();
		if (!title) return { success: false, error: 'Title required' };
		await updateList(params.id, { title, slug: slug || undefined });
		return { success: true };
	},
	deleteList: async ({ params }) => {
		await deleteList(params.id);
		throw redirect(303, '/admin/events/lists');
	}
};
