import tailwindcss from '@tailwindcss/vite';
import { sentrySvelteKit } from '@sentry/sveltekit';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import { resolve, join } from 'path';
import { cpSync, existsSync, readFileSync } from 'fs';

function tinymceSelfHosted(): Plugin {
	const tinymceBase = resolve('node_modules/tinymce');
	const assetDirs = ['skins', 'icons', 'themes', 'models', 'plugins'];

	return {
		name: 'tinymce-self-hosted',
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				if (req.url?.startsWith('/tinymce/')) {
					const filePath = join(tinymceBase, req.url.replace('/tinymce/', ''));
					if (existsSync(filePath)) {
						return res.end(readFileSync(filePath));
					}
				}
				next();
			});
		},
		closeBundle() {
			const outDir = resolve('.svelte-kit/output/client/tinymce');
			for (const dir of assetDirs) {
				const src = join(tinymceBase, dir);
				if (existsSync(src)) {
					cpSync(src, join(outDir, dir), { recursive: true });
				}
			}
		}
	};
}

function shouldUploadSentrySourceMaps(): boolean {
	return Boolean(
		process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
	);
}

const uploadSentrySourceMaps = shouldUploadSentrySourceMaps();
const sentryPlugins = await sentrySvelteKit({
	adapter: 'node',
	autoUploadSourceMaps: uploadSentrySourceMaps,
	authToken: process.env.SENTRY_AUTH_TOKEN,
	org: process.env.SENTRY_ORG,
	project: process.env.SENTRY_PROJECT,
	release: {
		name: process.env.SENTRY_RELEASE || process.env.RAILWAY_GIT_COMMIT_SHA
	},
	telemetry: false
});

export default defineConfig({
	plugins: [...sentryPlugins, tailwindcss(), sveltekit(), tinymceSelfHosted()],
	resolve: {
		dedupe: ['svelte', 'bits-ui']
	},
	optimizeDeps: {
		include: ['svelte', '@sentry/sveltekit', 'posthog-js']
	},
	server: {
		host: 'localhost',
		strictPort: true,
		watch: {
			// SvelteKit rewrites `.svelte-kit/types` proxy files during route sync.
			// Ignoring that generated subtree prevents transient ENOENT noise in dev.
			ignored: ['**/.svelte-kit/types/**']
		}
	},
	test: {
		include: ['tests/**/*.test.ts'],
		environment: 'node',
		testTimeout: 120000,
		hookTimeout: 120000
	},
	build: {
		sourcemap: uploadSentrySourceMaps ? 'hidden' : false,
		rollupOptions: {
			output: {
				manualChunks(id: string) {
					if (id.includes('node_modules/@schedule-x')) return 'schedule-x';
					if (id.includes('node_modules/@internationalized')) return 'intl';
					if (id.includes('node_modules/temporal')) return 'temporal';
					if (id.includes('node_modules/@lucide')) return 'lucide';
					if (id.includes('node_modules/tinymce')) return 'tinymce';
				}
			}
		},
		chunkSizeWarningLimit: 600
	}
});
