import type { Actions, PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import {
	getListById,
	getListEvents,
	addEventToList,
	removeEventFromList,
	updateList,
	deleteList,
	setListEventOrder
} from '$lib/server/event-lists';
import { getEventById, getEvents } from '$lib/server/events';

export const load: PageServerLoad = async ({ params }) => {
	const [list, listEvents, publishedEvents] = await Promise.all([
		getListById(params.id),
		getListEvents(params.id),
		getEvents({ includeUnlisted: true })
	]);
	if (!list) throw error(404, 'List not found');
	return {
		list,
		listEvents,
		publishedEvents
	};
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
	reorder: async ({ params, request }) => {
		const fd = await request.formData();
		const orderedIds = ((fd.get('orderedIds') as string | null) ?? '')
			.split(',')
			.map((value) => value.trim())
			.filter(Boolean);
		if (orderedIds.length === 0) return { success: false, error: 'Order is required' };
		await setListEventOrder(params.id, orderedIds);
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
		throw redirect(303, '/admin/events?tab=lists');
	}
};
