import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	const url = event.url.toString();
	if (url.includes('/api/auth/')) {
		const { isAuthPath } = await import('better-auth/svelte-kit');
		const matched = isAuthPath(url, auth.options);
		if (matched) {
			return auth.handler(event.request);
		}
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = handleBetterAuth;
