import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

const PHOTON_URL = 'https://photon.komoot.io/api/';
const CENSUS_URL = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress';
const MAPBOX_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

type GeoFeature = {
	type: 'Feature';
	geometry: { type: 'Point'; coordinates: [number, number] };
	properties: Record<string, string | number | undefined>;
};

/** Mapbox Geocoding v5 feature (GeoJSON-like but with place_name, context) */
type MapboxFeature = {
	type: 'Feature';
	geometry: { type: 'Point'; coordinates: [number, number] };
	place_name?: string;
	text?: string;
	address?: string;
	context?: Array<{ id: string; text: string; short_code?: string }>;
};

function mapboxToFeature(f: MapboxFeature): GeoFeature | null {
	const coords = f.geometry?.coordinates;
	if (!coords || coords.length < 2) return null;
	const lng = Number(coords[0]);
	const lat = Number(coords[1]);
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
	const ctx = f.context ?? [];
	const place = ctx.find((c) => c.id.startsWith('place.'));
	const region = ctx.find((c) => c.id.startsWith('region.'));
	const country = ctx.find((c) => c.id.startsWith('country.'));
	const city = place?.text ?? '';
	const state = region?.text ?? '';
	const street = f.address && f.text ? `${f.address} ${f.text}`.trim() : f.text ?? '';
	const name = f.place_name ?? [street, city, state].filter(Boolean).join(', ');
	return {
		type: 'Feature',
		geometry: { type: 'Point', coordinates: [lng, lat] },
		properties: {
			name,
			street: street || undefined,
			city: city || undefined,
			state: state || undefined,
			country: country?.text ?? undefined,
			osm_id: f.place_name ?? `mapbox-${lng}-${lat}`,
			osm_type: 'M'
		}
	};
}

/** Census returns x = longitude, y = latitude */
type CensusMatch = {
	coordinates?: { x?: number; y?: number };
	matchedAddress?: string;
	addressComponents?: {
		streetName?: string;
		city?: string;
		state?: string;
		fromAddress?: string;
		toAddress?: string;
	};
};

function censusToFeature(m: CensusMatch, index: number): GeoFeature | null {
	const coords = m.coordinates;
	if (coords == null || coords.x == null || coords.y == null) return null;
	const lng = Number(coords.x);
	const lat = Number(coords.y);
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
	const c = m.addressComponents;
	const street = c?.streetName
		? [c.fromAddress ?? '', c.streetName, c.toAddress ?? ''].filter(Boolean).join(' ').trim() || c.streetName
		: '';
	const city = c?.city ?? '';
	const state = c?.state ?? '';
	const name = m.matchedAddress ?? [street, city, state].filter(Boolean).join(', ');
	return {
		type: 'Feature',
		geometry: { type: 'Point', coordinates: [lng, lat] },
		properties: {
			name,
			street: street || undefined,
			city: city || undefined,
			state: state || undefined,
			country: 'United States',
			osm_id: `census-${index}`,
			osm_type: 'C'
		}
	};
}

export const GET: RequestHandler = async ({ url }) => {
	const q = url.searchParams.get('q')?.trim();
	if (!q || q.length < 2) {
		return json({ type: 'FeatureCollection', features: [] });
	}
	const limit = Math.min(Number(url.searchParams.get('limit')) || 12, 25);
	const token = env.MAPBOX_ACCESS_TOKEN ?? env.MAPBOX_TOKEN;

	try {
		// Mapbox Geocoding (when token is set) – best address/place coverage
		const mapboxPromise = token
			? fetch(
					`${MAPBOX_URL}/${encodeURIComponent(q)}.json?access_token=${encodeURIComponent(token)}&limit=10&country=US`,
					{ headers: { Accept: 'application/json' } }
			  )
					.then(async (res) => {
						if (!res.ok) return [];
						const data = await res.json();
						const features = (data.features ?? []) as MapboxFeature[];
						return features.map(mapboxToFeature).filter((f): f is GeoFeature => f != null);
					})
					.catch(() => [])
			: Promise.resolve([]);

		// Photon (OSM) – good for place names and international
		const photonPromise = fetch(
			`${PHOTON_URL}?q=${encodeURIComponent(q)}&limit=${limit}`,
			{ headers: { Accept: 'application/json' } }
		).then(async (res) => {
			if (!res.ok) return [];
			const data = await res.json();
			return (data.features ?? []) as GeoFeature[];
		});

		// US Census – good for US street addresses (no key required)
		const censusPromise = fetch(
			`${CENSUS_URL}?address=${encodeURIComponent(q)}&benchmark=Public_AR_Current&format=json`,
			{
				headers: {
					Accept: 'application/json',
					'User-Agent': 'KnowledgeBasket-Geocoder/1.0 (events form)'
				}
			}
		)
			.then(async (res) => {
				if (!res.ok) return [];
				const data = await res.json();
				const matches = (data.result?.addressMatches ?? []) as CensusMatch[];
				return matches.map((m, i) => censusToFeature(m, i)).filter((f): f is GeoFeature => f != null);
			})
			.catch(() => []);

		const [mapboxFeatures, photonFeatures, censusFeatures] = await Promise.all([
			mapboxPromise,
			photonPromise,
			censusPromise
		]);

		// Merge: Mapbox first (if any), then Census, then Photon; dedupe by coordinates
		const byKey = new Map<string, GeoFeature>();
		for (const f of mapboxFeatures) {
			const key = `${f.geometry.coordinates[0].toFixed(5)}-${f.geometry.coordinates[1].toFixed(5)}`;
			if (!byKey.has(key)) byKey.set(key, f);
		}
		for (const f of censusFeatures) {
			const key = `${f.geometry.coordinates[0].toFixed(5)}-${f.geometry.coordinates[1].toFixed(5)}`;
			if (!byKey.has(key)) byKey.set(key, f);
		}
		for (const f of photonFeatures) {
			const key = `${f.geometry.coordinates[0].toFixed(5)}-${f.geometry.coordinates[1].toFixed(5)}`;
			if (!byKey.has(key)) byKey.set(key, f);
		}
		const features = [...byKey.values()].slice(0, limit);

		return json({ type: 'FeatureCollection', features });
	} catch {
		return json({ type: 'FeatureCollection', features: [] });
	}
};
