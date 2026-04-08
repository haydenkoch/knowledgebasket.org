import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import {
	createSource,
	getSourceHealthSummary,
	getSourcesForAdmin,
	getSourceStatusCounts
} from '$lib/server/sources';

export const load: PageServerLoad = async ({ url }) => {
	const status = url.searchParams.get('status') ?? 'all';
	const healthStatus = url.searchParams.get('healthStatus') ?? 'all';
	const enabled = url.searchParams.get('enabled') ?? 'all';
	const coil = url.searchParams.get('coil') ?? 'all';
	const search = url.searchParams.get('search') ?? '';
	const page = parseInt(url.searchParams.get('page') ?? '1', 10);

	const [{ items, total }, statusCounts, healthSummary] = await Promise.all([
		getSourcesForAdmin({
			status,
			healthStatus,
			enabled,
			coil,
			search,
			page,
			limit: 25
		}),
		getSourceStatusCounts(),
		getSourceHealthSummary()
	]);

	return {
		sources: items,
		total,
		statusCounts,
		healthSummary,
		currentStatus: status,
		currentHealthStatus: healthStatus,
		currentEnabled: enabled,
		currentCoil: coil,
		currentSearch: search,
		currentPage: page
	};
};

export const actions: Actions = {
	createSource: async ({ request }) => {
		const fd = await request.formData();
		const name = (fd.get('name') as string)?.trim();
		const sourceUrl = (fd.get('sourceUrl') as string)?.trim();

		if (!name) return fail(400, { error: 'Name is required' });
		if (!sourceUrl) return fail(400, { error: 'Source URL is required' });

		try {
			await createSource({
				name,
				description: ((fd.get('description') as string) || '').trim() || null,
				sourceUrl,
				homepageUrl: ((fd.get('homepageUrl') as string) || '').trim() || null,
				coils: fd.getAll('coils') as string[] as Array<
					'events' | 'funding' | 'jobs' | 'red_pages' | 'toolbox'
				>,
				ingestionMethod: ((fd.get('ingestionMethod') as string) || 'manual_only') as
					| 'manual_only'
					| 'manual_with_reminder'
					| 'rss_import'
					| 'ical_import'
					| 'api_import'
					| 'html_scrape'
					| 'directory_sync'
					| 'document_extraction'
					| 'newsletter_triage'
					| 'hybrid',
				sourceCategory: ((fd.get('sourceCategory') as string) || null) as
					| null
					| 'government_federal'
					| 'government_state'
					| 'government_tribal'
					| 'nonprofit'
					| 'foundation'
					| 'aggregator'
					| 'news_media'
					| 'academic'
					| 'professional_association'
					| 'private_business'
					| 'community',
				enabled: fd.has('enabled'),
				reviewRequired: !fd.has('autoApprove'),
				autoApprove: fd.has('autoApprove')
			});
		} catch (err) {
			return fail(400, {
				error: err instanceof Error ? err.message : 'Failed to create source'
			});
		}

		return { success: true };
	}
};
