import tailwindcss from '@tailwindcss/vite';
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

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), tinymceSelfHosted()],
	test: {
		environment: 'node',
		testTimeout: 120000,
		hookTimeout: 120000
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) {
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
