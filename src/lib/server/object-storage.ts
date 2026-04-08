import {
	CreateBucketCommand,
	GetObjectCommand,
	HeadBucketCommand,
	NoSuchKey,
	PutObjectCommand,
	PutBucketPolicyCommand,
	S3Client,
	S3ServiceException
} from '@aws-sdk/client-s3';
import { buildPublicAssetUrl } from '$lib/config/public-assets';
import { readRuntimeConfigValue } from '$lib/server/runtime-secrets';

const DEFAULT_REGION = 'us-east-1';

let bucketReadyPromise: Promise<void> | null = null;

export type ObjectStorageHealth = {
	configured: boolean;
	available: boolean;
	bucket: string | null;
	error?: string;
};

function getBucketName(): string {
	const bucket = readRuntimeConfigValue('MINIO_BUCKET')?.trim();
	if (!bucket) throw new Error('MINIO_BUCKET is not configured');
	return bucket;
}

function buildPublicBucketPolicy(bucket: string): string {
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

export function isObjectStorageConfigured(): boolean {
	return !!(
		readRuntimeConfigValue('MINIO_ENDPOINT')?.trim() &&
		readRuntimeConfigValue('MINIO_ACCESS_KEY')?.trim() &&
		readRuntimeConfigValue('MINIO_SECRET_KEY')?.trim() &&
		readRuntimeConfigValue('MINIO_BUCKET')?.trim()
	);
}

function getObjectStorageClient(): S3Client {
	if (!isObjectStorageConfigured()) {
		throw new Error('Object storage is not configured');
	}

	return new S3Client({
		region: DEFAULT_REGION,
		endpoint: readRuntimeConfigValue('MINIO_ENDPOINT'),
		forcePathStyle: true,
		credentials: {
			accessKeyId: readRuntimeConfigValue('MINIO_ACCESS_KEY') ?? '',
			secretAccessKey: readRuntimeConfigValue('MINIO_SECRET_KEY') ?? ''
		}
	});
}

async function ensureBucket(): Promise<void> {
	if (bucketReadyPromise) {
		return bucketReadyPromise;
	}

	bucketReadyPromise = (async () => {
		const client = getObjectStorageClient();
		const bucket = getBucketName();

		try {
			await client.send(new HeadBucketCommand({ Bucket: bucket }));
		} catch (error) {
			if (!(error instanceof S3ServiceException) || error.$metadata.httpStatusCode !== 404) {
				throw error;
			}
			await client.send(new CreateBucketCommand({ Bucket: bucket }));
		}

		await client.send(
			new PutBucketPolicyCommand({
				Bucket: bucket,
				Policy: buildPublicBucketPolicy(bucket)
			})
		);
	})();

	try {
		await bucketReadyPromise;
	} catch (error) {
		bucketReadyPromise = null;
		throw error;
	}
}

export function buildUploadUrl(objectKey: string): string {
	return buildPublicAssetUrl(objectKey);
}

export async function putUploadObject(
	objectKey: string,
	body: Uint8Array,
	contentType: string
): Promise<string> {
	await ensureBucket();
	const client = getObjectStorageClient();
	const bucket = getBucketName();

	await client.send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: objectKey,
			Body: body,
			ContentType: contentType,
			CacheControl: 'public, max-age=31536000, immutable'
		})
	);

	return buildUploadUrl(objectKey);
}

export async function getUploadObject(objectKey: string): Promise<{
	body: Uint8Array;
	contentType: string | null;
	contentLength: number | null;
	lastModified: Date | null;
	etag: string | null;
}> {
	const client = getObjectStorageClient();
	const bucket = getBucketName();

	try {
		const response = await client.send(
			new GetObjectCommand({
				Bucket: bucket,
				Key: objectKey
			})
		);

		return {
			body: response.Body ? await response.Body.transformToByteArray() : new Uint8Array(),
			contentType: response.ContentType ?? null,
			contentLength: response.ContentLength ?? null,
			lastModified: response.LastModified ?? null,
			etag: response.ETag ?? null
		};
	} catch (error) {
		if (error instanceof NoSuchKey) {
			throw new Error('Object not found');
		}
		throw error;
	}
}

export async function getObjectStorageHealth(): Promise<ObjectStorageHealth> {
	if (!isObjectStorageConfigured()) {
		return {
			configured: false,
			available: false,
			bucket: null
		};
	}

	try {
		await ensureBucket();
		return {
			configured: true,
			available: true,
			bucket: getBucketName()
		};
	} catch (error) {
		return {
			configured: true,
			available: false,
			bucket: readRuntimeConfigValue('MINIO_BUCKET')?.trim() ?? null,
			error: error instanceof Error ? error.message : 'Unable to reach object storage'
		};
	}
}
