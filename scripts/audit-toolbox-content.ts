import 'dotenv/config';

import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import * as cheerio from 'cheerio';
import { createHash } from 'node:crypto';
import { execFile as execFileCallback } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { promisify } from 'node:util';
import postgres from 'postgres';

import { resolveToolboxResourcesDir } from '../src/lib/server/toolbox-resource-library';

const execFile = promisify(execFileCallback);

type ContentMode = 'link' | 'hosted' | 'file';

type ResourceRow = {
	id: string;
	slug: string;
	title: string;
	content_mode: ContentMode;
	external_url: string | null;
	file_url: string | null;
	image_url: string | null;
};

type CliOptions = {
	apply: boolean;
	json: boolean;
	write?: string;
};

type Replacement = {
	externalUrl?: string | null;
	localFile?: string;
	remotePdfUrl?: string;
	insecurePdfSource?: boolean;
	dropExternal?: boolean;
};

type ProbeResult = {
	ok: boolean;
	status: number | null;
	finalUrl: string | null;
	contentType: string | null;
};

const NETWORK_TIMEOUT_MS = 12000;

type Change = {
	slug: string;
	title: string;
	before: {
		contentMode: ContentMode;
		externalUrl: string | null;
		fileUrl: string | null;
		imageUrl: string | null;
	};
	after: {
		contentMode: ContentMode;
		externalUrl: string | null;
		fileUrl: string | null;
		imageUrl: string | null;
	};
	audit: ProbeResult | null;
	notes: string[];
};

const REQUIRED_ENV_VARS = ['DATABASE_URL', 'MINIO_ENDPOINT', 'MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY', 'MINIO_BUCKET'];

