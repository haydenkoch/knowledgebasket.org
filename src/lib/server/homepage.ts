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
import { sanitizeRichTextHtml } from '$lib/server/sanitize-rich-text';
import { rewriteLegacyLocalObjectStorageUrlsInValue } from '$lib/config/public-assets';
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
	createSection,
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
export const HOMEPAGE_LIVE_CONFIG_KEY = HOMEPAGE_CONFIG_KEY;
export const HOMEPAGE_DRAFT_CONFIG_KEY = 'homepage_config_draft';
export const HOMEPAGE_PUBLISH_META_KEY = 'homepage_config_publish_meta';

export type HomepagePublishMeta = {
	publishedAt: string | null;
	publishedById: string | null;
};

function parseFeaturedRefs(arr: unknown): HomepageFeaturedRef[] {
	if (!Array.isArray(arr)) return [];
	return (arr as Record<string, unknown>[])
		.filter(
			(item) =>
				typeof item.coil === 'string' &&
				typeof item.itemId === 'string' &&
				(item.itemId as string).length > 0
		)
		.map((item) => ({
			coil: item.coil as CoilKey,
			itemId: item.itemId as string,
			title: typeof item.title === 'string' ? item.title : ''
		}));
}

function sanitizeHomepageSectionContent(section: HomepageSectionConfig): HomepageSectionConfig {
	const nextSection = { ...section };

	if (typeof nextSection.content === 'string') {
		nextSection.content = sanitizeRichTextHtml(nextSection.content) ?? undefined;
	}

	if (nextSection.source === 'container' && nextSection.children) {
		nextSection.children = nextSection.children.map(sanitizeHomepageSectionContent);
	}

	return nextSection;
}

function parseHomepageConfig(raw: string | null): HomepageConfig {
	if (!raw) return createDefaultHomepageConfig();
	try {
		const parsed = rewriteLegacyLocalObjectStorageUrlsInValue(
			JSON.parse(raw) as Record<string, unknown>
		).value;

		// Parse legacy global featured array (for migration)
		const legacyFeatured = parseFeaturedRefs(parsed.featured);

		let sections: HomepageSectionConfig[];
		if (Array.isArray(parsed.sections)) {
			sections = (parsed.sections as Record<string, unknown>[]).map((s) => {
				const source = (s.source ?? s.coil ?? 'events') as SectionSource;
				const id = typeof s.id === 'string' && s.id.trim().length > 0 ? s.id : genSectionId();

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

				const section: HomepageSectionConfig = {
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
				};

				// Parse per-section featured items
				if (source === 'featured') {
					section.items = parseFeaturedRefs(s.items);
				}

				// Parse container children
				if (source === 'container') {
					section.columns = (s.columns === 3 ? 3 : 2) as HomepageSectionConfig['columns'];
					section.children = Array.isArray(s.children)
						? (s.children as Record<string, unknown>[])
								.map((child) => {
									const childSource = (child.source ?? 'richtext') as SectionSource;
									if (childSource === 'container') return null; // no nested containers
									const childId =
										typeof child.id === 'string' && child.id.trim().length > 0
											? child.id
											: genSectionId();
									const childSection = createSection(childSource, {
										id: childId,
										heading:
											typeof child.heading === 'string'
												? child.heading
												: DEFAULT_HEADINGS[childSource] || childSource,
										visible: child.visible !== false,
										limit: Math.min(Math.max((child.limit as number) || 3, 1), 12),
										layoutPreset: normalizeLayoutPreset(
											childSource,
											typeof child.layoutPreset === 'string' ? child.layoutPreset : null
										),
										content: typeof child.content === 'string' ? child.content : undefined,
										imageUrl: typeof child.imageUrl === 'string' ? child.imageUrl : undefined,
										imageAlt: typeof child.imageAlt === 'string' ? child.imageAlt : undefined,
										imageHeight: (['sm', 'md', 'lg', 'xl'].includes(child.imageHeight as string)
											? child.imageHeight
											: 'md') as HomepageSectionConfig['imageHeight'],
										imageFit: (['cover', 'contain'].includes(child.imageFit as string)
											? child.imageFit
											: 'cover') as HomepageSectionConfig['imageFit'],
										imageHref: typeof child.imageHref === 'string' ? child.imageHref : undefined,
										imageRounded: child.imageRounded !== false
									});
									if (childSource === 'featured') {
										childSection.items = parseFeaturedRefs(child.items);
									}
									if (child.sortBy) childSection.sortBy = child.sortBy as SortField;
									if (child.sortDir) childSection.sortDir = child.sortDir as SortDir;
									if (child.futureOnly !== undefined)
										childSection.futureOnly = child.futureOnly as boolean;
									if (child.searchQuery) childSection.searchQuery = child.searchQuery as string;
									if (Array.isArray(child.excludedIds)) {
										childSection.excludedIds = [
											...new Set((child.excludedIds as string[]).filter(Boolean))
										];
									}
									return childSection;
								})
								.filter((c): c is HomepageSectionConfig => c !== null)
						: [];
				}

				// Parse image section
				if (source === 'image') {
					section.imageUrl = typeof s.imageUrl === 'string' ? s.imageUrl : '';
					section.imageAlt = typeof s.imageAlt === 'string' ? s.imageAlt : '';
					section.imageHeight = (
						['sm', 'md', 'lg', 'xl'].includes(s.imageHeight as string) ? s.imageHeight : 'md'
					) as HomepageSectionConfig['imageHeight'];
					section.imageFit = (
						['cover', 'contain'].includes(s.imageFit as string) ? s.imageFit : 'cover'
					) as HomepageSectionConfig['imageFit'];
					section.imageHref = typeof s.imageHref === 'string' ? s.imageHref : undefined;
					section.imageRounded = s.imageRounded !== false;
				}

				return section;
			});
		} else {
			sections = createDefaultHomepageConfig().sections;
		}

		// Migrate legacy global featured into the first featured section that has no items
		if (legacyFeatured.length > 0) {
			const firstEmpty = sections.find(
				(s) => s.source === 'featured' && (!s.items || s.items.length === 0)
			);
			if (firstEmpty) {
				firstEmpty.items = legacyFeatured;
			}
		}

		return cloneHomepageConfig({
			featured: [],
			sections: sections.map(sanitizeHomepageSectionContent)
		});
	} catch {
		return createDefaultHomepageConfig();
	}
}

