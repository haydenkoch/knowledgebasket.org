import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createPrivacyRequest, exportUserPrivacyBundle } from '$lib/server/privacy';
import { getPrivacyRequestsSchemaHealth } from '$lib/server/privacy-schema';

type PrivacyExportDeps = {
	createPrivacyRequest: typeof createPrivacyRequest;
	exportUserPrivacyBundle: typeof exportUserPrivacyBundle;
	getPrivacyRequestsSchemaHealth: typeof getPrivacyRequestsSchemaHealth;
};

export function _createPrivacyExportHandler(
	deps: PrivacyExportDeps = {
		createPrivacyRequest,
		exportUserPrivacyBundle,
		getPrivacyRequestsSchemaHealth
	}
): RequestHandler {
	return async ({ locals }) => {
		if (!locals.user) {
			throw redirect(303, '/auth/login?redirect=/account/privacy');
		}

		const bundle = await deps.exportUserPrivacyBundle(locals.user.id);
		const schemaHealth = await deps.getPrivacyRequestsSchemaHealth();

		if (schemaHealth.ok) {
			await deps.createPrivacyRequest({
				userId: locals.user.id,
				requestType: 'export_data',
				subject: 'Self-serve privacy export',
				status: 'fulfilled',
				fulfilledAt: new Date(),
				details: { format: 'json' },
				resolutionNotes: 'Export downloaded through account privacy page.'
			});
		}

		return json(bundle, {
			headers: {
				'Content-Disposition': `attachment; filename="knowledge-basket-privacy-export-${locals.user.id}.json"`,
				'X-KB-Privacy-Schema': schemaHealth.ok ? 'ready' : 'compatibility'
			}
		});
	};
}

export const GET = _createPrivacyExportHandler();
