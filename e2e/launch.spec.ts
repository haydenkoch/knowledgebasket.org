import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import postgres from 'postgres';
import { CONSENT_VERSION } from '../src/lib/legal/config';

const sql = postgres(process.env.DATABASE_URL ?? 'postgres://kb:kbdev@localhost:5432/kb');
const baseURL = `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT ?? '4273'}`;
const seededConsent = JSON.stringify({
	version: CONSENT_VERSION,
	updatedAt: new Date('2026-04-06T00:00:00.000Z').toISOString(),
	source: 'preferences',
	globalPrivacyControl: false,
	categories: {
		essential: true,
		preferences: true,
		analytics: false,
		marketing: false
	}
});

async function createVerifiedCredentialUser(role: 'contributor' | 'admin' = 'admin') {
	const { hashPassword } = await import('../node_modules/better-auth/dist/crypto/password.mjs');
	const userId = randomUUID();
	const accountId = randomUUID();
	const email = `playwright-${Date.now()}-${randomUUID()}@example.com`;
	const password = 'playwright-pass-123';
	const passwordHash = await hashPassword(password);

	await sql`insert into "user" (id, name, email, email_verified, role, created_at, updated_at)
		values (${userId}, 'Playwright Admin', ${email}, true, ${role}, now(), now())`;
	await sql`insert into account (id, account_id, provider_id, user_id, password, created_at, updated_at)
		values (${accountId}, ${email}, 'credential', ${userId}, ${passwordHash}, now(), now())`;

	return {
		email,
		password,
		cleanup: async () => {
			await sql`delete from account where id = ${accountId}`;
			await sql`delete from "user" where id = ${userId}`;
		}
	};
}

async function signIn(page: Parameters<typeof test>[0]['page'], email: string, password: string) {
	await page.goto('/auth/login?redirect=%2Faccount');
	await page.getByLabel('Email address').fill(email);
	await page.getByLabel('Password').fill(password);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL(/\/account$/);
}

async function expectNoAxeViolations(
	page: Parameters<typeof test>[0]['page'],
	label: string,
	options?: { exclude?: string[]; include?: string[] }
) {
	let builder = new AxeBuilder({ page });
	for (const selector of options?.include ?? []) {
		builder = builder.include(selector);
	}
	for (const selector of options?.exclude ?? []) {
		builder = builder.exclude(selector);
	}
	const results = await builder.analyze();
	expect(results.violations, `${label} axe violations`).toEqual([]);
}

test.beforeEach(async ({ context }) => {
	await context.addInitScript((consentValue: string) => {
		window.localStorage.setItem('kb:consent', consentValue);
	}, seededConsent);
	await context.addCookies([
		{
			name: 'kb_consent',
			value: encodeURIComponent(seededConsent),
			url: baseURL
		}
	]);
});

test.afterAll(async () => {
	await sql.end({ timeout: 5 });
});

test('public browse routes render their primary titles', async ({ context }) => {
	const routes = [
		['/', /Knowledge Basket/],
		['/events', /Events \| Knowledge Basket/],
		['/funding', /Funding \| Knowledge Basket/],
		['/red-pages', /Red Pages \| Knowledge Basket/],
		['/jobs', /Job Board \| Knowledge Basket/],
		['/toolbox', /Toolbox \| Knowledge Basket/],
		['/search?q=tribal', /Search results for "tribal"/]
	] as const;

	for (const [route, titlePattern] of routes) {
		const routePage = await context.newPage();
		try {
			await routePage.goto(route, { waitUntil: 'domcontentloaded' });
			await expect(routePage).toHaveTitle(titlePattern);
		} finally {
			await routePage.close();
		}
	}
});

test('signed-out users are redirected away from protected account and admin routes', async ({
	page
}) => {
	await page.goto('/account/privacy');
	await expect(page).toHaveURL(/\/auth\/login\?redirect=%2Faccount%2Fprivacy/);
	await expect(page.getByLabel('Email address')).toBeVisible();

	await page.goto('/admin');
	await expect(page).toHaveURL(/\/auth\/login\?redirect=%2Fadmin/);
	await expect(page.getByLabel('Email address')).toBeVisible();
});

test('admin users can sign in and reach account and admin workspaces', async ({ page }) => {
	const user = await createVerifiedCredentialUser('admin');

	try {
		await signIn(page, user.email, user.password);
		await expect(page.getByRole('heading', { name: 'Playwright Admin' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Account settings' })).toBeVisible();

		await page.goto('/admin');
		await expect(page.getByRole('heading', { name: 'Work queue' })).toBeVisible();
		await expect(page.getByText('Needs attention').first()).toBeVisible();
	} finally {
		await user.cleanup();
	}
});

test('representative public, auth, account, and admin pages pass axe', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Search the Knowledge Basket' })).toBeVisible();
	await expectNoAxeViolations(page, 'home');

	await page.goto('/events');
	await expect(page).toHaveTitle(/Events \| Knowledge Basket/);
	await expectNoAxeViolations(page, 'events', {
		exclude: ['.kb-submit-tab', '.kb-submit-bar']
	});

	await page.goto('/auth/login');
	await expect(page.getByLabel('Email address')).toBeVisible();
	await expectNoAxeViolations(page, 'auth login');

	const user = await createVerifiedCredentialUser('admin');

	try {
		await signIn(page, user.email, user.password);
		await expectNoAxeViolations(page, 'account');

		await page.goto('/admin');
		await expect(page.getByRole('heading', { name: 'Work queue' })).toBeVisible();
		await expectNoAxeViolations(page, 'admin', { include: ['#admin-main'] });
	} finally {
		await user.cleanup();
	}
});
