import { error, json, redirect, type RequestEvent } from '@sveltejs/kit';

export const PRIVILEGED_ROLES = ['moderator', 'admin'] as const;
export type PrivilegedRole = (typeof PRIVILEGED_ROLES)[number];
export type PrivilegedUser = NonNullable<App.Locals['user']> & { role: PrivilegedRole };

type GuardableEvent = Pick<RequestEvent, 'locals' | 'request' | 'url'>;

function isPrivilegedRole(role: string | undefined): role is PrivilegedRole {
	return PRIVILEGED_ROLES.includes(role as PrivilegedRole);
}

function isSafeMethod(method: string): boolean {
	return method === 'GET' || method === 'HEAD';
}

export function hasPrivilegedUser(
	user: App.Locals['user'] | null | undefined
): user is PrivilegedUser {
	return !!user && isPrivilegedRole(user.role);
}

export function requireAdminPageAccess(
	event: Pick<RequestEvent, 'locals' | 'url'>,
	loginRedirect = event.url.pathname + event.url.search
): PrivilegedUser {
	if (!event.locals.user) {
		throw redirect(303, `/auth/login?redirect=${encodeURIComponent(loginRedirect)}`);
	}
	if (!hasPrivilegedUser(event.locals.user)) {
		throw redirect(303, '/auth/unauthorized');
	}
	return event.locals.user;
}

export function requirePrivilegedApiUser(locals: App.Locals): PrivilegedUser {
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}
	if (!hasPrivilegedUser(locals.user)) {
		throw error(403, 'Forbidden');
	}
	return locals.user;
}

export function guardAdminRequest(event: GuardableEvent): Response | null {
	if (!event.url.pathname.startsWith('/admin')) {
		return null;
	}

	if (hasPrivilegedUser(event.locals.user)) {
		return null;
	}

	if (!event.locals.user) {
		if (isSafeMethod(event.request.method)) {
			throw redirect(
				303,
				`/auth/login?redirect=${encodeURIComponent(event.url.pathname + event.url.search)}`
			);
		}

		return json({ error: 'Authentication required' }, { status: 401 });
	}

	if (isSafeMethod(event.request.method)) {
		throw redirect(303, '/auth/unauthorized');
	}

	return json({ error: 'Forbidden' }, { status: 403 });
}
