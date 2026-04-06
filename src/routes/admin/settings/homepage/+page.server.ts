import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	DEFAULT_HEADINGS,
	SOURCE_HAS_DATE_FILTER,
	createSection,
	fetchHomepageSectionPreview,
	getHomepageDraftConfig,
	getHomepageLiveConfig,
	getHomepagePublishMeta,
	publishHomepageDraftConfig,
	resetHomepageDraftConfig,
	saveHomepageDraftConfig,
	normalizeLayoutPreset,
	type HomepageSectionConfig,
	type SectionSource,
	type SortDir,
	type SortField
} from '$lib/server/homepage';
import type { CoilKey } from '$lib/data/kb';

/* ── Section payload validation (from sections/+page.server.ts) ── */

const VALID_SOURCES: SectionSource[] = [
	'featured',
	'richtext',
	'container',
	'image',
	'events',
	'funding',
	'jobs',
	'redpages',
	'toolbox'
];
const VALID_SORT_FIELDS: SortField[] = [
	'date',
	'deadline',
	'published',
	'created',
	'title',
	'name'
];
const VALID_SORT_DIRS: SortDir[] = ['asc', 'desc'];

type SectionsPayloadResult =
	| { success: true; sections: HomepageSectionConfig[] }
	| { success: false; error: string };

function parseSectionsPayload(
	raw: string,
	existingById: Map<string, HomepageSectionConfig>
): SectionsPayloadResult {
	if (!raw) return { success: false, error: 'Missing section payload' };

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return { success: false, error: 'Invalid section payload' };
	}

	if (!Array.isArray(parsed)) {
		return { success: false, error: 'Section payload must be an array' };
	}

	const normalized = parsed
		.map((entry, index) =>
			entry && typeof entry === 'object'
				? normalizeSectionPayload(
						entry as Record<string, unknown>,
						index,
						existingById.get(String((entry as { id?: unknown }).id ?? ''))
					)
				: null
		)
		.filter((section): section is HomepageSectionConfig => Boolean(section));

	if (normalized.length === 0) {
		return { success: false, error: 'Add at least one homepage section' };
	}

	return { success: true, sections: normalized };
}

function normalizeSectionPayload(
	entry: Record<string, unknown>,
	index: number,
	existing: HomepageSectionConfig | undefined
): HomepageSectionConfig | null {
	const source = entry.source;
	if (typeof source !== 'string' || !VALID_SOURCES.includes(source as SectionSource)) return null;

	const base = existing ?? createSection(source as SectionSource);
	const id = typeof entry.id === 'string' && entry.id.trim() ? entry.id : `${base.id}_${index}`;
	const heading =
		typeof entry.heading === 'string' && entry.heading.trim().length > 0
			? entry.heading.trim()
			: DEFAULT_HEADINGS[source as SectionSource];
	const visible = entry.visible !== false;
	const layoutPreset = normalizeLayoutPreset(
		source as SectionSource,
		typeof entry.layoutPreset === 'string' ? entry.layoutPreset : null
	);

	if (source === 'featured') {
		const items = Array.isArray(entry.items)
			? (entry.items as Array<Record<string, unknown>>)
					.filter(
						(item) =>
							typeof item.coil === 'string' &&
							typeof item.itemId === 'string' &&
							(item.itemId as string).trim().length > 0
					)
					.map((item) => ({
						coil: item.coil as CoilKey,
						itemId: (item.itemId as string).trim(),
						title: typeof item.title === 'string' ? item.title : ''
					}))
			: [];
		return { ...base, id, source, visible, heading, layoutPreset, items };
	}

	if (source === 'richtext') {
		return {
			...base,
			id,
			source,
			visible,
			heading,
			layoutPreset,
			content: typeof entry.content === 'string' ? entry.content : (base.content ?? '')
		};
	}

	if (source === 'container') {
		const columns = (entry.columns === 3 ? 3 : 2) as 2 | 3;
		const children = Array.isArray(entry.children)
			? (entry.children as Array<Record<string, unknown>>)
					.map((child, ci) => {
						if (!child || typeof child !== 'object') return null;
						const childSource = child.source as string;
						if (!childSource || childSource === 'container') return null;
						return normalizeSectionPayload(child, ci, undefined);
					})
					.filter((c): c is HomepageSectionConfig => c !== null)
			: [];
		return { ...base, id, source, visible, heading, columns, children };
	}

	if (source === 'image') {
		return {
			...base,
			id,
			source,
			visible,
			heading,
			imageUrl: typeof entry.imageUrl === 'string' ? entry.imageUrl : '',
			imageAlt: typeof entry.imageAlt === 'string' ? entry.imageAlt : '',
			imageHeight: (['sm', 'md', 'lg', 'xl'].includes(entry.imageHeight as string)
				? entry.imageHeight
				: 'md') as HomepageSectionConfig['imageHeight'],
			imageFit: (['cover', 'contain'].includes(entry.imageFit as string)
				? entry.imageFit
				: 'cover') as HomepageSectionConfig['imageFit'],
			imageHref: typeof entry.imageHref === 'string' ? entry.imageHref : undefined,
			imageRounded: entry.imageRounded !== false
		};
	}

	const sortBy =
		typeof entry.sortBy === 'string' && VALID_SORT_FIELDS.includes(entry.sortBy as SortField)
			? (entry.sortBy as SortField)
			: base.sortBy;
	const sortDir =
		typeof entry.sortDir === 'string' && VALID_SORT_DIRS.includes(entry.sortDir as SortDir)
			? (entry.sortDir as SortDir)
			: base.sortDir;
	const limit = Math.min(Math.max(Number(entry.limit) || base.limit, 1), 12);
	const futureOnly = SOURCE_HAS_DATE_FILTER[source as SectionSource]
		? entry.futureOnly === true
		: false;
	const excludedIds = Array.isArray(entry.excludedIds)
		? entry.excludedIds
				.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
				.map((item) => item.trim())
		: [];
	const searchQuery =
		typeof entry.searchQuery === 'string' && entry.searchQuery.trim().length > 0
			? entry.searchQuery.trim()
			: undefined;

	return {
		...base,
		id,
		source: source as Exclude<SectionSource, 'featured' | 'richtext' | 'container' | 'image'>,
		visible,
		heading,
		limit,
		sortBy,
		sortDir,
		futureOnly,
		searchQuery,
		layoutPreset,
		excludedIds: excludedIds.length > 0 ? [...new Set(excludedIds)] : undefined
	};
}

