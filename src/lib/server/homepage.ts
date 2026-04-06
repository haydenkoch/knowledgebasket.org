/**
 * Homepage configuration: server-side operations (read, write, resolve).
 */
import { getSetting, setSetting } from '$lib/server/settings';
import { getEventById } from '$lib/server/events';
import { queryEventsForHomepage } from '$lib/server/events';
import { getFundingById } from '$lib/server/funding';
import { queryFundingForHomepage } from '$lib/server/funding';
import { getJobById } from '$lib/server/jobs';
import { queryJobsForHomepage } from '$lib/server/jobs';
import { getResourceById } from '$lib/server/toolbox';
import { queryResourcesForHomepage } from '$lib/server/toolbox';
import { getBusinessById } from '$lib/server/red-pages';
import { queryBusinessesForHomepage } from '$lib/server/red-pages';
import type {
	CoilKey,
	EventItem,
	FundingItem,
	JobItem,
	ToolboxItem,
	RedPagesItem
} from '$lib/data/kb';
import {
	DEFAULT_HEADINGS,
	cloneHomepageConfig,
	createDefaultHomepageConfig,
	normalizeLayoutPreset,
	genSectionId,
	type HomepageConfig,
	type HomepageFeaturedRef,
	type HomepageSectionConfig,
	type SectionSource,
	type SortField,
	type SortDir
} from '$lib/data/homepage';

export * from '$lib/data/homepage';

export const HOMEPAGE_CONFIG_KEY = 'homepage_config';

export async function getHomepageConfig(): Promise<HomepageConfig> {
	const raw = await getSetting(HOMEPAGE_CONFIG_KEY);
	if (!raw) return createDefaultHomepageConfig();
	try {
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		const featured = Array.isArray(parsed.featured)
			? (parsed.featured as Record<string, unknown>[])
					.filter(
						(item) =>
							typeof item.coil === 'string' &&
							typeof item.itemId === 'string' &&
							item.itemId.length > 0
					)
					.map((item) => ({
						coil: item.coil as CoilKey,
						itemId: item.itemId as string,
						title: typeof item.title === 'string' ? item.title : ''
					}))
			: [];

		let sections: HomepageSectionConfig[];
		if (Array.isArray(parsed.sections)) {
			sections = (parsed.sections as Record<string, unknown>[]).map((s) => {
				// New format has `source` and `id`
				// Old format had `coil` and optionally `mode`
				const source = (s.source ?? s.coil ?? 'events') as SectionSource;
				const id = typeof s.id === 'string' && s.id.trim().length > 0 ? s.id : genSectionId();

				// Backwards compat: old `mode` field → new sort fields
				let sortBy = s.sortBy as SortField | undefined;
				let sortDir = s.sortDir as SortDir | undefined;
				let futureOnly = s.futureOnly as boolean | undefined;

				if (!sortBy) {
					const mode = s.mode as string | undefined;
					if (mode === 'upcoming') {
						sortBy = source === 'funding' ? 'deadline' : 'date';
						sortDir = 'asc';
						futureOnly = true;
					} else {
						sortBy = source === 'redpages' ? 'created' : 'published';
						sortDir = 'desc';
						futureOnly = false;
					}
				}

				return {
					id,
					source,
					visible: s.visible !== false,
					limit: Math.min(Math.max((s.limit as number) || 3, 1), 12),
					sortBy: sortBy ?? 'published',
					sortDir: sortDir ?? 'desc',
					futureOnly: futureOnly ?? false,
					heading: typeof s.heading === 'string' ? s.heading : DEFAULT_HEADINGS[source] || source,
					excludedIds: Array.isArray(s.excludedIds)
						? [...new Set((s.excludedIds as string[]).filter(Boolean))]
						: undefined,
					searchQuery:
						typeof s.searchQuery === 'string' && s.searchQuery.trim().length > 0
							? s.searchQuery.trim()
							: undefined,
					layoutPreset: normalizeLayoutPreset(
						source,
						typeof s.layoutPreset === 'string' ? s.layoutPreset : null
					),
					content: typeof s.content === 'string' ? s.content : undefined
				} as HomepageSectionConfig;
			});
		} else {
			sections = createDefaultHomepageConfig().sections;
		}

		return cloneHomepageConfig({ featured, sections });
	} catch {
		return createDefaultHomepageConfig();
	}
}

export async function saveHomepageConfig(config: HomepageConfig): Promise<void> {
	await setSetting(HOMEPAGE_CONFIG_KEY, JSON.stringify(cloneHomepageConfig(config)));
}

export type ResolvedFeaturedItem = {
	coil: CoilKey;
	item: EventItem | FundingItem | JobItem | ToolboxItem | RedPagesItem;
};

export type HomepageSectionPreviewItem = {
	id: string;
	title: string;
	skipped: boolean;
};

export async function resolveFeaturedItems(
	refs: HomepageFeaturedRef[]
): Promise<ResolvedFeaturedItem[]> {
	const results = await Promise.all(
		refs.map(async (ref) => {
			try {
				const item = await resolveItem(ref.coil, ref.itemId);
				if (!item || item.status !== 'published') return null;
				return { coil: ref.coil, item } as ResolvedFeaturedItem;
			} catch {
				return null;
			}
		})
	);
	return results.filter((r): r is ResolvedFeaturedItem => r !== null);
}

export async function fetchHomepageSectionPreview(
	section: HomepageSectionConfig
): Promise<HomepageSectionPreviewItem[]> {
	if (section.source === 'featured' || section.source === 'richtext') {
		return [];
	}

	const excludedSet = new Set(section.excludedIds ?? []);
	const totalNeeded = section.limit + excludedSet.size;
	const opts = {
		limit: totalNeeded,
		sortBy: section.sortBy,
		sortDir: section.sortDir,
		futureOnly: section.futureOnly,
		searchQuery: section.searchQuery
	};

	let items: { id: string; title: string }[] = [];

	switch (section.source) {
		case 'events':
			items = await queryEventsForHomepage(opts);
			break;
		case 'funding':
			items = await queryFundingForHomepage(opts);
			break;
		case 'jobs':
			items = await queryJobsForHomepage(opts);
			break;
		case 'toolbox':
			items = await queryResourcesForHomepage(opts);
			break;
		case 'redpages':
			items = await queryBusinessesForHomepage(opts);
			break;
	}

	return items.map((item) => ({
		id: item.id,
		title: item.title,
		skipped: excludedSet.has(item.id)
	}));
}

async function resolveItem(coil: CoilKey, id: string) {
	switch (coil) {
		case 'events':
			return getEventById(id);
		case 'funding':
			return getFundingById(id);
		case 'jobs':
			return getJobById(id);
		case 'toolbox':
			return getResourceById(id);
		case 'redpages':
			return getBusinessById(id);
	}
}
