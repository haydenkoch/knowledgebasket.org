import type { ActionFailure } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import { exportUserPrivacyBundle, getPrivacyDashboard } from '../src/lib/server/privacy';
import {
	_createPrivacyActions,
	_loadPrivacyPage
} from '../src/routes/account/privacy/+page.server';
import { _createPrivacyExportHandler } from '../src/routes/account/privacy/export/+server';

const healthySchema = {
	ok: true,
	missing: [],
	message: null
};

const degradedPrivacySchema = {
	ok: false,
	missing: ['privacy_requests'],
	message: 'Privacy request storage is unavailable until the latest migration is applied.'
};

const degradedLifecycleSchema = {
	ok: false,
	missing: ['organization_claim_requests', 'organization_invites', 'personal_calendar_feeds'],
	message: 'Account lifecycle tools are unavailable until the latest migration is applied.'
};

function makeRequest(formData: FormData): Request {
	return new Request('http://localhost/account/privacy', {
		method: 'POST',
		body: formData
	});
}

const dashboardUser = {
	id: 'user-1',
	name: 'Sky Reader',
	email: 'sky@example.com',
	role: 'contributor',
	newsletterOptIn: false,
	createdAt: new Date('2026-04-05T00:00:00.000Z')
};

const exportedUser = {
	id: 'user-1',
	name: 'Sky Reader',
	email: 'sky@example.com',
	emailVerified: true,
	image: null,
	role: 'contributor',
	banned: false,
	banReason: null,
	banExpires: null,
	bio: null,
	avatarUrl: null,
	tribalAffiliation: null,
	location: null,
	newsletterOptIn: false,
	createdAt: new Date('2026-04-05T00:00:00.000Z'),
	updatedAt: new Date('2026-04-05T00:00:00.000Z')
};

describe('account privacy route behavior', () => {
	it('surfaces schema health in the page load payload', async () => {
		const load = _loadPrivacyPage({
			getPrivacyDashboard: vi.fn(
				async () =>
					({
						user: dashboardUser,
						requests: [],
						submissions: [],
						submissionCounts: {
							events: 0,
							funding: 0,
							jobs: 0,
							redPages: 0,
							toolbox: 0
						}
					}) satisfies Awaited<ReturnType<typeof getPrivacyDashboard>>
			),
			getPrivacyRequestsSchemaHealth: vi.fn(async () => healthySchema),
			getAccountLifecycleSchemaHealth: vi.fn(async () => degradedLifecycleSchema)
		});

		const result = await load({
			locals: { user: { id: 'user-1' } }
		} as never);

		expect(result).toEqual(
			expect.objectContaining({
				schemaHealth: {
					privacyRequests: healthySchema,
					accountLifecycle: degradedLifecycleSchema
				}
			})
		);
	});

	it('returns a clear 503 error when correction requests cannot be stored', async () => {
		const createContentPrivacyRequest = vi.fn();
		const actions = _createPrivacyActions({
			getPrivacyDashboard: vi.fn(),
			createContentPrivacyRequest,
			deleteUserAccount: vi.fn(),
			getPrivacyRequestsSchemaHealth: vi.fn(async () => degradedPrivacySchema),
			getAccountLifecycleSchemaHealth: vi.fn(async () => healthySchema)
		});

		const form = new FormData();
		form.set('subject', 'Fix listing');
		form.set('message', 'Please update this.');

		const result = (await actions.requestCorrection({
			request: makeRequest(form),
			locals: { user: { id: 'user-1' } }
		} as never)) as ActionFailure<Record<string, string>>;

		expect(result.status).toBe(503);
		expect(result.data).toEqual(
			expect.objectContaining({
				correctionError: degradedPrivacySchema.message
			})
		);
		expect(createContentPrivacyRequest).not.toHaveBeenCalled();
	});

	it('blocks self-serve account deletion when lifecycle tables are missing', async () => {
		const deleteUserAccount = vi.fn();
		const actions = _createPrivacyActions({
			getPrivacyDashboard: vi.fn(),
			createContentPrivacyRequest: vi.fn(),
			deleteUserAccount,
			getPrivacyRequestsSchemaHealth: vi.fn(async () => healthySchema),
			getAccountLifecycleSchemaHealth: vi.fn(async () => degradedLifecycleSchema)
		});

		const form = new FormData();
		form.set('confirmation', 'DELETE');

		const result = (await actions.deleteAccount({
			request: makeRequest(form),
			locals: { user: { id: 'user-1' } },
			cookies: { delete: vi.fn() }
		} as never)) as ActionFailure<Record<string, string>>;

		expect(result.status).toBe(503);
		expect(result.data).toEqual(
			expect.objectContaining({
				deleteError: degradedLifecycleSchema.message
			})
		);
		expect(deleteUserAccount).not.toHaveBeenCalled();
	});
});

describe('privacy export handler', () => {
	it('still returns the export bundle in compatibility mode without writing a request log', async () => {
		const createPrivacyRequest = vi.fn();
		const bundle = {
			exportedAt: '2026-04-05T00:00:00.000Z',
			user: exportedUser,
			sessions: [],
			accounts: [],
			verifications: [],
			privacyRequests: [],
			submissions: {
				events: [],
				funding: [],
				jobs: [],
				redPages: [],
				toolbox: []
			}
		} satisfies Awaited<ReturnType<typeof exportUserPrivacyBundle>>;
		const exportUserPrivacyBundleMock = vi.fn(async () => bundle);
		const handler = _createPrivacyExportHandler({
			createPrivacyRequest,
			exportUserPrivacyBundle: exportUserPrivacyBundleMock,
			getPrivacyRequestsSchemaHealth: vi.fn(async () => degradedPrivacySchema)
		});

		const response = await handler({
			locals: { user: { id: 'user-1' } }
		} as never);
		const expectedPayload = JSON.parse(JSON.stringify(bundle));

		expect(response.status).toBe(200);
		expect(response.headers.get('X-KB-Privacy-Schema')).toBe('compatibility');
		expect(await response.json()).toEqual(expectedPayload);
		expect(createPrivacyRequest).not.toHaveBeenCalled();
	});
});
