import { afterEach, describe, expect, it } from 'vitest';
import {
	buildBreadcrumbJsonLd,
	buildOgImagePath,
	buildRobotsDirective,
	buildSeoMetadata,
	buildWebSiteJsonLd
} from '../src/lib/seo/metadata';
import {
	getServerRobotsDirective,
	isIndexableBrowseRequest,
	resolveSeoOrigin
} from '../src/lib/server/seo';

const originalOrigin = process.env.ORIGIN;

afterEach(() => {
	process.env.ORIGIN = originalOrigin;
});

describe('seo metadata helpers', () => {
	it('builds canonical and social URLs from the provided origin', () => {
		const metadata = buildSeoMetadata({
			origin: 'https://kb.example.com/',
			pathname: '/events',
			title: 'Events | Knowledge Basket',
			description: 'Indigenous gatherings and cultural events.',
			ogImage: buildOgImagePath({
				title: 'Events',
				eyebrow: 'Knowledge Basket',
				theme: 'events'
			})
		});

		expect(metadata.canonicalUrl).toBe('https://kb.example.com/events');
		expect(metadata.ogImage).toMatch(/^https:\/\/kb\.example\.com\/og\.png\?/);
		expect(metadata.robots).toBe(
			'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'
		);
	});

	it('builds breadcrumb schema with absolute URLs', () => {
		const schema = buildBreadcrumbJsonLd('https://kb.example.com/', [
			{ name: 'Knowledge Basket', pathname: '/' },
			{ name: 'Events', pathname: '/events' },
			{ name: 'Gathering', pathname: '/events/gathering' }
		]);

		expect(schema).toEqual({
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [
				{
					'@type': 'ListItem',
					position: 1,
					name: 'Knowledge Basket',
					item: 'https://kb.example.com/'
				},
				{
					'@type': 'ListItem',
					position: 2,
					name: 'Events',
					item: 'https://kb.example.com/events'
				},
				{
					'@type': 'ListItem',
					position: 3,
					name: 'Gathering',
					item: 'https://kb.example.com/events/gathering'
				}
			]
		});
	});

	it('resolves the SEO origin from ORIGIN when configured', () => {
		process.env.ORIGIN = 'https://canonical.example.com/';

		expect(resolveSeoOrigin(new URL('https://preview.example.com/events'))).toBe(
			'https://canonical.example.com'
		);
	});

	it('treats only clean browse URLs as indexable', () => {
		expect(isIndexableBrowseRequest(new URL('https://kb.example.com/events'))).toBe(true);
		expect(isIndexableBrowseRequest(new URL('https://kb.example.com/events?page=2'))).toBe(false);
		expect(isIndexableBrowseRequest(new URL('https://kb.example.com/events?q=tribal'))).toBe(false);
	});

	it('returns the expected robots directives for page and server policies', () => {
		expect(buildRobotsDirective('noindex-follow')).toBe('noindex,follow');
		expect(buildRobotsDirective('noindex-nofollow')).toBe('noindex,nofollow');
		expect(getServerRobotsDirective('/api/health')).toBe('noindex, nofollow');
		expect(getServerRobotsDirective('/toolbox/guide/preview')).toBe('noindex, nofollow');
		expect(getServerRobotsDirective('/events')).toBeNull();
	});

	it('builds WebSite schema with a SearchAction', () => {
		const schema = buildWebSiteJsonLd('https://kb.example.com');

		expect(schema['@type']).toBe('WebSite');
		expect(schema.url).toBe('https://kb.example.com/');
		expect(schema.potentialAction).toEqual({
			'@type': 'SearchAction',
			target: 'https://kb.example.com/search?q={search_term_string}',
			'query-input': 'required name=search_term_string'
		});
	});

	it('appends breadcrumb schema to serialized JSON-LD when breadcrumb items are provided', () => {
		const metadata = buildSeoMetadata({
			origin: 'https://kb.example.com',
			pathname: '/toolbox',
			title: 'Toolbox | Knowledge Basket',
			breadcrumbItems: [
				{ name: 'Knowledge Basket', pathname: '/' },
				{ name: 'Toolbox', pathname: '/toolbox' }
			]
		});

		expect(metadata.jsonLdScripts).toHaveLength(1);
		expect(metadata.jsonLdScripts[0]).toContain('"@type":"BreadcrumbList"');
		expect(metadata.jsonLdScripts[0]).toContain('"item":"https://kb.example.com/toolbox"');
	});
});
