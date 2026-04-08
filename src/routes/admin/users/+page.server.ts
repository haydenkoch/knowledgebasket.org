import { error, fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	ADMIN_USERS_PAGE_SIZE,
	adminBanUser,
	adminRevokeUserSessions,
	adminSendPasswordReset,
	adminSetUserRole,
	adminUnbanUser,
	listAdminManagedUsers,
	normalizeManageableUserRole,
	toAdminUsersErrorMessage
} from '$lib/server/admin-users';

function requireSiteAdmin(locals: App.Locals) {
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	if (locals.user.role !== 'admin') {
		throw error(403, 'Only site admins can manage users.');
	}

	return locals.user;
}

function parseBanDuration(value: string): number | undefined {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
	return Math.floor(parsed);
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const currentAdmin = requireSiteAdmin(locals);
	const search = url.searchParams.get('q')?.trim() ?? '';
	const page = Number(url.searchParams.get('page') ?? '1');
	const users = await listAdminManagedUsers({
		search,
		page,
		pageSize: ADMIN_USERS_PAGE_SIZE
	});

	return {
		...users,
		currentAdminId: currentAdmin.id,
		rangeStart: users.total === 0 ? 0 : (users.page - 1) * users.pageSize + 1,
		rangeEnd: users.total === 0 ? 0 : Math.min(users.page * users.pageSize, users.total)
	};
};

export const actions: Actions = {
	setRole: async ({ locals, request }) => {
		const admin = requireSiteAdmin(locals);
		const formData = await request.formData();
		const userId = String(formData.get('userId') ?? '').trim();
		const roleValue = String(formData.get('role') ?? '').trim();
		const role = normalizeManageableUserRole(roleValue);

		if (!userId) return fail(400, { error: 'Choose a user to update.' });
		if (!role) return fail(400, { error: 'Choose a valid role.' });
		if (userId === admin.id && role !== 'admin') {
			return fail(400, { error: 'You cannot remove your own site admin access.' });
		}

		try {
			await adminSetUserRole({
				headers: request.headers,
				userId,
				role
			});
		} catch (err) {
			return fail(400, {
				error: toAdminUsersErrorMessage(err, 'Unable to update user permissions right now.')
			});
		}

		return { success: `Permissions updated to ${role}.` };
	},
	sendPasswordReset: async ({ locals, request }) => {
		requireSiteAdmin(locals);
		const formData = await request.formData();
		const email = String(formData.get('email') ?? '').trim();

		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return fail(400, { error: 'Enter a valid email address to send a reset link.' });
		}

		try {
			await adminSendPasswordReset({
				email,
				redirectTo: '/auth/reset-password'
			});
		} catch (err) {
			return fail(400, {
				error: toAdminUsersErrorMessage(err, 'Unable to send a password reset right now.')
			});
		}

		return { success: `Password reset instructions sent to ${email}.` };
	},
	revokeSessions: async ({ locals, request }) => {
		const admin = requireSiteAdmin(locals);
		const formData = await request.formData();
		const userId = String(formData.get('userId') ?? '').trim();

		if (!userId) return fail(400, { error: 'Choose a user whose sessions should be revoked.' });
		if (userId === admin.id) {
			return fail(400, { error: 'Use the account settings page to manage your own sessions.' });
		}

		try {
			await adminRevokeUserSessions({
				headers: request.headers,
				userId
			});
		} catch (err) {
			return fail(400, {
				error: toAdminUsersErrorMessage(err, 'Unable to revoke sessions right now.')
			});
		}

		return { success: 'All active sessions were revoked for that user.' };
	},
	ban: async ({ locals, request }) => {
		const admin = requireSiteAdmin(locals);
		const formData = await request.formData();
		const userId = String(formData.get('userId') ?? '').trim();
		const reason = String(formData.get('banReason') ?? '').trim();
		const duration = parseBanDuration(String(formData.get('banDuration') ?? '').trim());

		if (!userId) return fail(400, { error: 'Choose a user to ban.' });
		if (userId === admin.id) {
			return fail(400, { error: 'You cannot ban your own account.' });
		}

		try {
			await adminBanUser({
				headers: request.headers,
				userId,
				reason,
				expiresInSeconds: duration
			});
		} catch (err) {
			return fail(400, {
				error: toAdminUsersErrorMessage(err, 'Unable to ban that user right now.')
			});
		}

		return { success: 'User access disabled and active sessions revoked.' };
	},
	unban: async ({ locals, request }) => {
		requireSiteAdmin(locals);
		const formData = await request.formData();
		const userId = String(formData.get('userId') ?? '').trim();

		if (!userId) return fail(400, { error: 'Choose a user to restore.' });

		try {
			await adminUnbanUser({
				headers: request.headers,
				userId
			});
		} catch (err) {
			return fail(400, {
				error: toAdminUsersErrorMessage(err, 'Unable to restore that user right now.')
			});
		}

		return { success: 'User access restored.' };
	}
};
