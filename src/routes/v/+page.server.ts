import { env } from '$env/dynamic/private';
import { getVenues, getVenueMapPoints, type GeoFilter } from '$lib/server/venues';

const PAGE_SIZE = 24;
const DEFAULT_RADIUS_MI = 50;
const MIN_RADIUS_MI = 1;
const MAX_RADIUS_MI = 500;

export type IpGeo = {
	lat: number;
	lng: number;
	place: string | null;
};

/**
 * Extract a coarse location from the hosting provider's geo headers.
 * Falls back to `null` when headers aren't present (e.g. local dev),
 * in which case the map will simply fit to all points.
 */
function parseIpGeo(request: Request): IpGeo | null {
	const h = request.headers;
	const candidates: Array<[string, string]> = [
		// Vercel Edge
		['x-vercel-ip-latitude', 'x-vercel-ip-longitude'],
		// Cloudflare
		['cf-iplatitude', 'cf-iplongitude'],
		// Netlify (via Edge Functions)
		['x-nf-geo-latitude', 'x-nf-geo-longitude']
	];
	for (const [latKey, lngKey] of candidates) {
		const latRaw = h.get(latKey);
		const lngRaw = h.get(lngKey);
		if (!latRaw || !lngRaw) continue;
		const lat = Number(latRaw);
		const lng = Number(lngRaw);
		if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
		if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;

		const city =
			h.get('x-vercel-ip-city') ?? h.get('cf-ipcity') ?? h.get('x-nf-geo-city') ?? null;
		const region =
			h.get('x-vercel-ip-country-region') ??
			h.get('cf-region') ??
			h.get('x-nf-geo-subdivision-code') ??
			null;
		const country =
			h.get('x-vercel-ip-country') ??
			h.get('cf-ipcountry') ??
			h.get('x-nf-geo-country') ??
			null;

		const place =
			[decodeOrNull(city), decodeOrNull(region) ?? decodeOrNull(country)]
				.filter(Boolean)
				.join(', ') || null;

		return { lat, lng, place };
	}
	return null;
}

function decodeOrNull(value: string | null): string | null {
	if (!value) return null;
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

function parseGeo(url: URL): { geo: GeoFilter | undefined; place: string } {
	const latRaw = url.searchParams.get('lat');
	const lngRaw = url.searchParams.get('lng');
	const radiusRaw = url.searchParams.get('radius');
	const place = url.searchParams.get('place')?.trim() ?? '';

	if (!latRaw || !lngRaw) return { geo: undefined, place: '' };

	const lat = Number(latRaw);
	const lng = Number(lngRaw);
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { geo: undefined, place: '' };
	if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return { geo: undefined, place: '' };

	const radiusParsed = Number(radiusRaw);
	const radiusMiles = Number.isFinite(radiusParsed)
		? Math.min(MAX_RADIUS_MI, Math.max(MIN_RADIUS_MI, radiusParsed))
		: DEFAULT_RADIUS_MI;

	return { geo: { lat, lng, radiusMiles }, place };
}

export async function load({ url, request }) {
	const search = url.searchParams.get('q')?.trim() ?? '';
	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1);
	const { geo, place } = parseGeo(url);
	const ipGeo = parseIpGeo(request);

	const [{ venues, total }, mapPoints] = await Promise.all([
		getVenues({
			search: search || undefined,
			page,
			limit: PAGE_SIZE,
			geo
		}),
		getVenueMapPoints({ search: search || undefined, geo })
	]);

	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const mapboxToken = env.MAPBOX_ACCESS_TOKEN ?? env.MAPBOX_TOKEN ?? null;

	return {
		venues,
		query: search,
		mapboxToken,
		geo: geo ?? null,
		place,
		ipGeo,
		mapPoints: mapPoints.map((p) => ({
			id: p.id,
			slug: p.slug,
			name: p.name,
			lat: p.lat,
			lng: p.lng,
			logoUrl: null,
			badge: p.venueType,
			verified: false,
			location:
				[p.city, p.state].filter(Boolean).join(', ') || p.address || null,
			description: p.description
		})),
		pagination: {
			page,
			pageSize: PAGE_SIZE,
			total,
			totalPages
		}
	};
}
