#!/usr/bin/env node
/**
 * Seed funding, jobs, red-pages, and toolbox tables.
 * Run from site/: node scripts/seed-coils.js
 */
import 'dotenv/config';
import postgres from 'postgres';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { syncCuratedFunding } from './lib/curated-funding-sync.mjs';
import { syncCuratedRedPages } from './lib/curated-red-pages-sync.mjs';

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL is not set.');
	process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);

function slugify(text) {
	if (!text || typeof text !== 'string') return 'item';
	return (
		text
			.trim()
			.toLowerCase()
			.replace(/\s+/g, '-')
			.replace(/[^a-z0-9-]/g, '')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '')
			.slice(0, 100) || 'item'
	);
}

function uniqueSlug(base, seen) {
	let slug = base;
	let n = 0;
	while (seen.has(slug)) slug = `${base.slice(0, 90)}-${++n}`;
	seen.add(slug);
	return slug;
}

function parseCSV(content) {
	const rows = [];
	let row = [];
	let field = '';
	let inQuotes = false;
	for (let i = 0; i < content.length; i++) {
		const c = content[i];
		if (inQuotes) {
			if (c === '"' && content[i + 1] === '"') {
				field += '"';
				i++;
			} else if (c === '"') inQuotes = false;
			else field += c;
		} else {
			if (c === '"') inQuotes = true;
			else if (c === ',' || c === '\n') {
				row.push(field.trim());
				field = '';
				if (c === '\n') {
					rows.push(row);
					row = [];
				}
			} else field += c;
		}
	}
	if (field || row.length) {
		row.push(field.trim());
		rows.push(row);
	}
	return rows;
}

async function upsertOrganization(seed) {
	const rows = await sql`
		INSERT INTO organizations (
			slug, name, aliases, description, website, email, org_type, org_types, region,
			city, state, tribal_affiliation, tribal_affiliations, verified, social_links
		) VALUES (
			${seed.slug}, ${seed.name}, ${seed.aliases ?? []}, ${seed.description ?? null},
			${seed.website ?? null}, ${seed.email ?? null}, ${seed.orgType ?? null},
			${seed.orgTypes ?? []}, ${seed.region ?? null}, ${seed.city ?? null},
			${seed.state ?? null}, ${seed.tribalAffiliation ?? null},
			${seed.tribalAffiliations ?? []}, ${seed.verified ?? false}, ${seed.socialLinks ?? {}}
		)
		ON CONFLICT (slug) DO UPDATE SET
			name = EXCLUDED.name,
			aliases = EXCLUDED.aliases,
			description = EXCLUDED.description,
			website = EXCLUDED.website,
			email = EXCLUDED.email,
			org_type = EXCLUDED.org_type,
			org_types = EXCLUDED.org_types,
			region = EXCLUDED.region,
			city = EXCLUDED.city,
			state = EXCLUDED.state,
			tribal_affiliation = EXCLUDED.tribal_affiliation,
			tribal_affiliations = EXCLUDED.tribal_affiliations,
			verified = EXCLUDED.verified,
			social_links = EXCLUDED.social_links,
			updated_at = NOW()
		RETURNING id, slug
	`;
	return rows[0];
}

async function upsertVenue(seed) {
	const rows = await sql`
		INSERT INTO venues (
			slug, name, aliases, description, address, city, state, zip,
			website, venue_type, organization_id
		) VALUES (
			${seed.slug}, ${seed.name}, ${seed.aliases ?? []}, ${seed.description ?? null},
			${seed.address ?? null}, ${seed.city ?? null}, ${seed.state ?? null},
			${seed.zip ?? null}, ${seed.website ?? null}, ${seed.venueType ?? null},
			${seed.organizationId ?? null}
		)
		ON CONFLICT (slug) DO UPDATE SET
			name = EXCLUDED.name,
			aliases = EXCLUDED.aliases,
			description = EXCLUDED.description,
			address = EXCLUDED.address,
			city = EXCLUDED.city,
			state = EXCLUDED.state,
			zip = EXCLUDED.zip,
			website = EXCLUDED.website,
			venue_type = EXCLUDED.venue_type,
			organization_id = EXCLUDED.organization_id,
			updated_at = NOW()
		RETURNING id, slug
	`;
	return rows[0];
}

