/**
 * Shared server-side helpers for auth guards and request parsing.
 */
import { redirect } from '@sveltejs/kit';

type Locals = App.Locals;

/** Throw a redirect if the user is not authenticated. */
export function ensureAuth(locals: Locals, redirectTo = '/demo/better-auth/login'): NonNullable<App.Locals['user']> {
	if (!locals.user) throw redirect(303, redirectTo);
	return locals.user;
}

/** Throw a redirect if the user does not have one of the required roles. */
export function ensureRole(
	locals: Locals,
	roles: string[],
	redirectTo = '/'
): NonNullable<App.Locals['user']> {
	const user = ensureAuth(locals);
	if (!roles.includes(user.role ?? '')) throw redirect(303, redirectTo);
	return user;
}

/** Extract pagination params from URL search params. */
export function paginationFromUrl(
	url: URL,
	defaults: { page?: number; limit?: number } = {}
): { page: number; limit: number; offset: number } {
	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? String(defaults.page ?? 1), 10));
	const limit = Math.max(1, parseInt(url.searchParams.get('limit') ?? String(defaults.limit ?? 25), 10));
	return { page, limit, offset: (page - 1) * limit };
}
