#!/usr/bin/env node

import 'dotenv/config';
import postgres from 'postgres';
import {
	CreateBucketCommand,
	HeadBucketCommand,
	PutBucketPolicyCommand,
	PutObjectCommand,
	S3Client
} from '@aws-sdk/client-s3';

const {
	DATABASE_URL,
	MINIO_ENDPOINT,
	MINIO_ACCESS_KEY,
	MINIO_SECRET_KEY,
	MINIO_BUCKET,
	PUBLIC_ASSET_BASE_URL
} = process.env;

if (!DATABASE_URL) {
	console.error('DATABASE_URL is not set.');
	process.exit(1);
}

if (
	!MINIO_ENDPOINT ||
	!MINIO_ACCESS_KEY ||
	!MINIO_SECRET_KEY ||
	!MINIO_BUCKET ||
	!PUBLIC_ASSET_BASE_URL
) {
	console.error(
		'MinIO env vars not set. Need: MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET, PUBLIC_ASSET_BASE_URL'
	);
	process.exit(1);
}

const USER_AGENT =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36';

const db = postgres(DATABASE_URL);
const s3 = new S3Client({
	region: 'us-east-1',
	endpoint: MINIO_ENDPOINT,
	forcePathStyle: true,
	credentials: {
		accessKeyId: MINIO_ACCESS_KEY,
		secretAccessKey: MINIO_SECRET_KEY
	}
});

const logoMappings = [
	{
		objectKey: 'logos/jobs/hoopa-valley-tribe.png',
		remoteUrl: 'https://www.hoopa-nsn.gov/wp-content/uploads/2018/12/HoopaLogo-1.png',
		target: { table: 'jobs', column: 'employer_name', value: 'Hoopa Valley Tribe' }
	},
	{
		objectKey: 'logos/jobs/blue-lake-rancheria.png',
		remoteUrl: 'https://www.bluelakerancheria-nsn.gov/wp-content/uploads/2024/08/BLR_Tribal-Seal.png',
		target: { table: 'jobs', column: 'employer_name', value: 'Blue Lake Rancheria' }
	},
	{
		objectKey: 'logos/jobs/united-indian-health-services.png',
		remoteUrl: 'https://uihs.org/wp-content/uploads/2021/11/logo-01.png',
		target: { table: 'jobs', column: 'employer_name', value: 'United Indian Health Services' }
	},
	{
		objectKey: 'logos/jobs/southern-indian-health-council.png',
		remoteUrl: 'https://static.wixstatic.com/media/5cc939_0597c450312c49488c828bb90dfa3ee6~mv2.png',
		target: { table: 'jobs', column: 'employer_name', value: 'Southern Indian Health Council' }
	},
	{
		objectKey: 'logos/jobs/natives-in-tech.png',
		remoteUrl: 'https://avatars.githubusercontent.com/u/35468375?v=4',
		target: { table: 'jobs', column: 'employer_name', value: 'Natives in Tech' }
	},
	{
		objectKey: 'logos/jobs/news-from-native-california.png',
		remoteUrl: 'https://newsfromnativecalifornia.com/wp-content/uploads/2020/07/NNC_Logo_white_80.png',
		target: { table: 'jobs', column: 'employer_name', value: 'News From Native California' }
	},
	{
		objectKey: 'logos/jobs/karuk-tribe.png',
		remoteUrl: 'https://cdn.prod.website-files.com/6840684a84781283cd1b68e3/687012149e5340bcb616ab51_Karuk%20Seal.png',
		target: { table: 'jobs', column: 'employer_name', value: 'Karuk Tribe' }
	},
	{
		objectKey: 'logos/jobs/association-on-american-indian-affairs.png',
		remoteUrl:
			'https://www.indian-affairs.org/uploads/8/7/3/8/87380358/published/100-year-anniversary-website-header-logo.png?1656534935',
		target: {
			table: 'jobs',
			column: 'employer_name',
			value: 'Associaton on American Indian Affairs'
		}
	},
	{
		objectKey: 'logos/jobs/california-lci.svg',
		remoteUrl: 'https://lci.ca.gov/images/LCI_logo_rgb_horizontal_full.svg',
		target: {
			table: 'jobs',
			column: 'employer_name',
			value: "CA Governor's Office of Land Use & Climate Innovation"
		}
	},
	{
		objectKey: 'logos/funding/native-cultures-fund.png',
		remoteUrl: 'https://hafoundation.org/wp-content/uploads/2022/12/haf-wr_ncf-1024x225.png',
		target: {
			table: 'funding',
			column: 'funder_name',
			value: 'Native Cultures Fund / Humboldt Area Foundation'
		}
	},
	{
		objectKey: 'logos/funding/california-natural-resources-agency.png',
		remoteUrl: 'https://resources.ca.gov/assets/img/CNRA-Logo.png',
		target: {
			table: 'funding',
			column: 'funder_name',
			value: 'California Natural Resources Agency'
		}
	},
	{
		objectKey: 'logos/funding/california-department-of-fish-and-wildlife.png',
		remoteUrl: 'https://wildlife.ca.gov/Portals/0/agency-logo.png',
		target: {
			table: 'funding',
			column: 'funder_name',
			value: 'California Department of Fish and Wildlife'
		}
	},
	{
		objectKey: 'logos/funding/california-hcd.png',
		remoteUrl: 'https://www.hcd.ca.gov/sites/default/files/hcd-logo.png',
		target: {
			table: 'funding',
			column: 'funder_name',
			value: 'California Department of Housing and Community Development'
		}
	},
	{
		objectKey: 'logos/funding/california-ocean-protection-council.png',
		remoteUrl: 'https://opc.ca.gov/wp-content/uploads/2023/07/OPC-Letterhead-Logo-WEB-1.png',
		target: {
			table: 'funding',
			column: 'funder_name',
			value: 'California Ocean Protection Council'
		}
	}
];

