/**
 * Homepage configuration types and constants.
 * Shared between server and client code.
 */
import type { CoilKey } from '$lib/data/kb';
import { coilPaths } from '$lib/data/kb';

/** A section can pull from any coil, be editor's picks, richtext, container, or image */
export type SectionSource = CoilKey | 'featured' | 'richtext' | 'container' | 'image';
export type HomepageLayoutPreset = 'auto' | 'cards' | 'list' | 'compact' | 'banner';

export type SortField = 'date' | 'deadline' | 'published' | 'created' | 'title' | 'name';
export type SortDir = 'asc' | 'desc';

export type ContainerColumns = 2 | 3;
export type ImageHeight = 'sm' | 'md' | 'lg' | 'xl';
export type ImageFit = 'cover' | 'contain';

export interface HomepageFeaturedRef {
	coil: CoilKey;
	itemId: string;
	title: string;
}

export interface HomepageSectionConfig {
	/** Unique identifier for this section instance */
	id: string;
	/** Which coil to pull from, 'featured' for editor's picks, or 'richtext' for custom content */
	source: SectionSource;
	visible: boolean;
	limit: number;
	sortBy: SortField;
	sortDir: SortDir;
	futureOnly: boolean;
	heading: string;
	excludedIds?: string[];
	searchQuery?: string;
	layoutPreset?: HomepageLayoutPreset;
	/** HTML content for richtext sections */
	content?: string;
	/** Curated items for featured sections (each featured section has its own list) */
	items?: HomepageFeaturedRef[];
	/** Container: number of columns */
	columns?: ContainerColumns;
	/** Container: nested child sections */
	children?: HomepageSectionConfig[];
	/** Image: URL */
	imageUrl?: string;
	/** Image: alt text */
	imageAlt?: string;
	/** Image: display height */
	imageHeight?: ImageHeight;
	/** Image: object-fit */
	imageFit?: ImageFit;
	/** Image: optional link */
	imageHref?: string;
	/** Image: rounded corners */
	imageRounded?: boolean;
}

export interface HomepageConfig {
	/** @deprecated Legacy global featured list — migrated into per-section items on parse */
	featured: HomepageFeaturedRef[];
	sections: HomepageSectionConfig[];
}

/** Sort options available per source */
export const SOURCE_SORT_OPTIONS: Record<SectionSource, { value: SortField; label: string }[]> = {
	featured: [],
	richtext: [],
	container: [],
	image: [],
	events: [
		{ value: 'date', label: 'Event date' },
		{ value: 'published', label: 'Date added' },
		{ value: 'title', label: 'Title' }
	],
	funding: [
		{ value: 'deadline', label: 'Deadline' },
		{ value: 'published', label: 'Date added' },
		{ value: 'title', label: 'Title' }
	],
	jobs: [
		{ value: 'published', label: 'Date added' },
		{ value: 'title', label: 'Title' }
	],
	redpages: [
		{ value: 'created', label: 'Date added' },
		{ value: 'name', label: 'Name' }
	],
	toolbox: [
		{ value: 'published', label: 'Date added' },
		{ value: 'title', label: 'Title' }
	]
};

/** Whether a source supports the "future only" date filter */
export const SOURCE_HAS_DATE_FILTER: Record<SectionSource, boolean> = {
	featured: false,
	richtext: false,
	container: false,
	image: false,
	events: true,
	funding: true,
	jobs: false,
	redpages: false,
	toolbox: false
};

export const DEFAULT_HEADINGS: Record<SectionSource, string> = {
	featured: "Editor's Picks",
	richtext: 'Announcement',
	container: '',
	image: '',
	events: 'Upcoming Events',
	funding: 'Funding Deadlines',
	jobs: 'Latest Job Openings',
	redpages: 'Red Pages Spotlight',
	toolbox: 'From the Toolbox'
};

