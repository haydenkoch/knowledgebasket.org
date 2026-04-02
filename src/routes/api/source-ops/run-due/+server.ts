import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { error, json } from '@sveltejs/kit';
import { runDueSources } from '$lib/server/ingestion/scheduler';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	const sourceOpsSecret = env.SOURCE_OPS_SECRET?.trim();
	const headerSecret = request.headers.get('x-source-ops-secret')?.trim();
	const hasAdminSession = locals.user?.role === 'admin' || locals.user?.role === 'moderator';
	const hasValidSecret = !!sourceOpsSecret && headerSecret === sourceOpsSecret;

	if (!dev && !hasAdminSession && !hasValidSecret) {
		throw error(403, 'Forbidden');
	}

	const result = await runDueSources({
		trigger: 'api',
		triggeredBy: locals.user?.id ?? null
	});

	return json({ ok: true, ...result });
};
