#!/usr/bin/env node
/**
 * Toolbox Foundation Seed — Knowledge Basket
 * ============================================
 * For each resource with a local PDF:
 *   1. Compute sha256 of the file
 *   2. Upload to MinIO at toolbox/original/{sha256}.{ext}
 *   3. Insert DB record with contentMode='file', fileUrl='/uploads/toolbox/original/{sha256}.{ext}'
 *
 * For web-only resources (videos, podcasts, web pages, live websites):
 *   - Insert with contentMode='link', externalUrl set
 *
 * For items with both a local PDF and a canonical URL:
 *   - Hosted in MinIO (contentMode='file'), externalUrl kept for attribution
 *
 * Run from site/:
 *   node scripts/toolbox-foundation-seed.js
 *
 * Requires .env with MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET, DATABASE_URL
 */

import 'dotenv/config';
import postgres from 'postgres';
import {
	S3Client,
	PutObjectCommand,
	HeadBucketCommand,
	CreateBucketCommand,
	HeadObjectCommand
} from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { randomUUID } from 'crypto';

// ── Environment ───────────────────────────────────────────────────────────────

const {
	DATABASE_URL,
	MINIO_ENDPOINT,
	MINIO_ACCESS_KEY,
	MINIO_SECRET_KEY,
	MINIO_BUCKET,
	KB_RESOURCES_PATH
} = process.env;

if (!DATABASE_URL) {
	console.error('DATABASE_URL is not set.');
	process.exit(1);
}
if (!MINIO_ENDPOINT || !MINIO_ACCESS_KEY || !MINIO_SECRET_KEY || !MINIO_BUCKET) {
	console.error(
		'MinIO env vars not set. Need: MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET'
	);
	process.exit(1);
}

const sql = postgres(DATABASE_URL);

// ── MinIO client ──────────────────────────────────────────────────────────────

const s3 = new S3Client({
	region: 'us-east-1',
	endpoint: MINIO_ENDPOINT,
	forcePathStyle: true,
	credentials: { accessKeyId: MINIO_ACCESS_KEY, secretAccessKey: MINIO_SECRET_KEY }
});

async function ensureBucket() {
	try {
		await s3.send(new HeadBucketCommand({ Bucket: MINIO_BUCKET }));
	} catch {
		await s3.send(new CreateBucketCommand({ Bucket: MINIO_BUCKET }));
		console.log(`  Created bucket: ${MINIO_BUCKET}`);
	}
}

/**
 * Upload a file to MinIO. Uses sha256 as the object key to deduplicate.
 * Returns the /uploads/... URL path that the SvelteKit route serves.
 * Skips the PUT if the object already exists (idempotent re-runs).
 */
async function uploadToMinio(absolutePath) {
	const buf = await readFile(absolutePath);
	const sha256 = createHash('sha256').update(buf).digest('hex');
	const ext = extname(absolutePath).replace(/^\./, '').toLowerCase() || 'bin';
	const objectKey = `toolbox/original/${sha256}.${ext}`;
	const mimeType =
		ext === 'pdf'
			? 'application/pdf'
			: ext === 'docx'
				? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
				: 'application/octet-stream';

	// Check if already uploaded (idempotent)
	try {
		await s3.send(new HeadObjectCommand({ Bucket: MINIO_BUCKET, Key: objectKey }));
		return { fileUrl: `/uploads/${objectKey}`, objectKey, skipped: true };
	} catch {
		/* not found, will upload */
	}

	await s3.send(
		new PutObjectCommand({
			Bucket: MINIO_BUCKET,
			Key: objectKey,
			Body: buf,
			ContentType: mimeType,
			CacheControl: 'public, max-age=31536000, immutable'
		})
	);

	return { fileUrl: `/uploads/${objectKey}`, objectKey, skipped: false };
}

// ── Resources directory ───────────────────────────────────────────────────────

function resolveResourcesDir() {
	if (KB_RESOURCES_PATH?.trim()) return resolve(KB_RESOURCES_PATH.trim());
	const inCwd = resolve(process.cwd(), 'resources');
	const sibling = resolve(process.cwd(), '..', 'resources');
	if (existsSync(inCwd)) return inCwd;
	if (existsSync(sibling)) return sibling;
	return sibling;
}

// ── Slug helpers ──────────────────────────────────────────────────────────────

function slugify(text) {
	return (
		text
			?.trim()
			.toLowerCase()
			.replace(/\s+/g, '-')
			.replace(/[^a-z0-9-]/g, '')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '')
			.slice(0, 100) || 'item'
	);
}

function uniqueSlug(base, seen) {
	let slug = base,
		n = 0;
	while (seen.has(slug)) slug = `${base.slice(0, 90)}-${++n}`;
	seen.add(slug);
	return slug;
}

// =============================================================================
// RESOURCE DATA
// =============================================================================
//
// Fields:
//   title, description, sourceName, author, publishDate (ISO string or null)
//   resourceType  — 'Guide' | 'Toolkit' | 'Report / White Paper' | 'Policy Document'
//                   'Article' | 'Video' | 'Podcast'
//   mediaType     — 'PDF' | 'Video' | 'Podcast' | 'Web' | null
//   category      — standardized category string
//   tags          — string[]
//   localFile     — relative path inside resources/ folder, or null (link-only items)
//   externalUrl   — canonical public URL; used as attribution for file items,
//                   primary link for link-only items
// =============================================================================

