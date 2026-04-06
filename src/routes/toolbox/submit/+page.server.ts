import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { createResource } from '$lib/server/toolbox';
import { RATE_LIMIT_POLICIES, consumeRateLimit } from '$lib/server/rate-limit';
import { buildSubmissionAdminNotes } from '$lib/server/submission-notes';

type ToolboxSubmitDeps = {
	createResource: (data: Parameters<typeof createResource>[0]) => Promise<unknown>;
};

export function _createToolboxSubmitActions(deps: ToolboxSubmitDeps = { createResource }): Actions {
	return {
		default: async (event) => {
			const rateLimit = consumeRateLimit(
				event,
				RATE_LIMIT_POLICIES.publicSubmit,
				'/toolbox/submit'
			);
			if (!rateLimit.allowed) {
				return fail(429, {
					error: `Too many submissions. Please wait ${rateLimit.retryAfterSeconds} seconds and try again.`
				});
			}

			const { request, locals } = event;
			const formData = await request.formData();
			const resource_title = formData.get('resource_title')?.toString().trim() ?? '';
			const url = formData.get('url')?.toString().trim() ?? '';
			const media_type = formData.get('media_type')?.toString().trim() ?? '';
			const category = formData.get('category')?.toString().trim() ?? '';
			const source = formData.get('source')?.toString().trim() ?? '';
			const description = formData.get('description')?.toString().trim() ?? '';
			const contact_name = formData.get('contact_name')?.toString().trim() ?? '';
			const email = formData.get('email')?.toString().trim() ?? '';

			const values = {
				resource_title,
				url,
				media_type,
				category,
				source,
				description,
				contact_name,
				email
			};

			if (!resource_title || !url || !description || !contact_name || !email) {
				return fail(400, {
					error:
						'Please fill in all required fields: Resource title, URL, Description, Your name, and Your email.',
					values
				});
			}

			await deps.createResource({
				title: resource_title,
				description,
				sourceName: source || null,
				resourceType: media_type || 'resource',
				mediaType: media_type || null,
				category: category || null,
				categories: category ? [category] : null,
				contentMode: 'link',
				externalUrl: url,
				adminNotes: buildSubmissionAdminNotes({
					name: contact_name,
					email
				}),
				submittedById: locals.user?.id ?? null,
				status: 'pending',
				source: 'submission'
			});

			return {
				success: true,
				message:
					'Thank you! Your resource has been submitted for review. Our moderation team will review it shortly.'
			};
		}
	};
}

export const actions = _createToolboxSubmitActions();
