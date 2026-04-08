import { env } from '$env/dynamic/private';
import { getOrganizations, getOrganizationMapPoints } from '$lib/server/organizations';

const PAGE_SIZE = 24;

export async function load({ url }) {
	const search = url.searchParams.get('q')?.trim() ?? '';
	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1);
	const [{ orgs, total }, mapPoints] = await Promise.all([
		getOrganizations({
			search: search || undefined,
			page,
			limit: PAGE_SIZE
		}),
		getOrganizationMapPoints({ search: search || undefined })
	]);

	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const mapboxToken = env.MAPBOX_ACCESS_TOKEN ?? env.MAPBOX_TOKEN ?? null;

	return {
		organizations: orgs,
		query: search,
		mapboxToken,
		mapPoints: mapPoints.map((p) => ({
			id: p.id,
			slug: p.slug,
			name: p.name,
			lat: p.lat,
			lng: p.lng,
			logoUrl: p.logoUrl,
			badge: p.orgType,
			verified: p.verified,
			location: [p.city, p.state].filter(Boolean).join(', ') || null,
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
