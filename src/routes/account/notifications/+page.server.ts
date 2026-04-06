import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	getUnreadNotificationCount,
	getUserNotificationPreferences,
	getUserNotifications,
	markAllNotificationsRead,
	markNotificationRead,
	updateUserNotificationPreferences
} from '$lib/server/personalization';

export const load: PageServerLoad = async ({ locals }) => {
	const [notifications, preferences, unreadCount] = await Promise.all([
		getUserNotifications(locals.user!.id),
		getUserNotificationPreferences(locals.user!.id),
		getUnreadNotificationCount(locals.user!.id)
	]);

	return { notifications, preferences, unreadCount };
};

export const actions: Actions = {
	savePreferences: async ({ locals, request }) => {
		const formData = await request.formData();
		await updateUserNotificationPreferences(locals.user!.id, {
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

		return { success: true };
	},
	markRead: async ({ locals, request }) => {
		const formData = await request.formData();
		const notificationId = formData.get('notificationId')?.toString().trim();
		if (!notificationId) return fail(400, { error: 'Notification is required.' });
		await markNotificationRead(locals.user!.id, notificationId);
		return { success: true };
	},
	markAllRead: async ({ locals }) => {
		await markAllNotificationsRead(locals.user!.id);
		return { success: true };
	}
};
