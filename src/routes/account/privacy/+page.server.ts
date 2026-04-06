import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	createContentPrivacyRequest,
	deleteUserAccount,
	getPrivacyDashboard
} from '$lib/server/privacy';
import {
	getAccountLifecycleSchemaHealth,
	getPrivacyRequestsSchemaHealth
} from '$lib/server/privacy-schema';

type PrivacyPageDeps = {
	getPrivacyDashboard: typeof getPrivacyDashboard;
	createContentPrivacyRequest: typeof createContentPrivacyRequest;
	deleteUserAccount: typeof deleteUserAccount;
	getPrivacyRequestsSchemaHealth: typeof getPrivacyRequestsSchemaHealth;
	getAccountLifecycleSchemaHealth: typeof getAccountLifecycleSchemaHealth;
};

export function _loadPrivacyPage(
	deps: Pick<
		PrivacyPageDeps,
		'getPrivacyDashboard' | 'getPrivacyRequestsSchemaHealth' | 'getAccountLifecycleSchemaHealth'
	> = {
		getPrivacyDashboard,
		getPrivacyRequestsSchemaHealth,
		getAccountLifecycleSchemaHealth
	}
): PageServerLoad {
	return async ({ locals }) => {
		const [dashboard, privacyRequests, accountLifecycle] = await Promise.all([
			deps.getPrivacyDashboard(locals.user!.id),
			deps.getPrivacyRequestsSchemaHealth(),
			deps.getAccountLifecycleSchemaHealth()
		]);

		return {
			...dashboard,
			schemaHealth: {
				privacyRequests,
				accountLifecycle
			}
		};
	};
}

export const load = _loadPrivacyPage();

export function _createPrivacyActions(
	deps: PrivacyPageDeps = {
		createContentPrivacyRequest,
		deleteUserAccount,
		getPrivacyDashboard,
		getPrivacyRequestsSchemaHealth,
		getAccountLifecycleSchemaHealth
	}
): Actions {
	return {
		requestCorrection: async ({ request, locals }) => {
			const schemaHealth = await deps.getPrivacyRequestsSchemaHealth();
			if (!schemaHealth.ok) {
				return fail(503, {
					correctionError:
						schemaHealth.message ??
						'Privacy request storage is unavailable until the latest migration is applied.'
				});
			}

			const formData = await request.formData();
			const subject = formData.get('subject')?.toString().trim() ?? '';
			const contentUrl = formData.get('contentUrl')?.toString().trim() ?? '';
			const message = formData.get('message')?.toString().trim() ?? '';

			if (!subject || !message) {
				return fail(400, {
					correctionError:
						'Add a subject and enough detail for us to review the correction request.'
				});
			}

			await deps.createContentPrivacyRequest({
				userId: locals.user!.id,
				requestType: 'correct_content',
				subject,
				message,
				contentUrl
			});

			return { correctionSuccess: 'Correction request submitted.' };
		},
		requestRemoval: async ({ request, locals }) => {
			const schemaHealth = await deps.getPrivacyRequestsSchemaHealth();
			if (!schemaHealth.ok) {
				return fail(503, {
					removalError:
						schemaHealth.message ??
						'Privacy request storage is unavailable until the latest migration is applied.'
				});
			}

			const formData = await request.formData();
			const subject = formData.get('subject')?.toString().trim() ?? '';
			const contentUrl = formData.get('contentUrl')?.toString().trim() ?? '';
			const message = formData.get('message')?.toString().trim() ?? '';

			if (!subject || !message) {
				return fail(400, {
					removalError: 'Add a subject and enough detail for us to review the removal request.'
				});
			}

			await deps.createContentPrivacyRequest({
				userId: locals.user!.id,
				requestType: 'remove_content',
				subject,
				message,
				contentUrl
			});

			return { removalSuccess: 'Removal request submitted.' };
		},
		deleteAccount: async ({ request, locals, cookies }) => {
			const schemaHealth = await deps.getAccountLifecycleSchemaHealth();
			if (!schemaHealth.ok) {
				return fail(503, {
					deleteError:
						schemaHealth.message ??
						'Account lifecycle tools are unavailable until the latest migration is applied.'
				});
			}

			const formData = await request.formData();
			const confirmation = formData.get('confirmation')?.toString().trim() ?? '';
			if (confirmation !== 'DELETE') {
				return fail(400, {
					deleteError: 'Type DELETE to confirm that you want to delete your account.'
				});
			}

			await deps.deleteUserAccount(locals.user!.id);
			cookies.delete('better-auth.session_token', { path: '/' });
			throw redirect(303, '/?accountDeleted=1');
		}
	};
}

export const actions = _createPrivacyActions();
