import { getPrivacyDashboard } from '$lib/server/privacy';
import {
	getAccountQuickCounts,
	getFollowedOrganizations,
	getPersonalCalendarFeed,
	getUnreadNotificationCount,
	getUserBookmarks,
	getUserNotificationPreferences,
	getUserNotifications
} from '$lib/server/personalization';
import { listUserOrganizationClaims, listUserOrganizations } from '$lib/server/organization-access';

export async function getAccountDashboard(userId: string) {
	const [
		privacy,
		counts,
		organizations,
		claims,
		follows,
		bookmarks,
		notifications,
		unreadCount,
		preferences,
		calendarFeed
	] = await Promise.all([
		getPrivacyDashboard(userId),
		getAccountQuickCounts(userId),
		listUserOrganizations(userId),
		listUserOrganizationClaims(userId),
		getFollowedOrganizations(userId),
		getUserBookmarks(userId),
		getUserNotifications(userId, 10),
		getUnreadNotificationCount(userId),
		getUserNotificationPreferences(userId),
		getPersonalCalendarFeed(userId)
	]);

	return {
		privacy,
		counts,
		organizations,
		claims,
		follows,
		bookmarks,
		notifications,
		unreadCount,
		preferences,
		calendarFeed
	};
}
