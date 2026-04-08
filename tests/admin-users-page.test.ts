import { describe, expect, it, vi, beforeEach } from 'vitest';

type MockAdminManagedUser = {
	id: string;
	name: string;
	email: string;
	role: string | null;
};

type MockAdminUsersResult = {
	users: MockAdminManagedUser[];
	search: string;
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
	adminCount: number;
	bannedCount: number;
};

const listAdminManagedUsers = vi.fn(async (): Promise<MockAdminUsersResult> => ({
	users: [],
	search: '',
	page: 1,
	pageSize: 20,
	total: 0,
	totalPages: 1,
	adminCount: 1,
	bannedCount: 0
}));

const adminSetUserRole = vi.fn(async () => undefined);
const adminSendPasswordReset = vi.fn(async () => undefined);
const adminRevokeUserSessions = vi.fn(async () => undefined);
const adminBanUser = vi.fn(async () => undefined);
const adminUnbanUser = vi.fn(async () => undefined);

vi.mock('../src/lib/server/admin-users', () => ({
	ADMIN_USERS_PAGE_SIZE: 20,
	listAdminManagedUsers,
	adminSetUserRole,
	adminSendPasswordReset,
	adminRevokeUserSessions,
	adminBanUser,
	adminUnbanUser,
	normalizeManageableUserRole: (role: string) =>
		role === 'contributor' || role === 'moderator' || role === 'admin' ? role : null,
	toAdminUsersErrorMessage: (error: unknown, fallback: string) =>
		error instanceof Error ? error.message : fallback
}));

function makeRequest(form: FormData) {
	return new Request('http://localhost/admin/users', {
		method: 'POST',
		body: form
	});
}

describe('admin users page server', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('blocks moderators from loading the page', async () => {
		const mod = await import('../src/routes/admin/users/+page.server');

		await expect(
			mod.load({
				locals: { user: { id: 'moderator-1', role: 'moderator' } },
				url: new URL('http://localhost/admin/users')
			} as never)
		).rejects.toMatchObject({ status: 403 });
	});

	it('loads users for site admins', async () => {
		listAdminManagedUsers.mockResolvedValueOnce({
			users: [{ id: 'user-2', name: 'Sky Reader', email: 'sky@example.com', role: 'contributor' }],
			search: 'sky',
			page: 2,
			pageSize: 20,
			total: 31,
			totalPages: 2,
			adminCount: 2,
			bannedCount: 1
		});

		const mod = await import('../src/routes/admin/users/+page.server');
		const result = await mod.load({
			locals: { user: { id: 'admin-1', role: 'admin' } },
			url: new URL('http://localhost/admin/users?q=sky&page=2')
		} as never);

		expect(listAdminManagedUsers).toHaveBeenCalledWith({
			search: 'sky',
			page: 2,
			pageSize: 20
		});
		expect(result).toEqual(
			expect.objectContaining({
				currentAdminId: 'admin-1',
				total: 31,
				rangeStart: 21,
				rangeEnd: 31
			})
		);
	});

	it('prevents the current admin from demoting themselves', async () => {
		const mod = await import('../src/routes/admin/users/+page.server');
		const form = new FormData();
		form.set('userId', 'admin-1');
		form.set('role', 'moderator');

		const result = await mod.actions.setRole({
			locals: { user: { id: 'admin-1', role: 'admin' } },
			request: makeRequest(form)
		} as never);

		expect(adminSetUserRole).not.toHaveBeenCalled();
		expect(result).toMatchObject({
			status: 400,
			data: { error: 'You cannot remove your own site admin access.' }
		});
	});

	it('updates another user role when requested by an admin', async () => {
		const mod = await import('../src/routes/admin/users/+page.server');
		const form = new FormData();
		form.set('userId', 'user-2');
		form.set('role', 'moderator');

		const result = await mod.actions.setRole({
			locals: { user: { id: 'admin-1', role: 'admin' } },
			request: makeRequest(form)
		} as never);

		expect(adminSetUserRole).toHaveBeenCalledWith({
			headers: expect.any(Headers),
			userId: 'user-2',
			role: 'moderator'
		});
		expect(result).toEqual({ success: 'Permissions updated to moderator.' });
	});

	it('sends password reset instructions for a valid email', async () => {
		const mod = await import('../src/routes/admin/users/+page.server');
		const form = new FormData();
		form.set('email', 'sky@example.com');

		const result = await mod.actions.sendPasswordReset({
			locals: { user: { id: 'admin-1', role: 'admin' } },
			request: makeRequest(form)
		} as never);

		expect(adminSendPasswordReset).toHaveBeenCalledWith({
			email: 'sky@example.com',
			redirectTo: '/auth/reset-password'
		});
		expect(result).toEqual({ success: 'Password reset instructions sent to sky@example.com.' });
	});

	it('bans another user with the selected duration', async () => {
		const mod = await import('../src/routes/admin/users/+page.server');
		const form = new FormData();
		form.set('userId', 'user-2');
		form.set('banReason', 'Repeated abuse');
		form.set('banDuration', '604800');

		const result = await mod.actions.ban({
			locals: { user: { id: 'admin-1', role: 'admin' } },
			request: makeRequest(form)
		} as never);

		expect(adminBanUser).toHaveBeenCalledWith({
			headers: expect.any(Headers),
			userId: 'user-2',
			reason: 'Repeated abuse',
			expiresInSeconds: 604800
		});
		expect(result).toEqual({ success: 'User access disabled and active sessions revoked.' });
	});
});
