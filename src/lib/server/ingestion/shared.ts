import { createHash, randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { load } from 'cheerio';
import { stripHtml } from '$lib/utils/format';
import type {
	AdapterConfig,
	FetchErrorCategory,
	FetchResult,
	FetchStatus,
	SourceRecord
} from './types';

export const INGESTION_USER_AGENT = 'KnowledgeBasket-SourceOps/1.0 (+https://knowledgebasket.org)';
const DEFAULT_TIMEOUT_MS = 20000;

type RequestOptions = {
	method?: 'GET' | 'POST';
	headers?: Record<string, string>;
	query?: Record<string, string | number | boolean | null | undefined>;
	body?: string;
	accept?: string;
	timeoutMs?: number;
};

export function randomRunId() {
	return randomUUID();
}

export function buildFetchUrl(
	baseUrl: string,
	query?: Record<string, string | number | boolean | null | undefined>
) {
	const url = new URL(baseUrl);
	for (const [key, value] of Object.entries(query ?? {})) {
		if (value === null || value === undefined || value === '') continue;
		url.searchParams.set(key, String(value));
	}
	return url.toString();
}

export async function fetchText(url: string, options?: RequestOptions): Promise<FetchResult> {
	const startedAt = Date.now();
	try {
		const response = await fetch(buildFetchUrl(url, options?.query), {
			method: options?.method ?? 'GET',
			headers: {
				'User-Agent': INGESTION_USER_AGENT,
				Accept: options?.accept ?? 'text/plain, text/html, application/json;q=0.9, */*;q=0.8',
				...(options?.headers ?? {})
			},
			body: options?.body,
			signal: AbortSignal.timeout(options?.timeoutMs ?? DEFAULT_TIMEOUT_MS)
		});

		const rawContent = await response.text();
		const responseTimeMs = Date.now() - startedAt;
		const headers = Object.fromEntries(response.headers.entries());
		const success = response.ok;

		return {
			success,
			status: success ? 'success' : mapHttpStatusToFetchStatus(response.status),
			httpStatusCode: response.status,
			responseTimeMs,
			rawContent: success ? rawContent : null,
			contentHash: success ? sha256(rawContent) : null,
			contentSizeBytes: Buffer.byteLength(rawContent, 'utf8'),
			errorMessage: success ? null : `HTTP ${response.status} while fetching ${url}`,
			errorCategory: success ? null : mapHttpStatusToErrorCategory(response.status),
			headers
		};
	} catch (error) {
		const isTimeout = error instanceof DOMException && error.name === 'TimeoutError';
		return {
			success: false,
			status: isTimeout ? 'timeout' : 'failure',
			httpStatusCode: null,
			responseTimeMs: Date.now() - startedAt,
			rawContent: null,
			contentHash: null,
			contentSizeBytes: 0,
			errorMessage: error instanceof Error ? error.message : 'Unknown fetch error',
			errorCategory: isTimeout ? 'timeout' : 'network',
			headers: {}
		};
	}
}

export async function fetchJson<T = unknown>(
	url: string,
	options?: RequestOptions
): Promise<{ fetchResult: FetchResult; data: T | null }> {
	const fetchResult = await fetchText(url, {
		...options,
		accept: options?.accept ?? 'application/json, text/plain;q=0.8, */*;q=0.5'
	});
	if (!fetchResult.success || !fetchResult.rawContent) {
		return { fetchResult, data: null };
	}

	try {
		return {
			fetchResult,
			data: JSON.parse(fetchResult.rawContent) as T
		};
	} catch (error) {
		return {
			fetchResult: {
				...fetchResult,
				success: false,
				status: 'failure',
				errorCategory: 'parse',
				errorMessage: error instanceof Error ? error.message : 'Invalid JSON response',
				rawContent: null,
				contentHash: null
			},
			data: null
		};
	}
}

export function extractPath(data: unknown, path: string | null | undefined): unknown {
	if (!path) return data;
	const segments = path
		.replace(/\[(\d+)\]/g, '.$1')
		.split('.')
		.map((segment) => segment.trim())
		.filter(Boolean);

	let current: unknown = data;
	for (const segment of segments) {
		if (current === null || current === undefined) return undefined;
		if (Array.isArray(current)) {
			const index = Number(segment);
			if (!Number.isInteger(index)) return undefined;
			current = current[index];
			continue;
		}
		if (typeof current !== 'object') return undefined;
		current = (current as Record<string, unknown>)[segment];
	}
	return current;
}

export function resolveAdapterHeaders(
	headers: Record<string, unknown> | undefined
): Record<string, string> {
	const resolved: Record<string, string> = {};
	for (const [key, value] of Object.entries(headers ?? {})) {
		if (typeof value !== 'string') continue;
		const envMatch = value.match(/^ENV:(.+)$/);
		if (envMatch) {
			const envValue = process.env[envMatch[1]?.trim() ?? ''];
			if (envValue) resolved[key] = envValue;
			continue;
		}
		if (value.trim()) resolved[key] = value.trim();
	}
	return resolved;
}

export function absoluteUrl(candidate: string | null | undefined, baseUrl: string) {
	if (!candidate?.trim()) return null;
	try {
		return new URL(candidate.trim(), baseUrl).toString();
	} catch {
		return candidate.trim();
	}
}

export function cleanText(value: string | null | undefined) {
	if (!value) return null;
	const normalized = stripHtml(value).replace(/\s+/g, ' ').trim();
	return normalized || null;
}

export function splitTags(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value
			.filter((entry): entry is string => typeof entry === 'string')
			.map((entry) => entry.trim())
			.filter(Boolean);
	}
	if (typeof value === 'string') {
		return value
			.split(/[|,]/)
			.map((entry) => entry.trim())
			.filter(Boolean);
	}
	return [];
}

