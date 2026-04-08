/**
 * Shared form schema: dropdown options, placeholders, and suggested values
 * for Knowledge Basket submit forms. Aligns with index.html mockup and kb data.
 */

export const geographyOptions = [
	{ value: '', label: 'Select region…' },
	{ value: 'California', label: 'California' },
	{ value: 'Sierra Nevada', label: 'Sierra Nevada' },
	{ value: 'Northern California', label: 'Northern California' },
	{ value: 'National', label: 'National' },
	{ value: 'Virtual', label: 'Virtual' },
	{ value: 'No Restriction', label: 'No Restriction' }
] as const;

/** Geography for events (subset) */
export const eventGeographyOptions = geographyOptions.filter((r) =>
	['', 'California', 'Sierra Nevada', 'National'].includes(r.value)
);

/** Individual tags for event type (multi-select on submit). */
export const eventTypeTags = [
	'Art Exhibit',
	'Performance',
	'Community Meeting',
	'Forum',
	'Conference',
	'Summit',
	'Symposium',
	'Festival',
	'Celebration',
	'Film Screening',
	'Powwow',
	'Big Time',
	'Trade Show',
	'Marketplace',
	'Other'
] as const;

export type EventTypeTag = (typeof eventTypeTags)[number];

/** Groups for filter UI: selecting a group shows events with any of its tags. */
export const eventTypeGroups = [
	{
		id: 'art-performance',
		label: 'Art Exhibit / Performance',
		tags: ['Art Exhibit', 'Performance']
	},
	{
		id: 'community-forum',
		label: 'Community Meeting / Forum',
		tags: ['Community Meeting', 'Forum']
	},
	{
		id: 'conference-summit',
		label: 'Conference / Summit / Symposium',
		tags: ['Conference', 'Summit', 'Symposium']
	},
	{
		id: 'festival-celebration',
		label: 'Festival / Celebration',
		tags: ['Festival', 'Celebration']
	},
	{
		id: 'film-screening',
		label: 'Film Screening / Festival',
		tags: ['Film Screening', 'Festival']
	},
	{ id: 'powwow-bigtime', label: 'Powwow / Big Time', tags: ['Powwow', 'Big Time'] },
	{
		id: 'trade-marketplace',
		label: 'Trade Show / Marketplace',
		tags: ['Trade Show', 'Marketplace']
	},
	{ id: 'other', label: 'Other', tags: ['Other'] }
] as const;

/** Legacy single-select options (for backward compat). */
export const eventTypeOptions = [
	{ value: '', label: 'Select type…' },
	{ value: 'Art Exhibit / Performance', label: 'Art Exhibit / Performance' },
	{ value: 'Community Meeting / Forum', label: 'Community Meeting / Forum' },
	{ value: 'Conference / Summit / Symposium', label: 'Conference / Summit / Symposium' },
	{ value: 'Festival / Celebration', label: 'Festival / Celebration' },
	{ value: 'Film Screening / Festival', label: 'Film Screening / Festival' },
	{ value: 'Powwow / Big Time', label: 'Powwow / Big Time' },
	{ value: 'Trade Show / Marketplace', label: 'Trade Show / Marketplace' },
	{ value: 'Other', label: 'Other' }
] as const;

export const eventAudienceOptions = [
	{ value: '', label: 'Select…' },
	{ value: 'General Public', label: 'General Public' },
	{ value: 'Indigenous Only', label: 'Indigenous Only' },
	{ value: 'By Profession', label: 'By Profession' }
] as const;

export const eventCostOptions = [
	{ value: '', label: 'Select…' },
	{ value: 'Free', label: 'Free' },
	{ value: 'Free, registration required', label: 'Free, registration required' },
	{
		value: 'Suggested donation / pay what you can',
		label: 'Suggested donation / pay what you can'
	},
	{ value: 'Sliding scale', label: 'Sliding scale' },
	{ value: 'Paid', label: 'Paid' },
	{ value: 'Cost varies', label: 'Cost varies' }
] as const;

