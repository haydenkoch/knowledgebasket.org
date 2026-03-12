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

import { seedEventsFromCsv, seedRedPagesFromCsv } from './seedFromCsv';

export const kbData: KBData = {
	events: seedEventsFromCsv as EventItem[],
	funding: [
		{
			id: 'funding-forest-stewardship',
			title: 'California Forest Stewardship Program',
			description:
				'Funding for Tribal Nations, local governments, and nonprofits to implement forest stewardship projects.',
			funder: 'CA Dept. of Forestry & Fire Protection',
			status: 'Open',
			amount: '$25,000 – $500,000',
			region: 'California',
			coil: 'funding'
		},
		{
			id: 'funding-native-arts',
			title: 'Native Arts & Cultures Foundation Grants',
			description: 'Support for Native artists and culture bearers.',
			funder: 'Native Arts & Cultures Foundation',
			status: 'Rolling',
			amount: '$5,000 – $50,000',
			region: 'National',
			coil: 'funding'
		}
	],
	redpages: seedRedPagesFromCsv as RedPagesItem[],
	jobs: [
		{
			id: 'job-env-coordinator',
			title: 'Tribal Environmental Coordinator',
			description:
				'Manage environmental programs, grants, and consultation for the Shingle Springs Band of Miwok Indians.',
			employer: 'Shingle Springs Band of Miwok Indians',
			location: 'Shingle Springs, CA',
			type: 'Full-Time',
			sector: 'Government / Tribal',
			coil: 'jobs'
		},
		{
			id: 'job-kb-coordinator',
			title: 'Knowledge Basket Program Coordinator',
			description:
				'Coordinate the digital Knowledge Basket, including content curation, outreach to Tribal partners, and maintenance of the platform.',
			employer: 'Indigenous Futures Society',
			location: 'Remote / California',
			type: 'Full-Time',
			sector: 'Nonprofit',
			coil: 'jobs'
		}
	],
	toolbox: [
		{
			id: 'toolkit-ncai',
			title: 'NCAI Tribal Economic Development Toolkit',
			description:
				'Comprehensive toolkit for Tribal Nations to build resilient Indigenous economies, including strategic planning guidance and case studies.',
			source: 'National Congress of American Indians',
			mediaType: 'Toolkit',
			category: 'Economic Development',
			coil: 'toolbox'
		},
		{
			id: 'toolkit-bcafn',
			title: 'BC Assembly of First Nations Black Books',
			description:
				'Economic development guides for Indigenous communities at any stage of their economic journey, with resources for planning and growth.',
			source: 'BC Assembly of First Nations',
			mediaType: 'Toolkit',
			category: 'Indigenous Economic Futures',
			coil: 'toolbox'
		},
		{
			id: 'pdf-iitc-study-guide',
			title: 'IITC Study Guide: Gold, Greed and Genocide',
			description:
				'Educational resource on the impact of gold rush and colonization on Indigenous peoples in California.',
			source: 'International Indian Treaty Council',
			mediaType: 'Report',
			category: 'Reconciliation & Equity',
			coil: 'toolbox',
			url: '/resources/Reconciliation%20%26%20Equity/IITC-Study-Guide-Gold-Greed-and-Genocide.pdf'
		}
	]
};

export type SearchResults = Partial<Record<CoilKey, BaseItem[]>>;

export function searchAll(query: string, scope: 'all' | CoilKey = 'all'): SearchResults | null {
	const q = query.trim().toLowerCase();
	if (!q) return null;

	const scopes: CoilKey[] = scope === 'all' ? (Object.keys(kbData) as CoilKey[]) : [scope];
	const results: SearchResults = {};

	for (const key of scopes) {
		const items = kbData[key] as BaseItem[];
		const matches = items.filter((item) => {
			const haystack = [
				item.title,
				item.description,
				(key === 'events' && (item as EventItem).location) || '',
				(key === 'events' && (item as EventItem).type) || '',
				(key === 'funding' && (item as FundingItem).funder) || '',
				(key === 'redpages' && (item as RedPagesItem).tribe) || '',
					(key === 'jobs' && (item as JobItem).employer) || '',
				(key === 'toolbox' && (item as ToolboxItem).source) || ''
			]
				.map((v) => (v || '').toLowerCase())
				.join(' ');
			return haystack.includes(q);
		});
		if (matches.length) {
			results[key] = matches;
		}
	}

	return Object.keys(results).length ? results : null;
}

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

