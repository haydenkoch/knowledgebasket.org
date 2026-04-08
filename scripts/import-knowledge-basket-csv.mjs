#!/usr/bin/env node
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { parse } from 'csv-parse/sync';
import postgres from 'postgres';

const DEFAULT_CSV_PATH = '/Users/hayden/Downloads/Knowledge Basket Resources - Sheet1.csv';
const EVENT_TYPES = new Set([
	'Art Exhibit',
	'Performance',
	'Community Meeting',
	'Forum',
	'Conference',
	'Summit',
	'Symposium',
	'Festival',
	'Celebration',
	'Film Screening',
	'Powwow',
	'Big Time',
	'Trade Show',
	'Marketplace',
	'Other'
]);

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL is not set.');
	process.exit(1);
}

const csvPath = process.argv[2] || DEFAULT_CSV_PATH;
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

function escapeHtml(value) {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function linkifyText(value) {
	return escapeHtml(value)
		.replace(/\b(https?:\/\/[^\s<]+)/gi, '<a href="$1" target="_blank" rel="noopener">$1</a>')
		.replace(/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/gi, '<a href="mailto:$1">$1</a>');
}

function textToHtml(value) {
	const source = String(value ?? '')
		.replace(/\r\n/g, '\n')
		.replace(/\u00a0/g, ' ')
		.trim();
	if (!source) return null;

	const blocks = source
		.split(/\n{2,}/)
		.map((block) => block.trim())
		.filter(Boolean);

	return blocks
		.map((block) => {
			const lines = block
				.split('\n')
				.map((line) => line.trim())
				.filter(Boolean);
			const isList = lines.length > 1 && lines.every((line) => /^([*-]|•|\d+\.)\s+/.test(line));
			if (isList) {
				return `<ul>${lines
					.map((line) => line.replace(/^([*-]|•|\d+\.)\s+/, ''))
					.map((line) => `<li>${linkifyText(line)}</li>`)
					.join('')}</ul>`;
			}
			return `<p>${lines.map((line) => linkifyText(line)).join('<br />')}</p>`;
		})
		.join('\n');
}

function slugify(value) {
	const base =
		String(value ?? '')
			.trim()
			.toLowerCase()
			.replace(/&/g, ' and ')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 90) || 'item';
	return base;
}

function normalizeUrl(value) {
	const raw = String(value ?? '').trim();
	if (!raw) return null;

	if (/^mailto:/i.test(raw)) return raw.toLowerCase();

	try {
		const url = new URL(raw);
		if (url.protocol !== 'http:' && url.protocol !== 'https:') return raw;
		url.hash = '';
		return url.toString().replace(/\/$/, '');
	} catch {
		return raw;
	}
}

function tagsFromCsv(value) {
	return Array.from(
		new Set(
			String(value ?? '')
				.split(',')
				.map((tag) => tag.trim())
				.filter(Boolean)
		)
	);
}

function dateAtNoonUtc(dateOnly) {
	if (!dateOnly) return null;
	return new Date(`${dateOnly}T12:00:00.000Z`);
}

function parseMonthDate(value) {
	const raw = String(value ?? '')
		.replace(/\s+/g, ' ')
		.replace(/,\s*,/g, ',')
		.trim();
	if (!raw) return null;
	const match = raw.match(
		/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(\d{4})\b/i
	);
	if (!match) return null;
	const month = String(
		[
			'january',
			'february',
			'march',
			'april',
			'may',
			'june',
			'july',
			'august',
			'september',
			'october',
			'november',
			'december'
		].indexOf(match[1].toLowerCase()) + 1
	).padStart(2, '0');
	const day = String(Number.parseInt(match[2], 10)).padStart(2, '0');
	return `${match[3]}-${month}-${day}`;
}

function firstDateFromText(value) {
	return dateAtNoonUtc(parseMonthDate(value));
}

async function uniqueSlug(table, title) {
	const base = slugify(title);
	let slug = base;
	let suffix = 1;

	while (true) {
		const rows = await sql.unsafe(`select 1 from ${table} where slug = $1 limit 1`, [slug]);
		if (rows.length === 0) return slug;
		slug = `${base.slice(0, 80)}-${suffix++}`;
	}
}

