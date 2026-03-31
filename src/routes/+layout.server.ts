import type { LayoutServerLoad } from './$types';
import { getSetting, BRAND_LOGO_KEY, BRAND_FAVICON_KEY } from '$lib/server/settings';

export const load: LayoutServerLoad = async () => {
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
	return { brandLogoUrl, brandFaviconUrl };
};
