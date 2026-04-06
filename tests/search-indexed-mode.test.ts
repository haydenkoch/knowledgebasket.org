import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startDevServer } from './helpers/dev-server';

let server: Awaited<ReturnType<typeof startDevServer>>;

async function waitForIndexedSearch(baseUrl: string) {
	for (let attempt = 0; attempt < 20; attempt += 1) {
		const response = await fetch(`${baseUrl}/api/search?q=tribal`);
		const payload = (await response.json()) as {
			resultSource: string;
			readiness: { state: string; detail: string };
			groups: Array<{ key: string; results: unknown[] }>;
		};

		if (payload.readiness.state === 'ready' && payload.resultSource === 'meilisearch') {
			return payload;
		}

		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	throw new Error('Timed out waiting for indexed search readiness');
}

describe.runIf(
	process.env.SEARCH_INDEXED_MODE_TEST === '1' && Boolean(process.env.MEILISEARCH_HOST)
)('search indexed-mode contract', () => {
	beforeAll(async () => {
		server = await startDevServer(4175, {
			REINDEX_SECRET: process.env.REINDEX_SECRET ?? 'indexed-search-secret'
		});

		const response = await fetch(`${server.baseUrl}/api/reindex`, {
			method: 'POST',
			headers: {
				'x-reindex-secret': process.env.REINDEX_SECRET ?? 'indexed-search-secret'
			}
		});

		expect(response.status).toBe(200);
	});

	afterAll(async () => {
		await server?.stop();
	});

	it('reports ready meilisearch-backed results once indexes are built', async () => {
		const payload = await waitForIndexedSearch(server.baseUrl);

		expect(payload.readiness.state).toBe('ready');
		expect(payload.readiness.detail).toBe('ready');
		expect(payload.resultSource).toBe('meilisearch');
		expect(payload.groups.some((group) => group.results.length > 0)).toBe(true);
	});
});
