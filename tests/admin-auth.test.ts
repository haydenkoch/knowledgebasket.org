import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startDevServer } from './helpers/dev-server';

let server: Awaited<ReturnType<typeof startDevServer>>;

describe('admin request protection', () => {
	beforeAll(async () => {
		server = await startDevServer(4175);
	});

	afterAll(async () => {
		await server?.stop();
	});

	it('redirects unauthenticated admin page loads to login', async () => {
		const response = await fetch(`${server.baseUrl}/admin/funding`, {
			redirect: 'manual'
		});

		expect(response.status).toBe(303);
		expect(response.headers.get('location')).toContain('/auth/login?redirect=%2Fadmin%2Ffunding');
	});

	it('blocks unauthenticated admin actions before mutation logic runs', async () => {
		const response = await fetch(`${server.baseUrl}/admin/funding?/bulkDelete`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Origin: server.baseUrl,
				Referer: `${server.baseUrl}/admin/funding`
			},
			body: new URLSearchParams({ ids: 'demo-id' })
		});

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: 'Authentication required' });
	});

	it('blocks unauthenticated admin funding create actions', async () => {
		const response = await fetch(`${server.baseUrl}/admin/funding/new`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Origin: server.baseUrl,
				Referer: `${server.baseUrl}/admin/funding/new`
			},
			body: new URLSearchParams({ title: 'Test funding', funderName: 'Funder' })
		});

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: 'Authentication required' });
	});

	it('blocks unauthenticated admin funding moderation actions', async () => {
		const response = await fetch(`${server.baseUrl}/admin/funding/demo-id?/approve`, {
			method: 'POST',
			headers: {
				Origin: server.baseUrl,
				Referer: `${server.baseUrl}/admin/funding/demo-id`
			}
		});

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: 'Authentication required' });
	});
});
