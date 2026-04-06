type RateLimitPolicy = {
	key: string;
	limit: number;
	windowMs: number;
};

type RateLimitBucket = {
	count: number;
	resetAt: number;
};

export type RateLimitResult = {
	allowed: boolean;
	key: string;
	limit: number;
	remaining: number;
	resetAt: number;
	retryAfterSeconds: number;
};

type RateLimitEvent = {
	request: Request;
	locals?: App.Locals;
	url?: URL;
	getClientAddress?: () => string;
};

const buckets = new Map<string, RateLimitBucket>();
let lastCleanupAt = 0;

export const RATE_LIMIT_POLICIES = {
	authLogin: { key: 'auth:login', limit: 8, windowMs: 10 * 60_000 },
	authRegister: { key: 'auth:register', limit: 6, windowMs: 10 * 60_000 },
	authForgotPassword: { key: 'auth:forgot-password', limit: 5, windowMs: 15 * 60_000 },
	publicSubmit: { key: 'public:submit', limit: 8, windowMs: 60 * 60_000 },
	searchApi: { key: 'api:search', limit: 120, windowMs: 60_000 },
	privilegedOps: { key: 'api:privileged', limit: 30, windowMs: 5 * 60_000 }
} as const satisfies Record<string, RateLimitPolicy>;

function cleanupBuckets(now: number) {
	if (now - lastCleanupAt < 60_000) return;
	lastCleanupAt = now;

	for (const [key, bucket] of buckets.entries()) {
		if (bucket.resetAt <= now) {
			buckets.delete(key);
		}
	}
}

function readForwardedAddress(request: Request): string | null {
	const forwarded =
		request.headers.get('cf-connecting-ip') ??
		request.headers.get('x-real-ip') ??
		request.headers.get('x-forwarded-for');

	if (!forwarded) return null;

	return (
		forwarded
			.split(',')
			.map((entry) => entry.trim())
			.find(Boolean) ?? null
	);
}

function actorFingerprint(event: RateLimitEvent): string {
	const sessionUserId = event.locals?.user?.id?.trim();
	if (sessionUserId) return `user:${sessionUserId}`;

	try {
		const clientAddress = event.getClientAddress?.();
		if (clientAddress) return `ip:${clientAddress}`;
	} catch {
		// `getClientAddress` is not always available in tests or non-adapter contexts.
	}

	const forwarded = readForwardedAddress(event.request);
	if (forwarded) return `ip:${forwarded}`;

	const userAgent = event.request.headers.get('user-agent')?.trim() ?? 'unknown-agent';
	return `agent:${userAgent}`;
}

export function consumeRateLimit(
	event: RateLimitEvent,
	policy: RateLimitPolicy,
	scope?: string
): RateLimitResult {
	const now = Date.now();
	cleanupBuckets(now);

	const scopeKey = scope?.trim() || event.url?.pathname || new URL(event.request.url).pathname;
	const key = `${policy.key}:${scopeKey}:${actorFingerprint(event)}`;
	const bucket = buckets.get(key);

	if (!bucket || bucket.resetAt <= now) {
		const nextBucket: RateLimitBucket = {
			count: 1,
			resetAt: now + policy.windowMs
		};
		buckets.set(key, nextBucket);

		return {
			allowed: true,
			key,
			limit: policy.limit,
			remaining: Math.max(0, policy.limit - 1),
			resetAt: nextBucket.resetAt,
			retryAfterSeconds: Math.ceil(policy.windowMs / 1000)
		};
	}

	if (bucket.count >= policy.limit) {
		return {
			allowed: false,
			key,
			limit: policy.limit,
			remaining: 0,
			resetAt: bucket.resetAt,
			retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
		};
	}

	bucket.count += 1;
	buckets.set(key, bucket);

	return {
		allowed: true,
		key,
		limit: policy.limit,
		remaining: Math.max(0, policy.limit - bucket.count),
		resetAt: bucket.resetAt,
		retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
	};
}

export function buildRateLimitHeaders(result: RateLimitResult): Record<string, string> {
	return {
		'X-RateLimit-Limit': String(result.limit),
		'X-RateLimit-Remaining': String(result.remaining),
		'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
		'Retry-After': String(result.retryAfterSeconds)
	};
}