const resources = [
	// ── LAND & WATER GUARDIANSHIP ─────────────────────────────────────────────

	{
		title:
			'Joint Secretarial Order 3403: Fulfilling the Trust Responsibility to Indian Tribes in the Stewardship of Federal Lands and Waters',
		description:
			'Binding order from the Secretaries of Agriculture and Interior directing both departments to ensure tribal nations are full partners in the stewardship of federal lands and waters. Establishes co-stewardship as formal federal policy and outlines mandatory consultation and partnership obligations.',
		sourceName: 'U.S. Department of Agriculture & U.S. Department of the Interior',
		author: null,
		publishDate: '2021-11-15',
		resourceType: 'Policy Document',
		mediaType: 'PDF',
		category: 'Land & Water Guardianship',
		tags: [
			'co-management',
			'federal policy',
			'trust responsibility',
			'stewardship',
			'Interior',
			'USDA',
			'Secretarial Order'
		],
		localFile: 'Land & Water Guardianship/Indigenous Co-Management with Federal Partners.pdf',
		externalUrl: null
	},

	{
		title:
			'We Rise Together: Achieving Pathway to Canada Target 1 Through Indigenous Protected and Conserved Areas',
		description:
			"Report and recommendations from Canada's Indigenous Circle of Experts on creating Indigenous Protected and Conserved Areas in the spirit and practice of reconciliation. A foundational IPCA framework document widely cited in U.S. and Canadian co-stewardship advocacy.",
		sourceName: 'Indigenous Circle of Experts / Environment and Climate Change Canada',
		author: null,
		publishDate: '2018-03-01',
		resourceType: 'Report / White Paper',
		mediaType: 'PDF',
		category: 'Land & Water Guardianship',
		tags: [
			'IPCA',
			'ICCA',
			'indigenous conservation',
			'reconciliation',
			'Canada',
			'protected areas',
			'co-management'
		],
		localFile: 'Land & Water Guardianship/PA234-ICE_Report_2018_Mar_22_web.pdf',
		externalUrl: null
	},

	{
		title:
			'Science Synthesis to Support Socioecological Resilience in the Sierra Nevada and Southern Cascade Range',
		description:
			'Federal science synthesis examining collaborative and participatory approaches to national forest management in the Sierra Nevada, including the role of tribal nations and local communities in land stewardship, fire management, and ecosystem decisions.',
		sourceName: 'USDA Forest Service Pacific Southwest Research Station',
		author: 'Susan Charnley, Jonathan W. Long, Frank K. Lake',
		publishDate: '2014-01-01',
		resourceType: 'Report / White Paper',
		mediaType: 'PDF',
		category: 'Land & Water Guardianship',
		tags: [
			'Sierra Nevada',
			'socioecological resilience',
			'USFS',
			'collaborative management',
			'tribal stewardship',
			'Frank Lake'
		],
		localFile: 'Land & Water Guardianship/LakeFrank-Handout-2.pdf',
		externalUrl: null
	},

	{
		title: 'Good Practices in Participatory Mapping: A Review for IFAD',
		description:
			'Comprehensive review of participatory mapping methods enabling indigenous and rural communities to assert territorial rights, document traditional land use, and engage in land governance. Covers community mapping, GPS methods, GIS, and legal recognition pathways.',
		sourceName: 'International Fund for Agricultural Development (IFAD)',
		author: null,
		publishDate: '2009-04-01',
		resourceType: 'Guide',
		mediaType: 'PDF',
		category: 'Land & Water Guardianship',
		tags: [
			'participatory mapping',
			'land rights',
			'GIS',
			'community mapping',
			'territorial rights',
			'IFAD'
		],
		localFile: 'Land & Water Guardianship/Paticipatory Mapping for Rights.pdf',
		externalUrl: 'https://www.ifad.org/en/web/knowledge/publication/asset/38327811'
	},

	{
		title:
			'ICCA Toolkit: Recognising and Supporting Territories and Areas Conserved by Indigenous Peoples and Local Communities',
		description:
			'Practical toolkit for recognizing, supporting, and strengthening ICCAs—indigenous-governed territories and conservation areas. Covers legal recognition, documentation strategies, governance models, and global advocacy. The definitive international reference for community-governed conservation.',
		sourceName: 'ICCA Consortium',
		author: null,
		publishDate: null,
		resourceType: 'Toolkit',
		mediaType: 'PDF',
		category: 'Land & Water Guardianship',
		tags: [
			'ICCA',
			'IPCA',
			'indigenous conservation',
			'territories',
			'community governance',
			'toolkit',
			'international'
		],
		localFile: 'Land & Water Guardianship/IPCA/ICCA Toolkit Final - web.pdf',
		externalUrl: 'https://www.iccaforum.org/icca-toolkit'
	},

	{
		title: 'Indigenous Guardians Toolkit',
		description:
			'Practical toolkit for Indigenous Guardian programs — land and sea monitoring initiatives led by Indigenous peoples to protect and manage their traditional territories. Includes program design templates, funding strategies, legal frameworks, and case studies.',
		sourceName: 'Indigenous Guardians Toolkit Network',
		author: null,
		publishDate: null,
		resourceType: 'Toolkit',
		mediaType: 'PDF',
		category: 'Land & Water Guardianship',
		tags: [
			'guardians',
			'land stewardship',
			'monitoring',
			'indigenous rangers',
			'toolkit',
			'traditional territory'
		],
		localFile: 'Land & Water Guardianship/Indigenous_Guardians_Toolkit_Canada.pdf',
		externalUrl: 'https://www.indigenousguardianstoolkit.ca/'
	},

	{
		title: 'The Indigenous World 2024',
		description:
			'Annual reference publication providing a global overview of the status and rights of indigenous peoples. Covers land rights, climate justice, political developments, legal frameworks, and governance across every world region. Essential reference for advocacy and policy work.',
		sourceName: 'International Work Group for Indigenous Affairs (IWGIA)',
		author: null,
		publishDate: '2024-01-01',
		resourceType: 'Report / White Paper',
		mediaType: 'PDF',
		category: 'Land & Water Guardianship',
		tags: [
			'indigenous rights',
			'global',
			'annual report',
			'land rights',
			'climate justice',
			'IWGIA',
			'international law'
		],
		localFile: 'Land & Water Guardianship/IWGIA_Book_The Indigenous World 2024_ENG.pdf',
		externalUrl: 'https://iwgia.org/en/resources/indigenous-world.html'
	},

	{
		title: 'The Study on Indian Water Rights — California Indian Legal Services (2024)',
		description:
			"Authoritative 82-page legal study explaining California's framework for tribal water rights, including the Winters Doctrine, federal reserved rights, quantification processes, and practical implications for California tribal nations seeking to assert and protect their water.",
		sourceName: 'California Indian Legal Services (CILS)',
		author: 'H. Michael Ross',
		publishDate: '2024-08-14',
		resourceType: 'Report / White Paper',
		mediaType: 'PDF',
		category: 'Land & Water Guardianship',
		tags: [
			'water rights',
			'Winters Doctrine',
			'California',
			'Indian law',
			'federal reserved rights',
			'legal',
			'CILS'
		],
		localFile: 'Land & Water Guardianship/CILS_The Study_Indian_Water_Rights_2024v1.pdf',
		externalUrl: 'http://water.calindian.org/'
	},

	{
		title: 'Salmon Feeds Our People: The Importance of Salmon to the Karuk and Yurok Tribes',
		description:
			'Peer-reviewed research documenting the central role of salmon in the diet, culture, health, and sovereignty of Northern California tribal nations. Demonstrates how salmon decline intersects with food insecurity, treaty rights, and the need for river restoration.',
		sourceName: 'University of Oregon',
		author: 'Kari Marie Norgaard & Jonathan W. Long',
		publishDate: null,
		resourceType: 'Article',
		mediaType: 'PDF',
		category: 'Land & Water Guardianship',
		tags: [
			'salmon',
			'Karuk',
			'Yurok',
			'food sovereignty',
			'Pacific Northwest',
			'tribal culture',
			'water rights',
			'river restoration'
		],
		localFile: 'Land & Water Guardianship/Salmon-Feeds-Our-People-Reed-Norgaard.pdf',
		externalUrl: 'https://pages.uoregon.edu/norgaard/pdf/Salmon-Feeds-Our-People-Reed-Norgaard.pdf'
	},

	{
		title: 'USFS Pacific Southwest Region Tribal Partnership Matrix',
		description:
			'Reference matrix documenting the full range of agreements, consultation processes, and partnership mechanisms available between the USDA Forest Service Pacific Southwest Region and California tribal nations for land, resource, and cultural site co-management.',
		sourceName: 'USDA Forest Service',
		author: null,
		publishDate: null,
		resourceType: 'Guide',
		mediaType: 'PDF',
		category: 'Land & Water Guardianship',
		tags: [
			'USFS',
			'tribal partnerships',
			'Forest Service',
			'co-management',
			'California',
			'Pacific Southwest Region'
		],
		localFile: 'Land & Water Guardianship/USFS PSW Region Tribal Partnership Matrix.pdf',
		externalUrl: 'https://www.fs.usda.gov/Internet/FSE_DOCUMENTS/fseprd1019068.pdf'
	},

	{
		title: 'Land Co-Management Repository',
		description:
			'Searchable online repository of co-management agreements, MOUs, joint management plans, and legal frameworks compiled by NARF. Covers federal and state co-management arrangements between tribal nations and government agencies across the United States.',
		sourceName: 'Native American Rights Fund (NARF)',
		author: null,
		publishDate: null,
		resourceType: 'Toolkit',
		mediaType: 'Web',
		category: 'Land & Water Guardianship',
		tags: [
			'co-management',
			'agreements',
			'MOUs',
			'legal frameworks',
			'NARF',
			'federal',
			'repository'
		],
		localFile: null,
		externalUrl: 'https://narf.org/resources/land-co-management-repository/'
	},

	{
		title:
			'BLM Co-Stewardship Legal Authorities: Detailed Discussion of FLPMA and Related Statutes',
		description:
			'Legal memorandum analyzing the statutory and regulatory authorities — including Section 307(b) of FLPMA — that authorize the Bureau of Land Management to enter co-stewardship and cooperative management agreements with tribal nations.',
		sourceName: 'U.S. Bureau of Land Management',
		author: null,
		publishDate: '2022-09-01',
		resourceType: 'Policy Document',
		mediaType: 'PDF',
		category: 'Land & Water Guardianship',
		tags: [
			'BLM',
			'FLPMA',
			'co-stewardship',
			'legal authorities',
			'cooperative agreements',
			'Indian law'
		],
		localFile: 'Land & Water Guardianship/Landback Definitions_Terms.pdf',
		externalUrl: null
	},

	{
		title: "Sogorea Te' Land Trust",
		description:
			'Urban Indigenous women-led land trust in the San Francisco Bay Area facilitating the return of Lisjan/Ohlone territory to Indigenous stewardship. Co-founded by Corrina Gould and Johnella LaRose; pioneered the Shuumi Land Tax model for settler accountability and urban land return.',
		sourceName: "Sogorea Te' Land Trust",
		author: null,
		publishDate: null,
		resourceType: 'Toolkit',
		mediaType: 'Web',
		category: 'Land & Water Guardianship',
		tags: [
			'land trust',
			'urban indigenous',
			'women-led',
			'Bay Area',
			'land back',
			'Ohlone',
			'Shuumi Land Tax',
			'Corrina Gould'
		],
		localFile: null,
		externalUrl: 'https://sogoreate-landtrust.org/'
	},

	{
		title: 'Amah Mutsun Land Trust',
		description:
			'Tribal land trust of the Amah Mutsun Tribal Band working to protect, restore, and reclaim ancestral lands in the Santa Cruz / San Juan Bautista area. A leading example of tribal-led land return and indigenous stewardship in California.',
		sourceName: 'Amah Mutsun Tribal Band',
		author: null,
		publishDate: null,
		resourceType: 'Toolkit',
		mediaType: 'Web',
		category: 'Land & Water Guardianship',
		tags: [
			'land trust',
			'Amah Mutsun',
			'land back',
			'California',
			'restoration',
			'tribal stewardship',
			'Santa Cruz'
		],
		localFile: null,
		externalUrl: 'https://www.amahmutsun.org/amah-mutsun-land-trust'
	},

	{
		title: 'Washoe Tribe Historical Presence in the Sierra Valley Landscape',
		description:
			"Vision plan narrative documenting the Washoe Tribe's millennia-long cultural, spiritual, and ecological relationship with the Sierra Valley (Long Valley) landscape. Prepared as part of a conservation partnership project, contextualizing Washoe territorial affiliation, displacement, and the importance of restoring indigenous stewardship in the Northern Sierra Nevada.",
		sourceName: 'Friends of the River Land Trust / Natural Service Project',
		author: null,
		publishDate: null,
		resourceType: 'Report / White Paper',
		mediaType: 'PDF',
		category: 'Land & Water Guardianship',
		tags: [
			'Washoe',
			'Sierra Valley',
			'Sierra Nevada',
			'Long Valley',
			'historical presence',
			'California',
			'land stewardship',
			'IPCA'
		],
		localFile: 'Land & Water Guardianship/Task 4 Vision Plan_Washoe Historical Context_ .pdf',
		externalUrl: null
	},

	// ── EMERGENCY SERVICES & CLIMATE ADAPTATION ──────────────────────────────

	{
		title:
			'Indigenous Fire Futures: Anticolonial Approaches to Shifting Fire Relations in California',
		description:
			'Peer-reviewed article examining anticolonial frameworks for restoring Indigenous fire stewardship in California. Analyzes how settler colonial property regimes and fire suppression policies suppress tribal burning, and what a genuine restoration of indigenous fire governance requires.',
		sourceName: 'Environment and Society: Advances in Research, Vol. 14',
		author: 'Deniss J. Martinez, Bruno Seraphin, Tony Marks-Block, Peter Nelson, Kirsten Vinyeta',
		publishDate: '2023-01-01',
		resourceType: 'Article',
		mediaType: 'PDF',
		category: 'Emergency Services & Climate Adaptation',
		tags: [
			'fire',
			'anticolonial',
			'California',
			'indigenous fire management',
			'settler colonialism',
			'prescribed burning',
			'TEK'
		],
		localFile: 'Land & Water Guardianship/environment-and-society-ares140109.pdf',
		externalUrl: 'https://doi.org/10.3167/ares.2023.140109'
	},

	{
		title: 'Indigenous Perspective of Fire in the Upper Snake River Basin',
		description:
			'Report documenting tribal perspectives on fire ecology, traditional burning practices, and the role of indigenous fire stewardship in the Upper Snake River Basin, including current barriers to cultural burning and opportunities for tribal-led restoration.',
		sourceName: null,
		author: null,
		publishDate: '2025-01-01',
		resourceType: 'Report / White Paper',
		mediaType: 'PDF',
		category: 'Emergency Services & Climate Adaptation',
		tags: [
			'fire',
			'Snake River Basin',
			'indigenous perspective',
			'traditional burning',
			'prescribed fire',
			'Great Basin'
		],
		localFile:
			'Emergency Services & Climate Adaption/IndigenousFirePerspective2024-WEB-MID-144ppi.pdf',
		externalUrl: null
	},

	{
		title:
			'Good Fire: Current Barriers to the Expansion of Cultural Burning and Prescribed Fire in California — Karuk Tribe',
		description:
			'Comprehensive report for the Karuk Tribe documenting the legal, regulatory, and institutional barriers preventing expansion of cultural and prescribed burning in California, with specific policy recommendations for tribal, state, and federal action.',
		sourceName: 'Karuk Tribe',
		author: 'Sara A. Clark, Andrew Miller, Don L. Hankins',
		publishDate: '2021-03-01',
		resourceType: 'Report / White Paper',
		mediaType: 'PDF',
		category: 'Emergency Services & Climate Adaptation',
		tags: [
			'prescribed fire',
			'cultural burning',
			'Karuk',
			'California',
			'policy barriers',
			'good fire',
			'Hankins'
		],
		localFile: 'Emergency Services & Climate Adaption/karuk-prescribed-fire-rpt_final-1 (1).pdf',
		externalUrl: null
	},

	{
		title:
			'Core Principles for Agency Engagement to Support Community Rights for Climate Adaptation',
		description:
			"Policy recommendations from the Rising Voices Working Group for NOAA's Justice40 Strategic Plan, establishing core principles for how federal agencies must engage with Indigenous and tribal communities on climate adaptation, resettlement, and site expansion.",
		sourceName: 'Rising Voices Working Group / NOAA',
		author: 'Deanna Johnson',
		publishDate: '2024-09-01',
		resourceType: 'Policy Document',
		mediaType: 'PDF',
		category: 'Emergency Services & Climate Adaptation',
		tags: [
			'climate adaptation',
			'agency engagement',
			'Justice40',
			'NOAA',
			'community rights',
			'resettlement',
			'tribal rights'
		],
		localFile: 'Emergency Services & Climate Adaption/coreprinciplesforagencyengagement.pdf',
		externalUrl: null
	},

	{
		title: 'Indigenous Peoples Terminology for the Fourth National Climate Assessment (NCA4)',
		description:
			'Reference guide establishing culturally appropriate and accurate terminology for discussing Indigenous peoples, their relationships with land and climate, and their rights in federal climate assessment contexts.',
		sourceName: 'Institute for Tribal Environmental Professionals (ITEP) / NOAA',
		author: null,
		publishDate: '2018-01-01',
		resourceType: 'Guide',
		mediaType: 'PDF',
		category: 'Emergency Services & Climate Adaptation',
		tags: [
			'climate',
			'terminology',
			'NCA4',
			'indigenous peoples',
			'language guide',
			'ITEP',
			'federal'
		],
		localFile:
			'Emergency Services & Climate Adaption/Indigenous Peoples Terminology for NCA4-final.pdf',
		externalUrl:
			'http://www7.nau.edu/itep/main/tcc/docs/resources/Indigenous%20Peoples%20Terminology%20for%20NCA4-final.pdf'
	},

	{
		title: 'Climate Adaptation Barriers and Needs Experienced by Northwest Coastal Tribes (2024)',
		description:
			'Key findings from tribal listening sessions documenting the specific barriers Northwest coastal tribes face in pursuing climate adaptation — including gaps in funding, capacity, jurisdiction, data sovereignty, and recognition of traditional ecological knowledge.',
		sourceName: null,
		author: null,
		publishDate: '2024-08-01',
		resourceType: 'Report / White Paper',
		mediaType: 'PDF',
		category: 'Emergency Services & Climate Adaptation',
		tags: [
			'climate adaptation',
			'Pacific Northwest',
			'coastal tribes',
			'listening sessions',
			'barriers',
			'data sovereignty',
			'TEK'
		],
		localFile:
			'Emergency Services & Climate Adaption/Adaptation-Barriers-NW-Coastal-Tribes_2024.pdf',
		externalUrl: null
	},

	{
		title: 'IPCC AR5 Synthesis Report: Climate Change 2014',
		description:
			"The IPCC's Fifth Assessment Synthesis Report — the authoritative international scientific assessment of climate change, its observed and projected impacts, and options for adaptation and mitigation. Essential scientific foundation for tribal climate planning and advocacy.",
		sourceName: 'Intergovernmental Panel on Climate Change (IPCC)',
		author: null,
		publishDate: '2014-11-01',
		resourceType: 'Report / White Paper',
		mediaType: 'PDF',
		category: 'Emergency Services & Climate Adaptation',
		tags: ['IPCC', 'climate change', 'global warming', 'synthesis report', 'science', 'AR5'],
		localFile:
			'Emergency Services & Climate Adaption/Intergovernmental Panel on climate change.pdf',
		externalUrl: 'https://www.ipcc.ch/report/ar5/syr/'
	},

	{
		title: 'How Indigenous Practice of Good Fire Can Help Our Forests Thrive',
		description:
			'University of California feature article exploring how Indigenous-led prescribed burning and cultural fire management can restore forest health, reduce catastrophic wildfire risk, and support tribal sovereignty over traditional landscapes in California.',
		sourceName: 'University of California',
		author: null,
		publishDate: null,
		resourceType: 'Article',
		mediaType: 'Web',
		category: 'Emergency Services & Climate Adaptation',
		tags: [
			'good fire',
			'prescribed burning',
			'traditional ecological knowledge',
			'forests',
			'California',
			'University of California'
		],
		localFile: null,
		externalUrl:
			'https://www.universityofcalifornia.edu/news/how-indigenous-practice-good-fire-can-help-our-forests-thrive'
	},

	{
		title: 'Indigenous Emergency Management (ArcGIS StoryMap)',
		description:
			'Interactive StoryMap documenting Indigenous approaches to emergency preparedness, disaster response, and community resilience, including integration of traditional ecological knowledge into emergency management frameworks.',
		sourceName: null,
		author: null,
		publishDate: null,
		resourceType: 'Toolkit',
		mediaType: 'Web',
		category: 'Emergency Services & Climate Adaptation',
		tags: [
			'emergency management',
			'disaster response',
			'indigenous resilience',
			'StoryMap',
			'preparedness',
			'ArcGIS'
		],
		localFile: null,
		externalUrl: 'https://storymaps.arcgis.com/stories/68cf92ba8c724eea95acd5a195c49d32'
	},

	{
		title: 'Indian Hands / Indian Lands: Indigenous Solidarity and Climate Change (PBS)',
		description:
			'PBS documentary short exploring how Indigenous communities are at the frontlines of climate change, and how indigenous solidarity and land rights are central to effective climate justice movements.',
		sourceName: 'PBS',
		author: null,
		publishDate: null,
		resourceType: 'Video',
		mediaType: 'Video',
		category: 'Emergency Services & Climate Adaptation',
		tags: ['climate change', 'solidarity', 'PBS', 'documentary', 'land rights', 'climate justice'],
		localFile: null,
		externalUrl: 'https://www.pbs.org/video/indigenous-solidarity-and-climate-change-8fsn8u'
	},

	// ── RECONCILIATION & EQUITY ───────────────────────────────────────────────

	{
		title:
			"Free, Prior and Informed Consent: An Indigenous Peoples' Right and a Good Practice for Local Communities (FAO)",
		description:
			"The FAO's foundational guide to Free, Prior and Informed Consent (FPIC) as a right of indigenous peoples enshrined in international law. Covers the legal basis in UNDRIP and ILO 169, the core elements of genuine consent, and practical implementation guidance.",
		sourceName: 'Food and Agriculture Organization of the United Nations (FAO)',
		author: null,
		publishDate: null,
		resourceType: 'Policy Document',
		mediaType: 'PDF',
		category: 'Reconciliation & Equity',
		tags: ['FPIC', 'indigenous rights', 'UN', 'consent', 'UNDRIP', 'international law', 'FAO'],
		localFile:
			'Reconciliation & Equity/Free, Prior and Informed Consent _ Indigenous Peoples _ Food and Agriculture Organization of the United Nations.pdf',
		externalUrl: 'https://www.fao.org/indigenous-peoples/our-pillars/fpic/en/'
	},

	{
		title:
			'Operational Guidance: Free, Prior and Informed Consent (Accountability Framework Initiative)',
		description:
			'Step-by-step operational guide for implementing FPIC with indigenous peoples and local communities in supply chains, land use, and development projects. Covers process design, documentation, dispute resolution, and grievance mechanisms.',
		sourceName: 'Accountability Framework Initiative',
		author: null,
		publishDate: '2020-01-01',
		resourceType: 'Guide',
		mediaType: 'PDF',
		category: 'Reconciliation & Equity',
		tags: [
			'FPIC',
			'operational guidance',
			'supply chains',
			'indigenous rights',
			'land use',
			'compliance'
		],
		localFile: 'Reconciliation & Equity/Operational Guide FPIC.pdf',
		externalUrl:
			'https://accountability-framework.org/fileadmin/uploads/afi/Documents/Operational_Guidance/OG_FPIC-2020-5.pdf'
	},

	{
		title:
			'Tribal Nations Engagement Handbook — California Department of Housing and Community Development (2024)',
		description:
			'Official California state handbook guiding HCD staff and program partners in respectful, legally grounded engagement with California tribal nations. Covers tribal sovereignty, the consultation process, cultural sensitivity, and the legal framework for state-tribal relations in housing and land use.',
		sourceName: 'California Department of Housing and Community Development (HCD)',
		author: null,
		publishDate: '2024-03-01',
		resourceType: 'Guide',
		mediaType: 'PDF',
		category: 'Reconciliation & Equity',
		tags: [
			'California',
			'tribal consultation',
			'engagement',
			'tribal sovereignty',
			'state-tribal relations',
			'HCD',
			'housing'
		],
		localFile:
			'Reconciliation & Equity/Native Atlas, Engagement-california-tribal-nations-handbook.pdf',
		externalUrl: null
	},

	{
		title: 'Gold, Greed and Genocide Study Guide',
		description:
			'Educational study guide covering the systematic genocide of California Indian peoples during the Gold Rush era. Includes discussion questions, primary sources, and structured teaching materials for educators and community groups.',
		sourceName: 'International Indian Treaty Council (IITC)',
		author: null,
		publishDate: null,
		resourceType: 'Guide',
		mediaType: 'PDF',
		category: 'Reconciliation & Equity',
		tags: [
			'California history',
			'genocide',
			'gold rush',
			'education',
			'Indian history',
			'IITC',
			'curriculum'
		],
		localFile: 'Reconciliation & Equity/IITC-Study-Guide-Gold-Greed-and-Genocide.pdf',
		externalUrl:
			'https://www.iitc.org/wp-content/uploads/IITC-Study-Guide-Gold-Greed-and-Genocide.pdf'
	},

	{
		title: 'Gold, Greed and Genocide: Timeline, Videos, and Educational Resources (IITC)',
		description:
			'Full multimedia educational resource from IITC documenting the genocide of California Indian peoples during and after the Gold Rush. Includes interactive timeline, documentary clips, study guides, and resources for educators and activists.',
		sourceName: 'International Indian Treaty Council (IITC)',
		author: null,
		publishDate: null,
		resourceType: 'Toolkit',
		mediaType: 'Web',
		category: 'Reconciliation & Equity',
		tags: [
			'California history',
			'genocide',
			'gold rush',
			'education',
			'multimedia',
			'Indian history',
			'IITC'
		],
		localFile: null,
		externalUrl: 'https://www.iitc.org/gold-greed-genocide/'
	},

	{
		title: 'Questions About Home: Indigenous Resistance Reflection Worksheet',
		description:
			'Reflective worksheet developed with Corrina Gould (Chochenyo Ohlone/Lisjan), Johnella LaRose (Shoshone-Bannock), and Nick Tilsen to prompt thinking about land, belonging, settler responsibility, and indigenous resistance. Inspired by Robina Thomas (Lyackson Coast Salish).',
		sourceName: "Sogorea Te' Land Trust / Indigenous Educators",
		author: 'Developed with Corrina Gould, Johnella LaRose, Nick Tilsen',
		publishDate: null,
		resourceType: 'Guide',
		mediaType: 'PDF',
		category: 'Reconciliation & Equity',
		tags: [
			'settler responsibility',
			'land back',
			'reflection',
			'Ohlone',
			'decolonization',
			'education',
			'worksheet'
		],
		localFile: 'Reconciliation & Equity/Indigenous-Resistance-Homework.pdf',
		externalUrl: null
	},

	{
		title:
			'An Act for the Government and Protection of Indians — California Legislature, April 22, 1850',
		description:
			"Primary source: California's 1850 Act that effectively enabled the forced indenture, removal, and trafficking of California Indian peoples. A foundational document for understanding the legal architecture of California Indian genocide and the settler colonial state.",
		sourceName: 'California State Legislature',
		author: null,
		publishDate: '1850-04-22',
		resourceType: 'Policy Document',
		mediaType: 'PDF',
		category: 'Reconciliation & Equity',
		tags: [
			'California',
			'historical law',
			'Indian law',
			'colonialism',
			'1850',
			'indenture',
			'primary source',
			'genocide'
		],
		localFile: 'Reconciliation & Equity/CA Law Protection of Indians 4.22.1850.pdf',
		externalUrl: null
	},

	{
		title: 'Early California Laws and Policies Related to California Indians',
		description:
			'Analysis of the early state and federal laws that shaped California Indian policy from 1846–1870, including acts enabling forced labor, prohibiting Indian testimony in court, and facilitating systematic land dispossession.',
		sourceName: 'National Immigrant Justice Center',
		author: null,
		publishDate: null,
		resourceType: 'Policy Document',
		mediaType: 'PDF',
		category: 'Reconciliation & Equity',
		tags: [
			'California',
			'historical law',
			'Indian policy',
			'colonialism',
			'land dispossession',
			'legal history'
		],
		localFile: 'Reconciliation & Equity/Early CA Laws and Policies.pdf',
		externalUrl:
			'https://www.nijc.org/pdfs/Subject%20Matter%20Articles/Historical/Early%20CA%20Laws%20and%20Policies.pdf'
	},

	{
		title: 'California Indian Treaty F (Unratified, 1851)',
		description:
			'Primary source document: one of 18 treaties negotiated between the U.S. government and California Indian tribes in 1851–1852 that were suppressed by the Senate and kept secret for 50 years, denying tribes recognition, land, and treaty protections. Courtesy of California State Library.',
		sourceName: 'California State Library',
		author: null,
		publishDate: '1851-01-01',
		resourceType: 'Policy Document',
		mediaType: 'PDF',
		category: 'Reconciliation & Equity',
		tags: [
			'treaty',
			'historical',
			'California',
			'Indian law',
			'unratified',
			'primary source',
			'1851',
			'suppressed treaties'
		],
		localFile: 'Reconciliation & Equity/treaty_f.pdf',
		externalUrl: null
	},

	{
		title: 'Fortress Conservation and the Makings of Yosemite National Park',
		description:
			'Essay examining how Yosemite National Park was created through the forced removal of Ahwahneechee and other indigenous peoples, and how the "fortress conservation" model perpetuates dispossession of indigenous land stewards globally under the guise of environmentalism.',
		sourceName: 'School of Marine and Environmental Affairs, University of Washington',
		author: null,
		publishDate: null,
		resourceType: 'Article',
		mediaType: 'Web',
		category: 'Reconciliation & Equity',
		tags: [
			'Yosemite',
			'conservation history',
			'dispossession',
			'national parks',
			'fortress conservation',
			'Ahwahneechee',
			'environmentalism'
		],
		localFile: null,
		externalUrl:
			'https://smea.uw.edu/currents/fortress-conservation-the-makings-of-yosemite-national-park/'
	},

	{
		title: "Buried Secrets: America's Indian Boarding Schools, Part 1",
		description:
			'Investigative podcast documentary from Reveal examining the history and continuing harms of American Indian boarding schools, including survivor testimonies, unmarked graves, and the federal policy of forced cultural assimilation.',
		sourceName: 'Reveal / The Center for Investigative Reporting',
		author: null,
		publishDate: null,
		resourceType: 'Podcast',
		mediaType: 'Podcast',
		category: 'Reconciliation & Equity',
		tags: [
			'boarding schools',
			'historical trauma',
			'podcast',
			'investigative journalism',
			'assimilation',
			'Reveal'
		],
		localFile: null,
		externalUrl: 'https://revealnews.org/podcast/indian-boarding-schools-part-one/'
	},

	{
		title: "Buried Secrets: America's Indian Boarding Schools, Part 2",
		description:
			"Continuation of Reveal's investigative documentary on Indian boarding schools, exploring intergenerational trauma, the movement for federal accountability, and Indigenous-led efforts toward truth-telling and healing.",
		sourceName: 'Reveal / The Center for Investigative Reporting',
		author: null,
		publishDate: null,
		resourceType: 'Podcast',
		mediaType: 'Podcast',
		category: 'Reconciliation & Equity',
		tags: [
			'boarding schools',
			'historical trauma',
			'podcast',
			'investigative journalism',
			'healing',
			'Reveal'
		],
		localFile: null,
		externalUrl: 'https://revealnews.org/podcast/indian-boarding-schools-part-two/'
	},

	{
		title: 'Colonialism and Decolonization: What It Is',
		description:
			'Accessible explainer from Bioneers on colonialism and decolonization as they apply to Indigenous peoples, land, culture, and governance. Essential grounding for non-indigenous practitioners, allies, and organizations beginning decolonization work.',
		sourceName: 'Bioneers',
		author: null,
		publishDate: null,
		resourceType: 'Article',
		mediaType: 'Web',
		category: 'Reconciliation & Equity',
		tags: [
			'decolonization',
			'colonialism',
			'education',
			'ally education',
			'Bioneers',
			'terminology'
		],
		localFile: null,
		externalUrl: 'https://bioneers.org/what-is-decolonization-zmaz2109/'
	},

	// ── CULTURAL REGENERATION ─────────────────────────────────────────────────

	{
		title:
			"Declaration on the Cultural and Biological Rights of Nisena'n Homelands (Bear River Declaration, 2022)",
		description:
			"Historic declaration issued April 19, 2022 asserting the cultural and biological rights of the Nisena'n People over K'umim Sew' (Bear River) in Nevada County, California. Includes bilingual Nisena'n/English text and territorial map.",
		sourceName: "Nisena'n Nation",
		author: null,
		publishDate: '2022-04-19',
		resourceType: 'Policy Document',
		mediaType: 'PDF',
		category: 'Cultural Regeneration',
		tags: [
			"Nisena'n",
			'Bear River',
			'declaration',
			'sovereignty',
			'biological rights',
			'California',
			'Nevada County',
			'Nevada Irrigation District'
		],
		localFile: 'Cultural Regeneration/Bear River Declaration with Map LTR.pdf',
		externalUrl: null
	},

	{
		title: 'NAGPRA 2024: Revamped Rule Strengthens Process for Museums and Universities',
		description:
			'Legal bulletin analyzing the 2024 revisions to NAGPRA regulations, which significantly strengthen tribal authority over the repatriation of ancestral remains, sacred objects, and items of cultural patrimony held by federally funded museums and universities.',
		sourceName: 'Lathrop GPM LLP',
		author: 'Russell C. Menyhart, Leanna Longley',
		publishDate: '2024-02-09',
		resourceType: 'Article',
		mediaType: 'PDF',
		category: 'Cultural Regeneration',
		tags: [
			'NAGPRA',
			'repatriation',
			'museums',
			'cultural heritage',
			'sacred objects',
			'2024',
			'legal',
			'universities'
		],
		localFile:
			'Cultural Regeneration/nagpra-2024-revamped-rule-strengthens-process-for-museums.pdf',
		externalUrl: null
	},

	{
		title: 'Cultivating Resilience: Bio-Region Framework',
		description:
			'Framework document from an Indigenous Consensus Process examining the determinants of planetary health from Indigenous perspectives. Proposes a bio-regional approach to ecological and cultural resilience grounded in indigenous sovereignty and intergenerational responsibility.',
		sourceName: null,
		author: null,
		publishDate: '2024-03-01',
		resourceType: 'Guide',
		mediaType: 'PDF',
		category: 'Cultural Regeneration',
		tags: [
			'bio-region',
			'resilience',
			'planetary health',
			'indigenous consensus',
			'sovereignty',
			'ecological framework'
		],
		localFile: 'Cultural Regeneration/PDF Cultivating Resilience_ Bio Region Framework Text.pdf',
		externalUrl: null
	},

	{
		title: 'Cultural Survival: Capacity Building for Indigenous Communities',
		description:
			'Programs and tools from Cultural Survival offering capacity-building resources for Indigenous communities, including advocacy training, community radio development, digital media support, and Indigenous rights education materials.',
		sourceName: 'Cultural Survival',
		author: null,
		publishDate: null,
		resourceType: 'Toolkit',
		mediaType: 'Web',
		category: 'Cultural Regeneration',
		tags: [
			'capacity building',
			'indigenous advocacy',
			'community radio',
			'media',
			'rights education',
			'Cultural Survival'
		],
		localFile: null,
		externalUrl: 'https://www.culturalsurvival.org/capacity-building'
	},

	{
		title: 'Tending Nature (PBS / KCET Series)',
		description:
			'Multi-episode documentary series exploring how Indigenous peoples of California have been tending and shaping local landscapes for millennia through traditional ecological knowledge, controlled burning, and reciprocal land stewardship. Recommended by Nisenan leader Brian Wallace.',
		sourceName: 'KCET / PBS SoCal',
		author: null,
		publishDate: null,
		resourceType: 'Video',
		mediaType: 'Video',
		category: 'Cultural Regeneration',
		tags: [
			'traditional ecological knowledge',
			'PBS',
			'documentary series',
			'California',
			'land stewardship',
			'KCET',
			'TEK'
		],
		localFile: null,
		externalUrl: 'https://www.kcet.org/shows/tending-nature'
	},

	{
		title: 'Indigenous Earth Community Podcast',
		description:
			'Podcast series centering indigenous voices on ecology, community resilience, and relationship with the earth. Features indigenous leaders, scientists, and activists discussing sovereignty, environmental justice, and land stewardship from inside indigenous communities.',
		sourceName: null,
		author: null,
		publishDate: null,
		resourceType: 'Podcast',
		mediaType: 'Podcast',
		category: 'Cultural Regeneration',
		tags: [
			'podcast',
			'indigenous community',
			'ecology',
			'environmental justice',
			'earth',
			'sovereignty'
		],
		localFile: null,
		externalUrl:
			'https://podcasts.apple.com/us/podcast/indigenous-earth-community-podcast/id1505816415'
	},

	// ── FOOD SOVEREIGNTY ──────────────────────────────────────────────────────

	{
		title: 'Indigenous Food Systems: Transformative Strategies to Perpetuate Nationhood',
		description:
			'Strategic framework examining how Indigenous food systems are inseparable from sovereignty and nationhood. Provides analysis and recommendations for communities, advocates, and policymakers on revitalizing indigenous food systems as an act of self-determination.',
		sourceName: null,
		author: null,
		publishDate: '2018-07-01',
		resourceType: 'Guide',
		mediaType: 'PDF',
		category: 'Food Sovereignty',
		tags: [
			'food sovereignty',
			'indigenous food systems',
			'nationhood',
			'sovereignty',
			'food security',
			'self-determination'
		],
		localFile:
			'Cultural Regeneration/Native Foods_Guidance/Indigenous Food Systems Transformative Strategies to Perpetuate Nationhood July 2018 print FINAL.pdf',
		externalUrl: null
	},

	{
		title: 'Native Grown + Gathered: Strengthening Indigenous Food Sovereignty',
		description:
			'Guide examining the landscape of native-grown and wild-gathered foods, and how Indigenous food sovereignty initiatives build community health, cultural continuity, and economic self-determination through traditional food systems.',
		sourceName: 'Native Foods Business (NFB)',
		author: null,
		publishDate: '2023-01-01',
		resourceType: 'Guide',
		mediaType: 'PDF',
		category: 'Food Sovereignty',
		tags: [
			'native foods',
			'food sovereignty',
			'wild harvest',
			'traditional foods',
			'indigenous agriculture',
			'NFB'
		],
		localFile: 'Cultural Regeneration/Native Foods_Guidance/Native+Grown+and+Gathered_NFB_+V3.pdf',
		externalUrl: null
	},

	// ── SOVEREIGNTY & LEGAL ───────────────────────────────────────────────────

	{
		title: 'Contract Waivers for Tribal Sovereign Immunity: What Every Attorney Needs to Know',
		description:
			'Legal analysis from The Advocate (Idaho State Bar) examining how federal courts treat tribal sovereign immunity waivers in contract disputes. Covers scope of immunity, express and implied waivers, and practical guidance for contracting with tribal nations.',
		sourceName: 'The Advocate — Idaho State Bar',
		author: 'Rob Roy Smith',
		publishDate: '2018-03-01',
		resourceType: 'Guide',
		mediaType: 'PDF',
		category: 'Sovereignty & Legal',
		tags: [
			'sovereign immunity',
			'tribal sovereignty',
			'contracts',
			'legal',
			'waiver',
			'Indian law',
			'attorney'
		],
		localFile:
			'Sovereignty Immunity Waivers/Contract Waivers for Tribal Sovereign Immunity  What Every Idaho Attorney Needs to Know Advocate Smith MarchApril 2018 (1).pdf',
		externalUrl: null
	},

	{
		title: 'United Nations Declaration on the Rights of Indigenous Peoples (UNDRIP)',
		description:
			'The foundational international human rights instrument for Indigenous peoples, adopted by the UN General Assembly in 2007. Establishes individual and collective rights to culture, identity, language, health, education, and self-determination. Endorsed by the United States in 2010. The legal and moral baseline for all indigenous rights advocacy and policy work.',
		sourceName: 'United Nations',
		author: null,
		publishDate: '2007-09-13',
		resourceType: 'Policy Document',
		mediaType: 'PDF',
		category: 'Sovereignty & Legal',
		tags: [
			'UNDRIP',
			'UN',
			'international law',
			'self-determination',
			'indigenous rights',
			'human rights',
			'FPIC',
			'foundational'
		],
		localFile: null,
		externalUrl:
			'https://www.un.org/development/desa/indigenouspeoples/wp-content/uploads/sites/19/2018/11/UNDRIP_E_web.pdf'
	},

	{
		title: 'Tribal Nations and the United States: An Introduction (NCAI)',
		description:
			'Comprehensive introductory primer from the National Congress of American Indians on the history, legal status, and governance of tribal nations in the United States. Covers the federal trust responsibility, treaty rights, tribal sovereignty, and the government-to-government relationship. Essential orientation for anyone beginning work with tribal communities.',
		sourceName: 'National Congress of American Indians (NCAI)',
		author: null,
		publishDate: '2020-01-01',
		resourceType: 'Guide',
		mediaType: 'PDF',
		category: 'Sovereignty & Legal',
		tags: [
			'tribal sovereignty',
			'NCAI',
			'federal trust responsibility',
			'treaties',
			'government-to-government',
			'Indian law',
			'primer'
		],
		localFile: null,
		externalUrl:
			'https://www.ncai.org/tribalnations/introduction/Tribal_Nations_and_the_United_States_An_Introduction.pdf'
	},

	{
		title: 'Indian Self-Determination and Education Assistance Act (P.L. 93-638)',
		description:
			'The landmark 1975 federal law that transformed the federal-tribal relationship by authorizing tribal nations to contract with the federal government to administer programs previously run by the BIA and IHS. P.L. 638 is the legal foundation for tribal self-governance, self-determination contracting, and compacting across virtually every federal Indian program.',
		sourceName: 'U.S. Bureau of Indian Affairs',
		author: null,
		publishDate: '1975-01-04',
		resourceType: 'Policy Document',
		mediaType: 'Web',
		category: 'Sovereignty & Legal',
		tags: [
			'P.L. 638',
			'self-determination',
			'self-governance',
			'BIA',
			'IHS',
			'compacting',
			'contracting',
			'federal Indian law'
		],
		localFile: null,
		externalUrl: 'https://www.bia.gov/sites/default/files/dup/assets/bia/ois/pdf/idc1-024284.pdf'
	},

	{
		title: 'McGirt v. Oklahoma, 591 U.S. ___ (2020) — Supreme Court Opinion',
		description:
			"Landmark 2020 Supreme Court ruling holding that the eastern half of Oklahoma remains Indian Country under the Major Crimes Act because Congress never explicitly disestablished the Muscogee (Creek) Nation's reservation. McGirt is one of the most significant federal Indian law decisions in decades, with broad implications for tribal jurisdiction, criminal law, and reservation boundaries nationally.",
		sourceName: 'U.S. Supreme Court',
		author: 'Justice Neil Gorsuch (majority opinion)',
		publishDate: '2020-07-09',
		resourceType: 'Policy Document',
		mediaType: 'PDF',
		category: 'Sovereignty & Legal',
		tags: [
			'McGirt',
			'SCOTUS',
			'Indian Country',
			'reservation',
			'Muscogee Creek',
			'Oklahoma',
			'jurisdiction',
			'federal Indian law'
		],
		localFile: null,
		externalUrl: 'https://www.supremecourt.gov/opinions/19pdf/18-9526_9okb.pdf'
	},

	// ── TRIBAL GOVERNANCE ─────────────────────────────────────────────────────

	{
		title: 'Tribal Business Structure Handbook (2008 Edition)',
		description:
			'Foundational handbook covering organizational and legal structures available to tribal nations for economic development — including wholly-owned tribal enterprises, Section 17 federal corporations, LLCs, and joint ventures — with analysis of sovereignty protections and liability.',
		sourceName: 'Office of the Assistant Secretary — Indian Affairs / Tulalip Tribes',
		author: 'Karen J. Atkinson, Kathleen M. Nilles',
		publishDate: '2008-01-01',
		resourceType: 'Guide',
		mediaType: 'PDF',
		category: 'Tribal Governance',
		tags: [
			'tribal business',
			'economic development',
			'tribal enterprises',
			'Section 17',
			'LLC',
			'sovereignty',
			'Tulalip',
			'Indian Affairs'
		],
		localFile: 'Tribal Management/tribal_business_structure_handbook.pdf',
		externalUrl: null
	},

	{
		title:
			'Rebuilding Native Nations: Strategies for Governance and Development (Native Nations Institute)',
		description:
			"The Native Nations Institute at University of Arizona's hub for research on effective tribal governance, nation-building, and self-determination. Synthesizes decades of research into what distinguishes successful tribal governance: sovereignty, capable governing institutions, a cultural match, and a strategic orientation. Essential for tribal leaders, staff, and partners.",
		sourceName: 'Native Nations Institute, University of Arizona',
		author: null,
		publishDate: null,
		resourceType: 'Toolkit',
		mediaType: 'Web',
		category: 'Tribal Governance',
		tags: [
			'tribal governance',
			'nation building',
			'self-determination',
			'NNI',
			'capacity',
			'institutional development',
			'university'
		],
		localFile: null,
		externalUrl:
			'https://nni.arizona.edu/programs-projects/policy-analysis-research/rebuilding-native-nations'
	},

	{
		title:
			'Self-Governance Compacting: A Guide for Tribes (Self-Governance Communication and Education Tribal Consortium)',
		description:
			'Practical guide to the Title IV self-governance compacting process under P.L. 93-638, through which tribal nations assume direct control of federal programs previously administered by the BIA and IHS. Covers compact negotiation, annual funding agreements, program waivers, and reporting requirements.',
		sourceName: 'Self-Governance Communication and Education (SGCE) Tribal Consortium',
		author: null,
		publishDate: null,
		resourceType: 'Guide',
		mediaType: 'Web',
		category: 'Tribal Governance',
		tags: [
			'self-governance',
			'compacting',
			'P.L. 638',
			'BIA',
			'IHS',
			'Title IV',
			'compact',
			'annual funding agreement'
		],
		localFile: null,
		externalUrl: 'https://tribalselfgov.org/tribal-self-governance/getting-started/'
	},

	{
		title: 'Tribal Consultation Policy Guide — Executive Order 13175 and Beyond',
		description:
			"Policy guide covering the federal government's consultation obligations under Executive Order 13175 (Consultation and Coordination with Indian Tribal Governments), the Presidential Memorandum of 2021, and agency-specific policies. Explains when consultation is required, what it must include, and how tribes can hold agencies accountable.",
		sourceName: 'National Congress of American Indians (NCAI)',
		author: null,
		publishDate: null,
		resourceType: 'Policy Document',
		mediaType: 'Web',
		category: 'Tribal Governance',
		tags: [
			'consultation',
			'EO 13175',
			'federal agencies',
			'government-to-government',
			'NCAI',
			'tribal rights',
			'policy'
		],
		localFile: null,
		externalUrl: 'https://www.ncai.org/policy-issues/tribal-governance/consultation'
	},

	// ── INDIGENOUS WOMEN & GENDER JUSTICE ────────────────────────────────────

	{
		title: "Without a Whisper: Native Women and First Women's Rights (PBS)",
		description:
			"PBS documentary film restoring the largely erased history of how Haudenosaunee women's political power, governance structures, and sovereignty influenced early American feminists and the 19th-century suffrage movement.",
		sourceName: 'PBS',
		author: null,
		publishDate: null,
		resourceType: 'Video',
		mediaType: 'Video',
		category: 'Indigenous Women & Gender Justice',
		tags: [
			'indigenous women',
			"women's rights",
			'Haudenosaunee',
			'suffrage',
			'PBS',
			'documentary',
			'governance',
			'Iroquois'
		],
		localFile: null,
		externalUrl: 'https://www.pbs.org/video/without-a-whisper-wnpj8u'
	},

	{
		title: 'Accomplices Not Allies: Abolishing the Ally Industrial Complex',
		description:
			'Foundational Indigenous Action Media essay challenging the "ally" framework and calling for a shift from performative allyship to active complicity in dismantling systems of oppression. Widely cited in indigenous, racial justice, and environmental advocacy communities as essential reading for non-indigenous partners and organizations.',
		sourceName: 'Indigenous Action Media',
		author: null,
		publishDate: '2014-05-04',
		resourceType: 'Article',
		mediaType: 'Web',
		category: 'Indigenous Women & Gender Justice',
		tags: [
			'allyship',
			'accomplices',
			'decolonization',
			'solidarity',
			'advocacy',
			'Indigenous Action Media',
			'settler responsibility'
		],
		localFile: null,
		externalUrl:
			'https://www.indigenousaction.org/accomplices-not-allies-abolishing-the-ally-industrial-complex/'
	},

	{
		title: 'CARE Principles for Indigenous Data Governance',
		description:
			'The CARE Principles (Collective Benefit, Authority to Control, Responsibility, Ethics) provide a framework for Indigenous data governance that centers Indigenous rights and interests in how data about Indigenous peoples is collected, held, and used. A counterpart to FAIR data principles, grounded in indigenous sovereignty over information about communities, lands, and cultures.',
		sourceName: 'Global Indigenous Data Alliance (GIDA)',
		author: 'Stephanie Russo Carroll, Desi Rodriguez-Lonebear, Andrew Martinez',
		publishDate: '2020-10-01',
		resourceType: 'Guide',
		mediaType: 'PDF',
		category: 'Indigenous Women & Gender Justice',
		tags: [
			'data sovereignty',
			'indigenous data',
			'CARE principles',
			'GIDA',
			'data governance',
			'ethics',
			'research'
		],
		localFile: null,
		externalUrl:
			'https://static1.squarespace.com/static/5d3799de845604000199cd24/t/5da9f4479ecab221ce848fb2/1571419719915/CARE+Principles_One+Pagers+FINAL_Oct+29+2019.pdf'
	},

	{
		title: 'Missing and Murdered Indigenous Women & Girls: MMIW Resources (NIWRC)',
		description:
			"Resource hub from the National Indigenous Women's Resource Center on the epidemic of Missing and Murdered Indigenous Women and Girls (MMIWG). Includes policy briefs, legislative analysis, community safety resources, and advocacy tools for tribal communities, advocates, and policymakers working to address MMIWG.",
		sourceName: "National Indigenous Women's Resource Center (NIWRC)",
		author: null,
		publishDate: null,
		resourceType: 'Toolkit',
		mediaType: 'Web',
		category: 'Indigenous Women & Gender Justice',
		tags: [
			'MMIW',
			'MMIWG',
			'indigenous women',
			'violence',
			'public safety',
			'NIWRC',
			'advocacy',
			'tribal law'
		],
		localFile: null,
		externalUrl: 'https://www.niwrc.org/mmiwr'
	},

	{
		title: 'Land Back: Corrina Gould at the Clayman Institute for Gender Research (Stanford, 2022)',
		description:
			"Keynote talk by Corrina Gould (Chochenyo Ohlone/Lisjan), co-founder of Sogorea Te' Land Trust, at Stanford's Clayman Institute for Gender Research. Gould connects indigenous women's leadership, land return, and the intersections of gender justice and Land Back organizing in the Bay Area and beyond.",
		sourceName: 'Clayman Institute for Gender Research, Stanford University',
		author: 'Corrina Gould',
		publishDate: '2022-01-01',
		resourceType: 'Video',
		mediaType: 'Video',
		category: 'Indigenous Women & Gender Justice',
		tags: [
			'Corrina Gould',
			'land back',
			'Ohlone',
			'Bay Area',
			'gender justice',
			"women's leadership",
			'Stanford',
			'Sogorea Te'
		],
		localFile: null,
		externalUrl: 'https://gender.stanford.edu/news-publications/gender-news/land-back'
	}
];

