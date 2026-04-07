import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startDevServer } from './helpers/dev-server';

let server: Awaited<ReturnType<typeof startDevServer>>;

describe('manifest route', () => {
	beforeAll(async () => {
		server = await startDevServer(4177, {
			PUBLIC_ASSET_BASE_URL: 'https://assets.example.com/kb-uploads'
		});
	});

	afterAll(async () => {
		await server?.stop();
	});

	it('serves a JSON web manifest with branded and static icons', async () => {
		const response = await fetch(`${server.baseUrl}/manifest.webmanifest`);
		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toContain('application/manifest+json');

		const manifest = (await response.json()) as {
			icons: Array<{ src: string; purpose?: string }>;
		};

		expect(manifest.icons[0]?.src).toMatch(/^https:\/\/assets\.example\.com\/kb-uploads\/.+\.png$/);
		expect(manifest.icons.some((icon) => icon.src.endsWith('/icon-192.png'))).toBe(true);
		expect(manifest.icons.some((icon) => icon.src.endsWith('/icon-512.png'))).toBe(true);
		expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
	});
});
