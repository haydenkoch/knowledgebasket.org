import { getSetting, BRAND_FAVICON_KEY, BRAND_LOGO_KEY } from '$lib/server/settings';
import { buildPublicAssetUrl, DEFAULT_LOGO_OBJECT_KEY } from '$lib/config/public-assets';

const DEFAULT_MANIFEST = {
	name: 'Knowledge Basket',
	short_name: 'KB',
	start_url: '/',
	display: 'standalone',
	background_color: '#f7f0dc',
	theme_color: '#132533',
	description:
		'Search Indigenous-led events, funding, Native-owned businesses, jobs, and practical resources.'
};

export async function GET() {
	let iconUrl = buildPublicAssetUrl(DEFAULT_LOGO_OBJECT_KEY);

	try {
		const [faviconUrl, logoUrl] = await Promise.all([
			getSetting(BRAND_FAVICON_KEY),
			getSetting(BRAND_LOGO_KEY)
		]);
		iconUrl = faviconUrl ?? logoUrl ?? iconUrl;
	} catch {
		// site_settings may not exist yet; fall back to the seeded default icon
	}

	return new Response(
		JSON.stringify({
			...DEFAULT_MANIFEST,
			icons: [
				{
					src: iconUrl,
					sizes: '512x512',
					type: 'image/png'
				}
			]
		}),
		{
			headers: {
				'Content-Type': 'application/manifest+json; charset=utf-8',
				'Cache-Control': 'public, max-age=300'
			}
		}
	);
}
