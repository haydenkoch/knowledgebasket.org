import { randomUUID } from 'crypto';
import {
	CURATED_RED_PAGES_SOURCE,
	CURATED_RED_PAGES_VERIFIED_AT,
	curatedRedPages
} from '../data/red-pages-curated.mjs';

function toDate(value) {
	if (!value) return null;
	return new Date(`${value}T00:00:00.000Z`);
}

function buildAdminNotes(record) {
	const lines = [
		`Curated Red Pages listing audited on ${CURATED_RED_PAGES_VERIFIED_AT}.`,
		record.verified
			? 'Official business presence verified from current public sources.'
			: 'Listing strengthened from current public sources, but some details remain lightly verified.'
	];

	for (const [index, url] of (record.sourceUrls ?? []).entries()) {
		lines.push(`Source ${index + 1}: ${url}`);
	}

	if (record.verificationNotes) {
		lines.push(`Notes: ${record.verificationNotes}`);
	}

	return lines.join('\n');
}

function toRedPagesRow(record, publishedAt = new Date()) {
	return {
		id: randomUUID(),
		slug: record.slug,
		name: record.name,
		description: record.description ?? null,
		organization_id: record.organizationId ?? null,
		owner_name: record.ownerName ?? null,
		service_type: record.serviceType ?? null,
		service_types: record.serviceTypes ?? [],
		service_area: record.serviceArea ?? null,
		tags: record.tags ?? [],
		tribal_affiliation: record.tribalAffiliation ?? null,
		tribal_affiliations: record.tribalAffiliations ?? [],
		ownership_identity: record.ownershipIdentity ?? [],
		website: record.website ?? null,
		email: record.email ?? null,
		phone: record.phone ?? null,
		address: record.address ?? null,
		city: record.city ?? null,
		state: record.state ?? null,
		zip: record.zip ?? null,
		lat: record.lat ?? null,
		lng: record.lng ?? null,
		region: record.region ?? null,
		business_hours: record.businessHours ?? [],
		logo_url: record.logoUrl ?? null,
		image_url: record.imageUrl ?? null,
		image_urls: record.imageUrls ?? [],
		certifications: record.certifications ?? [],
		social_links: record.socialLinks ?? {},
		status: 'published',
		source: CURATED_RED_PAGES_SOURCE,
		featured: record.featured ?? false,
		unlisted: record.unlisted ?? false,
		published_at: publishedAt,
		admin_notes: buildAdminNotes(record),
		submitted_by_id: null,
		reviewed_by_id: null,
		verified: record.verified ?? false,
		verified_at: record.verified ? toDate(CURATED_RED_PAGES_VERIFIED_AT) : null
	};
}

export async function syncCuratedRedPages(sql, opts = {}) {
	const prune = opts.prune ?? true;
	const publishedAt = opts.publishedAt ?? new Date();
	const summary = {
		total: curatedRedPages.length,
		created: 0,
		updated: 0,
		deleted: 0,
		removed: []
	};

	const existingRows = await sql`
		SELECT id, slug, source, name, status
		FROM red_pages_businesses
	`;
	const existingBySlug = new Map(existingRows.map((row) => [row.slug, row]));
	const curatedSlugs = new Set(curatedRedPages.map((record) => record.slug));

	for (const record of curatedRedPages) {
		const row = toRedPagesRow(record, publishedAt);
		await sql`
			INSERT INTO red_pages_businesses (
				id, slug, name, description, organization_id, owner_name,
				service_type, service_types, service_area, tags,
				tribal_affiliation, tribal_affiliations, ownership_identity,
				website, email, phone, address, city, state, zip,
				lat, lng, region, business_hours,
				logo_url, image_url, image_urls, certifications, social_links,
				status, source, featured, unlisted, published_at, admin_notes,
				submitted_by_id, reviewed_by_id, verified, verified_at
			)
			VALUES (
				${row.id}, ${row.slug}, ${row.name}, ${row.description}, ${row.organization_id}, ${row.owner_name},
				${row.service_type}, ${row.service_types}, ${row.service_area}, ${row.tags},
				${row.tribal_affiliation}, ${row.tribal_affiliations}, ${row.ownership_identity},
				${row.website}, ${row.email}, ${row.phone}, ${row.address}, ${row.city}, ${row.state}, ${row.zip},
				${row.lat}, ${row.lng}, ${row.region}, ${row.business_hours},
				${row.logo_url}, ${row.image_url}, ${row.image_urls}, ${row.certifications}, ${row.social_links},
				${row.status}, ${row.source}, ${row.featured}, ${row.unlisted}, ${row.published_at}, ${row.admin_notes},
				${row.submitted_by_id}, ${row.reviewed_by_id}, ${row.verified}, ${row.verified_at}
			)
			ON CONFLICT (slug) DO UPDATE SET
				name = EXCLUDED.name,
				description = EXCLUDED.description,
				organization_id = EXCLUDED.organization_id,
				owner_name = EXCLUDED.owner_name,
				service_type = EXCLUDED.service_type,
				service_types = EXCLUDED.service_types,
				service_area = EXCLUDED.service_area,
				tags = EXCLUDED.tags,
				tribal_affiliation = EXCLUDED.tribal_affiliation,
				tribal_affiliations = EXCLUDED.tribal_affiliations,
				ownership_identity = EXCLUDED.ownership_identity,
				website = EXCLUDED.website,
				email = EXCLUDED.email,
				phone = EXCLUDED.phone,
				address = EXCLUDED.address,
				city = EXCLUDED.city,
				state = EXCLUDED.state,
				zip = EXCLUDED.zip,
				lat = EXCLUDED.lat,
				lng = EXCLUDED.lng,
				region = EXCLUDED.region,
				business_hours = EXCLUDED.business_hours,
				logo_url = EXCLUDED.logo_url,
				image_url = EXCLUDED.image_url,
				image_urls = EXCLUDED.image_urls,
				certifications = EXCLUDED.certifications,
				social_links = EXCLUDED.social_links,
				status = EXCLUDED.status,
				source = EXCLUDED.source,
				featured = EXCLUDED.featured,
				unlisted = EXCLUDED.unlisted,
				published_at = COALESCE(red_pages_businesses.published_at, EXCLUDED.published_at),
				admin_notes = EXCLUDED.admin_notes,
				submitted_by_id = EXCLUDED.submitted_by_id,
				reviewed_by_id = EXCLUDED.reviewed_by_id,
				verified = EXCLUDED.verified,
				verified_at = EXCLUDED.verified_at,
				updated_at = NOW()
		`;

		if (existingBySlug.has(record.slug)) summary.updated += 1;
		else summary.created += 1;
	}

	if (prune) {
		for (const row of existingRows) {
			if (curatedSlugs.has(row.slug)) continue;
			if (row.status !== 'published') continue;
			if (row.source !== 'seed' && row.source !== CURATED_RED_PAGES_SOURCE) continue;

			await sql`
				DELETE FROM red_pages_businesses
				WHERE id = ${row.id}
			`;
			summary.deleted += 1;
			summary.removed.push({
				slug: row.slug,
				name: row.name,
				source: row.source
			});
		}
	}

	return summary;
}
