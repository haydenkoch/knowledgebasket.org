import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL ?? 'postgres://kb:kbdev@localhost:5432/kb');
const baseURL = `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? '4273'}`;

async function createSeoFixtures() {
	const organizationId = randomUUID();
	const venueId = randomUUID();

	await sql`insert into organizations (
		id, slug, name, description, website, region, city, state, verified, created_at, updated_at
	) values (
		${organizationId},
		'future-rivers',
		'Future Rivers',
		'Indigenous-led watershed restoration and stewardship.',
		'https://example.com/future-rivers',
		'Sierra Nevada',
		'Auburn',
		'CA',
		true,
		now(),
		now()
	)`;

	await sql`insert into venues (
		id, slug, name, description, city, state, venue_type, organization_id, created_at, updated_at
	) values (
		${venueId},
		'longhouse',
		'Longhouse',
		'Community venue for gatherings and cultural programming.',
		'Auburn',
		'CA',
		'Community center',
		${organizationId},
		now(),
		now()
	)`;

	return {
		cleanup: async () => {
			await sql`delete from venues where id = ${venueId}`;
			await sql`delete from organizations where id = ${organizationId}`;
		}
	};
}

test.afterAll(async () => {
	await sql.end({ timeout: 5 });
});

test('public SEO metadata covers public, filtered, org, venue, and private pages', async ({
	page,
	request
}) => {
	const fixture = await createSeoFixtures();

	try {
		await page.goto('/');
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${baseURL}/`);
		await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
			'content',
			/\/og\.png\?/
		);

		await page.goto('/events?view=calendar');
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
			'href',
			`${baseURL}/events`
		);

		await page.goto('/auth/login');
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
			'content',
			'noindex,nofollow'
		);

		await page.goto('/o/future-rivers');
		await expect(page).toHaveTitle(/Future Rivers \| Organization \| Knowledge Basket/);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
			'href',
			`${baseURL}/o/future-rivers`
		);
		await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
			'content',
			/\/og\.png\?/
		);
		const organizationSchemas = await page
			.locator('script[type="application/ld+json"]')
			.evaluateAll((elements) => elements.map((element) => element.textContent ?? ''));
		expect(organizationSchemas.some((schema) => schema.includes('"@type":"Organization"'))).toBe(
			true
		);
		expect(organizationSchemas.some((schema) => schema.includes('"@type":"BreadcrumbList"'))).toBe(
			true
		);

		await page.goto('/v/longhouse');
		await expect(page).toHaveTitle(/Longhouse \| Venue \| Knowledge Basket/);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
			'href',
			`${baseURL}/v/longhouse`
		);
		await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
			'content',
			/\/og\.png\?/
		);
		const venueSchemas = await page
			.locator('script[type="application/ld+json"]')
			.evaluateAll((elements) => elements.map((element) => element.textContent ?? ''));
		expect(venueSchemas.some((schema) => schema.includes('"@type":"Place"'))).toBe(true);

		const ogResponse = await request.get(
			`${baseURL}/og.png?title=Future%20Rivers&eyebrow=Knowledge%20Basket&theme=organization`
		);
		expect(ogResponse.ok()).toBe(true);
		expect(ogResponse.headers()['content-type']).toBe('image/png');
	} finally {
		await fixture.cleanup();
	}
});
