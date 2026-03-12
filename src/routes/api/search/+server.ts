import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { kbData, searchAllLiveFromData } from '$lib/data/kb';
import { readSubmissions } from '$lib/server/submissions';

export const GET: RequestHandler = async ({ url }) => {
	const q = (url.searchParams.get('q') as string)?.trim() ?? '';
	if (q.length < 2) {
		return json({ results: null });
	}
	const [events, funding, redpages, jobs, toolbox] = await Promise.all([
		readSubmissions('events'),
		readSubmissions('funding'),
		readSubmissions('redpages'),
		readSubmissions('jobs'),
		readSubmissions('toolbox')
	]);
	const merged = {
		events: [...kbData.events, ...events],
		funding: [...kbData.funding, ...funding],
		redpages: [...kbData.redpages, ...redpages],
		jobs: [...kbData.jobs, ...jobs],
		toolbox: [...kbData.toolbox, ...toolbox]
	};
	const results = searchAllLiveFromData(merged, q, 'all');
	return json({ results });
};