export function parseDateLike(value: unknown): string | null {
	if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	const parsed = new Date(trimmed);
	return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function parseNumberLike(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value !== 'string') return null;
	const normalized = value.replace(/[^\d.-]/g, '');
	if (!normalized) return null;
	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : null;
}

export function inferFeedUrlFromHtml(html: string, baseUrl: string) {
	const $ = load(html);
	const preferred = $('link[rel="alternate"]')
		.toArray()
		.map((element) => ({
			type: ($(element).attr('type') || '').toLowerCase(),
			href: $(element).attr('href') || ''
		}))
		.find((entry) => entry.type.includes('rss') || entry.type.includes('atom'));

	if (preferred?.href) return absoluteUrl(preferred.href, baseUrl);

	const candidates = [
		...$('a[href*="/feed"], a[href$=".xml"], a[href*="rss"]')
			.toArray()
			.map((element) => $(element).attr('href'))
	].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
	return candidates.length > 0 ? absoluteUrl(candidates[0], baseUrl) : null;
}

export function inferDownloadUrlFromHtml(
	html: string,
	baseUrl: string,
	patterns = [/\.csv($|\?)/i, /\.xlsx?($|\?)/i, /download/i, /export/i]
) {
	const $ = load(html);
	const candidates = $('a[href]')
		.toArray()
		.map((element) => ({
			href: $(element).attr('href') || '',
			text: cleanText($(element).text()) ?? ''
		}))
		.filter((entry) =>
			patterns.some((pattern) => pattern.test(entry.href) || pattern.test(entry.text))
		);

	return candidates.length > 0 ? absoluteUrl(candidates[0]?.href, baseUrl) : null;
}

export function selectSourceUrl(source: SourceRecord, config: AdapterConfig) {
	const configuredFetchUrl = typeof config.fetchUrl === 'string' ? config.fetchUrl.trim() : '';
	return configuredFetchUrl || source.fetchUrl || source.sourceUrl;
}

export function sha256(value: string) {
	return createHash('sha256').update(value).digest('hex');
}

export function mapHttpStatusToFetchStatus(status: number): FetchStatus {
	if (status === 408 || status === 504) return 'timeout';
	if (status >= 200 && status < 300) return 'success';
	return 'failure';
}

export function mapHttpStatusToErrorCategory(status: number): FetchErrorCategory {
	if (status === 401 || status === 403) return 'auth';
	if (status === 404) return 'not_found';
	if (status === 408 || status === 504) return 'timeout';
	if (status === 429) return 'rate_limit';
	if (status >= 500) return 'server_error';
	return 'unknown';
}
