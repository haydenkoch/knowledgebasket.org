import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	getHomepageConfig,
	saveHomepageConfig,
	resolveFeaturedItems,
	fetchHomepageSectionPreview,
	DEFAULT_CONFIG,
	createSection,
	type HomepageSectionConfig,
	type SectionSource,
	type SortField,
	type SortDir,
	DEFAULT_HEADINGS,
	SOURCE_HAS_DATE_FILTER,
	normalizeLayoutPreset
} from '$lib/server/homepage';
import type { CoilKey } from '$lib/data/kb';

const VALID_SOURCES: SectionSource[] = [
	'featured',
	'richtext',
	'events',
	'funding',
	'jobs',
	'redpages',
	'toolbox'
];

export const load: PageServerLoad = async () => {
	const config = await getHomepageConfig();
	const featuredItems = await resolveFeaturedItems(config.featured);

	// Load previews for all non-featured sections
	const previewEntries = await Promise.all(
		config.sections
			.filter((s) => s.source !== 'featured')
			.map(async (s) => {
				const items = await fetchHomepageSectionPreview(s).catch(() => []);
				return [s.id, items] as const;
			})
	);
	const sectionPreviews = Object.fromEntries(previewEntries) as Record<
		string,
		{ id: string; title: string }[]
	>;

	return { config, featuredItems, sectionPreviews };
};