/* ── Load ── */

export const load: PageServerLoad = async () => {
	const [draftConfig, liveConfig, publishMeta] = await Promise.all([
		getHomepageDraftConfig(),
		getHomepageLiveConfig(),
		getHomepagePublishMeta()
	]);

	// Collect all previewable sections (top-level + container children)
	const allSections: HomepageSectionConfig[] = [];
	for (const section of draftConfig.sections) {
		allSections.push(section);
		if (section.source === 'container' && section.children) {
			allSections.push(...section.children);
		}
	}

	const previewEntries = await Promise.all(
		allSections
			.filter((s) => !['featured', 'richtext', 'container', 'image'].includes(s.source))
			.map(
				async (section) =>
					[section.id, await fetchHomepageSectionPreview(section).catch(() => [])] as const
			)
	);
	const sectionPreviews = Object.fromEntries(previewEntries) as Record<
		string,
		{ id: string; title: string; skipped: boolean }[]
	>;

	return {
		draftConfig,
		liveConfig,
		publishMeta,
		hasChanges: JSON.stringify(draftConfig) !== JSON.stringify(liveConfig),
		sectionPreviews
	};
};

/* ── Actions ── */

export const actions: Actions = {
	saveSections: async ({ request }) => {
		const formData = await request.formData();
		const raw = String(formData.get('sectionsPayload') ?? '').trim();

		const config = await getHomepageDraftConfig();
		const existingById = new Map(config.sections.map((section) => [section.id, section] as const));
		const result = parseSectionsPayload(raw, existingById);
		if (!result.success) return fail(400, { error: result.error });

		config.sections = result.sections;
		await saveHomepageDraftConfig(config);
		return { success: true };
	},

	publishDraft: async ({ request, locals }) => {
		const formData = await request.formData();
		const raw = String(formData.get('sectionsPayload') ?? '').trim();
		if (raw) {
			const config = await getHomepageDraftConfig();
			const existingById = new Map(
				config.sections.map((section) => [section.id, section] as const)
			);
			const result = parseSectionsPayload(raw, existingById);
			if (!result.success) return fail(400, { error: result.error });

			config.sections = result.sections;
			await saveHomepageDraftConfig(config);
		}

		await publishHomepageDraftConfig(locals.user?.id ?? null);
		return { success: true };
	},

	resetDraft: async () => {
		try {
			await resetHomepageDraftConfig();
			return { success: true };
		} catch (error) {
			return fail(400, {
				error: error instanceof Error ? error.message : 'Could not reset draft homepage'
			});
		}
	}
};
