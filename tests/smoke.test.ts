import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startDevServer } from './helpers/dev-server';

let server: Awaited<ReturnType<typeof startDevServer>>;

describe('public route smoke tests', () => {
	beforeAll(async () => {
		server = await startDevServer(4173, { MEILISEARCH_HOST: '' });
	});

	afterAll(async () => {
		await server?.stop();
	});

	it('serves core public and auth routes without crashing', async () => {
		const routes = [
			'/',
			'/about',
			'/events',
			'/funding',
			'/red-pages',
			'/jobs',
			'/toolbox',
			'/auth/login',
			'/auth/register',
			'/auth/forgot-password',
			'/auth/reset-password?token=test-token',
			'/auth/verify-email?email=test@example.com',
			'/search?q=tribal',
			'/robots.txt',
			'/sitemap.xml',
			'/manifest.webmanifest'
		];

		for (const route of routes) {
			const response = await fetch(`${server.baseUrl}${route}`, { redirect: 'manual' });
			expect(response.status, route).toBe(200);
		}
	});

	it('redirects unauthenticated admin traffic to login', async () => {
		const response = await fetch(`${server.baseUrl}/admin`, { redirect: 'manual' });
		expect(response.status).toBe(303);
		expect(response.headers.get('location')).toContain('/auth/login?redirect=/admin');
	});

	it('renders metadata on top-level public pages', async () => {
		const pages = [
			{
				path: '/',
				title: '<title>Knowledge Basket</title>',
				description: 'Search Knowledge Basket for Indigenous-led events'
			},
			{
				path: '/events',
				title: '<title>Events | Knowledge Basket</title>',
				description: 'Indigenous gatherings, trainings, and cultural events'
			},
			{
				path: '/funding',
				title: '<title>Funding | Knowledge Basket</title>',
				description: 'Browse grants, contracts, fellowships'
			},
			{
				path: '/jobs',
				title: '<title>Job Board | Knowledge Basket</title>',
				description: 'Browse job openings, fellowships'
			},
			{
				path: '/red-pages',
				title: '<title>Red Pages | Knowledge Basket</title>',
				description: 'Browse Native-owned businesses'
			},
			{
				path: '/toolbox',
				title: '<title>Toolbox | Knowledge Basket</title>',
				description: 'Browse toolkits, policy documents'
			}
		];

		for (const page of pages) {
			const html = await fetch(`${server.baseUrl}${page.path}`).then((response) => response.text());
			expect(html).toContain(page.title);
			expect(html).toContain(page.description);
			expect(html).toContain('rel="canonical"');
		}
	});

	it('shows explicit limited-search messaging when the cross-coil index is unavailable', async () => {
		const html = await fetch(`${server.baseUrl}/search?q=tribal`).then((response) =>
			response.text()
		);
		const normalized = html.replace(/\s+/g, ' ');
		expect(normalized).toContain('Search is currently limited');
		expect(normalized).toContain('results currently show events only');
	});

	it('publishes discovery endpoints with sitemap and manifest links', async () => {
		const robots = await fetch(`${server.baseUrl}/robots.txt`).then((response) => response.text());
		expect(robots).toContain('Sitemap:');

		const sitemap = await fetch(`${server.baseUrl}/sitemap.xml`).then((response) =>
			response.text()
		);
		expect(sitemap).toContain('<urlset');
		expect(sitemap).toContain(`${server.baseUrl}/events`);

		const manifest = await fetch(`${server.baseUrl}/manifest.webmanifest`).then((response) =>
			response.json()
		);
		expect(manifest.name).toBe('Knowledge Basket');
		expect(manifest.start_url).toBe('/');
	});
});
