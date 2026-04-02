import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const origin = (env.ORIGIN ?? url.origin).replace(/\/$/, '');
	const body = ['User-agent: *', 'Allow: /', `Sitemap: ${origin}/sitemap.xml`].join('\n');

	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8'
		}
	});
};
