import type { RequestHandler } from './$types';
import { getEvents } from '$lib/server/events';
import { getPublishedFunding } from '$lib/server/funding';
import { getPublishedJobs } from '$lib/server/jobs';
import { getPublishedBusinesses } from '$lib/server/red-pages';
import { getPublishedResources } from '$lib/server/toolbox';
import { getOrganizations } from '$lib/server/organizations';
import { getVenues } from '$lib/server/venues';
import { resolveSeoOrigin } from '$lib/server/seo';

type SitemapEntry = {
	loc: string;
	lastmod?: string;
};

function xmlEscape(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}

function asIsoDate(value: string | undefined): string | undefined {
	if (!value) return undefined;
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

async function safeLoad<T>(load: () => Promise<T>, fallback: T): Promise<T> {
	try {
		return await load();
	} catch {
		return fallback;
	}
}

export const GET: RequestHandler = async ({ url }) => {
	const origin = resolveSeoOrigin(url);
	const staticEntries: SitemapEntry[] = [
		{ loc: `${origin}/` },
		{ loc: `${origin}/about` },
		{ loc: `${origin}/support` },
		{ loc: `${origin}/open-source` },
		{ loc: `${origin}/events` },
		{ loc: `${origin}/funding` },
		{ loc: `${origin}/red-pages` },
		{ loc: `${origin}/jobs` },
		{ loc: `${origin}/toolbox` }
	];

	const [events, funding, redPages, jobs, toolbox, organizations, venues] = await Promise.all([
		safeLoad(() => getEvents({ includeIcal: false }), []),
		safeLoad(() => getPublishedFunding(), []),
		safeLoad(() => getPublishedBusinesses(), []),
		safeLoad(() => getPublishedJobs(), []),
		safeLoad(() => getPublishedResources(), []),
		safeLoad(async () => (await getOrganizations({ limit: 5000 })).orgs, []),
		safeLoad(async () => (await getVenues({ limit: 5000 })).venues, [])
	]);

	const entries: SitemapEntry[] = [
		...staticEntries,
		...events.map((event) => ({
			loc: `${origin}/events/${event.slug ?? event.id}`,
			lastmod: asIsoDate(event.publishedAt ?? event.startDate)
		})),
		...funding.map((item) => ({
			loc: `${origin}/funding/${item.slug ?? item.id}`,
			lastmod: asIsoDate(item.publishedAt ?? item.deadline)
		})),
		...redPages.map((item) => ({
			loc: `${origin}/red-pages/${item.slug ?? item.id}`,
			lastmod: asIsoDate(item.publishedAt)
		})),
		...jobs.map((item) => ({
			loc: `${origin}/jobs/${item.slug ?? item.id}`,
			lastmod: asIsoDate(item.publishedAt ?? item.applicationDeadline)
		})),
		...toolbox.map((item) => ({
			loc: `${origin}/toolbox/${item.slug ?? item.id}`,
			lastmod: asIsoDate(item.publishedAt ?? item.publishDate)
		})),
		...organizations.map((organization) => ({
			loc: `${origin}/o/${organization.slug ?? organization.id}`,
			lastmod: asIsoDate(String(organization.updatedAt))
		})),
		...venues.map((venue) => ({
			loc: `${origin}/v/${venue.slug ?? venue.id}`,
			lastmod: asIsoDate(String(venue.updatedAt))
		}))
	];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries
		.map(
			(entry) =>
				`  <url>\n    <loc>${xmlEscape(entry.loc)}</loc>${
					entry.lastmod ? `\n    <lastmod>${xmlEscape(entry.lastmod)}</lastmod>` : ''
				}\n  </url>`
		)
		.join('\n')}\n</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8'
		}
	});
};
