import { kbData } from '$lib/data/kb';
import { readSubmissions } from '$lib/server/submissions';
import type { EventItem } from '$lib/data/kb';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	const submissions = (await readSubmissions('events')) as EventItem[];
	const events = [...kbData.events, ...submissions];
	const event = events.find((e) => e.id === params.slug);
	if (!event) throw error(404, 'Event not found');
	return { event };
}
