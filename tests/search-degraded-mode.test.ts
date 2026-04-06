import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startDevServer } from './helpers/dev-server';

let server: Awaited<ReturnType<typeof startDevServer>>;

describe.runIf(process.env.SEARCH_DEGRADED_MODE_TEST === '1')(
	'search degraded-mode contract',
	() => {
		beforeAll(async () => {
			server = await startDevServer(4176, {
				MEILISEARCH_HOST: '',
				MEILISEARCH_API_KEY: ''
			});
		});

		afterAll(async () => {
			await server?.stop();
		});

		it('falls back to database results and reports offline readiness when search is unavailable', async () => {
			const response = await fetch(`${server.baseUrl}/api/search?q=tribal`);
			expect(response.status).toBe(200);

			const payload = (await response.json()) as {
				resultSource: string;
				readiness: { state: string; detail: string };
				groups: Array<{ key: string; results: unknown[] }>;
				experience?: { degraded?: boolean; degradedLabel?: string };
			};

			expect(payload.resultSource).toBe('database');
			expect(payload.readiness.state).toBe('offline');
			expect(payload.readiness.detail).toBe('not-configured');
			expect(payload.groups.some((group) => group.results.length > 0)).toBe(true);
			expect(payload.experience?.degraded).toBe(true);
			expect(payload.experience?.degradedLabel).toBe(
				'Search is running in compatibility mode because indexed search is not configured.'
			);
		});
	}
);
