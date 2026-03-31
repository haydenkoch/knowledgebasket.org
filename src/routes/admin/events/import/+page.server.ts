import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { createEvent } from '$lib/server/events';
import { fetchEventsFromIcalFeed } from '$lib/server/ical-feed';

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	preview: async ({ request }) => {
		const fd = await request.formData();
		const url = fd.get('url') as string;
		if (!url?.trim()) return fail(400, { error: 'URL is required' });

		try {
			const events = await fetchEventsFromIcalFeed(url);
			return { events, url };
		} catch (e) {
			return fail(400, { error: `Failed to fetch iCal: ${e instanceof Error ? e.message : 'Unknown error'}` });
		}
	},
	import: async ({ request, locals }) => {
		const fd = await request.formData();
		const eventsJson = fd.get('events') as string;
		if (!eventsJson) return fail(400, { error: 'No events data' });

		let events: any[];
		try {
			events = JSON.parse(eventsJson);
		} catch {
			return fail(400, { error: 'Invalid events data' });
		}

		const selected = fd.getAll('selected') as string[];
		const toImport = events.filter((_: any, i: number) => selected.includes(String(i)));

		let imported = 0;
		for (const e of toImport) {
			try {
				await createEvent({
					title: e.title,
					description: e.description,
					location: e.location,
					startDate: e.startDate,
					endDate: e.endDate,
					eventUrl: e.eventUrl,
					hostOrg: e.hostOrg,
					submittedById: locals.user?.id,
					status: 'pending',
					source: 'ical-import'
				});
				imported++;
			} catch (err) {
				console.warn('[import] Failed to import event:', e.title, err);
			}
		}

		return { success: true, imported };
	}
};