/** Slug is item id (already kebab-case). */
export function getItemBySlug(coil: CoilKey, slug: string): BaseItem | undefined {
	const list = kbData[coil] as BaseItem[];
	return list.find((item) => item.id === slug);
}

/** All items with coil path for building links. */
export function getAllItems(): Array<{ coil: CoilKey; item: BaseItem; path: string }> {
	const out: Array<{ coil: CoilKey; item: BaseItem; path: string }> = [];
	for (const coil of Object.keys(kbData) as CoilKey[]) {
		const path = getCoilPath(coil);
		for (const item of kbData[coil] as BaseItem[]) {
			out.push({ coil, item, path });
		}
	}
	return out;
}

/** Build haystack string for one item for search matching. */
function itemHaystack(key: CoilKey, item: BaseItem): string {
	return [
		item.title,
		item.description,
		(key === 'events' && (item as EventItem).location) || '',
		(key === 'events' && (item as EventItem).type) || '',
		(key === 'events' && (item as EventItem).region) || '',
		(key === 'funding' && (item as FundingItem).funder) || '',
		(key === 'funding' && (item as FundingItem).status) || '',
		(key === 'redpages' && (item as RedPagesItem).tribe) || '',
		(key === 'redpages' && (item as RedPagesItem).serviceType) || '',
		(key === 'jobs' && (item as JobItem).employer) || '',
		(key === 'jobs' && (item as JobItem).location) || '',
		(key === 'toolbox' && (item as ToolboxItem).source) || '',
		(key === 'toolbox' && (item as ToolboxItem).mediaType) || '',
		(key === 'toolbox' && (item as ToolboxItem).category) || ''
	]
		.join(' ')
		.toLowerCase();
}

/** Live search over arbitrary KB data (e.g. merged with submissions). */
export function searchAllLiveFromData(
	data: KBData,
	query: string,
	scope: 'all' | CoilKey = 'all'
): SearchResults | null {
	const q = query.trim().toLowerCase();
	if (!q) return null;
	const terms = q.split(/\s+/).filter(Boolean);
	if (!terms.length) return null;
	const scopes: CoilKey[] = scope === 'all' ? (Object.keys(data) as CoilKey[]) : [scope];
	const results: SearchResults = {};
	for (const key of scopes) {
		const items = data[key] as BaseItem[];
		const matches = items.filter((item) => {
			const haystack = itemHaystack(key, item);
			return terms.every((t) => haystack.includes(t));
		});
		if (matches.length) results[key] = matches;
	}
	return Object.keys(results).length ? results : null;
}

/** Live search: tokenize query and match any word (Algolia-style). Returns grouped by coil. */
export function searchAllLive(query: string, scope: 'all' | CoilKey = 'all'): SearchResults | null {
	const q = query.trim().toLowerCase();
	if (!q) return null;
	const terms = q.split(/\s+/).filter(Boolean);
	if (!terms.length) return null;

	const scopes: CoilKey[] = scope === 'all' ? (Object.keys(kbData) as CoilKey[]) : [scope];
	const results: SearchResults = {};

	for (const key of scopes) {
		const items = kbData[key] as BaseItem[];
		const matches = items.filter((item) => {
			const haystack = itemHaystack(key, item);
			return terms.every((t) => haystack.includes(t));
		});
		if (matches.length) results[key] = matches;
	}

	return Object.keys(results).length ? results : null;
}