function buildPublicBucketPolicy(bucket) {
	return JSON.stringify({
		Version: '2012-10-17',
		Statement: [
			{
				Sid: 'PublicReadGetObject',
				Effect: 'Allow',
				Principal: '*',
				Action: ['s3:GetObject'],
				Resource: [`arn:aws:s3:::${bucket}/*`]
			}
		]
	});
}

async function ensureBucket() {
	try {
		await s3.send(new HeadBucketCommand({ Bucket: MINIO_BUCKET }));
	} catch {
		await s3.send(new CreateBucketCommand({ Bucket: MINIO_BUCKET }));
		console.log(`Created bucket: ${MINIO_BUCKET}`);
	}

	await s3.send(
		new PutBucketPolicyCommand({
			Bucket: MINIO_BUCKET,
			Policy: buildPublicBucketPolicy(MINIO_BUCKET)
		})
	);
}

function normalizePublicAssetBaseUrl(value) {
	return String(value).trim().replace(/\/+$/, '');
}

function buildPublicUrl(objectKey) {
	return `${normalizePublicAssetBaseUrl(PUBLIC_ASSET_BASE_URL)}/${objectKey}`;
}

function inferContentType(url, headerValue) {
	const type = String(headerValue ?? '').toLowerCase();
	if (type.startsWith('image/')) return type;

	const lower = String(url).toLowerCase();
	if (lower.endsWith('.png')) return 'image/png';
	if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
	if (lower.endsWith('.webp')) return 'image/webp';
	if (lower.endsWith('.svg')) return 'image/svg+xml';
	return 'application/octet-stream';
}

async function uploadRemoteAsset(objectKey, remoteUrl) {
	const response = await fetch(remoteUrl, {
		redirect: 'follow',
		headers: { 'user-agent': USER_AGENT }
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch ${remoteUrl}: ${response.status} ${response.statusText}`);
	}

	const contentType = inferContentType(response.url || remoteUrl, response.headers.get('content-type'));
	const body = Buffer.from(await response.arrayBuffer());

	await s3.send(
		new PutObjectCommand({
			Bucket: MINIO_BUCKET,
			Key: objectKey,
			Body: body,
			ContentType: contentType,
			CacheControl: 'public, max-age=31536000, immutable'
		})
	);

	return buildPublicUrl(objectKey);
}

async function updateRows(mapping, imageUrl) {
	if (mapping.target.table === 'jobs') {
		const rows = await db`
			update jobs
			set image_url = ${imageUrl}
			where employer_name = ${mapping.target.value}
			returning id
		`;
		return rows.length;
	}

	if (mapping.target.table === 'funding') {
		const rows = await db`
			update funding
			set image_url = ${imageUrl}
			where funder_name = ${mapping.target.value}
			returning id
		`;
		return rows.length;
	}

	throw new Error(`Unsupported table: ${mapping.target.table}`);
}

async function verifyTargetCounts() {
	const jobs = await db`
		select employer_name as label, count(*)::int as count
		from jobs
		where employer_name in (
			'Blue Lake Rancheria',
			'Hoopa Valley Tribe',
			'Natives in Tech',
			'News From Native California',
			'Karuk Tribe',
			'Associaton on American Indian Affairs',
			'CA Governor''s Office of Land Use & Climate Innovation',
			'Southern Indian Health Council',
			'United Indian Health Services'
		)
		group by employer_name
		order by employer_name
	`;

	const funding = await db`
		select funder_name as label, count(*)::int as count
		from funding
		where funder_name in (
			'California Department of Fish and Wildlife',
			'California Department of Housing and Community Development',
			'California Natural Resources Agency',
			'California Ocean Protection Council',
			'Native Cultures Fund / Humboldt Area Foundation'
		)
		group by funder_name
		order by funder_name
	`;

	return { jobs, funding };
}

async function main() {
	await ensureBucket();
	const summary = [];

	for (const mapping of logoMappings) {
		const imageUrl = await uploadRemoteAsset(mapping.objectKey, mapping.remoteUrl);
		const updated = await updateRows(mapping, imageUrl);
		summary.push({
			table: mapping.target.table,
			label: mapping.target.value,
			imageUrl,
			updated
		});
		console.log(`Uploaded ${mapping.objectKey} and updated ${updated} ${mapping.target.table} row(s) for ${mapping.target.value}`);
	}

	const counts = await verifyTargetCounts();
	console.log('\nVerification counts:');
	console.log(JSON.stringify(counts, null, 2));

	console.log('\nApplied logo mappings:');
	console.log(JSON.stringify(summary, null, 2));
}

try {
	await main();
} catch (error) {
	console.error(error);
	process.exitCode = 1;
} finally {
	await db.end();
}
