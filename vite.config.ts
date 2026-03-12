import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes('node_modules/@schedule-x')) return 'schedule-x';
					if (id.includes('node_modules/@internationalized')) return 'intl';
					if (id.includes('node_modules/temporal')) return 'temporal';
					if (id.includes('node_modules/@lucide')) return 'lucide';
				}
			}
		},
		chunkSizeWarningLimit: 600
	}
});
