import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { APIError } from 'better-auth/api';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/auth.schema';
import { USER_ROLES, type UserRole } from '$lib/data/kb';

export const ADMIN_USERS_PAGE_SIZE = 20;

export const MANAGEABLE_USER_ROLES = USER_ROLES satisfies readonly UserRole[];

export type ManageableUserRole = (typeof MANAGEABLE_USER_ROLES)[number];

export type AdminManagedUser = Pick<
	typeof userTable.$inferSelect,
	| 'id'
	| 'name'
	| 'email'
	| 'emailVerified'
	| 'role'
	| 'banned'
	| 'banReason'
	| 'banExpires'
	| 'createdAt'
	| 'updatedAt'
>;

type UntypedAuthApiMethod = (args: unknown) => Promise<unknown>;

function buildSearchClause(search: string) {
	if (!search) return undefined;

	const pattern = `%${search}%`;
	return or(ilike(userTable.name, pattern), ilike(userTable.email, pattern));
}

function normalizePage(value: string | null | undefined): number {
	const parsed = Number(value ?? '1');
	if (!Number.isFinite(parsed) || parsed < 1) return 1;
	return Math.floor(parsed);
}

export function normalizeManageableUserRole(role: string): ManageableUserRole | null {
	return MANAGEABLE_USER_ROLES.includes(role as ManageableUserRole)
		? (role as ManageableUserRole)
		: null;
}

export function toAdminUsersErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof APIError) return error.message || fallback;
	if (error instanceof Error) return error.message || fallback;
	return fallback;
}

export function buildAdminUsersHref(search: string, page: number): string {
	const params = new URLSearchParams();
	if (search) params.set('q', search);
	if (page > 1) params.set('page', String(page));
	const query = params.toString();
	return query ? `/admin/users?${query}` : '/admin/users';
}

async function callUntypedAuthApi<T>(methodName: string, args: unknown): Promise<T> {
	const method = (auth.api as Record<string, UntypedAuthApiMethod | undefined>)[methodName];
	if (!method) {
		throw new Error(`Missing auth API method: ${methodName}`);
	}

	return (await method(args)) as T;
}

export async function listAdminManagedUsers(input: {
	search: string;
	page?: number;
	pageSize?: number;
}) {
	const search = input.search.trim();
	const page = input.page ? normalizePage(String(input.page)) : 1;
	const pageSize = input.pageSize ?? ADMIN_USERS_PAGE_SIZE;
	const where = buildSearchClause(search);
	const totalRowsPromise = db
		.select({ count: sql<number>`count(*)::int` })
		.from(userTable)
		.where(where);
	const adminRowsPromise = db
		.select({ count: sql<number>`count(*)::int` })
		.from(userTable)
		.where(and(where, eq(userTable.role, 'admin')));
	const bannedRowsPromise = db
		.select({ count: sql<number>`count(*)::int` })
		.from(userTable)
		.where(and(where, eq(userTable.banned, true)));

	const [totalRows, adminRows, bannedRows] = await Promise.all([
		totalRowsPromise,
		adminRowsPromise,
		bannedRowsPromise
	]);

	const total = totalRows[0]?.count ?? 0;
	const adminCount = adminRows[0]?.count ?? 0;
	const bannedCount = bannedRows[0]?.count ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const safePage = Math.min(page, totalPages);
	const offset = (safePage - 1) * pageSize;

	const users = await db
		.select({
			id: userTable.id,
			name: userTable.name,
			email: userTable.email,
			emailVerified: userTable.emailVerified,
			role: userTable.role,
			banned: userTable.banned,
			banReason: userTable.banReason,
			banExpires: userTable.banExpires,
			createdAt: userTable.createdAt,
			updatedAt: userTable.updatedAt
		})
		.from(userTable)
		.where(where)
		.orderBy(desc(userTable.createdAt), userTable.email)
		.limit(pageSize)
		.offset(offset);

	return {
		users,
		search,
		page: safePage,
		pageSize,
		total,
		totalPages,
		adminCount,
		bannedCount
	};
}

export async function adminSetUserRole(input: {
	headers: Headers;
	userId: string;
	role: ManageableUserRole;
}) {
	return callUntypedAuthApi('setRole', {
		headers: input.headers,
		body: {
			userId: input.userId,
			role: input.role
		}
	});
}

export async function adminBanUser(input: {
	headers: Headers;
	userId: string;
	reason?: string;
	expiresInSeconds?: number;
}) {
	return callUntypedAuthApi('banUser', {
		headers: input.headers,
		body: {
			userId: input.userId,
			banReason: input.reason?.trim() || undefined,
			banExpiresIn: input.expiresInSeconds
		}
	});
}

export async function adminUnbanUser(input: { headers: Headers; userId: string }) {
	return callUntypedAuthApi('unbanUser', {
		headers: input.headers,
		body: { userId: input.userId }
	});
}

export async function adminRevokeUserSessions(input: { headers: Headers; userId: string }) {
	return callUntypedAuthApi('revokeUserSessions', {
		headers: input.headers,
		body: { userId: input.userId }
	});
}

export async function adminSendPasswordReset(input: { email: string; redirectTo?: string }) {
	return callUntypedAuthApi('requestPasswordReset', {
		body: {
			email: input.email,
			redirectTo: input.redirectTo
		}
	});
}