const DIRECT_PDF_PATTERNS = [/\.pdf(?:$|[?#])/i, /\/printable\/pdf(?:$|[?#])/i];

const REPLACEMENTS: Record<string, Replacement> = {
	'free-prior-and-informed-consent-a-practical-guide': {
		externalUrl:
			'https://www.culturalsurvival.org/news/new-guide-supports-indigenous-leaders-develop-fpic-protocols-and-secure-self-determined'
	},
	'free-prior-and-informed-consent-an-indigenous-peoples-right-and-a-good-practice-for-local-communitie':
		{
			localFile:
				'Reconciliation & Equity/Free, Prior and Informed Consent _ Indigenous Peoples _ Food and Agriculture Organization of the United Nations.pdf',
			dropExternal: true
		},
	'indian-self-determination-and-education-assistance-act-pl-93-638': {
		externalUrl: 'https://www.govinfo.gov/content/pkg/COMPS-10401/pdf/COMPS-10401.pdf',
		remotePdfUrl: 'https://www.govinfo.gov/content/pkg/COMPS-10401/pdf/COMPS-10401.pdf'
	},
	'land-back-corrina-gould-at-the-clayman-institute-for-gender-research-stanford-2022': {
		externalUrl:
			'https://gender.stanford.edu/events/clayman-conversations-presents-why-indigenous-land-back-feminist-issue'
	},
	'native-business-development-resources': {
		externalUrl: 'https://acf.gov/ana/outreach-material/economic-development-resources'
	},
	'native-language-preservation-toolkit': {
		externalUrl: 'https://fpcc.ca/stories/fpcc-language-resources/'
	},
	'rebuilding-native-nations-strategies-for-governance-and-development-native-nations-institute':
		{
			externalUrl: 'https://nni.arizona.edu/our-work/digital-resources'
		},
	'self-governance-compacting-a-guide-for-tribes-self-governance-communication-and-education-tribal-con':
		{
			externalUrl: 'https://www.tribalselfgov.org/about/sgcetc/'
		},
	'traditional-ecological-knowledge-and-climate-adaptation': {
		externalUrl: 'https://research.fs.usda.gov/treesearch/58352',
		remotePdfUrl: 'https://research.fs.usda.gov/treesearch/download/58352.pdf'
	},
	'tribal-government-handbook-essential-resources-for-tribal-leaders': {
		externalUrl: 'https://www.bia.gov/service/tribal-leaders-directory'
	},
	'tribal-consultation-policy-guide-executive-order-13175-and-beyond': {
		externalUrl: 'https://www.bia.gov/manual/tribal-consultation-process'
	},
	'tribal-historic-preservation-program-manual': {
		externalUrl:
			'https://www.nps.gov/articles/upload/THPO-Application-Update_Including-Outline_Updated-09092019.pdf',
		remotePdfUrl:
			'https://www.nps.gov/articles/upload/THPO-Application-Update_Including-Outline_Updated-09092019.pdf'
	},
	'tribal-nations-and-the-united-states-an-introduction-ncai': {
		remotePdfUrl:
			'https://archive.ncai.org/tribalnations/introduction/Indian_Country_101_Updated_February_2019.pdf',
		insecurePdfSource: true,
		dropExternal: true
	},
	'good-practices-in-participatory-mapping-a-review-for-ifad': {
		dropExternal: true
	},
	'icca-toolkit-recognising-and-supporting-territories-and-areas-conserved-by-indigenous-peoples-and-lo':
		{
			dropExternal: true
		},
	'indigenous-fire-futures-anticolonial-approaches-to-shifting-fire-relations-in-california': {
		dropExternal: true
	},
	'usfs-pacific-southwest-region-tribal-partnership-matrix': {
		dropExternal: true
	}
};

async function main() {
	const options = parseArgs(process.argv.slice(2));
	assertEnv();

	const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
	const resourcesDir = resolveToolboxResourcesDir({
		configuredPath: process.env.KB_RESOURCES_PATH ?? null,
		cwd: process.cwd()
	});

	const storage = createStorageClient();
	const rows = await sql<ResourceRow[]>`
		select id, slug, title, content_mode, external_url, file_url, image_url
		from toolbox_resources
		where status = 'published'
		order by slug asc
	`;

	const changes: Change[] = [];
	for (const row of rows) {
		const change = await auditResource(row, resourcesDir, storage);
		if (change) changes.push(change);
	}

	if (options.apply) {
		for (const change of changes) {
			await sql`
				update toolbox_resources
				set
					content_mode = ${change.after.contentMode},
					external_url = ${change.after.externalUrl},
					file_url = ${change.after.fileUrl},
					image_url = ${change.after.imageUrl},
					updated_at = now()
				where slug = ${change.slug}
			`;
		}
	}

	await sql.end();

	const payload = {
		generatedAt: new Date().toISOString(),
		applied: options.apply,
		summary: {
			changed: changes.length,
			fileBacked: changes.filter((change) => change.after.contentMode === 'file').length,
			withPreviewImage: changes.filter((change) => Boolean(change.after.imageUrl)).length
		},
		changes
	};

	if (options.write) {
		const outputPath = resolve(options.write);
		await mkdir(dirname(outputPath), { recursive: true });
		await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
	}

	if (options.json) {
		process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
		return;
	}

	printSummary(payload);
}

function parseArgs(args: string[]): CliOptions {
	const options: CliOptions = {
		apply: false,
		json: false
	};

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];
		if (arg === '--apply') {
			options.apply = true;
			continue;
		}
		if (arg === '--json') {
			options.json = true;
			continue;
		}
		if (arg === '--write') {
			options.write = args[index + 1];
			index += 1;
		}
	}

	return options;
}

function assertEnv() {
	const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]?.trim());
	if (missing.length > 0) {
		throw new Error(`Missing required env vars: ${missing.join(', ')}`);
	}
}

function createStorageClient() {
	return new S3Client({
		region: 'us-east-1',
		endpoint: process.env.MINIO_ENDPOINT,
		forcePathStyle: true,
		credentials: {
			accessKeyId: process.env.MINIO_ACCESS_KEY ?? '',
			secretAccessKey: process.env.MINIO_SECRET_KEY ?? ''
		}
	});
}

function isDirectPdfUrl(url: string | null | undefined) {
	return Boolean(url && DIRECT_PDF_PATTERNS.some((pattern) => pattern.test(url)));
}

