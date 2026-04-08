import tailwindcss from '@tailwindcss/vite';
import { sentrySvelteKit } from '@sentry/sveltekit';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import { resolve, join } from 'path';
import { cpSync, existsSync, readFileSync } from 'fs';
import { resolveRuntimeConfigValue } from './src/lib/config/runtime-secrets';

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
	const sentryAuthToken = resolveRuntimeConfigValue(process.env, 'SENTRY_AUTH_TOKEN', {
		readFile: (path) => readFileSync(path, 'utf8')
	}).value;

	return Boolean(sentryAuthToken && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT);
}

const uploadSentrySourceMaps = shouldUploadSentrySourceMaps();
const sentryAuthToken = resolveRuntimeConfigValue(process.env, 'SENTRY_AUTH_TOKEN', {
	readFile: (path) => readFileSync(path, 'utf8')
}).value;
const sentryPlugins = await sentrySvelteKit({
	adapter: 'node',
	autoUploadSourceMaps: uploadSentrySourceMaps,
	authToken: sentryAuthToken,
	org: process.env.SENTRY_ORG,
	project: process.env.SENTRY_PROJECT,
	release: {
		name: process.env.SENTRY_RELEASE || process.env.RAILWAY_GIT_COMMIT_SHA
	},
	telemetry: false
});

export default defineConfig({
	plugins: [...sentryPlugins, tailwindcss(), sveltekit(), tinymceSelfHosted()],
	ssr: {
		external: ['sharp']
	},
	resolve: {
		dedupe: ['svelte', 'bits-ui']
	},
	optimizeDeps: {
		include: [
			'svelte',
			'@sentry/sveltekit',
			'posthog-js',
			// Deep subpath imports used by `$lib/analytics/posthog.client.ts`.
			// Without pre-bundling these, Vite discovers them lazily, re-optimizes
			// mid-session, and leaves the transform cache referencing stale `?v=`
			// hashes → 504 Outdated Optimize Dep on dynamic imports of
			// anything that touches analytics (e.g. PublicCommandPalette).
			'posthog-js/lib/src/entrypoints/module.slim.es.js',
			'posthog-js/lib/src/entrypoints/extension-bundles.es.js'
		]
	},
	server: {
		host: 'localhost',
		strictPort: true,
		watch: {
			// SvelteKit rewrites `.svelte-kit/types` proxy files during route sync.
			// Ignoring that generated subtree prevents transient ENOENT noise in dev.
			ignored: ['**/.svelte-kit/types/**']
		},
		// Pre-transform the root layout, client hooks, and the top-level global
		// organisms at boot. This forces Vite to crawl their deps (Lucide icons,
		// posthog, Sentry, bits-ui, etc.) before the browser requests anything,
		// which prevents mid-session re-optimization cycles that invalidate the
		// transform cache and surface as "Loading failed for the module" /
		// 504 Outdated Optimize Dep errors in the browser.
		warmup: {
			clientFiles: [
				'./src/hooks.client.ts',
				'./src/routes/+layout.svelte',
				'./src/lib/components/organisms/KbHeader.svelte',
				'./src/lib/components/organisms/KbPublicNavSidebar.svelte',
				'./src/lib/components/organisms/PublicCommandPalette.svelte',
				'./src/lib/components/organisms/ConsentManager.svelte',
				'./src/lib/insights/provider.client.ts',
				'./src/lib/insights/events.ts'
			]
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