async function findExistingByTitle(title) {
	const normalized = String(title ?? '')
		.trim()
		.toLowerCase();
	if (!normalized) return [];

	const checks = [
		{ table: 'events', columns: ['event_url', 'registration_url', 'virtual_event_url'] },
		{ table: 'funding', columns: ['apply_url'] },
		{ table: 'jobs', columns: ['apply_url'] },
		{ table: 'toolbox_resources', columns: ['external_url', 'file_url'] }
	];

	const matches = [];
	for (const check of checks) {
		const rows = await sql.unsafe(
			`select title, slug from ${check.table} where lower(trim(title)) = $1 order by title`,
			[normalized]
		);
		for (const row of rows) matches.push({ table: check.table, ...row });
	}
	return matches;
}

async function findExistingByUrls(urls) {
	const normalizedUrls = Array.from(new Set(urls.map(normalizeUrl).filter(Boolean)));
	if (normalizedUrls.length === 0) return [];

	const checks = [
		{ table: 'events', columns: ['event_url', 'registration_url', 'virtual_event_url'] },
		{ table: 'funding', columns: ['apply_url'] },
		{ table: 'jobs', columns: ['apply_url'] },
		{ table: 'toolbox_resources', columns: ['external_url', 'file_url'] }
	];

	const matches = [];
	for (const check of checks) {
		for (const column of check.columns) {
			const rows = await sql.unsafe(
				`select title, slug, ${column} as url from ${check.table} where ${column} = any($1::text[]) order by title`,
				[normalizedUrls]
			);
			for (const row of rows) matches.push({ table: check.table, column, ...row });
		}
	}
	return matches;
}

function inferEventTypes(tags, fallback = 'Other') {
	const types = Array.from(new Set(tags.filter((tag) => EVENT_TYPES.has(tag))));
	if (types.length === 0) return { type: fallback, types: [fallback] };
	return { type: types[0], types };
}

function buildJobApplicationInstructions(row) {
	if (!String(row.Link ?? '').trim()) return null;
	return textToHtml(row.Link);
}

function buildFundingNotes(row) {
	const raw = String(row.Deadline ?? '').trim();
	return raw || null;
}

