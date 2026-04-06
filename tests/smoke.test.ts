import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as cheerio from 'cheerio';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { startDevServer } from './helpers/dev-server';

let server: Awaited<ReturnType<typeof startDevServer>>;
const sql = postgres(process.env.DATABASE_URL ?? 'postgres://kb:kbdev@localhost:5432/kb');

async function createVerifiedCredentialUser(role: 'contributor' | 'admin' = 'contributor') {
	const { hashPassword } = await import('../node_modules/better-auth/dist/crypto/password.mjs');
	const id = randomUUID();
	const accountId = randomUUID();
	const email = `smoke-${Date.now()}-${randomUUID()}@example.com`;
	const password = 'smokepass123';
	const passwordHash = await hashPassword(password);

	await sql`insert into "user" (id, name, email, email_verified, role, created_at, updated_at)
		values (${id}, 'Smoke User', ${email}, true, ${role}, now(), now())`;
	await sql`insert into account (id, account_id, provider_id, user_id, password, created_at, updated_at)
		values (${accountId}, ${email}, 'credential', ${id}, ${passwordHash}, now(), now())`;

	return {
		email,
		password,
		cleanup: async () => {
			await sql`delete from account where id = ${accountId}`;
			await sql`delete from "user" where id = ${id}`;
		}
	};
}

async function signInAndGetCookie(baseUrl: string, email: string, password: string) {
	const response = await fetch(`${baseUrl}/auth/login?/signIn`, {
		method: 'POST',
		redirect: 'manual',
		headers: {
			'content-type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({ email, password })
	});

	const rawSetCookie = response.headers.get('set-cookie') ?? '';
	const cookieHeader = rawSetCookie
		.split(/,(?=\s*[^;]+=)/)
		.map((part) => part.split(';')[0])
		.join('; ');

	return cookieHeader;
}

describe('public route smoke tests', () => {
	beforeAll(async () => {
		server = await startDevServer(4173, {
			MEILISEARCH_HOST: 'http://127.0.0.1:65534'
		});
	});

	afterAll(async () => {
		await server?.stop();
		await sql.end({ timeout: 5 });
	});

	it('serves core public and auth routes without crashing', async () => {
		const routes = [
			'/',
			'/about',
			'/privacy',
			'/terms',
			'/cookies',
			'/privacy/requests',
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
			'/api/health',
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
		expect(response.headers.get('location')).toContain('/auth/login?redirect=%2Fadmin');
	});

	it('redirects unauthenticated account privacy traffic to login', async () => {
		const response = await fetch(`${server.baseUrl}/account/privacy`, { redirect: 'manual' });
		expect(response.status).toBe(303);
		expect(response.headers.get('location')).toContain('/auth/login?redirect=%2Faccount%2Fprivacy');
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

	it('renders semantic pagination navigation on public browse pages', async () => {
		const html = await fetch(`${server.baseUrl}/toolbox`).then((response) => response.text());
		const $ = cheerio.load(html);
		const paginationNav = $('nav[aria-label="Pagination"]');

		expect(paginationNav.length).toBeGreaterThan(0);
		expect(paginationNav.text()).toContain('Previous');
		expect(paginationNav.text()).toContain('Next');
		expect(paginationNav.find('[aria-current="page"]').length).toBeGreaterThan(0);
	});

	it('renders the global search page for a populated query', async () => {
		const html = await fetch(`${server.baseUrl}/search?q=tribal`).then((response) =>
			response.text()
		);
		const normalized = html.replace(/\s+/g, ' ');
		expect(normalized).toContain('Search results for "tribal"');
		expect(normalized).toContain('Search Knowledge Basket');
	});

	it('publishes discovery endpoints with sitemap and manifest links', async () => {
		const robots = await fetch(`${server.baseUrl}/robots.txt`).then((response) => response.text());
		expect(robots).toContain('Sitemap:');

		const sitemap = await fetch(`${server.baseUrl}/sitemap.xml`).then((response) =>
			response.text()
		);
		expect(sitemap).toContain('<urlset');
		expect(sitemap).toContain('/events</loc>');

		const manifest = await fetch(`${server.baseUrl}/manifest.webmanifest`).then((response) =>
			response.json()
		);
		expect(manifest.name).toBe('Knowledge Basket');
		expect(manifest.start_url).toBe('/');
	});

	it('applies security headers to public responses', async () => {
		const response = await fetch(`${server.baseUrl}/privacy`, { redirect: 'manual' });
		expect(response.headers.get('content-security-policy')).toContain("default-src 'self'");
		expect(response.headers.get('permissions-policy')).toContain('camera=()');
		expect(response.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
		expect(response.headers.get('x-content-type-options')).toBe('nosniff');
	});

	it('renders signed-in toolbox chrome without falling back to the signed-out header', async () => {
		const user = await createVerifiedCredentialUser('admin');

		try {
			const cookieHeader = await signInAndGetCookie(server.baseUrl, user.email, user.password);
			const response = await fetch(`${server.baseUrl}/toolbox`, {
				headers: { cookie: cookieHeader },
				redirect: 'manual'
			});
			const html = await response.text();

			expect(response.status).toBe(200);
			expect(html).toContain('Smoke User');
			expect(html).toContain('kb-header__account-trigger');
			expect(html).toContain('/auth/logout');
			expect(html).not.toContain('> Sign in <');
		} finally {
			await user.cleanup();
		}
	});
});
