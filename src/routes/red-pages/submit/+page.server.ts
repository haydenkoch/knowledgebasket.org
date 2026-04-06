import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { createBusiness } from '$lib/server/red-pages';
import { RATE_LIMIT_POLICIES, consumeRateLimit } from '$lib/server/rate-limit';
import { buildSubmissionAdminNotes } from '$lib/server/submission-notes';

type RedPagesSubmitDeps = {
	createBusiness: (data: Parameters<typeof createBusiness>[0]) => Promise<unknown>;
};

export function _createRedPagesSubmitActions(
	deps: RedPagesSubmitDeps = { createBusiness }
): Actions {
	return {
		default: async (event) => {
			const rateLimit = consumeRateLimit(
				event,
				RATE_LIMIT_POLICIES.publicSubmit,
				'/red-pages/submit'
			);
			if (!rateLimit.allowed) {
				return fail(429, {
					error: `Too many submissions. Please wait ${rateLimit.retryAfterSeconds} seconds and try again.`
				});
			}

			const { request, locals } = event;
			const formData = await request.formData();
			const business_name = formData.get('business_name')?.toString().trim() ?? '';
			const tribal_affiliation = formData.get('tribal_affiliation')?.toString().trim() ?? '';
			const service_type = formData.get('service_type')?.toString().trim() ?? '';
			const service_area = formData.get('service_area')?.toString().trim() ?? '';
			const description = formData.get('description')?.toString().trim() ?? '';
			const website = formData.get('website')?.toString().trim() ?? '';
			const contact_name = formData.get('contact_name')?.toString().trim() ?? '';
			const email = formData.get('email')?.toString().trim() ?? '';
			const contact_phone = formData.get('contact_phone')?.toString().trim() ?? '';

			const values = {
				business_name,
				tribal_affiliation,
				service_type,
				service_area,
				description,
				website,
				contact_name,
				email,
				contact_phone
			};

			if (
				!business_name ||
				!tribal_affiliation ||
				!service_type ||
				!description ||
				!contact_name ||
				!email
			) {
				return fail(400, {
					error:
						'Please fill in all required fields: Business name, Tribal affiliation, Service type, Description, Your name, and Your email.',
					values
				});
			}

			await deps.createBusiness({
				name: business_name,
				description,
				tribalAffiliation: tribal_affiliation,
				tribalAffiliations: tribal_affiliation ? [tribal_affiliation] : null,
				serviceType: service_type,
				serviceTypes: service_type ? [service_type] : null,
				serviceArea: service_area || null,
				region: service_area || null,
				website: website || null,
				adminNotes: buildSubmissionAdminNotes({
					name: contact_name,
					email,
					phone: contact_phone
				}),
				submittedById: locals.user?.id ?? null,
				status: 'pending',
				source: 'submission'
			});

			return {
				success: true,
				message:
					'Thank you! Your Red Pages listing has been submitted for review. Our moderation team will review it shortly.'
			};
		}
	};
}

export const actions = _createRedPagesSubmitActions();