/** Funding opportunity type (funder category) */
export const fundingTypeOptions = [
	{ value: '', label: 'Select type…' },
	{ value: 'Federal', label: 'Federal' },
	{ value: 'State', label: 'State' },
	{ value: 'Local / County', label: 'Local / County' },
	{ value: 'Private Foundation', label: 'Private Foundation' },
	{ value: 'NGO', label: 'NGO' },
	{ value: 'Corporate', label: 'Corporate' },
	{ value: 'Tribal', label: 'Tribal' },
	{ value: 'Other', label: 'Other' }
] as const;

export const fundingStatusOptions = [
	{ value: '', label: 'Select…' },
	{ value: 'Open', label: 'Open' },
	{ value: 'Rolling / Ongoing', label: 'Rolling / Ongoing' },
	{ value: 'Coming Soon', label: 'Coming Soon' },
	{ value: 'Closed', label: 'Closed' }
] as const;

export const fundingFocusOptions = [
	{ value: '', label: 'Select…' },
	{ value: 'Land Stewardship', label: 'Land Stewardship' },
	{ value: 'Workforce Development', label: 'Workforce Development' },
	{ value: 'Cultural Preservation', label: 'Cultural Preservation' },
	{ value: 'Economic Development', label: 'Economic Development' },
	{ value: 'Environment', label: 'Environment' },
	{ value: 'Health', label: 'Health' },
	{ value: 'Education', label: 'Education' },
	{ value: 'Housing', label: 'Housing' },
	{ value: 'Other', label: 'Other' }
] as const;

/** Red Pages service type */
export const redPagesServiceTypeOptions = [
	{ value: '', label: 'Select type…' },
	{ value: 'Apparel & Accessories', label: 'Apparel & Accessories' },
	{ value: 'Eco-Cultural Restoration', label: 'Eco-Cultural Restoration' },
	{ value: 'Jewelry', label: 'Jewelry' },
	{ value: 'News Media', label: 'News Media' },
	{ value: 'Nonprofit', label: 'Nonprofit' },
	{ value: 'Organizational Consulting', label: 'Organizational Consulting' },
	{
		value: 'Traditional Arts (Beadwork / Basketry / Regalia)',
		label: 'Traditional Arts (Beadwork / Basketry / Regalia)'
	},
	{ value: 'Web Design & Development', label: 'Web Design & Development' },
	{ value: 'Other', label: 'Other' }
] as const;

/** Red Pages service area = geography subset */
export const redPagesAreaOptions = geographyOptions.filter((r) => r.value !== 'No Restriction');

/** Job type */
export const jobTypeOptions = [
	{ value: '', label: 'Select…' },
	{ value: 'full-time', label: 'Full-Time' },
	{ value: 'part-time', label: 'Part-Time' },
	{ value: 'contract', label: 'Contract / Temporary' },
	{ value: 'temporary', label: 'Temporary' },
	{ value: 'fellowship', label: 'Fellowship' },
	{ value: 'internship', label: 'Internship' },
	{ value: 'volunteer', label: 'Volunteer' },
	{ value: 'other', label: 'Other' }
] as const;

/** Job sector */
export const jobSectorOptions = [
	{ value: '', label: 'Select…' },
	{ value: 'government', label: 'Government / Tribal' },
	{ value: 'environmental', label: 'Environmental / Conservation' },
	{ value: 'health', label: 'Health & Wellness' },
	{ value: 'education', label: 'Education' },
	{ value: 'technology', label: 'Technology' },
	{ value: 'construction', label: 'Construction / Trades' },
	{ value: 'nonprofit', label: 'Nonprofit' },
	{ value: 'legal', label: 'Legal' },
	{ value: 'arts-culture', label: 'Arts & Culture' },
	{ value: 'economic-development', label: 'Economic Development' },
	{ value: 'other', label: 'Other' }
] as const;

