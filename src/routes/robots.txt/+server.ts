import { resolveRuntimeOrigin } from '$lib/server/runtime-config';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const origin = resolveRuntimeOrigin() ?? url.origin;
	const body = ['User-agent: *', 'Allow: /', `Sitemap: ${origin}/sitemap.xml`].join('\n');

	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8'
		}
	});
};
