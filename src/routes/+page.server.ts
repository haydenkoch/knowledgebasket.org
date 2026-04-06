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
	getHomepageDraftConfig,
	resolveFeaturedItems,
	DEFAULT_CONFIG,
	type HomepageSectionConfig
} from '$lib/server/homepage';
import { hasPrivilegedUser } from '$lib/server/access-control';
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

export const load: PageServerLoad = async ({ url, locals }) => {
	const draftPreview =
		url.searchParams.get('preview') === 'draft' && hasPrivilegedUser(locals.user);
	const [config, counts] = await Promise.all([
		(draftPreview ? getHomepageDraftConfig() : getHomepageConfig()).catch(() => DEFAULT_CONFIG),
		getCoilCounts().catch(() => ({ events: 0, funding: 0, jobs: 0, toolbox: 0, redpages: 0 }))
	]);

	const visibleSections = config.sections.filter((s) => s.visible);

	// Collect all sections including container children
	const allFetchable: HomepageSectionConfig[] = [];
	for (const s of visibleSections) {
		allFetchable.push(s);
		if (s.source === 'container' && s.children) {
			allFetchable.push(...s.children.filter((c) => c.visible));
		}
	}

	// Fetch data for each section in parallel (featured sections resolve their own items)
	const sectionDataEntries = await Promise.all(
		allFetchable.map(async (s) => {
			if (s.source === 'featured') {
				const resolved = s.items?.length ? await resolveFeaturedItems(s.items).catch(() => []) : [];
				return [s.id, resolved] as const;
			}
			if (s.source === 'container' || s.source === 'image' || s.source === 'richtext') {
				return [s.id, []] as const;
			}
			const items = await fetchSectionItems(s).catch(() => []);
			return [s.id, items] as const;
		})
	);
	const sectionData = Object.fromEntries(sectionDataEntries) as Record<string, unknown[]>;

	return {
		origin: url.origin,
		draftPreview,
		sections: visibleSections,
		sectionData,
		counts
	};
};
