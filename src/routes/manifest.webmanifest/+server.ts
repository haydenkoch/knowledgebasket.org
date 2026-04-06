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
	let iconUrl: string;
	try {
		iconUrl = buildPublicAssetUrl(DEFAULT_LOGO_OBJECT_KEY);
	} catch {
		// PUBLIC_ASSET_BASE_URL not set — use a static fallback so the manifest still loads
		iconUrl = '/favicon.png';
	}

	try {
		const [faviconUrl, logoUrl] = await Promise.all([
			getSetting(BRAND_FAVICON_KEY),
			getSetting(BRAND_LOGO_KEY)
		]);
		iconUrl = normalizeManifestIconUrl(faviconUrl) ?? normalizeManifestIconUrl(logoUrl) ?? iconUrl;
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

function normalizeManifestIconUrl(value: string | null): string | null {
	if (!value) return null;
	if (!value.startsWith('/uploads/')) return value;
	return buildPublicAssetUrl(value.slice('/uploads/'.length));
}