export const HOMEPAGE_LAYOUT_LABELS: Record<HomepageLayoutPreset, string> = {
	auto: 'Auto',
	cards: 'Cards',
	list: 'List',
	compact: 'Compact',
	banner: 'Banner'
};

export const SOURCE_LAYOUT_PRESETS: Record<SectionSource, HomepageLayoutPreset[]> = {
	featured: ['auto', 'cards', 'list', 'compact'],
	richtext: ['auto', 'banner', 'cards'],
	container: ['auto'],
	image: ['auto'],
	events: ['auto', 'cards', 'list', 'compact'],
	funding: ['auto', 'cards', 'list', 'compact'],
	jobs: ['auto', 'cards', 'list', 'compact'],
	redpages: ['auto', 'cards', 'list', 'compact'],
	toolbox: ['auto', 'cards', 'list', 'compact']
};

export const IMAGE_HEIGHT_LABELS: Record<ImageHeight, string> = {
	sm: 'Small',
	md: 'Medium',
	lg: 'Large',
	xl: 'Extra Large'
};

export const IMAGE_HEIGHT_CLASSES: Record<ImageHeight, string> = {
	sm: 'h-32 sm:h-40',
	md: 'h-48 sm:h-56',
	lg: 'h-64 sm:h-80',
	xl: 'h-80 sm:h-[28rem]'
};

/** Sources that can be placed inside a container column */
export const CONTAINER_CHILD_SOURCES: SectionSource[] = [
	'featured',
	'richtext',
	'image',
	'events',
	'funding',
	'jobs',
	'redpages',
	'toolbox'
];

export function normalizeLayoutPreset(
	source: SectionSource,
	layoutPreset?: string | null
): HomepageLayoutPreset {
	if (
		!layoutPreset ||
		!SOURCE_LAYOUT_PRESETS[source].includes(layoutPreset as HomepageLayoutPreset)
	) {
		return 'auto';
	}
	return layoutPreset as HomepageLayoutPreset;
}

export function resolveSectionLayoutPreset(
	section: Pick<HomepageSectionConfig, 'source' | 'limit' | 'layoutPreset'>
): HomepageLayoutPreset {
	const preset = normalizeLayoutPreset(section.source, section.layoutPreset);
	if (preset !== 'auto') return preset;

	switch (section.source) {
		case 'events':
		case 'funding':
			return section.limit <= 4 ? 'cards' : 'list';
		case 'jobs':
		case 'redpages':
		case 'toolbox':
			return section.limit <= 4 ? 'list' : 'compact';
		case 'richtext':
			return 'banner';
		case 'featured':
			return section.limit <= 4 ? 'cards' : 'list';
		case 'container':
		case 'image':
		default:
			return 'auto';
	}
}

export function buildHomepageSectionMoreHref(
	section: Pick<HomepageSectionConfig, 'source' | 'searchQuery'> & { futureOnly?: boolean }
): string | null {
	if (
		section.source === 'featured' ||
		section.source === 'richtext' ||
		section.source === 'container' ||
		section.source === 'image'
	)
		return null;

	const path = `/${coilPaths[section.source] ?? section.source}`;
	const params = new URLSearchParams();

	if (section.searchQuery?.trim()) {
		params.set('q', section.searchQuery.trim());
	}

	if ((section.source === 'events' || section.source === 'funding') && section.futureOnly) {
		params.set('future', '1');
	}

	const query = params.toString();
	return query ? `${path}?${query}` : path;
}

type HomepageItemHrefTarget = {
	id: string;
	slug?: string;
	coil?: CoilKey;
};

function buildCoilHref(coil: CoilKey): string {
	return `/${coilPaths[coil] ?? coil}`;
}