export const actions: Actions = {
	addFeatured: async ({ request }) => {
		const fd = await request.formData();
		const coil = fd.get('coil') as CoilKey;
		const itemId = fd.get('itemId') as string;
		const title = fd.get('title') as string;

		if (!coil || !itemId) return fail(400, { error: 'Invalid item' });

		const config = await getHomepageConfig();
		if (config.featured.some((f) => f.coil === coil && f.itemId === itemId)) {
			return fail(400, { error: 'Already featured' });
		}
		if (config.featured.length >= 8) {
			return fail(400, { error: 'Maximum 8 featured items' });
		}

		const resolved = await resolveFeaturedItems([{ coil, itemId, title: title || '' }]);
		if (resolved.length === 0) return fail(400, { error: 'Item not found or not published' });

		config.featured.push({ coil, itemId, title: resolved[0].item.title });
		await saveHomepageConfig(config);
		return { success: true };
	},

	removeFeatured: async ({ request }) => {
		const fd = await request.formData();
		const coil = fd.get('coil') as string;
		const itemId = fd.get('itemId') as string;
		const config = await getHomepageConfig();
		config.featured = config.featured.filter((f) => !(f.coil === coil && f.itemId === itemId));
		await saveHomepageConfig(config);
		return { success: true };
	},

	moveFeatured: async ({ request }) => {
		const fd = await request.formData();
		const index = parseInt(fd.get('index') as string, 10);
		const direction = fd.get('direction') as 'up' | 'down';
		const config = await getHomepageConfig();
		const arr = config.featured;
		const newIndex = direction === 'up' ? index - 1 : index + 1;
		if (newIndex < 0 || newIndex >= arr.length) return { success: true };
		[arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
		await saveHomepageConfig(config);
		return { success: true };
	},

	addSection: async ({ request }) => {
		const fd = await request.formData();
		const source = fd.get('source') as SectionSource;
		if (!VALID_SOURCES.includes(source)) return fail(400, { error: 'Invalid source' });
		const config = await getHomepageConfig();
		config.sections.push(createSection(source));
		await saveHomepageConfig(config);
		return { success: true };
	},

	removeSection: async ({ request }) => {
		const fd = await request.formData();
		const id = fd.get('sectionId') as string;
		const config = await getHomepageConfig();
		config.sections = config.sections.filter((s) => s.id !== id);
		await saveHomepageConfig(config);
		return { success: true };
	},

	excludeItem: async ({ request }) => {
		const fd = await request.formData();
		const sectionId = fd.get('sectionId') as string;
		const itemId = fd.get('itemId') as string;
		const config = await getHomepageConfig();
		const section = config.sections.find((s) => s.id === sectionId);
		if (!section) return fail(400, { error: 'Section not found' });
		section.excludedIds = [...(section.excludedIds ?? []), itemId];
		await saveHomepageConfig(config);
		return { success: true };
	},

	unexcludeItem: async ({ request }) => {
		const fd = await request.formData();
		const sectionId = fd.get('sectionId') as string;
		const itemId = fd.get('itemId') as string;
		const config = await getHomepageConfig();
		const section = config.sections.find((s) => s.id === sectionId);
		if (!section) return fail(400, { error: 'Section not found' });
		section.excludedIds = (section.excludedIds ?? []).filter((id) => id !== itemId);
		await saveHomepageConfig(config);
		return { success: true };
	},

	saveSections: async ({ request }) => {
		const fd = await request.formData();
		const config = await getHomepageConfig();
		const sectionsById = new Map(config.sections.map((section) => [section.id, section] as const));

		const orderRaw = fd.get('sectionOrder') as string;
		const orderedIds = orderRaw
			? orderRaw
					.split(',')
					.map((id) => id.trim())
					.filter(Boolean)
			: config.sections.map((s) => s.id);

		const featuredOrderRaw = fd.get('featuredOrder');
		if (typeof featuredOrderRaw === 'string' && featuredOrderRaw.trim().length > 0) {
			try {
				const parsed = JSON.parse(featuredOrderRaw) as Record<string, unknown>[];
				if (Array.isArray(parsed)) {
					config.featured = parsed
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
						}));
				}
			} catch {
				return fail(400, { error: 'Invalid featured order payload' });
			}
		}

		// Rebuild sections in the new order so local add/remove/edit state is the source of truth.
		const updated: HomepageSectionConfig[] = [];
		for (const id of orderedIds) {
			const existing = sectionsById.get(id);
			const source = (fd.get(`source_${id}`) as SectionSource | null) ?? existing?.source;
			if (!source || !VALID_SOURCES.includes(source)) continue;

			const base = existing ?? createSection(source, { id });

			const visible = fd.get(`visible_${id}`) === 'on';
			const heading = ((fd.get(`heading_${id}`) as string | null) ?? '').trim();
			const excludedIdsRaw = ((fd.get(`excludedIds_${id}`) as string | null) ?? '').trim();
			const excludedIds = excludedIdsRaw
				.split(',')
				.map((item) => item.trim())
				.filter(Boolean);

			if (source === 'featured') {
				updated.push({
					...base,
					id,
					source,
					visible,
					heading,
					layoutPreset: 'auto'
				});
			} else if (source === 'richtext') {
				const content = (fd.get(`content_${id}`) as string | null) ?? base.content ?? '';
				updated.push({
					...base,
					id,
					source,
					visible,
					heading,
					layoutPreset: normalizeLayoutPreset(
						source,
						fd.get(`layoutPreset_${id}`)?.toString() ?? base.layoutPreset
					),
					content
				});
			} else {
				const sortBy = ((fd.get(`sortBy_${id}`) as SortField | null) ?? base.sortBy) as SortField;
				const sortDir = ((fd.get(`sortDir_${id}`) as SortDir | null) ?? base.sortDir) as SortDir;
				const futureOnly = SOURCE_HAS_DATE_FILTER[source]
					? fd.get(`futureOnly_${id}`) === 'on'
					: false;
				const limit = Math.min(Math.max(parseInt(fd.get(`limit_${id}`) as string, 10) || 3, 1), 12);
				const searchQuery =
					((fd.get(`searchQuery_${id}`) as string | null) ?? '').trim() || undefined;
				updated.push({
					...base,
					id,
					source,
					visible,
					heading: heading || DEFAULT_HEADINGS[source],
					sortBy,
					sortDir,
					futureOnly,
					limit,
					searchQuery,
					layoutPreset: normalizeLayoutPreset(
						source,
						fd.get(`layoutPreset_${id}`)?.toString() ?? base.layoutPreset
					),
					excludedIds: excludedIds.length ? excludedIds : undefined
				});
			}
		}

		config.sections = updated;
		await saveHomepageConfig(config);
		return { success: true };
	},

	resetConfig: async () => {
		await saveHomepageConfig(DEFAULT_CONFIG);
		return { success: true };
	}
};
