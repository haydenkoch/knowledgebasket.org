import { sql, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	events as eventsTable,
	funding as fundingTable,
	jobs as jobsTable,
	toolboxResources as tbTable,
	redPagesBusinesses as rpTable
} from '$lib/server/db/schema';
import { queryEventsForHomepage } from '$lib/server/events';
import { queryFundingForHomepage } from '$lib/server/funding';
import { queryJobsForHomepage } from '$lib/server/jobs';
import { queryResourcesForHomepage } from '$lib/server/toolbox';
import { queryBusinessesForHomepage } from '$lib/server/red-pages';
import {
	getHomepageConfig,
	resolveFeaturedItems,
	DEFAULT_CONFIG,
	type HomepageSectionConfig
} from '$lib/server/homepage';
import type { PageServerLoad } from './$types';

async function getCoilCounts() {
	const [[e], [f], [j], [t], [r]] = await Promise.all([
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(eventsTable)
			.where(eq(eventsTable.status, 'published')),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(fundingTable)
			.where(eq(fundingTable.status, 'published')),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(jobsTable)
			.where(eq(jobsTable.status, 'published')),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(tbTable)
			.where(eq(tbTable.status, 'published')),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(rpTable)
			.where(eq(rpTable.status, 'published'))
	]);
	return { events: e.count, funding: f.count, jobs: j.count, toolbox: t.count, redpages: r.count };
}

async function fetchSectionItems(s: HomepageSectionConfig): Promise<unknown[]> {
	const opts = {
		limit: s.limit,
		sortBy: s.sortBy,
		sortDir: s.sortDir,
		futureOnly: s.futureOnly,
		excludedIds: s.excludedIds,
		searchQuery: s.searchQuery
	};
	switch (s.source) {
		case 'events':
			return queryEventsForHomepage(opts);
		case 'funding':
			return queryFundingForHomepage(opts);
		case 'jobs':
			return queryJobsForHomepage(opts);
		case 'toolbox':
			return queryResourcesForHomepage(opts);
		case 'redpages':
			return queryBusinessesForHomepage(opts);
		default:
			return [];
	}
}

export const load: PageServerLoad = async ({ url }) => {
	const [config, counts] = await Promise.all([
		getHomepageConfig().catch(() => DEFAULT_CONFIG),
		getCoilCounts().catch(() => ({ events: 0, funding: 0, jobs: 0, toolbox: 0, redpages: 0 }))
	]);

	const visibleSections = config.sections.filter((s) => s.visible);

	// Fetch data for each section in parallel
	const sectionDataEntries = await Promise.all(
		visibleSections.map(async (s) => {
			if (s.source === 'featured') return [s.id, []] as const;
			const items = await fetchSectionItems(s).catch(() => []);
			return [s.id, items] as const;
		})
	);
	const sectionData = Object.fromEntries(sectionDataEntries) as Record<string, unknown[]>;

	// Resolve featured items
	const featured = config.featured.length
		? await resolveFeaturedItems(config.featured).catch(() => [])
		: [];

	return {
		origin: url.origin,
		featured,
		sections: visibleSections,
		sectionData,
		counts
	};
};
