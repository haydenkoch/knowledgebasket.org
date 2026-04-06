import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createEvent } from '$lib/server/events';
import { fetchEventsFromIcalFeed } from '$lib/server/ical-feed';
import type { EventItem } from '$lib/data/kb';

export const load: PageServerLoad = async () => {
	return {
		legacyImportEnabled: env.ALLOW_LEGACY_EVENT_IMPORT === 'true'
	};
};

export const actions: Actions = {
	preview: async ({ request }) => {
		if (env.ALLOW_LEGACY_EVENT_IMPORT !== 'true') {
			return fail(403, {
				error:
					'Legacy iCal import is disabled. Use the source operations workflow for production ingestion.'
			});
		}

		const fd = await request.formData();
		const url = fd.get('url') as string;
		if (!url?.trim()) return fail(400, { error: 'URL is required' });

		try {
			const events = await fetchEventsFromIcalFeed(url);
			return { events, url };
		} catch (e) {
			return fail(400, {
				error: `Failed to fetch iCal: ${e instanceof Error ? e.message : 'Unknown error'}`
			});
		}
	},
	import: async ({ request, locals }) => {
		if (env.ALLOW_LEGACY_EVENT_IMPORT !== 'true') {
			return fail(403, {
				error:
					'Legacy iCal import is disabled. Use the source operations workflow for production ingestion.'
			});
		}

		const fd = await request.formData();
		const eventsJson = fd.get('events') as string;
		if (!eventsJson) return fail(400, { error: 'No events data' });

		let events: EventItem[];
		try {
			events = JSON.parse(eventsJson);
		} catch {
			return fail(400, { error: 'Invalid events data' });
		}

		const selected = fd.getAll('selected') as string[];
		const toImport = events.filter((_, i) => selected.includes(String(i)));

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
