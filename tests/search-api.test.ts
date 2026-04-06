import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startDevServer } from './helpers/dev-server';

let server: Awaited<ReturnType<typeof startDevServer>>;

describe('search API mode reporting', () => {
	beforeAll(async () => {
		server = await startDevServer(4174, {
			MEILISEARCH_HOST: 'http://127.0.0.1:65535',
			MEILISEARCH_API_KEY: ''
		});
	});

	afterAll(async () => {
		await server?.stop();
	});

	it('reports offline compatibility mode when Meilisearch is configured but unavailable', async () => {
		const response = await fetch(`${server.baseUrl}/api/search?q=tribal`);
		expect(response.status).toBe(200);

		const payload = (await response.json()) as {
			mode: string;
			query: string;
			resultSource: string;
		};

		expect(payload.query).toBe('tribal');
		expect(payload.mode).toBe('offline');
		expect(payload.resultSource).toBe('database');
	});
});