/** Job level / seniority */
export const jobLevelOptions = [
	{ value: '', label: 'Select…' },
	{ value: 'entry', label: 'Entry Level' },
	{ value: 'mid', label: 'Mid-Level' },
	{ value: 'senior', label: 'Senior' },
	{ value: 'director', label: 'Director / Executive' }
] as const;

/** Work arrangement */
export const workArrangementOptions = [
	{ value: '', label: 'Select…' },
	{ value: 'in-office', label: 'In-Office' },
	{ value: 'hybrid', label: 'Hybrid' },
	{ value: 'remote', label: 'Remote' }
] as const;

/** Toolbox media type */
export const toolboxMediaTypeOptions = [
	{ value: '', label: 'Select…' },
	{ value: 'Website / Organization', label: 'Website / Organization' },
	{ value: 'Report / White Paper', label: 'Report / White Paper' },
	{ value: 'Video', label: 'Video' },
	{ value: 'Podcast', label: 'Podcast' },
	{ value: 'Toolkit', label: 'Toolkit' },
	{ value: 'News Article', label: 'News Article' },
	{ value: 'Map / GIS', label: 'Map / GIS' },
	{ value: 'Policy Document', label: 'Policy Document' },
	{ value: 'Other', label: 'Other' }
] as const;

/** Toolbox subsection tabs (index.html style) */
export const TOOLBOX_SUBSECTIONS = [
	{ id: '', label: 'All' },
	{ id: 'indigenous-economic-futures', label: 'Indigenous Economic Futures' },
	{ id: 'tribal-govts-enterprises', label: 'Tribal Govts & Enterprises' },
	{ id: 'toolkits', label: 'Toolkits' },
	{ id: 'agency-policy-docs', label: 'Agency & Policy Docs' },
	{ id: 'library', label: 'Library' }
] as const;

export const toolboxCategoryOptions = [
	{ value: '', label: 'Select…' },
	{ value: 'Tribal Allies', label: 'Tribal Allies' },
	{ value: 'Land & Water Guardianship', label: 'Land & Water Guardianship' },
	{ value: 'Cultural Regeneration', label: 'Cultural Regeneration' },
	{ value: 'Reconciliation & Equity', label: 'Reconciliation & Equity' },
	{ value: 'Economic Development', label: 'Economic Development' },
	{ value: 'Food Sovereignty', label: 'Food Sovereignty' },
	{ value: 'Indigenous Economic Futures', label: 'Indigenous Economic Futures' },
	{ value: 'Other', label: 'Other' }
] as const;

/** Suggested placeholders for organization names (from kb data / mockup) */
export const placeholders = {
	organization: 'Indigenous Futures Society',
	organizationShort: 'e.g. Tribal government, Native-led nonprofit',
	location: 'e.g. Placerville, CA or Remote',
	locationCityState: 'e.g. Placerville, CA',
	venue: 'e.g. Shingle Springs Tribal Grounds',
	applyUrl: 'https://…',
	email: 'you@example.org',
	phone: '(555) 123-4567'
} as const;

/** Suggested organizations for datalist (host/employer/funder). Aligns with kb data + mockup. */
export const suggestedOrganizations = [
	'Shingle Springs Band of Miwok Indians',
	'Indigenous Futures Society',
	'CA Dept. of Forestry & Fire Protection',
	'Native Arts & Cultures Foundation',
	'National Congress of American Indians',
	'de Young Museum',
	'The Autry Museum',
	'CA Indian Museum and Cultural Center',
	'United National Indian Tribal Youth'
];

/** Suggested locations/cities for datalist */
export const suggestedLocations = [
	'Placerville, CA',
	'Sacramento, CA',
	'Los Angeles, CA',
	'San Francisco, CA',
	'Shingle Springs, CA',
	'Remote / California',
	'Tahoe City, CA',
	'Greenville, CA',
	'Gardnerville, NV'
];
