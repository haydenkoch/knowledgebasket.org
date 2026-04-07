import type { LayoutServerLoad } from './$types';
import { getSetting, BRAND_LOGO_KEY, BRAND_FAVICON_KEY } from '$lib/server/settings';
import { resolveSeoOrigin } from '$lib/server/seo';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	let brandLogoUrl: string | null = null;
	let brandFaviconUrl: string | null = null;
	try {
		[brandLogoUrl, brandFaviconUrl] = await Promise.all([
			getSetting(BRAND_LOGO_KEY),
			getSetting(BRAND_FAVICON_KEY)
		]);
	} catch {
		// site_settings table may not exist yet (run pnpm db:push); use defaults
	}
	return {
		brandLogoUrl,
		brandFaviconUrl,
		seoOrigin: resolveSeoOrigin(url),
		user: locals.user ?? null
	};
};
