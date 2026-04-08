#!/usr/bin/env node
import 'dotenv/config';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL is not set.');
	process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);

async function upsertOrganization() {
	const rows = await sql`
		INSERT INTO organizations (
			slug,
			name,
			aliases,
			description,
			website,
			org_type,
			org_types,
			region,
			city,
			state,
			verified,
			social_links
		) VALUES (
			${'kb-ci-collective'},
			${'Knowledge Basket CI Collective'},
			${['KBCI']},
			${'A lightweight Indigenous-led fixture organization used for CI contract coverage.'},
			${'https://example.com/kb-ci-collective'},
			${'nonprofit'},
			${['nonprofit']},
			${'California'},
			${'Sacramento'},
			${'CA'},
			${true},
			${{}}
		)
		ON CONFLICT (slug) DO UPDATE SET
			name = EXCLUDED.name,
			aliases = EXCLUDED.aliases,
			description = EXCLUDED.description,
			website = EXCLUDED.website,
			org_type = EXCLUDED.org_type,
			org_types = EXCLUDED.org_types,
			region = EXCLUDED.region,
			city = EXCLUDED.city,
			state = EXCLUDED.state,
			verified = EXCLUDED.verified,
			social_links = EXCLUDED.social_links,
			updated_at = NOW()
		RETURNING id
	`;

	return rows[0]?.id;
}

async function seedEvents(organizationId) {
	await sql`
		INSERT INTO events (
			slug,
			title,
			description,
			location,
			region,
			event_url,
			host_org,
			type,
			start_date,
			end_date,
			status,
			source,
			organization_id,
			published_at
		) VALUES (
			${'kb-ci-tribal-stewardship-summit'},
			${'Tribal Stewardship Summit'},
			${'Hands-on gathering for tribal stewardship, land restoration, and community data practice.'},
			${'Sacramento, CA'},
			${'California'},
			${'https://example.com/events/tribal-stewardship-summit'},
			${'Knowledge Basket CI Collective'},
			${'conference'},
			${new Date('2026-07-15T16:00:00.000Z')},
			${new Date('2026-07-17T00:00:00.000Z')},
			${'published'},
			${'seed:ci'},
			${organizationId},
			${new Date('2026-01-15T00:00:00.000Z')}
		)
		ON CONFLICT (slug) DO UPDATE SET
			title = EXCLUDED.title,
			description = EXCLUDED.description,
			location = EXCLUDED.location,
			region = EXCLUDED.region,
			event_url = EXCLUDED.event_url,
			host_org = EXCLUDED.host_org,
			type = EXCLUDED.type,
			start_date = EXCLUDED.start_date,
			end_date = EXCLUDED.end_date,
			status = EXCLUDED.status,
			source = EXCLUDED.source,
			organization_id = EXCLUDED.organization_id,
			published_at = EXCLUDED.published_at,
			updated_at = NOW()
	`;
}

async function seedFunding(organizationId) {
	await sql`
		INSERT INTO funding (
			slug,
			title,
			description,
			funder_name,
			organization_id,
			funding_type,
			application_status,
			deadline,
			region,
			apply_url,
			status,
			source,
			published_at
		) VALUES (
			${'kb-ci-tribal-resilience-grant'},
			${'Tribal Resilience Grant'},
			${'Support for tribal climate resilience, emergency preparedness, and local infrastructure planning.'},
			${'Knowledge Basket CI Collective'},
			${organizationId},
			${'grant'},
			${'open'},
			${new Date('2026-08-15T23:59:59.000Z')},
			${'National'},
			${'https://example.com/funding/tribal-resilience-grant'},
			${'published'},
			${'seed:ci'},
			${new Date('2026-01-15T00:00:00.000Z')}
		)
		ON CONFLICT (slug) DO UPDATE SET
			title = EXCLUDED.title,
			description = EXCLUDED.description,
			funder_name = EXCLUDED.funder_name,
			organization_id = EXCLUDED.organization_id,
			funding_type = EXCLUDED.funding_type,
			application_status = EXCLUDED.application_status,
			deadline = EXCLUDED.deadline,
			region = EXCLUDED.region,
			apply_url = EXCLUDED.apply_url,
			status = EXCLUDED.status,
			source = EXCLUDED.source,
			published_at = EXCLUDED.published_at,
			updated_at = NOW()
	`;
}