// =============================================================================
// SEED FUNCTION
// =============================================================================

async function run() {
	const resourcesDir = resolveResourcesDir();
	console.log(`\nResources directory: ${resourcesDir}`);
	if (!existsSync(resourcesDir)) {
		console.error(`Resources directory not found: ${resourcesDir}`);
		console.error('Set KB_RESOURCES_PATH in .env or ensure resources/ is a sibling of site/');
		process.exit(1);
	}

	await ensureBucket();
	console.log(`MinIO bucket ready: ${MINIO_BUCKET}\n`);

	const seen = new Set();
	const results = { inserted: 0, skipped: 0, uploadFailed: 0 };

	for (const item of resources) {
		const slug = uniqueSlug(slugify(item.title), seen);

		// ── Upload local file to MinIO ─────────────────────────────────────
		let fileUrl = null;
		let contentMode = item.localFile ? 'file' : 'link';

		if (item.localFile) {
			const absolutePath = resolve(resourcesDir, item.localFile);
			if (!existsSync(absolutePath)) {
				console.warn(`  ⚠ File not found, falling back to link: ${item.localFile}`);
				contentMode = item.externalUrl ? 'link' : 'file'; // keep 'file' so admin knows to fix it
			} else {
				try {
					const upload = await uploadToMinio(absolutePath);
					fileUrl = upload.fileUrl;
					const action = upload.skipped ? 'already in MinIO' : 'uploaded';
					console.log(`  ↑ ${action.padEnd(18)} ${item.localFile.split('/').pop()}`);
				} catch (err) {
					console.error(`  ✗ Upload failed: ${item.localFile}\n    ${err.message}`);
					results.uploadFailed++;
					contentMode = item.externalUrl ? 'link' : 'file';
				}
			}
		}

		// ── Insert into toolbox_resources ─────────────────────────────────
		try {
			const [row] = await sql`
				INSERT INTO toolbox_resources (
					id, slug, title, description,
					source_name, author, publish_date,
					resource_type, media_type, category, tags,
					content_mode, external_url, file_url,
					status, source, published_at
				) VALUES (
					${randomUUID()}, ${slug}, ${item.title}, ${item.description ?? null},
					${item.sourceName ?? null}, ${item.author ?? null},
					${item.publishDate ? new Date(item.publishDate) : null},
					${item.resourceType}, ${item.mediaType ?? null},
					${item.category}, ${item.tags ?? []},
					${contentMode}, ${item.externalUrl ?? null}, ${fileUrl},
					'published', 'seed', NOW()
				)
				ON CONFLICT (slug) DO NOTHING
				RETURNING id
			`;

			if (row) {
				results.inserted++;
				const mode = fileUrl ? '📄 file' : '🔗 link';
				console.log(
					`  ✓ ${mode}  [${item.category.slice(0, 28).padEnd(28)}]  ${item.title.slice(0, 55)}`
				);
			} else {
				results.skipped++;
				console.log(`  - already exists: ${slug}`);
			}
		} catch (err) {
			results.skipped++;
			console.error(`  ✗ DB insert failed: "${item.title}"\n    ${err.message}`);
		}
	}

	console.log(`
─────────────────────────────────────────────────
  Inserted:       ${results.inserted}
  Already exists: ${results.skipped}
  Upload errors:  ${results.uploadFailed}
─────────────────────────────────────────────────
`);

	await sql.end();
}

run().catch((err) => {
	console.error(err);
	process.exit(1);
});
