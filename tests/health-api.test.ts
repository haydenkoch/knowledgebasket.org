import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startDevServer } from './helpers/dev-server';

let server: Awaited<ReturnType<typeof startDevServer>>;

describe('health API schema reporting', () => {
	beforeAll(async () => {
		server = await startDevServer(4176, { MEILISEARCH_HOST: '' });
	});

	afterAll(async () => {
		await server?.stop();
	});

	it('reports schema readiness details alongside service health', async () => {
		const response = await fetch(`${server.baseUrl}/api/health`);
		expect(response.status).toBe(200);

		const payload = (await response.json()) as {
			status: string;
			services: {
				schema: {
					ok: boolean;
					checks: {
						sourceOps: { ok: boolean; missing: string[]; message: string | null };
						privacyRequests: { ok: boolean; missing: string[]; message: string | null };
						accountLifecycle: { ok: boolean; missing: string[]; message: string | null };
					};
				};
			};
		};

		expect(payload.status === 'ok' || payload.status === 'degraded').toBe(true);
		expect(payload.services.schema).toEqual(
			expect.objectContaining({
				ok: expect.any(Boolean),
				checks: expect.objectContaining({
					sourceOps: expect.objectContaining({
						ok: expect.any(Boolean),
						missing: expect.any(Array)
					}),
					privacyRequests: expect.objectContaining({
						ok: expect.any(Boolean),
						missing: expect.any(Array)
					}),
					accountLifecycle: expect.objectContaining({
						ok: expect.any(Boolean),
						missing: expect.any(Array)
					})
				})
			})
		);
	});
});
