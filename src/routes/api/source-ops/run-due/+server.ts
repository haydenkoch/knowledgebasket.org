import { json } from '@sveltejs/kit';
import { runDueSources } from '$lib/server/ingestion/scheduler';
import type { RequestHandler } from './$types';
import { requirePrivilegedApiUser } from '$lib/server/access-control';
import {
	RATE_LIMIT_POLICIES,
	buildRateLimitHeaders,
	consumeRateLimit
} from '$lib/server/rate-limit';
import { captureServerError, logServerEvent } from '$lib/server/observability';
import { readRuntimeConfigValue } from '$lib/server/runtime-secrets';

export const POST: RequestHandler = async ({ locals, request, getClientAddress, url }) => {
	const rateLimit = consumeRateLimit(
		{ request, locals, getClientAddress, url },
		RATE_LIMIT_POLICIES.privilegedOps,
		'/api/source-ops/run-due'
	);
	if (!rateLimit.allowed) {
		logServerEvent('source_ops.run_due_rate_limited', { path: '/api/source-ops/run-due' }, 'warn');
		return json(
			{ ok: false, error: 'Too many source-ops run requests' },
			{ status: 429, headers: buildRateLimitHeaders(rateLimit) }
		);
	}

	const sourceOpsSecret = readRuntimeConfigValue('SOURCE_OPS_SECRET')?.trim();
	const headerSecret = request.headers.get('x-source-ops-secret')?.trim();
	const hasValidSecret = !!sourceOpsSecret && headerSecret === sourceOpsSecret;

	if (!hasValidSecret) {
		requirePrivilegedApiUser(locals);
	}

	try {
		const result = await runDueSources({
			trigger: 'api',
			triggeredBy: locals.user?.id ?? null
		});

		logServerEvent('source_ops.run_due_completed', {
			totalSelected: result.totalSelected,
			totalProcessed: result.totalProcessed,
			totalCandidatesCreated: result.totalCandidatesCreated,
			totalAutoApproved: result.totalAutoApproved,
			triggeredBy: locals.user?.id ?? 'secret'
		});

		return json({ ok: true, ...result }, { headers: buildRateLimitHeaders(rateLimit) });
	} catch (cause) {
		await captureServerError('source_ops.run_due_failed', cause, {
			triggeredBy: locals.user?.id ?? 'secret'
		});
		throw cause;
	}
};