export function buildHomepageItemHref(coil: CoilKey, item: HomepageItemHrefTarget): string;
export function buildHomepageItemHref(
	source: SectionSource,
	item: HomepageItemHrefTarget
): string | null;
export function buildHomepageItemHref(
	source: SectionSource,
	item: HomepageItemHrefTarget
): string | null {
	if (source === 'featured') {
		return item.coil ? `${buildCoilHref(item.coil)}/${item.slug ?? item.id}` : null;
	}

	if (source === 'richtext' || source === 'container' || source === 'image') {
		return null;
	}

	return `${buildCoilHref(source)}/${item.slug ?? item.id}`;
}

let _idCounter = 0;
export function genSectionId(): string {
	return `sec_${Date.now()}_${++_idCounter}`;
}

/** Create a new section config with sensible defaults for a source */
export function createSection(
	source: SectionSource,
	overrides?: Partial<HomepageSectionConfig>
): HomepageSectionConfig {
	const defaults: Record<
		SectionSource,
		Pick<HomepageSectionConfig, 'sortBy' | 'sortDir' | 'futureOnly' | 'limit'>
	> = {
		featured: { sortBy: 'published', sortDir: 'desc', futureOnly: false, limit: 5 },
		richtext: { sortBy: 'published', sortDir: 'desc', futureOnly: false, limit: 1 },
		container: { sortBy: 'published', sortDir: 'desc', futureOnly: false, limit: 1 },
		image: { sortBy: 'published', sortDir: 'desc', futureOnly: false, limit: 1 },
		events: { sortBy: 'date', sortDir: 'asc', futureOnly: true, limit: 4 },
		funding: { sortBy: 'deadline', sortDir: 'asc', futureOnly: true, limit: 3 },
		jobs: { sortBy: 'published', sortDir: 'desc', futureOnly: false, limit: 4 },
		redpages: { sortBy: 'created', sortDir: 'desc', futureOnly: false, limit: 4 },
		toolbox: { sortBy: 'published', sortDir: 'desc', futureOnly: false, limit: 3 }
	};
	const d = defaults[source];

	const base: HomepageSectionConfig = {
		id: genSectionId(),
		source,
		visible: true,
		limit: d.limit,
		sortBy: d.sortBy,
		sortDir: d.sortDir,
		futureOnly: d.futureOnly,
		heading: DEFAULT_HEADINGS[source],
		layoutPreset: 'auto',
		...overrides
	};

	if (source === 'container') {
		base.columns = base.columns ?? 2;
		base.children = base.children ?? [];
	}

	if (source === 'image') {
		base.imageUrl = base.imageUrl ?? '';
		base.imageHeight = base.imageHeight ?? 'md';
		base.imageFit = base.imageFit ?? 'cover';
		base.imageRounded = base.imageRounded ?? true;
	}

	return base;
}

export function cloneSectionConfig(section: HomepageSectionConfig): HomepageSectionConfig {
	return {
		...section,
		excludedIds: section.excludedIds ? [...section.excludedIds] : undefined,
		layoutPreset: normalizeLayoutPreset(section.source, section.layoutPreset),
		items: section.items ? section.items.map((item) => ({ ...item })) : undefined,
		children: section.children
			? section.children.map((child) => cloneSectionConfig(child))
			: undefined
	};
}

export function cloneHomepageConfig(config: HomepageConfig): HomepageConfig {
	return {
		featured: config.featured.map((item) => ({ ...item })),
		sections: config.sections.map((section) => cloneSectionConfig(section))
	};
}

export const DEFAULT_SECTIONS: HomepageSectionConfig[] = [
	createSection('featured', { id: 'default_featured' }),
	createSection('events', { id: 'default_events' }),
	createSection('funding', { id: 'default_funding' }),
	createSection('jobs', { id: 'default_jobs' }),
	createSection('redpages', { id: 'default_redpages' }),
	createSection('toolbox', { id: 'default_toolbox' })
];

export function createDefaultHomepageConfig(): HomepageConfig {
	return {
		featured: [],
		sections: DEFAULT_SECTIONS.map((section) => cloneSectionConfig(section))
	};
}

export const DEFAULT_CONFIG: HomepageConfig = createDefaultHomepageConfig();
