import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startDevServer } from './helpers/dev-server';

let server: Awaited<ReturnType<typeof startDevServer>>;

describe('search API contract', () => {
	beforeAll(async () => {
		server = await startDevServer(4174, {
			MEILISEARCH_HOST: 'http://127.0.0.1:65535',
			MEILISEARCH_API_KEY: ''
		});
	});

	afterAll(async () => {
		await server?.stop();
	});

	it('reports readiness and fallback details when Meilisearch is configured but unavailable', async () => {
		const response = await fetch(`${server.baseUrl}/api/search?q=tribal`);
		expect(response.status).toBe(200);

		const payload = (await response.json()) as {
			query: string;
			resultSource: string;
			readiness: { state: string; detail: string };
			experience: { degraded: boolean; degradedLabel?: string };
			request: { surface: string; scope: string };
			fallbackReason?: string;
			groups: Array<{ key: string; results: unknown[] }>;
		};

		expect(payload.query).toBe('tribal');
		expect(payload.readiness.state).toBe('offline');
		expect(payload.readiness.detail).toBe('host-unavailable');
		expect(payload.resultSource).toBe('database');
		expect(payload.experience.degraded).toBe(true);
		expect(payload.experience.degradedLabel).toContain('compatibility');
		expect(payload.request.surface).toBe('autocomplete');
		expect(payload.request.scope).toBe('all');
		expect(payload.fallbackReason).toBe('search-offline');
		expect(Array.isArray(payload.groups)).toBe(true);
	});
});
