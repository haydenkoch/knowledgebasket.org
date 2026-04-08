import { randomUUID } from 'crypto';
import { MeiliSearch } from 'meilisearch';
import {
	CURATED_FUNDING_SOURCE,
	CURATED_FUNDING_VERIFIED_AT,
	curatedCaliforniaFunding
} from '../data/california-tribal-funding.mjs';

const FUNDING_INDEX_UID = 'funding';
const SHARED_RANKING_RULES = ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'];
const SHARED_SYNONYMS = {
	tribe: ['tribal', 'tribes'],
	tribal: ['tribe', 'tribes'],
	funding: ['grant', 'grants', 'capital'],
	grant: ['funding', 'grants']
};
const FUNDING_SEARCH_SETTINGS = {
	searchableAttributes: [
		'exactTitle',
		'title',
		'summary',
		'description',
		'funderName',
		'organizationName',
		'focusAreas',
		'eligibilityType',
		'fundingType',
		'tags',
		'region'
	],
	filterableAttributes: [
		'scope',
		'coil',
		'status',
		'region',
		'applicationStatus',
		'fundingType',
		'eligibilityType',
		'sortDate'
	],
	sortableAttributes: ['updatedAt', 'publishedAt', 'sortDate', 'openRank', 'featuredRank', 'title'],
	displayedAttributes: [
		'id',
		'slug',
		'title',
		'summary',
		'description',
		'scope',
		'coil',
		'kind',
		'href',
		'status',
		'updatedAt',
		'publishedAt',
		'sortDate',
		'featuredRank',
		'openRank',
		'imageUrl',
		'region',
		'organization',
		'organizationName',
		'tags',
		'funderName',
		'focusAreas',
		'eligibilityType',
		'fundingType',
		'applicationStatus'
	],
	rankingRules: SHARED_RANKING_RULES,
	synonyms: SHARED_SYNONYMS,
	typoTolerance: {
		enabled: true,
		disableOnWords: [],
		disableOnAttributes: ['slug'],
		minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 }
	}
};

function toDate(value) {
	if (!value) return null;
	return new Date(`${value}T00:00:00.000Z`);
}

function buildAdminNotes(record) {
	const lines = [
		`Curated California tribal funding record verified on ${CURATED_FUNDING_VERIFIED_AT}.`,
		`Official source page: ${record.sourceUrl}`
	];

	if (record.applicationUrl && record.applicationUrl !== record.sourceUrl) {
		lines.push(`Official application path: ${record.applicationUrl}`);
	}

	return lines.join('\n');
}

function toIsoString(value) {
	if (!value) return null;
	if (value instanceof Date) return value.toISOString();
	return new Date(value).toISOString();
}