export async function getHomepageLiveConfig(): Promise<HomepageConfig> {
	return parseHomepageConfig(await getSetting(HOMEPAGE_LIVE_CONFIG_KEY));
}

export async function getHomepageConfig(): Promise<HomepageConfig> {
	return getHomepageLiveConfig();
}

export async function getHomepageDraftConfig(): Promise<HomepageConfig> {
	const draft = await getSetting(HOMEPAGE_DRAFT_CONFIG_KEY);
	if (draft) return parseHomepageConfig(draft);
	return cloneHomepageConfig(await getHomepageLiveConfig());
}

export async function saveHomepageConfig(config: HomepageConfig): Promise<void> {
	await setSetting(HOMEPAGE_LIVE_CONFIG_KEY, JSON.stringify(cloneHomepageConfig(config)));
}

export async function saveHomepageDraftConfig(config: HomepageConfig): Promise<void> {
	await setSetting(HOMEPAGE_DRAFT_CONFIG_KEY, JSON.stringify(cloneHomepageConfig(config)));
}

export async function getHomepagePublishMeta(): Promise<HomepagePublishMeta | null> {
	const raw = await getSetting(HOMEPAGE_PUBLISH_META_KEY);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		return {
			publishedAt: typeof parsed.publishedAt === 'string' ? parsed.publishedAt : null,
			publishedById: typeof parsed.publishedById === 'string' ? parsed.publishedById : null
		};
	} catch {
		return null;
	}
}

export async function publishHomepageDraftConfig(
	publishedById: string | null
): Promise<HomepagePublishMeta> {
	const draft = await getHomepageDraftConfig();
	await saveHomepageConfig(draft);
	const meta = {
		publishedAt: new Date().toISOString(),
		publishedById
	} satisfies HomepagePublishMeta;
	await setSetting(HOMEPAGE_PUBLISH_META_KEY, JSON.stringify(meta));
	return meta;
}

export async function resetHomepageDraftConfig(): Promise<HomepageConfig> {
	const live = await getHomepageLiveConfig();
	await saveHomepageDraftConfig(live);
	return live;
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
	if (
		section.source === 'featured' ||
		section.source === 'richtext' ||
		section.source === 'container' ||
		section.source === 'image'
	) {
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