async function seedOrganizationsAndVenues() {
	const organizations = [
		{
			slug: 'indigenous-futures-society',
			name: 'Indigenous Futures Society',
			aliases: ['IFS'],
			description:
				'Native-led nonprofit supporting digital infrastructure, civic tools, and economic opportunity for Indigenous communities.',
			website: 'https://example.org/ifs',
			email: 'hello@example.org',
			orgType: 'nonprofit',
			orgTypes: ['nonprofit'],
			region: 'California',
			city: 'Sacramento',
			state: 'CA',
			verified: true
		},
		{
			slug: 'first-nations-development-institute',
			name: 'First Nations Development Institute',
			aliases: ['FNDI'],
			description:
				'Native-led intermediary that invests in and creates innovative institutions and models that strengthen asset control in Native communities.',
			website: 'https://www.firstnations.org',
			orgType: 'nonprofit',
			orgTypes: ['nonprofit'],
			region: 'National',
			city: 'Longmont',
			state: 'CO',
			verified: true
		},
		{
			slug: 'usda-forest-service',
			name: 'USDA Forest Service',
			aliases: ['Forest Service'],
			description:
				'Federal land management agency with tribal partnerships across stewardship, restoration, and cultural resource protection.',
			website: 'https://www.fs.usda.gov',
			orgType: 'government',
			orgTypes: ['government'],
			region: 'National',
			city: 'Washington',
			state: 'DC',
			verified: true
		},
		{
			slug: 'indian-health-service',
			name: 'Indian Health Service',
			aliases: ['IHS'],
			description:
				'Federal health program responsible for providing medical and public health services to American Indian and Alaska Native people.',
			website: 'https://www.ihs.gov',
			orgType: 'government',
			orgTypes: ['government'],
			region: 'National',
			city: 'Rockville',
			state: 'MD',
			verified: true
		}
	];

	const organizationRows = [];
	for (const organization of organizations) {
		organizationRows.push(await upsertOrganization(organization));
	}

	const organizationIds = Object.fromEntries(organizationRows.map((row) => [row.slug, row.id]));

	const venues = [
		{
			slug: 'indigenous-futures-commons',
			name: 'Indigenous Futures Commons',
			aliases: ['IFS Commons'],
			description: 'Flexible community venue for workshops, demos, and public programs.',
			address: '1200 Riverfront Ave',
			city: 'Sacramento',
			state: 'CA',
			zip: '95814',
			website: 'https://example.org/ifs/commons',
			venueType: 'community_center',
			organizationId: organizationIds['indigenous-futures-society']
		},
		{
			slug: 'sierra-stewardship-center',
			name: 'Sierra Stewardship Center',
			description:
				'Regional meeting space for stewardship trainings and tribal partnership convenings.',
			address: '101 Pine Ridge Rd',
			city: 'Placerville',
			state: 'CA',
			zip: '95667',
			website: 'https://www.fs.usda.gov',
			venueType: 'conference_center',
			organizationId: organizationIds['usda-forest-service']
		}
	];

	for (const venue of venues) {
		await upsertVenue(venue);
	}

	await sql`
		UPDATE funding
		SET organization_id = ${organizationIds['first-nations-development-institute']}
		WHERE organization_id IS NULL
			AND funder_name = 'First Nations Development Institute'
	`;
	await sql`
		UPDATE funding
		SET organization_id = ${organizationIds['usda-forest-service']}
		WHERE organization_id IS NULL
			AND funder_name = 'USDA Forest Service'
	`;

	await sql`
		UPDATE jobs
		SET organization_id = ${organizationIds['indigenous-futures-society']}
		WHERE organization_id IS NULL
			AND employer_name = 'Indigenous Futures Society'
	`;
	await sql`
		UPDATE jobs
		SET organization_id = ${organizationIds['indian-health-service']}
		WHERE organization_id IS NULL
			AND employer_name = 'Indian Health Service'
	`;
	await sql`
		UPDATE jobs
		SET organization_id = ${organizationIds['usda-forest-service']}
		WHERE organization_id IS NULL
			AND employer_name = 'USDA Forest Service'
	`;

	await sql`
		UPDATE toolbox_resources
		SET organization_id = ${organizationIds['first-nations-development-institute']}
		WHERE organization_id IS NULL
			AND source_name = 'First Nations Development Institute'
	`;
	await sql`
		UPDATE toolbox_resources
		SET organization_id = ${organizationIds['usda-forest-service']}
		WHERE organization_id IS NULL
			AND source_name = 'USDA Forest Service'
	`;

	console.log(`Seeded ${organizationRows.length} organizations and ${venues.length} venues.`);
}

