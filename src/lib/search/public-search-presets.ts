import type { CoilKey } from '$lib/data/kb';
import { buildScopedSearchHref, buildSearchHref } from '$lib/search/search-client';

export type PublicSearchAction = {
	label: string;
	hint: string;
	href: string;
};

export type PublicSearchPreset = {
	scope: CoilKey;
	label: string;
	description: string;
	href: string;
	quickLinks: PublicSearchAction[];
	queries: Array<{
		label: string;
		term: string;
		hint: string;
	}>;
};

function pad(value: number): string {
	return String(value).padStart(2, '0');
}

function formatDateInput(date: Date): string {
	return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function addDays(base: Date, days: number): Date {
	const next = new Date(base);
	next.setUTCDate(next.getUTCDate() + days);
	return next;
}

const TODAY = formatDateInput(new Date());
const IN_30_DAYS = formatDateInput(addDays(new Date(), 30));
const IN_45_DAYS = formatDateInput(addDays(new Date(), 45));
const IN_60_DAYS = formatDateInput(addDays(new Date(), 60));

export const PUBLIC_SEARCH_PRESETS: PublicSearchPreset[] = [
	{
		scope: 'events',
		label: 'Events',
		description: 'Powwows, convenings, trainings, and public gatherings.',
		href: '/events',
		quickLinks: [
			{
				label: 'Upcoming 30 days',
				hint: 'See what is coming up soon',
				href: buildSearchHref({
					scope: 'events',
					sort: 'date',
					dateFrom: TODAY,
					dateTo: IN_30_DAYS
				})
			},
			{
				label: 'Newest added',
				hint: 'Freshly published events',
				href: buildSearchHref({ scope: 'events', sort: 'recent' })
			}
		],
		queries: [
			{ label: 'Powwows', term: 'powwow', hint: 'Dance, culture, and community events' },
			{
				label: 'Youth summits',
				term: 'youth summit',
				hint: 'Leadership and youth-focused gatherings'
			},
			{ label: 'Trainings', term: 'training', hint: 'Workshops and practical learning sessions' }
		]
	},
	{
		scope: 'funding',
		label: 'Funding',
		description: 'Grants, awards, rolling opportunities, and contracts.',
		href: '/funding',
		quickLinks: [
			{
				label: 'Open now',
				hint: 'Open and rolling opportunities',
				href: buildSearchHref({
					scope: 'funding',
					sort: 'date',
					filters: { status: ['open', 'rolling'] }
				})
			},
			{
				label: 'Due in 60 days',
				hint: 'Time-sensitive funding to act on',
				href: buildSearchHref({
					scope: 'funding',
					sort: 'date',
					dateFrom: TODAY,
					dateTo: IN_60_DAYS
				})
			}
		],
		queries: [
			{
				label: 'Grant deadlines',
				term: 'grant deadline',
				hint: 'Time-sensitive funding opportunities'
			},
			{ label: 'Arts funding', term: 'arts grant', hint: 'Culture, language, and arts support' },
			{
				label: 'Economic development',
				term: 'economic development',
				hint: 'Business and community investment'
			}
		]
	},
	{
		scope: 'redpages',
		label: 'Red Pages',
		description: 'Native-owned businesses, services, and trusted partners.',
		href: '/red-pages',
		quickLinks: [
			{
				label: 'Newest listings',
				hint: 'Recently added businesses and vendors',
				href: buildSearchHref({ scope: 'redpages', sort: 'recent' })
			},
			{
				label: 'Browse directory',
				hint: 'Scan all Red Pages listings',
				href: '/red-pages'
			}
		],
		queries: [
			{
				label: 'Native-owned businesses',
				term: 'Native-owned businesses',
				hint: 'Indigenous-led vendors and shops'
			},
			{
				label: 'Consultants',
				term: 'consulting',
				hint: 'Strategy, planning, and advisory services'
			},
			{
				label: 'Design and media',
				term: 'design',
				hint: 'Creative, branding, and storytelling partners'
			}
		]
	},
	{
		scope: 'jobs',
		label: 'Jobs',
		description: 'Career openings, fellowships, and Tribal hiring opportunities.',
		href: '/jobs',
		quickLinks: [
			{
				label: 'Closing soon',
				hint: 'Applications due in the next 45 days',
				href: buildSearchHref({
					scope: 'jobs',
					sort: 'date',
					dateFrom: TODAY,
					dateTo: IN_45_DAYS
				})
			},
			{
				label: 'Recently updated',
				hint: 'Latest changes across the job board',
				href: buildSearchHref({ scope: 'jobs', sort: 'recent' })
			}
		],
		queries: [
			{
				label: 'Tribal employment',
				term: 'tribal employment',
				hint: 'Roles with Tribes and Tribal entities'
			},
			{
				label: 'Fellowships',
				term: 'fellowship',
				hint: 'Short-term and cohort-based opportunities'
			},
			{ label: 'Remote roles', term: 'remote', hint: 'Flexible and distributed work' }
		]
	},
	{
		scope: 'toolbox',
		label: 'Toolbox',
		description: 'Guides, reports, toolkits, and practical resources.',
		href: '/toolbox',
		quickLinks: [
			{
				label: 'Newest resources',
				hint: 'Recently added documents and guides',
				href: buildSearchHref({ scope: 'toolbox', sort: 'recent' })
			},
			{
				label: 'Policy docs',
				hint: 'Policy documents and formal guidance',
				href: buildSearchHref({
					scope: 'toolbox',
					filters: { mediaType: ['Policy Document'] }
				})
			}
		],
		queries: [
			{ label: 'Toolkits', term: 'toolkit', hint: 'Hands-on playbooks and templates' },
			{ label: 'Case studies', term: 'case study', hint: 'Examples and field lessons' },
			{ label: 'Policy guides', term: 'policy', hint: 'Frameworks, briefs, and policy docs' }
		]
	}
] as const;

export const PUBLIC_POPULAR_SEARCHES = [
	'grant deadlines',
	'cultural events',
	'tribal employment',
	'Native-owned businesses',
	'economic development'
] as const;

export { buildSearchHref, buildScopedSearchHref };