function stripHtml(value) {
	return String(value ?? '')
		.replace(/<[^>]*>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function buildFundingSearchDoc(row) {
	const summary = stripHtml(row.description).slice(0, 280) || undefined;
	const publishedAt =
		toIsoString(row.published_at) ?? toIsoString(row.updated_at) ?? new Date(0).toISOString();
	const updatedAt = toIsoString(row.updated_at) ?? publishedAt;
	return {
		id: row.id,
		slug: row.slug ?? row.id,
		title: row.title,
		summary,
		description: summary,
		scope: 'funding',
		coil: 'funding',
		kind: 'content',
		href: `/funding/${row.slug ?? row.id}`,
		status: 'published',
		updatedAt,
		publishedAt,
		sortDate: toIsoString(row.deadline) ?? publishedAt,
		openRank: row.application_status === 'open' || row.application_status === 'rolling' ? 1 : 0,
		featuredRank: row.featured ? 1 : 0,
		imageUrl: row.image_url ?? undefined,
		region: row.region ?? undefined,
		organization: row.organization_name ?? undefined,
		organizationName: row.organization_name ?? undefined,
		exactTitle: String(row.title).trim().toLowerCase(),
		tags: row.tags ?? [],
		funderName: row.funder_name ?? undefined,
		focusAreas: row.focus_areas ?? [],
		eligibilityType: row.eligibility_type ?? undefined,
		fundingType: row.funding_type ?? undefined,
		applicationStatus: row.application_status ?? undefined
	};
}

function getMeiliClient() {
	const host = process.env.MEILISEARCH_HOST?.trim();
	if (!host) return null;
	return new MeiliSearch({
		host,
		apiKey: process.env.MEILISEARCH_API_KEY || undefined
	});
}

async function waitForMeiliTask(client, task) {
	const taskUid = task?.taskUid ?? task?.uid;
	if (typeof taskUid !== 'number') return;
	await client.tasks.waitForTask(taskUid);
}

async function ensureFundingIndex(client) {
	try {
		await client.getIndex(FUNDING_INDEX_UID);
	} catch {
		const task = await client.createIndex(FUNDING_INDEX_UID, { primaryKey: 'id' });
		await waitForMeiliTask(client, task);
	}
}

async function reindexPublishedFundingSearch(sql) {
	const client = getMeiliClient();
	if (!client) {
		return {
			enabled: false,
			count: 0
		};
	}

	await ensureFundingIndex(client);
	const index = client.index(FUNDING_INDEX_UID);

	const settingsTask = await index.updateSettings(FUNDING_SEARCH_SETTINGS);
	await waitForMeiliTask(client, settingsTask);

	const publishedRows = await sql`
		SELECT
			funding.id,
			funding.slug,
			funding.title,
			funding.description,
			funding.funder_name,
			funding.funding_type,
			funding.focus_areas,
			funding.eligibility_type,
			funding.application_status,
			funding.region,
			funding.tags,
			funding.image_url,
			funding.published_at,
			funding.updated_at,
			funding.deadline,
			funding.featured,
			organizations.name AS organization_name
		FROM funding
		LEFT JOIN organizations ON organizations.id = funding.organization_id
		WHERE funding.status = 'published'
		ORDER BY funding.title ASC
	`;
	const docs = publishedRows.map((row) => buildFundingSearchDoc(row));

	const clearTask = await index.deleteAllDocuments();
	await waitForMeiliTask(client, clearTask);

	if (docs.length > 0) {
		const addTask = await index.addDocuments(docs);
		await waitForMeiliTask(client, addTask);
	}

	return {
		enabled: true,
		count: docs.length
	};
}

function toFundingRow(record, publishedAt = new Date()) {
	return {
		id: randomUUID(),
		slug: record.slug,
		title: record.title,
		description: record.description ?? null,
		funder_name: record.funderName ?? null,
		funding_type: record.fundingType ?? null,
		funding_types: record.fundingTypes ?? [],
		eligibility_type: record.eligibilityType ?? null,
		eligibility_types: record.eligibilityTypes ?? [],
		focus_areas: record.focusAreas ?? [],
		tags: record.tags ?? [],
		application_status: record.applicationStatus,
		open_date: toDate(record.openDate),
		deadline: toDate(record.deadline),
		award_date: toDate(record.awardDate),
		funding_cycle_notes: record.fundingCycleNotes ?? null,
		is_recurring: record.isRecurring ?? false,
		recurring_schedule: record.recurringSchedule ?? null,
		amount_min: record.amountMin ?? null,
		amount_max: record.amountMax ?? null,
		amount_description: record.amountDescription ?? null,
		funding_term: record.fundingTerm ?? null,
		match_required: record.matchRequired ?? false,
		match_requirements: record.matchRequirements ?? null,
		eligible_costs: record.eligibleCosts ?? null,
		region: record.region ?? null,
		geographic_restrictions: record.geographicRestrictions ?? null,
		apply_url: record.applicationUrl ?? record.sourceUrl ?? null,
		contact_email: record.contactEmail ?? null,
		contact_name: record.contactName ?? null,
		contact_phone: record.contactPhone ?? null,
		image_url: null,
		image_urls: [],
		status: 'published',
		source: CURATED_FUNDING_SOURCE,
		featured: false,
		unlisted: false,
		published_at: publishedAt,
		admin_notes: buildAdminNotes(record),
		submitted_by_id: null,
		reviewed_by_id: null
	};
}

export async function syncCuratedFunding(sql, opts = {}) {
	const prune = opts.prune ?? true;
	const publishedAt = opts.publishedAt ?? new Date();
	const summary = {
		total: curatedCaliforniaFunding.length,
		created: 0,
		updated: 0,
		deleted: 0,
		removed: [],
		searchIndexed: false,
		indexedCount: 0
	};

	const existingRows = await sql`
		SELECT id, slug, source, title, status
		FROM funding
	`;
	const existingBySlug = new Map(existingRows.map((row) => [row.slug, row]));
	const curatedSlugs = new Set(curatedCaliforniaFunding.map((record) => record.slug));

	for (const record of curatedCaliforniaFunding) {
		const row = toFundingRow(record, publishedAt);
		await sql`
			INSERT INTO funding (
				id, slug, title, description, funder_name, funding_type, funding_types,
				eligibility_type, eligibility_types, focus_areas, tags,
				application_status, open_date, deadline, award_date,
				funding_cycle_notes, is_recurring, recurring_schedule,
				amount_min, amount_max, amount_description,
				funding_term, match_required, match_requirements,
				eligible_costs, region, geographic_restrictions,
				apply_url, contact_email, contact_name, contact_phone,
				image_url, image_urls, status, source,
				featured, unlisted, published_at, admin_notes,
				submitted_by_id, reviewed_by_id
			)
			VALUES (
				${row.id}, ${row.slug}, ${row.title}, ${row.description},
				${row.funder_name}, ${row.funding_type}, ${row.funding_types},
				${row.eligibility_type}, ${row.eligibility_types}, ${row.focus_areas}, ${row.tags},
				${row.application_status}, ${row.open_date}, ${row.deadline}, ${row.award_date},
				${row.funding_cycle_notes}, ${row.is_recurring}, ${row.recurring_schedule},
				${row.amount_min}, ${row.amount_max}, ${row.amount_description},
				${row.funding_term}, ${row.match_required}, ${row.match_requirements},
				${row.eligible_costs}, ${row.region}, ${row.geographic_restrictions},
				${row.apply_url}, ${row.contact_email}, ${row.contact_name}, ${row.contact_phone},
				${row.image_url}, ${row.image_urls}, ${row.status}, ${row.source},
				${row.featured}, ${row.unlisted}, ${row.published_at}, ${row.admin_notes},
				${row.submitted_by_id}, ${row.reviewed_by_id}
			)
			ON CONFLICT (slug) DO UPDATE SET
				title = EXCLUDED.title,
				description = EXCLUDED.description,
				funder_name = EXCLUDED.funder_name,
				funding_type = EXCLUDED.funding_type,
				funding_types = EXCLUDED.funding_types,
				eligibility_type = EXCLUDED.eligibility_type,
				eligibility_types = EXCLUDED.eligibility_types,
				focus_areas = EXCLUDED.focus_areas,
				tags = EXCLUDED.tags,
				application_status = EXCLUDED.application_status,
				open_date = EXCLUDED.open_date,
				deadline = EXCLUDED.deadline,
				award_date = EXCLUDED.award_date,
				funding_cycle_notes = EXCLUDED.funding_cycle_notes,
				is_recurring = EXCLUDED.is_recurring,
				recurring_schedule = EXCLUDED.recurring_schedule,
				amount_min = EXCLUDED.amount_min,
				amount_max = EXCLUDED.amount_max,
				amount_description = EXCLUDED.amount_description,
				funding_term = EXCLUDED.funding_term,
				match_required = EXCLUDED.match_required,
				match_requirements = EXCLUDED.match_requirements,
				eligible_costs = EXCLUDED.eligible_costs,
				region = EXCLUDED.region,
				geographic_restrictions = EXCLUDED.geographic_restrictions,
				apply_url = EXCLUDED.apply_url,
				contact_email = EXCLUDED.contact_email,
				contact_name = EXCLUDED.contact_name,
				contact_phone = EXCLUDED.contact_phone,
				image_url = EXCLUDED.image_url,
				image_urls = EXCLUDED.image_urls,
				status = EXCLUDED.status,
				source = EXCLUDED.source,
				featured = EXCLUDED.featured,
				unlisted = EXCLUDED.unlisted,
				published_at = COALESCE(funding.published_at, EXCLUDED.published_at),
				admin_notes = EXCLUDED.admin_notes,
				submitted_by_id = EXCLUDED.submitted_by_id,
				reviewed_by_id = EXCLUDED.reviewed_by_id,
				updated_at = NOW()
		`;

		if (existingBySlug.has(record.slug)) summary.updated += 1;
		else summary.created += 1;
	}

	if (prune) {
		for (const row of existingRows) {
			if (curatedSlugs.has(row.slug)) continue;
			if (row.status !== 'published') continue;
			if (row.source !== 'seed' && row.source !== CURATED_FUNDING_SOURCE) continue;

			await sql`
				DELETE FROM funding
				WHERE id = ${row.id}
			`;
			summary.deleted += 1;
			summary.removed.push({
				slug: row.slug,
				title: row.title,
				source: row.source
			});
		}
	}

	const searchSummary = await reindexPublishedFundingSearch(sql);
	summary.searchIndexed = searchSummary.enabled;
	summary.indexedCount = searchSummary.count;

	return summary;
}