// ── Red Pages ─────────────────────────────────────────────────────────────────
async function seedRedPages() {
	const summary = await syncCuratedRedPages(sql, { prune: true });
	console.log(
		`Synced ${summary.total} curated Red Pages listings (${summary.created} created, ${summary.updated} updated, ${summary.deleted} legacy rows removed).`
	);
}

// ── Funding ───────────────────────────────────────────────────────────────────
async function seedFunding() {
	const summary = await syncCuratedFunding(sql, { prune: true });
	console.log(
		`Synced ${summary.total} curated funding opportunities (${summary.created} created, ${summary.updated} updated, ${summary.deleted} legacy rows removed, ${summary.searchIndexed ? `${summary.indexedCount} search docs rebuilt` : 'search reindex skipped'}).`
	);
}

// ── Jobs ──────────────────────────────────────────────────────────────────────
async function seedJobs() {
	const items = [
		{
			title: 'Tribal Historic Preservation Officer',
			employerName: 'Sierra Nevada Tribe (Example)',
			jobType: 'full_time',
			seniority: 'senior',
			sector: 'tribal_gov',
			workArrangement: 'in_office',
			location: 'Nevada City, CA',
			region: 'Sierra Nevada',
			description:
				'<p>Oversee tribal historic preservation programs including Section 106 consultation, tribal cultural resource surveys, NHPA compliance, and development of the tribal historic preservation plan. Work closely with federal and state agencies.</p>',
			qualifications:
				"<ul><li>Bachelor's degree in archaeology, anthropology, history, or related field</li><li>5+ years THPO or cultural resource management experience</li><li>Knowledge of Section 106 consultation process</li><li>Familiarity with Sierra Nevada tribal cultures preferred</li></ul>",
			applyUrl: '#',
			indigenousPriority: true,
			applicationDeadline: new Date('2026-05-01'),
			compensationMin: 65000,
			compensationMax: 85000,
			compensationDescription: '$65,000–$85,000 DOE'
		},
		{
			title: 'Native American Community Health Worker',
			employerName: 'Indian Health Service',
			jobType: 'full_time',
			seniority: 'entry',
			sector: 'government',
			workArrangement: 'hybrid',
			location: 'Sacramento, CA',
			region: 'California',
			description:
				'<p>Serve as a bridge between community members and healthcare providers. Conduct outreach, provide health education, assist with care coordination, and connect community members to social services. Bilingual preferred.</p>',
			qualifications:
				"<ul><li>High school diploma or GED required; Associate's degree preferred</li><li>Experience working in Native American communities</li><li>Community health worker certification preferred</li><li>Valid CA driver's license</li></ul>",
			applyUrl: 'https://www.ihs.gov',
			indigenousPriority: true,
			applicationDeadline: new Date('2026-04-20'),
			compensationMin: 42000,
			compensationMax: 55000,
			compensationDescription: '$42,000–$55,000 + federal benefits'
		},
		{
			title: 'Language Revitalization Program Coordinator',
			employerName: 'California Indian Language Center',
			jobType: 'full_time',
			seniority: 'mid',
			sector: 'nonprofit',
			workArrangement: 'hybrid',
			location: 'Davis, CA',
			region: 'California',
			description:
				'<p>Coordinate language documentation and revitalization projects for California Indian languages. Manage relationships with tribal language speakers and communities, oversee apprenticeship programs, support digital archiving efforts.</p>',
			qualifications:
				'<ul><li>MA in linguistics, anthropology, or Native American studies preferred</li><li>Experience with language documentation or revitalization</li><li>Knowledge of California Indian languages a plus</li><li>Strong project management skills</li></ul>',
			applyUrl: '#',
			indigenousPriority: true,
			applicationDeadline: new Date('2026-06-01'),
			compensationMin: 55000,
			compensationMax: 70000,
			compensationDescription: '$55,000–$70,000'
		},
		{
			title: 'Environmental Scientist – Tribal Lands',
			employerName: 'USDA Forest Service',
			jobType: 'full_time',
			seniority: 'mid',
			sector: 'government',
			workArrangement: 'in_office',
			location: 'Placerville, CA',
			region: 'Sierra Nevada',
			description:
				'<p>Conduct environmental assessments on Eldorado National Forest lands with tribal cultural significance. Collaborate with tribal liaisons, prepare NEPA documentation, and support tribal co-management initiatives.</p>',
			qualifications:
				"<ul><li>Bachelor's in environmental science, ecology, or related field</li><li>2+ years federal or state environmental work</li><li>Experience with tribal consultation preferred</li><li>Knowledge of Sierra Nevada ecosystems</li></ul>",
			applyUrl: 'https://www.usajobs.gov',
			indigenousPriority: false,
			applicationDeadline: new Date('2026-04-30'),
			compensationMin: 60000,
			compensationMax: 80000,
			compensationDescription: 'GS-9/11 scale ($60,000–$80,000)'
		},
		{
			title: 'Web Developer – Native Nonprofit',
			employerName: 'Indigenous Futures Society',
			jobType: 'contract',
			seniority: 'mid',
			sector: 'nonprofit',
			workArrangement: 'remote',
			location: 'Remote',
			region: 'California',
			description:
				'<p>Build and maintain web properties for IFS, including the Knowledge Basket platform. Experience with SvelteKit, PostgreSQL, and Tailwind CSS preferred. This is a part-time contract position with potential for full-time.</p>',
			qualifications:
				'<ul><li>2+ years web development experience</li><li>Proficiency in JavaScript/TypeScript</li><li>Experience with SvelteKit or similar frameworks</li><li>Understanding of accessibility (WCAG 2.1)</li></ul>',
			applyUrl: '#',
			indigenousPriority: true,
			applicationDeadline: new Date('2026-05-15'),
			compensationMin: 50,
			compensationMax: 80,
			compensationDescription: '$50–$80/hr contract'
		},
		{
			title: 'Traditional Ecological Knowledge Coordinator',
			employerName: 'Sierra Nevada Research Institute',
			jobType: 'full_time',
			seniority: 'mid',
			sector: 'education',
			workArrangement: 'hybrid',
			location: 'Merced, CA',
			region: 'Sierra Nevada',
			description:
				'<p>Facilitate integration of Traditional Ecological Knowledge (TEK) into research and land management practices. Build relationships with tribal communities, document TEK with community consent, and co-design research protocols.</p>',
			qualifications:
				'<ul><li>Graduate degree in ecology, Native American studies, or related field</li><li>Experience in community-based participatory research</li><li>Demonstrated relationships with Indigenous communities</li></ul>',
			applyUrl: '#',
			indigenousPriority: true,
			applicationDeadline: new Date('2026-06-15'),
			compensationMin: 58000,
			compensationMax: 72000,
			compensationDescription: '$58,000–$72,000'
		}
	];

	const seen = new Set();
	let count = 0;
	for (const item of items) {
		const slug = uniqueSlug(slugify(item.title), seen);
		await sql`
			INSERT INTO jobs (
				id, slug, title, description, qualifications, employer_name, job_type,
				seniority, sector, work_arrangement, location, region,
				apply_url, indigenous_priority, application_deadline,
				compensation_min, compensation_max, compensation_description,
				status, source, published_at
			) VALUES (
				${randomUUID()}, ${slug}, ${item.title}, ${item.description ?? null},
				${item.qualifications ?? null}, ${item.employerName}, ${item.jobType},
				${item.seniority}, ${item.sector}, ${item.workArrangement},
				${item.location ?? null}, ${item.region ?? null},
				${item.applyUrl ?? null}, ${item.indigenousPriority ?? false},
				${item.applicationDeadline ?? null},
				${item.compensationMin ?? null}, ${item.compensationMax ?? null},
				${item.compensationDescription ?? null},
				'published', 'seed', NOW()
			)
			ON CONFLICT (slug) DO NOTHING
		`;
		count++;
	}
	console.log(`Seeded ${count} jobs.`);
}

