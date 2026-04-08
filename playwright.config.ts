import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4273);
const host = '127.0.0.1';
const baseURL = `http://${host}:${port}`;

export default defineConfig({
	testDir: './e2e',
	timeout: 60_000,
	expect: {
		timeout: 10_000
	},
	fullyParallel: false,
	workers: 1,
	use: {
		baseURL,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure'
	},
	webServer: {
		command: `pnpm exec vite dev --host ${host} --port ${port} --strictPort`,
		url: `${baseURL}/manifest.webmanifest`,
		reuseExistingServer: !process.env.CI,
		env: {
			...process.env,
			ORIGIN: baseURL,
			PUBLIC_ASSET_BASE_URL: process.env.PUBLIC_ASSET_BASE_URL ?? `${baseURL}/assets`,
			REINDEX_SECRET: process.env.REINDEX_SECRET ?? 'playwright-reindex-secret'
		}
	},
	projects: [
		{
			name: 'desktop-chromium',
			use: {
				...devices['Desktop Chrome']
			}
		},
		{
			name: 'mobile-chromium',
			use: {
				...devices['Pixel 7']
			}
		}
	]
});
