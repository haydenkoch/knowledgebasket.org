const REDACTED = '[REDACTED]';
const TRUNCATED = '[TRUNCATED]';
const MAX_SANITIZE_DEPTH = 5;
const MAX_STRING_LENGTH = 2048;

const SENSITIVE_FIELD_PATTERN =
	/(^|[-_.])(authorization|cookie|set-cookie|password|passwd|secret|token|api[-_.]?key|session|client[-_.]?secret|refresh[-_.]?token|access[-_.]?token|email|query|body)($|[-_.])/i;
const URL_SENSITIVE_PARAM_PATTERN =
	/([?&](?:access_token|token|secret|api_key|email|code)=)[^&]+/gi;

export const SENTRY_CLIENT_IGNORED_ERRORS = [
	'ResizeObserver loop limit exceeded',
	'ResizeObserver loop completed with undelivered notifications'
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return Object.prototype.toString.call(value) === '[object Object]';
}

function isSensitiveKey(key: string | undefined): boolean {
	return key ? SENSITIVE_FIELD_PATTERN.test(key) : false;
}

function sanitizeString(value: string): string {
	const clipped =
		value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)} ${TRUNCATED}` : value;

	return clipped.replace(URL_SENSITIVE_PARAM_PATTERN, '$1[REDACTED]');
}

export function configuredBoolean(value: string | undefined, fallback = false): boolean {
	if (!value) return fallback;

	switch (value.trim().toLowerCase()) {
		case '1':
		case 'true':
		case 'yes':
		case 'on':
			return true;
		case '0':
		case 'false':
		case 'no':
		case 'off':
			return false;
		default:
			return fallback;
	}
}

export function configuredSampleRate(value: string | undefined, fallback: number): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback;
}

export function sanitizeSentryValue(value: unknown, key?: string, depth = 0): unknown {
	if (isSensitiveKey(key)) {
		return REDACTED;
	}

	if (depth >= MAX_SANITIZE_DEPTH) {
		return TRUNCATED;
	}

	if (typeof value === 'string') {
		return sanitizeString(value);
	}

	if (Array.isArray(value)) {
		return value.map((entry) => sanitizeSentryValue(entry, key, depth + 1));
	}

	if (value instanceof Date) {
		return value.toISOString();
	}

	if (isPlainObject(value)) {
		return Object.fromEntries(
			Object.entries(value).map(([entryKey, entryValue]) => [
				entryKey,
				sanitizeSentryValue(entryValue, entryKey, depth + 1)
			])
		);
	}

	return value;
}

export function sanitizeSentryAttributes(
	attributes: Record<string, unknown> = {}
): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(attributes).map(([key, value]) => [key, sanitizeSentryValue(value, key)])
	);
}
