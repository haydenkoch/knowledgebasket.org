import type { Actions, PageServerLoad } from './$types';
import { getSetting, setSetting, BRAND_LOGO_KEY, BRAND_FAVICON_KEY } from '$lib/server/settings';
import { uploadImage } from '$lib/server/upload';

export const load: PageServerLoad = async () => {
	const [logoUrl, faviconUrl] = await Promise.all([
		getSetting(BRAND_LOGO_KEY),
		getSetting(BRAND_FAVICON_KEY)
	]);
	return { logoUrl, faviconUrl };
};

export const actions: Actions = {
	uploadLogo: async ({ request }) => {
		const fd = await request.formData();
		const file = fd.get('logo') as File | null;
		if (!file || file.size === 0) return { success: false, error: 'Choose a file' };
		try {
			const url = await uploadImage(file, 'brand');
			await setSetting(BRAND_LOGO_KEY, url);
			return { success: true };
		} catch (e) {
			return { success: false, error: e instanceof Error ? e.message : 'Upload failed' };
		}
	},
	uploadFavicon: async ({ request }) => {
		const fd = await request.formData();
		const file = fd.get('favicon') as File | null;
		if (!file || file.size === 0) return { success: false, error: 'Choose a file' };
		try {
			const url = await uploadImage(file, 'brand');
			await setSetting(BRAND_FAVICON_KEY, url);
			return { success: true };
		} catch (e) {
			return { success: false, error: e instanceof Error ? e.message : 'Upload failed' };
		}
	}
};