async function seedJobs(organizationId) {
	await sql`
		INSERT INTO jobs (
			slug,
			title,
			description,
			employer_name,
			organization_id,
			job_type,
			work_arrangement,
			location,
			region,
			apply_url,
			application_deadline,
			indigenous_priority,
			status,
			source,
			published_at
		) VALUES (
			${'kb-ci-tribal-data-steward'},
			${'Tribal Data Steward'},
			${'Coordinate tribal knowledge systems, program reporting, and searchable content operations.'},
			${'Knowledge Basket CI Collective'},
			${organizationId},
			${'full_time'},
			${'hybrid'},
			${'Sacramento, CA'},
			${'California'},
			${'https://example.com/jobs/tribal-data-steward'},
			${new Date('2026-08-31T23:59:59.000Z')},
			${true},
			${'published'},
			${'seed:ci'},
			${new Date('2026-01-15T00:00:00.000Z')}
		)
		ON CONFLICT (slug) DO UPDATE SET
			title = EXCLUDED.title,
			description = EXCLUDED.description,
			employer_name = EXCLUDED.employer_name,
			organization_id = EXCLUDED.organization_id,
			job_type = EXCLUDED.job_type,
			work_arrangement = EXCLUDED.work_arrangement,
			location = EXCLUDED.location,
			region = EXCLUDED.region,
			apply_url = EXCLUDED.apply_url,
			application_deadline = EXCLUDED.application_deadline,
			indigenous_priority = EXCLUDED.indigenous_priority,
			status = EXCLUDED.status,
			source = EXCLUDED.source,
			published_at = EXCLUDED.published_at,
			updated_at = NOW()
	`;
}

async function seedRedPages(organizationId) {
	await sql`
		INSERT INTO red_pages_businesses (
			slug,
			name,
			description,
			organization_id,
			service_type,
			service_area,
			tribal_affiliation,
			ownership_identity,
			website,
			email,
			city,
			state,
			region,
			status,
			source,
			verified,
			published_at
		) VALUES (
			${'kb-ci-tribal-design-studio'},
			${'Tribal Design Studio'},
			${'Native-owned design and facilitation studio supporting tribal programs, storytelling, and digital wayfinding.'},
			${organizationId},
			${'design'},
			${'National'},
			${'Yurok'},
			${['Native-owned']},
			${'https://example.com/red-pages/tribal-design-studio'},
			${'hello@example.com'},
			${'Eureka'},
			${'CA'},
			${'California'},
			${'published'},
			${'seed:ci'},
			${true},
			${new Date('2026-01-15T00:00:00.000Z')}
		)
		ON CONFLICT (slug) DO UPDATE SET
			name = EXCLUDED.name,
			description = EXCLUDED.description,
			organization_id = EXCLUDED.organization_id,
			service_type = EXCLUDED.service_type,
			service_area = EXCLUDED.service_area,
			tribal_affiliation = EXCLUDED.tribal_affiliation,
			ownership_identity = EXCLUDED.ownership_identity,
			website = EXCLUDED.website,
			email = EXCLUDED.email,
			city = EXCLUDED.city,
			state = EXCLUDED.state,
			region = EXCLUDED.region,
			status = EXCLUDED.status,
			source = EXCLUDED.source,
			verified = EXCLUDED.verified,
			published_at = EXCLUDED.published_at,
			updated_at = NOW()
	`;
}

async function seedToolbox(organizationId) {
	await sql`
		INSERT INTO toolbox_resources (
			slug,
			title,
			description,
			body,
			source_name,
			organization_id,
			resource_type,
			media_type,
			category,
			content_mode,
			external_url,
			author,
			publish_date,
			status,
			source,
			published_at
		) VALUES (
			${'kb-ci-tribal-funding-toolkit'},
			${'Tribal Funding Toolkit'},
			${'Practical guide for tribal grant readiness, documentation, and community review workflows.'},
			${'A concise toolkit covering tribal funding preparation, document checklists, and storytelling prompts.'},
			${'Knowledge Basket CI Collective'},
			${organizationId},
			${'guide'},
			${'text/html'},
			${'Funding'},
			${'link'},
			${'https://example.com/toolbox/tribal-funding-toolkit'},
			${'Knowledge Basket CI Collective'},
			${new Date('2026-01-10T00:00:00.000Z')},
			${'published'},
			${'seed:ci'},
			${new Date('2026-01-15T00:00:00.000Z')}
		)
		ON CONFLICT (slug) DO UPDATE SET
			title = EXCLUDED.title,
			description = EXCLUDED.description,
			body = EXCLUDED.body,
			source_name = EXCLUDED.source_name,
			organization_id = EXCLUDED.organization_id,
			resource_type = EXCLUDED.resource_type,
			media_type = EXCLUDED.media_type,
			category = EXCLUDED.category,
			content_mode = EXCLUDED.content_mode,
			external_url = EXCLUDED.external_url,
			author = EXCLUDED.author,
			publish_date = EXCLUDED.publish_date,
			status = EXCLUDED.status,
			source = EXCLUDED.source,
			published_at = EXCLUDED.published_at,
			updated_at = NOW()
	`;
}

async function run() {
	const organizationId = await upsertOrganization();

	if (!organizationId) {
		throw new Error('Unable to seed CI organization fixture.');
	}

	await seedEvents(organizationId);
	await seedFunding(organizationId);
	await seedJobs(organizationId);
	await seedRedPages(organizationId);
	await seedToolbox(organizationId);

	console.log('Seeded CI fixture content.');
	await sql.end();
}

run().catch(async (error) => {
	console.error(error);
	await sql.end({ timeout: 5 });
	process.exit(1);
});
