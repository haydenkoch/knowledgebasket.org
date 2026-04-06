export const SEARCH_INDEX_SCOPES = [
	'events',
	'funding',
	'redpages',
	'jobs',
	'toolbox',
	'organizations',
	'venues',
	'sources'
] as const;

export const PUBLIC_SEARCH_SCOPES = ['events', 'funding', 'redpages', 'jobs', 'toolbox'] as const;

export const SEARCH_SCOPE_LABELS = {
	all: 'All results',
	events: 'Events',
	funding: 'Funding',
	redpages: 'Red Pages',
	jobs: 'Jobs',
	toolbox: 'Toolbox',
	organizations: 'Organizations',
	venues: 'Venues',
	sources: 'Sources'
} as const;