// ── Toolbox ───────────────────────────────────────────────────────────────────
async function seedToolbox() {
	const items = [
		{
			title: 'Tribal Government Handbook: Essential Resources for Tribal Leaders',
			sourceName: 'National Congress of American Indians',
			resourceType: 'guide',
			mediaType: 'text',
			category: 'Tribal Governance',
			contentMode: 'link',
			externalUrl: 'https://www.ncai.org/tribal-governance',
			description:
				'Comprehensive resource covering tribal sovereignty, governance structures, federal Indian law, and practical tools for tribal government operations.'
		},
		{
			title: 'Native Language Preservation Toolkit',
			sourceName: 'First Peoples Cultural Council',
			resourceType: 'toolkit',
			mediaType: 'toolkit',
			category: 'Language Revitalization',
			contentMode: 'link',
			externalUrl: 'https://fpcc.ca/resource/language-revitalization-resources/',
			description:
				'Practical toolkit for communities undertaking language revitalization work, including community assessment tools, program models, and best practices.'
		},
		{
			title: 'Indigenous Data Sovereignty: A Guide for Tribes',
			sourceName: 'US Indigenous Data Sovereignty Network',
			resourceType: 'guide',
			mediaType: 'text',
			category: 'Data Sovereignty',
			contentMode: 'link',
			externalUrl: 'https://usindigenousdata.org/',
			description:
				'An introduction to Indigenous data sovereignty principles and practical guidance for tribes asserting governance over their data.'
		},
		{
			title: 'Tribal Historic Preservation Program Manual',
			sourceName: 'National Trust for Historic Preservation',
			resourceType: 'guide',
			mediaType: 'text',
			category: 'Cultural Preservation',
			contentMode: 'link',
			externalUrl:
				'https://www.nps.gov/subjects/nationalregister/tribal-historic-preservation-programs.htm',
			description:
				'Step-by-step guidance for establishing and operating a Tribal Historic Preservation Officer program under the National Historic Preservation Act.'
		},
		{
			title: 'Traditional Ecological Knowledge and Climate Adaptation',
			sourceName: 'USDA Forest Service',
			resourceType: 'report',
			mediaType: 'report',
			category: 'Environmental Stewardship',
			contentMode: 'link',
			externalUrl: 'https://www.fs.usda.gov/treesearch/',
			description:
				'Research report examining how Traditional Ecological Knowledge can inform climate adaptation strategies for forest management in the Sierra Nevada.'
		},
		{
			title: 'Grant Writing for Tribal Organizations: A Step-by-Step Guide',
			sourceName: 'First Nations Development Institute',
			resourceType: 'guide',
			mediaType: 'text',
			category: 'Funding & Grants',
			contentMode: 'link',
			externalUrl: 'https://www.firstnations.org/publications/',
			description:
				'Practical guide covering all aspects of grant writing for tribal organizations, from identifying funders to crafting compelling narratives and managing reporting requirements.'
		},
		{
			title: 'Native Business Development Resources',
			sourceName: 'Administration for Native Americans',
			resourceType: 'toolkit',
			mediaType: 'toolkit',
			category: 'Economic Development',
			contentMode: 'link',
			externalUrl: 'https://www.acf.hhs.gov/ana/resource/native-business',
			description:
				'Curated resources for Native entrepreneurs and Native-owned businesses, including access to capital, certification programs, and technical assistance.'
		},
		{
			title: 'Free, Prior and Informed Consent: A Practical Guide',
			sourceName: 'Cultural Survival',
			resourceType: 'guide',
			mediaType: 'text',
			category: 'Indigenous Rights',
			contentMode: 'link',
			externalUrl:
				'https://www.culturalsurvival.org/publications/cultural-survival-quarterly/free-prior-and-informed-consent',
			description:
				'Explains FPIC principles, their legal basis, and practical applications for Indigenous communities facing development projects on or near their territories.'
		}
	];

	const seen = new Set();
	let count = 0;
	for (const item of items) {
		const slug = uniqueSlug(slugify(item.title), seen);
		await sql`
			INSERT INTO toolbox_resources (
				id, slug, title, description, source_name, resource_type,
				media_type, category, content_mode, external_url,
				status, source, published_at
			) VALUES (
				${randomUUID()}, ${slug}, ${item.title}, ${item.description ?? null},
				${item.sourceName ?? null}, ${item.resourceType},
				${item.mediaType ?? null}, ${item.category ?? null},
				${item.contentMode}, ${item.externalUrl ?? null},
				'published', 'seed', NOW()
			)
			ON CONFLICT (slug) DO NOTHING
		`;
		count++;
	}
	console.log(`Seeded ${count} toolbox resources.`);
}

async function run() {
	try {
		await seedOrganizationsAndVenues();
		await seedRedPages();
		await seedFunding();
		await seedJobs();
		await seedToolbox();
		console.log('Done.');
	} catch (err) {
		console.error(err);
		process.exit(1);
	} finally {
		await sql.end();
	}
}

run();
