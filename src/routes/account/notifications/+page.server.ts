import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireAuthenticatedUser } from '$lib/server/access-control';
import {
	getUnreadNotificationCount,
	getUserNotificationPreferences,
	getUserNotifications,
	markAllNotificationsRead,
	markNotificationRead,
	updateUserNotificationPreferences
} from '$lib/server/personalization';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireAuthenticatedUser(locals);
	const [notifications, preferences, unreadCount] = await Promise.all([
		getUserNotifications(user.id),
		getUserNotificationPreferences(user.id),
		getUnreadNotificationCount(user.id)
	]);

	return { notifications, preferences, unreadCount };
};

export const actions: Actions = {
	savePreferences: async ({ locals, request }) => {
		const user = requireAuthenticatedUser(locals);
		const formData = await request.formData();
		const preferences = await updateUserNotificationPreferences(user.id, {
			emailSubmissionUpdates: formData.has('emailSubmissionUpdates'),
			emailOrgActivity: formData.has('emailOrgActivity'),
			emailFollowedOrgs: formData.has('emailFollowedOrgs'),
			emailBookmarkReminders: formData.has('emailBookmarkReminders'),
			emailNewsletter: formData.has('emailNewsletter'),
			inAppSubmissionUpdates: formData.has('inAppSubmissionUpdates'),
			inAppOrgActivity: formData.has('inAppOrgActivity'),
			inAppFollowedOrgs: formData.has('inAppFollowedOrgs'),
			inAppBookmarkReminders: formData.has('inAppBookmarkReminders')
		});

		return {
			preferencesSuccess: 'Preferences saved for future notifications.',
			preferencesSavedAt: preferences.updatedAt.toISOString()
		};
	},
	markRead: async ({ locals, request }) => {
		const user = requireAuthenticatedUser(locals);
		const formData = await request.formData();
		const notificationId = formData.get('notificationId')?.toString().trim();
		if (!notificationId) return fail(400, { error: 'Notification is required.' });
		await markNotificationRead(user.id, notificationId);
		return { success: true };
	},
	markAllRead: async ({ locals }) => {
		const user = requireAuthenticatedUser(locals);
		await markAllNotificationsRead(user.id);
		return { success: true };
	}
};
