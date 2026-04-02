import type { LayoutServerLoad } from './$types';
import { getSetting, BRAND_LOGO_KEY } from '$lib/server/settings';

export const load: LayoutServerLoad = async ({ locals }) => {
	let brandLogoUrl: string | null = null;
	try {
		brandLogoUrl = await getSetting(BRAND_LOGO_KEY);
	} catch {
		// site_settings table may not exist yet
	}
	return { user: locals.user ?? null, brandLogoUrl };
};
