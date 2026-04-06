#!/usr/bin/env node

import 'dotenv/config';
import {
	CreateBucketCommand,
	HeadBucketCommand,
	PutBucketPolicyCommand,
	PutObjectCommand,
	S3Client
} from '@aws-sdk/client-s3';
import { readFile, readdir, stat } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';

const {
	MINIO_ENDPOINT,
	MINIO_ACCESS_KEY,
	MINIO_SECRET_KEY,
	MINIO_BUCKET
} = process.env;

if (!MINIO_ENDPOINT || !MINIO_ACCESS_KEY || !MINIO_SECRET_KEY || !MINIO_BUCKET) {
	console.error(
		'MinIO env vars not set. Need: MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET'
	);
	process.exit(1);
}

const ROOT = process.cwd();
const LANDSCAPE_ROOT = resolve(ROOT, 'static', 'images', 'landscapes');
const STATIC_UPLOADS_ROOT = resolve(ROOT, 'static', 'uploads');
const DEFAULT_LOGO_PATH = resolve(ROOT, 'static', 'images', 'logo.png');
const LANDSCAPE_WIDTH_DIRS = ['320', '640', '960', '1280', '1920'];

const s3 = new S3Client({
	region: 'us-east-1',
	endpoint: MINIO_ENDPOINT,
	forcePathStyle: true,
	credentials: {
		accessKeyId: MINIO_ACCESS_KEY,
		secretAccessKey: MINIO_SECRET_KEY
	}
});

function buildPublicBucketPolicy(bucket) {
	return JSON.stringify({
		Version: '2012-10-17',
		Statement: [
			{
				Sid: 'PublicReadGetObject',
				Effect: 'Allow',
				Principal: { AWS: ['*'] },
				Action: ['s3:GetObject'],
				Resource: [`arn:aws:s3:::${bucket}/*`]
			}
		]
	});
}

function contentTypeFor(filePath) {
	switch (extname(filePath).toLowerCase()) {
		case '.jpg':
		case '.jpeg':
			return 'image/jpeg';
		case '.png':
			return 'image/png';
		case '.webp':
			return 'image/webp';
		default:
			return 'application/octet-stream';
	}
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

async function collectFiles(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		if (entry.name.startsWith('.')) continue;
		const absolute = resolve(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await collectFiles(absolute)));
		} else if (entry.isFile()) {
			files.push(absolute);
		}
	}

	return files;
}

async function uploadFile(filePath, objectKey) {
	const body = await readFile(filePath);
	await s3.send(
		new PutObjectCommand({
			Bucket: MINIO_BUCKET,
			Key: objectKey,
			Body: body,
			ContentType: contentTypeFor(filePath),
			CacheControl: 'public, max-age=31536000, immutable'
		})
	);
	console.log(`Synced ${objectKey}`);
}

async function syncLandscapes() {
	for (const width of LANDSCAPE_WIDTH_DIRS) {
		const widthDir = resolve(LANDSCAPE_ROOT, width);
		try {
			const widthStat = await stat(widthDir);
			if (!widthStat.isDirectory()) continue;
		} catch {
			continue;
		}

		const files = await collectFiles(widthDir);
		for (const filePath of files) {
			const fileName = relative(widthDir, filePath).replace(/\\/g, '/');
			await uploadFile(filePath, `placeholders/landscapes/${width}/${fileName}`);
		}
	}
}

async function syncLegacyUploads() {
	try {
		const uploadsStat = await stat(STATIC_UPLOADS_ROOT);
		if (!uploadsStat.isDirectory()) return;
	} catch {
		return;
	}

	const files = await collectFiles(STATIC_UPLOADS_ROOT);
	for (const filePath of files) {
		const objectKey = relative(STATIC_UPLOADS_ROOT, filePath).replace(/\\/g, '/');
		await uploadFile(filePath, objectKey);
	}
}

async function syncDefaultLogo() {
	await uploadFile(DEFAULT_LOGO_PATH, 'system/logo.png');
}

async function main() {
	await ensureBucket();
	await syncLandscapes();
	await syncLegacyUploads();
	await syncDefaultLogo();
	console.log('MinIO public image sync complete.');
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
