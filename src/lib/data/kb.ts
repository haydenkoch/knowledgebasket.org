export type CoilKey = 'events' | 'funding' | 'redpages' | 'jobs' | 'toolbox';

export const coilLabels: Record<CoilKey, string> = {
	events: 'Events',
	funding: 'Funding',
	redpages: 'Red Pages',
	jobs: 'Job Board',
	toolbox: 'Toolbox'
};

export interface BaseItem {
	id: string;
	title: string;
	description?: string;
	coil: CoilKey;
}

export interface EventItem extends BaseItem {
	/** URL slug (unique). Used for /events/[slug] routes. */
	slug?: string;
	location?: string;
	/** Street address (optional) */
	address?: string;
	/** Latitude for map view */
	lat?: number;
	/** Longitude for map view */
	lng?: number;
	region?: string;
	/** Legacy single type string (e.g. "Powwow / Big Time"); kept for backward compat. */
	type?: string;
	/** Event type tags (e.g. ["Powwow", "Big Time"]). When set, type is derived for display. */
	types?: string[];
	audience?: string;
	/** Cost: Free / Sponsored or Registration Fee Required */
	cost?: string;
	/** Event or registration URL */
	eventUrl?: string;
	/** Start/end dates */
	startDate?: string;
	endDate?: string;
	/** Host org */
	hostOrg?: string;
	/** Optional image URL (e.g. /uploads/events/slug.jpg) */
	imageUrl?: string;
}

export interface FundingItem extends BaseItem {
	funder?: string;
	status?: string;
	amount?: string;
	region?: string;
	focus?: string;
	fundingType?: string;
	applyUrl?: string;
}

export interface RedPagesItem extends BaseItem {
	tribe?: string;
	serviceType?: string;
	region?: string;
	website?: string;
}

export interface JobItem extends BaseItem {
	employer?: string;
	location?: string;
	type?: string;
	sector?: string;
	region?: string;
	level?: string;
	workArrangement?: string;
	compensation?: string;
	benefits?: string;
	applyUrl?: string;
	applicationDeadline?: string;
	indigenousPriority?: boolean;
	imageUrl?: string;
}

export interface ToolboxItem extends BaseItem {
	source?: string;
	mediaType?: string;
	category?: string;
	url?: string;
}

export interface KBData {
	events: EventItem[];
	funding: FundingItem[];
	redpages: RedPagesItem[];
	jobs: JobItem[];
	toolbox: ToolboxItem[];
}

/** Search results shape (e.g. from /api/search). Events-only for now. */
export type SearchResults = Partial<Record<CoilKey, BaseItem[]>>;

/** URL path segment for each coil (for routing) */
export const coilPaths: Record<CoilKey, string> = {
	events: 'events',
	funding: 'funding',
	redpages: 'red-pages',
	jobs: 'jobs',
	toolbox: 'toolbox'
};

export function getCoilPath(coil: CoilKey): string {
	return coilPaths[coil];
}
