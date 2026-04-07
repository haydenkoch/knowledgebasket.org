import { getSetting, BRAND_FAVICON_KEY, BRAND_LOGO_KEY } from '$lib/server/settings';
import {
	buildPublicAssetUrl,
	DEFAULT_LOGO_OBJECT_KEY,
	resolveAbsoluteUrl
} from '$lib/config/public-assets';
import { resolveSeoOrigin } from '$lib/server/seo';

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

export async function GET({ url }: { url: URL }) {
	const origin = resolveSeoOrigin(url);
	let iconUrl: string | null = null;
	try {
		iconUrl = buildPublicAssetUrl(DEFAULT_LOGO_OBJECT_KEY);
	} catch {
		// Public asset storage is optional in local development.
	}

	try {
		const [faviconUrl, logoUrl] = await Promise.all([
			getSetting(BRAND_FAVICON_KEY),
			getSetting(BRAND_LOGO_KEY)
		]);
		iconUrl =
			normalizeManifestIconUrl(faviconUrl, origin) ??
			normalizeManifestIconUrl(logoUrl, origin) ??
			iconUrl;
	} catch {
		// site_settings may not exist yet; fall back to seeded or static icons.
	}

	const staticIcons = [
		{
			src: resolveAbsoluteUrl('/icon-192.png', { origin }) ?? '/icon-192.png',
			sizes: '192x192',
			type: 'image/png',
			purpose: 'any'
		},
		{
			src: resolveAbsoluteUrl('/icon-512.png', { origin }) ?? '/icon-512.png',
			sizes: '512x512',
			type: 'image/png',
			purpose: 'any'
		},
		{
			src: resolveAbsoluteUrl('/maskable-icon-512.png', { origin }) ?? '/maskable-icon-512.png',
			sizes: '512x512',
			type: 'image/png',
			purpose: 'maskable'
		}
	];

	const icons = [
		...(iconUrl
			? [
					{
						src: resolveAbsoluteUrl(iconUrl, { origin }) ?? iconUrl,
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any'
					}
				]
			: []),
		...staticIcons
	];

	return new Response(
		JSON.stringify({
			...DEFAULT_MANIFEST,
			id: '/',
			icons
		}),
		{
			headers: {
				'Content-Type': 'application/manifest+json; charset=utf-8',
				'Cache-Control': 'public, max-age=300'
			}
		}
	);
}

function normalizeManifestIconUrl(value: string | null, origin: string): string | null {
	if (!value) return null;
	return resolveAbsoluteUrl(value, { origin });
}