async function auditResource(
	row: ResourceRow,
	resourcesDir: string,
	storage: S3Client
): Promise<Change | null> {
	const replacement = REPLACEMENTS[row.slug];
	const notes: string[] = [];

	const candidateExternalUrl = replacement
		? Object.prototype.hasOwnProperty.call(replacement, 'externalUrl')
			? replacement.externalUrl ?? null
			: row.external_url
		: row.external_url;
	const resolvedExternalUrl = replacement?.dropExternal ? null : candidateExternalUrl;

	const audit = resolvedExternalUrl ? await safeProbeUrl(resolvedExternalUrl, notes) : null;

	const next: Change['after'] = {
		contentMode: row.content_mode,
		externalUrl: resolvedExternalUrl,
		fileUrl: row.file_url,
		imageUrl: row.image_url
	};

	try {
		const pdfSource = await resolvePdfSource(
			row,
			replacement,
			resolvedExternalUrl,
			audit,
			resourcesDir
		);
		if (pdfSource) {
			const uploaded = await uploadObject(storage, pdfSource.bytes, {
				prefix: 'toolbox/original',
				contentType: 'application/pdf',
				extension: 'pdf'
			});
			next.fileUrl = uploaded.publicPath;
			next.contentMode = 'file';
			notes.push(pdfSource.note);
		}
	} catch (error) {
		notes.push(
			`document self-hosting skipped: ${error instanceof Error ? error.message : String(error)}`
		);
	}

	if (!next.imageUrl && resolvedExternalUrl && audit?.ok && audit.contentType?.includes('text/html')) {
		try {
			const metadata = await extractPageMetadata(resolvedExternalUrl);
			if (metadata.imageUrl) {
				const image = await downloadBuffer(metadata.imageUrl);
				const uploaded = await uploadObject(storage, image.bytes, {
					prefix: 'toolbox/previews',
					contentType: image.contentType ?? 'image/jpeg',
					extension: guessExtension(metadata.imageUrl, image.contentType, 'jpg')
				});
				next.imageUrl = uploaded.publicPath;
				notes.push(`self-hosted preview image from ${metadata.imageUrl}`);
			}
		} catch (error) {
			notes.push(
				`preview image fetch skipped: ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}

	if (
		row.content_mode === 'file' &&
		row.external_url &&
		(audit?.status === 404 || replacement?.dropExternal)
	) {
		next.externalUrl = null;
		notes.push('removed stale source URL because the file is already self-hosted');
	}

	const before = {
		contentMode: row.content_mode,
		externalUrl: row.external_url,
		fileUrl: row.file_url,
		imageUrl: row.image_url
	};

	if (
		before.contentMode === next.contentMode &&
		before.externalUrl === next.externalUrl &&
		before.fileUrl === next.fileUrl &&
		before.imageUrl === next.imageUrl
	) {
		return null;
	}

	return {
		slug: row.slug,
		title: row.title,
		before,
		after: next,
		audit,
		notes
	};
}

async function resolvePdfSource(
	row: ResourceRow,
	replacement: Replacement | undefined,
	resolvedExternalUrl: string | null,
	audit: ProbeResult | null,
	resourcesDir: string
) {
	if (replacement?.localFile) {
		const absolutePath = await resolveExistingResourcePath(resourcesDir, replacement.localFile);
		if (!existsSync(absolutePath)) {
			throw new Error(`Missing local resource for ${row.slug}: ${absolutePath}`);
		}
		return {
			bytes: await readFile(absolutePath),
			note: `self-hosted local document ${replacement.localFile}`
		};
	}

	const remotePdfUrl =
		replacement?.remotePdfUrl ??
		(audit?.ok && audit.contentType?.includes('application/pdf') ? resolvedExternalUrl : null) ??
		(isDirectPdfUrl(resolvedExternalUrl) ? resolvedExternalUrl : null);

	if (!remotePdfUrl || row.file_url) {
		return null;
	}

	const buffer = await downloadBuffer(remotePdfUrl, {
		insecureTls: replacement?.insecurePdfSource
	});

	return {
		bytes: buffer.bytes,
		note: `self-hosted document from ${remotePdfUrl}`
	};
}

function normalizeLoosePath(value: string) {
	return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

async function resolveExistingResourcePath(baseDir: string, relativePath: string): Promise<string> {
	const directPath = resolve(baseDir, relativePath);
	if (existsSync(directPath)) return directPath;

	const target = normalizeLoosePath(relativePath);
	const candidates = await walkFiles(baseDir);
	const match = candidates.find((candidate) => normalizeLoosePath(candidate.relativePath) === target);
	return match?.absolutePath ?? directPath;
}

async function walkFiles(baseDir: string, currentDir = baseDir): Promise<Array<{ absolutePath: string; relativePath: string }>> {
	const entries = await readdir(currentDir, { withFileTypes: true });
	const out: Array<{ absolutePath: string; relativePath: string }> = [];

	for (const entry of entries) {
		const absolutePath = resolve(currentDir, entry.name);
		if (entry.isDirectory()) {
			out.push(...(await walkFiles(baseDir, absolutePath)));
			continue;
		}
		out.push({
			absolutePath,
			relativePath: absolutePath.slice(baseDir.length + 1)
		});
	}

	return out;
}

async function probeUrl(url: string): Promise<ProbeResult> {
	const response = await fetchWithTimeout(url, {
		method: 'GET',
		redirect: 'follow',
		headers: {
			'user-agent': 'Mozilla/5.0'
		}
	});

	return {
		ok: response.ok,
		status: response.status,
		finalUrl: response.url,
		contentType: response.headers.get('content-type')
	};
}

async function safeProbeUrl(url: string, notes: string[]): Promise<ProbeResult | null> {
	try {
		return await probeUrl(url);
	} catch (error) {
		notes.push(`link probe skipped: ${error instanceof Error ? error.message : String(error)}`);
		return null;
	}
}

async function extractPageMetadata(url: string) {
	const html = await downloadText(url);
	const $ = cheerio.load(html);
	const imageUrl =
		$('meta[property="og:image"]').attr('content') ??
		$('meta[name="twitter:image"]').attr('content') ??
		null;

	return {
		imageUrl
	};
}

async function downloadText(url: string, options?: { insecureTls?: boolean }) {
	if (options?.insecureTls) {
		const { stdout } = await execFile('curl', [
			'-k',
			'-L',
			'--silent',
			'--show-error',
			'--max-time',
			'30',
			'-A',
			'Mozilla/5.0',
			url
		]);
		return stdout;
	}

	const response = await fetchWithTimeout(url, {
		headers: {
			'user-agent': 'Mozilla/5.0'
		},
		redirect: 'follow'
	});
	if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
	return response.text();
}

async function downloadBuffer(url: string, options?: { insecureTls?: boolean }) {
	if (options?.insecureTls) {
		const { stdout } = await execFile('curl', [
			'-k',
			'-L',
			'--silent',
			'--show-error',
			'--max-time',
			'30',
			'-A',
			'Mozilla/5.0',
			url
		], { encoding: 'buffer', maxBuffer: 1024 * 1024 * 30 });
		return {
			bytes: stdout as Buffer,
			contentType: guessContentTypeFromExtension(url)
		};
	}

	const response = await fetchWithTimeout(url, {
		headers: {
			'user-agent': 'Mozilla/5.0'
		},
		redirect: 'follow'
	});
	if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status}`);
	return {
		bytes: Buffer.from(await response.arrayBuffer()),
		contentType: response.headers.get('content-type')
	};
}

async function fetchWithTimeout(url: string, init: RequestInit) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
	try {
		return await fetch(url, {
			...init,
			signal: controller.signal
		});
	} finally {
		clearTimeout(timer);
	}
}

function guessContentTypeFromExtension(url: string) {
	const extension = extname(new URL(url).pathname).replace(/^\./, '').toLowerCase();
	switch (extension) {
		case 'jpg':
		case 'jpeg':
			return 'image/jpeg';
		case 'png':
			return 'image/png';
		case 'webp':
			return 'image/webp';
		case 'svg':
			return 'image/svg+xml';
		case 'pdf':
			return 'application/pdf';
		default:
			return 'application/octet-stream';
	}
}

function guessExtension(url: string, contentType: string | null | undefined, fallback: string) {
	const fromPath = extname(new URL(url).pathname).replace(/^\./, '').toLowerCase();
	if (fromPath) return fromPath;
	if (contentType?.includes('png')) return 'png';
	if (contentType?.includes('webp')) return 'webp';
	if (contentType?.includes('svg')) return 'svg';
	if (contentType?.includes('jpeg') || contentType?.includes('jpg')) return 'jpg';
	return fallback;
}

async function uploadObject(
	storage: S3Client,
	bytes: Buffer,
	options: { prefix: string; contentType: string; extension: string }
) {
	const sha256 = createHash('sha256').update(bytes).digest('hex');
	const objectKey = `${options.prefix}/${sha256}.${options.extension}`;
	const bucket = process.env.MINIO_BUCKET!;

	try {
		await storage.send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }));
	} catch {
		await storage.send(
			new PutObjectCommand({
				Bucket: bucket,
				Key: objectKey,
				Body: bytes,
				ContentType: options.contentType,
				CacheControl: 'public, max-age=31536000, immutable'
			})
		);
	}

	return {
		objectKey,
		publicPath: `/uploads/${objectKey}`
	};
}

function printSummary(payload: {
	summary: { changed: number; fileBacked: number; withPreviewImage: number };
	changes: Change[];
	applied: boolean;
}) {
	process.stdout.write(`Toolbox content audit ${payload.applied ? '(applied)' : '(dry run)'}\n`);
	process.stdout.write(`- Changed resources: ${payload.summary.changed}\n`);
	process.stdout.write(`- File-backed resources after audit: ${payload.summary.fileBacked}\n`);
	process.stdout.write(`- Resources with preview images: ${payload.summary.withPreviewImage}\n\n`);

	for (const change of payload.changes) {
		process.stdout.write(`- ${change.slug}\n`);
		for (const note of change.notes) {
			process.stdout.write(`  - ${note}\n`);
		}
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