function toMailto(value) {
	const raw = String(value ?? '').trim();
	if (!raw) return null;
	const emailMatch = raw.match(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
	if (!emailMatch) return null;
	return `mailto:${emailMatch[1]}`;
}

function resolvedLinkForRow(row) {
	const title = String(row['Opportunity Title'] ?? '').trim();
	const originalLink = String(row.Link ?? '').trim();

	switch (title) {
		case 'Native Women in Agriculture and Natural Resources Symposium':
			return 'https://nafws.org/?s=Native+Women+in+Agriculture+and+Natural+Resources+Symposium';
		case 'National Summer Youth Practicum':
			return 'https://nafws.org/youth-early-professional/national-summer-youth-practicum/';
		case 'Board Member At-Large':
		case 'Board Member At-Large ':
			return toMailto(originalLink);
		case 'Call for Submissions':
			return (
				toMailto(originalLink) ?? 'https://newsfromnativecalifornia.com/submission-guidelines/'
			);
		default:
			return originalLink || null;
	}
}

function mapRow(row) {
	const title = String(row['Opportunity Title'] ?? '').trim();
	const coil = String(row.Coil ?? '').trim();
	const tags = tagsFromCsv(row.Tags);
	const descriptionHtml = textToHtml(row.Description);
	const deadlineText = String(row.Deadline ?? '').trim() || null;
	const resolvedLink = resolvedLinkForRow(row);

	switch (title) {
		case 'Native Women in Agriculture and Natural Resources Symposium': {
			const { type, types } = inferEventTypes(tags, 'Symposium');
			return {
				table: 'events',
				record: {
					title,
					description: descriptionHtml,
					location: 'Virtual',
					region: 'National',
					audience: 'Women in agriculture and natural resources fields',
					cost: 'Non-NAFWS Member: $50.00 (includes Membership); NAFWS Members: Free!',
					eventUrl: normalizeUrl(resolvedLink),
					startDate: dateAtNoonUtc('2026-03-23'),
					endDate: dateAtNoonUtc('2026-03-25'),
					hostOrg: String(row.Organization ?? '').trim() || null,
					type,
					types,
					tags,
					eventFormat: 'online',
					isAllDay: true,
					status: 'published',
					source: 'admin',
					publishedAt: new Date()
				},
				urls: [resolvedLink]
			};
		}

		case 'National Summer Youth Practicum': {
			const { type, types } = inferEventTypes(tags, 'Other');
			return {
				table: 'events',
				record: {
					title,
					description: descriptionHtml,
					location: 'Northern Colorado',
					region: 'National',
					audience: 'Native American and Alaska Native high school students ages 14-17',
					eventUrl: normalizeUrl(resolvedLink),
					registrationDeadline: firstDateFromText(deadlineText),
					hostOrg: String(row.Organization ?? '').trim() || null,
					type,
					types,
					tags,
					eventFormat: 'in_person',
					status: 'published',
					source: 'admin',
					publishedAt: new Date()
				},
				urls: [resolvedLink]
			};
		}

		case 'Grants for Arts Projects - Call for Applications':
			return {
				table: 'funding',
				record: {
					title,
					description: descriptionHtml,
					funderName: String(row.Organization ?? '').trim() || null,
					fundingType: 'Federal',
					focusAreas: ['Arts & Humanities'],
					tags,
					applicationStatus: 'Open',
					deadline: firstDateFromText(deadlineText),
					fundingCycleNotes: buildFundingNotes(row),
					region: 'National',
					applyUrl: normalizeUrl(resolvedLink),
					status: 'published',
					source: 'admin',
					publishedAt: new Date()
				},
				urls: [resolvedLink]
			};

		case 'SACNAS Annual Conference Travel Scholarship':
			return {
				table: 'funding',
				record: {
					title,
					description: descriptionHtml,
					funderName: String(row.Organization ?? '').trim() || null,
					fundingType: 'NGO',
					eligibilityType: 'Undergraduate and graduate students',
					focusAreas: ['Education', 'Workforce Development'],
					tags,
					applicationStatus: 'Open',
					deadline: firstDateFromText(deadlineText),
					region: 'National',
					applyUrl: normalizeUrl(resolvedLink),
					status: 'published',
					source: 'admin',
					publishedAt: new Date()
				},
				urls: [resolvedLink]
			};

		case 'SACNAS Annual Conference Call for Research Presentations':
			return {
				table: 'funding',
				record: {
					title,
					description: descriptionHtml,
					funderName: String(row.Organization ?? '').trim() || null,
					fundingType: 'NGO',
					eligibilityType: 'Students and early-career researchers',
					focusAreas: ['Education', 'Workforce Development'],
					tags,
					applicationStatus: 'Open',
					deadline: firstDateFromText(deadlineText),
					fundingCycleNotes: buildFundingNotes(row),
					region: 'National',
					applyUrl: normalizeUrl(resolvedLink),
					status: 'published',
					source: 'admin',
					publishedAt: new Date()
				},
				urls: [resolvedLink]
			};

		case 'Board Member At-Large':
		case 'Board Member At-Large ': {
			const applyUrl = normalizeUrl(resolvedLink);
			return {
				table: 'jobs',
				record: {
					title: 'Board Member At-Large',
					description: descriptionHtml,
					employerName: String(row.Organization ?? '').trim() || null,
					jobType: 'volunteer',
					seniority: 'director',
					sector: 'technology',
					workArrangement: 'remote',
					location: 'Remote',
					region: 'National',
					tags,
					applyUrl,
					applicationInstructions: buildJobApplicationInstructions(row),
					status: 'published',
					source: 'admin',
					publishedAt: new Date()
				},
				urls: [applyUrl]
			};
		}

		case 'Student Assistant - Tribal Climate Service Program':
			return {
				table: 'jobs',
				record: {
					title,
					description: descriptionHtml,
					employerName: String(row.Organization ?? '').trim() || null,
					jobType: 'part-time',
					seniority: 'entry',
					sector: 'government',
					workArrangement: 'in-office',
					location: '6000 J St, Sacramento, CA 95819',
					region: 'California',
					tags,
					compensationDescription:
						'$18.27 - $24.62 / Hour · Part-time, Off-campus · Student Assistant',
					applyUrl: normalizeUrl(resolvedLink),
					applicationDeadline: firstDateFromText(deadlineText),
					status: 'published',
					source: 'admin',
					publishedAt: new Date()
				},
				urls: [resolvedLink]
			};

		case 'Call for Submissions': {
			const applyUrl = normalizeUrl(resolvedLink);
			return {
				table: 'jobs',
				record: {
					title,
					description: descriptionHtml,
					employerName: String(row.Organization ?? '').trim() || null,
					jobType: 'other',
					seniority: 'entry',
					sector: 'arts-culture',
					workArrangement: 'remote',
					location: 'Remote',
					region: 'California',
					tags,
					applyUrl,
					applicationDeadline: firstDateFromText(deadlineText),
					applicationInstructions: buildJobApplicationInstructions(row),
					status: 'published',
					source: 'admin',
					publishedAt: new Date()
				},
				urls: [applyUrl, 'https://newsfromnativecalifornia.com/submission-guidelines/']
			};
		}

		case 'BNGA Grants Webinar Series':
			return {
				table: 'toolbox_resources',
				record: {
					title,
					description: descriptionHtml,
					sourceName: String(row.Organization ?? '').trim() || null,
					resourceType: 'Other',
					mediaType: 'Video',
					category: 'Economic Development',
					tags,
					contentMode: 'link',
					externalUrl: normalizeUrl(resolvedLink),
					status: 'published',
					source: 'admin',
					publishedAt: new Date()
				},
				urls: [resolvedLink]
			};

		case 'Native Youth Empowerment Conference 2026: Weaving Pathways of Education and Identity': {
			const { type, types } = inferEventTypes(tags, 'Conference');
			return {
				table: 'events',
				record: {
					title,
					description: textToHtml('Please click the link to complete this form.'),
					location: 'UC Davis',
					region: 'California',
					registrationUrl: normalizeUrl(resolvedLink),
					eventUrl: normalizeUrl(resolvedLink),
					hostOrg: String(row.Organization ?? '').trim() || null,
					type,
					types,
					tags,
					status: 'published',
					source: 'admin',
					publishedAt: new Date()
				},
				urls: [resolvedLink]
			};
		}

		case 'Natural Resources Technician III (Food Sovereignty)':
			return {
				table: 'jobs',
				record: {
					title,
					description: descriptionHtml,
					employerName: String(row.Organization ?? '').trim() || null,
					jobType: 'full-time',
					seniority: 'mid',
					sector: 'environmental',
					workArrangement: 'in-office',
					region: 'California',
					tags,
					applyUrl: normalizeUrl(resolvedLink),
					applicationDeadline: firstDateFromText(deadlineText),
					status: 'published',
					source: 'admin',
					publishedAt: new Date()
				},
				urls: [resolvedLink]
			};

		case 'Office Manager':
			return {
				table: 'jobs',
				record: {
					title,
					description: descriptionHtml,
					employerName: String(row.Organization ?? '').trim() || null,
					jobType: 'full-time',
					seniority: 'mid',
					sector: 'nonprofit',
					workArrangement: 'remote',
					location: 'Remote, United States',
					region: 'National',
					tags,
					compensationDescription: '$70,000 - $90,000 salary',
					benefits: textToHtml(
						'Benefits include health, dental, retirement savings, robust holiday, vacation, and sick leave, ongoing training, intergenerational healing opportunities.'
					),
					applyUrl: normalizeUrl(resolvedLink),
					applicationDeadline: firstDateFromText(deadlineText),
					applicationInstructions: textToHtml(
						'To apply for this position, email your resume, cover letter and writing sample to general@Indian-Affairs.org on or before March 27, 2026 at 11:59 pm Eastern.'
					),
					status: 'published',
					source: 'admin',
					publishedAt: new Date()
				},
				urls: [resolvedLink]
			};

		default:
			throw new Error(`No import mapping defined for "${title}" (${coil}).`);
	}
}

async function insertEvent(record) {
	const slug = await uniqueSlug('events', record.title);
	await sql`
		insert into events (
			id, slug, title, description, location, region, audience, cost, event_url,
			start_date, end_date, host_org, type, types, tags, registration_url,
			registration_deadline, event_format, is_all_day, status, source, published_at
		) values (
			${randomUUID()}, ${slug}, ${record.title}, ${record.description ?? null},
			${record.location ?? null}, ${record.region ?? null}, ${record.audience ?? null},
			${record.cost ?? null}, ${record.eventUrl ?? null}, ${record.startDate ?? null},
			${record.endDate ?? null}, ${record.hostOrg ?? null}, ${record.type ?? null},
			${record.types ?? null}, ${record.tags ?? null}, ${record.registrationUrl ?? null},
			${record.registrationDeadline ?? null}, ${record.eventFormat ?? null},
			${record.isAllDay ?? false}, ${record.status}, ${record.source}, ${record.publishedAt}
		)
	`;
	return slug;
}

async function insertFunding(record) {
	const slug = await uniqueSlug('funding', record.title);
	await sql`
		insert into funding (
			id, slug, title, description, funder_name, funding_type, eligibility_type,
			focus_areas, tags, application_status, deadline, funding_cycle_notes,
			region, apply_url, status, source, published_at
		) values (
			${randomUUID()}, ${slug}, ${record.title}, ${record.description ?? null},
			${record.funderName ?? null}, ${record.fundingType ?? null},
			${record.eligibilityType ?? null}, ${record.focusAreas ?? null},
			${record.tags ?? null}, ${record.applicationStatus ?? 'Open'},
			${record.deadline ?? null}, ${record.fundingCycleNotes ?? null},
			${record.region ?? null}, ${record.applyUrl ?? null},
			${record.status}, ${record.source}, ${record.publishedAt}
		)
	`;
	return slug;
}

async function insertJob(record) {
	const slug = await uniqueSlug('jobs', record.title);
	await sql`
		insert into jobs (
			id, slug, title, description, employer_name, job_type, seniority, sector,
			work_arrangement, location, region, tags, compensation_description,
			benefits, apply_url, application_deadline, application_instructions,
			status, source, published_at
		) values (
			${randomUUID()}, ${slug}, ${record.title}, ${record.description ?? null},
			${record.employerName ?? null}, ${record.jobType ?? null}, ${record.seniority ?? null},
			${record.sector ?? null}, ${record.workArrangement ?? null},
			${record.location ?? null}, ${record.region ?? null}, ${record.tags ?? null},
			${record.compensationDescription ?? null}, ${record.benefits ?? null},
			${record.applyUrl ?? null}, ${record.applicationDeadline ?? null},
			${record.applicationInstructions ?? null}, ${record.status}, ${record.source},
			${record.publishedAt}
		)
	`;
	return slug;
}

async function insertToolbox(record) {
	const slug = await uniqueSlug('toolbox_resources', record.title);
	await sql`
		insert into toolbox_resources (
			id, slug, title, description, source_name, resource_type, media_type,
			category, tags, content_mode, external_url, status, source, published_at
		) values (
			${randomUUID()}, ${slug}, ${record.title}, ${record.description ?? null},
			${record.sourceName ?? null}, ${record.resourceType ?? null},
			${record.mediaType ?? null}, ${record.category ?? null}, ${record.tags ?? null},
			${record.contentMode ?? 'link'}, ${record.externalUrl ?? null},
			${record.status}, ${record.source}, ${record.publishedAt}
		)
	`;
	return slug;
}

async function insertMappedRow(mapped) {
	switch (mapped.table) {
		case 'events':
			return insertEvent(mapped.record);
		case 'funding':
			return insertFunding(mapped.record);
		case 'jobs':
			return insertJob(mapped.record);
		case 'toolbox_resources':
			return insertToolbox(mapped.record);
		default:
			throw new Error(`Unsupported table: ${mapped.table}`);
	}
}

async function run() {
	const csvText = await readFile(csvPath, 'utf8');
	const rows = parse(csvText, {
		columns: true,
		skip_empty_lines: true,
		trim: true,
		bom: true
	});

	const summary = {
		inserted: [],
		skipped: []
	};

	for (const row of rows) {
		const mapped = mapRow(row);
		const globalTitleMatches = await findExistingByTitle(mapped.record.title);
		const urlMatches = await findExistingByUrls(mapped.urls ?? []);

		if (globalTitleMatches.length > 0 || urlMatches.length > 0) {
			summary.skipped.push({
				title: mapped.record.title,
				table: mapped.table,
				reason: globalTitleMatches.length > 0 ? 'title-match' : 'url-match',
				matches: globalTitleMatches.length > 0 ? globalTitleMatches : urlMatches
			});
			continue;
		}

		const slug = await insertMappedRow(mapped);
		summary.inserted.push({ title: mapped.record.title, table: mapped.table, slug });
	}

	console.log(`Imported ${summary.inserted.length} records from ${csvPath}`);
	for (const item of summary.inserted) {
		console.log(`INSERTED\t${item.table}\t${item.slug}\t${item.title}`);
	}
	for (const item of summary.skipped) {
		console.log(`SKIPPED\t${item.table}\t${item.reason}\t${item.title}`);
	}
}

run()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await sql.end();
	});
