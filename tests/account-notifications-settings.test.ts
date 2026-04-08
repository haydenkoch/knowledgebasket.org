import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUnreadNotificationCount = vi.fn(async () => 0);
const getUserNotificationPreferences = vi.fn(async () => ({
	id: 'pref-1',
	userId: 'user-1',
	emailSubmissionUpdates: true,
	emailOrgActivity: true,
	emailFollowedOrgs: true,
	emailBookmarkReminders: true,
	emailNewsletter: true,
	inAppSubmissionUpdates: true,
	inAppOrgActivity: true,
	inAppFollowedOrgs: true,
	inAppBookmarkReminders: true,
	updatedAt: new Date('2026-04-07T19:00:00.000Z')
}));
const getUserNotifications = vi.fn(async () => []);
const markAllNotificationsRead = vi.fn(async () => undefined);
const markNotificationRead = vi.fn(async () => undefined);
const updateUserNotificationPreferences = vi.fn(async () => ({
	id: 'pref-1',
	userId: 'user-1',
	emailSubmissionUpdates: true,
	emailOrgActivity: false,
	emailFollowedOrgs: false,
	emailBookmarkReminders: false,
	emailNewsletter: true,
	inAppSubmissionUpdates: false,
	inAppOrgActivity: true,
	inAppFollowedOrgs: false,
	inAppBookmarkReminders: false,
	updatedAt: new Date('2026-04-07T20:00:00.000Z')
}));

vi.mock('../src/lib/server/personalization', () => ({
	getUnreadNotificationCount,
	getUserNotificationPreferences,
	getUserNotifications,
	markAllNotificationsRead,
	markNotificationRead,
	updateUserNotificationPreferences
}));

vi.mock('../src/lib/server/access-control', () => ({
	requireAuthenticatedUser: vi.fn((locals: { user?: { id: string } }) => {
		if (!locals.user) {
			throw { status: 401 };
		}

		return locals.user;
	})
}));

function makeRequest(formData: FormData): Request {
	return new Request('http://localhost/account/notifications', {
		method: 'POST',
		body: formData
	});
}

describe('account notification settings', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('stores preferences and returns a future-use confirmation message', async () => {
		const mod = await import('../src/routes/account/notifications/+page.server');
		const form = new FormData();
		form.set('emailSubmissionUpdates', 'on');
		form.set('emailNewsletter', 'on');
		form.set('inAppOrgActivity', 'on');

		const result = await mod.actions.savePreferences({
			locals: { user: { id: 'user-1' } },
			request: makeRequest(form)
		} as never);

		expect(updateUserNotificationPreferences).toHaveBeenCalledWith('user-1', {
			emailSubmissionUpdates: true,
			emailOrgActivity: false,
			emailFollowedOrgs: false,
			emailBookmarkReminders: false,
			emailNewsletter: true,
			inAppSubmissionUpdates: false,
			inAppOrgActivity: true,
			inAppFollowedOrgs: false,
			inAppBookmarkReminders: false
		});
		expect(result).toEqual({
			preferencesSuccess: 'Preferences saved for future notifications.',
			preferencesSavedAt: '2026-04-07T20:00:00.000Z'
		});
	});
});
