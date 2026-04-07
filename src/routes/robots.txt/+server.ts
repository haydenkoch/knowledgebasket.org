import { resolveSeoOrigin } from '$lib/server/seo';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const origin = resolveSeoOrigin(url);
	const body = [
		'User-agent: *',
		'Allow: /',
		'Disallow: /admin',
		'Disallow: /account',
		'Disallow: /auth',
		'Disallow: /orgs',
		'Disallow: /org-invites',
		'Disallow: /demo',
		'Disallow: /api/',
		'Disallow: /events/submit',
		'Disallow: /funding/submit',
		'Disallow: /jobs/submit',
		'Disallow: /red-pages/submit',
		'Disallow: /toolbox/submit',
		`Sitemap: ${origin}/sitemap.xml`
	].join('\n');

	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8'
		}
	});
};
