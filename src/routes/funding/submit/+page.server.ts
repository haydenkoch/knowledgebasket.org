import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { createFunding } from '$lib/server/funding';
import { RATE_LIMIT_POLICIES, consumeRateLimit } from '$lib/server/rate-limit';
import { buildSubmissionAdminNotes, parseDateInput } from '$lib/server/submission-notes';

type FundingSubmitDeps = {
	createFunding: (data: Parameters<typeof createFunding>[0]) => Promise<unknown>;
};

export function _createFundingSubmitActions(deps: FundingSubmitDeps = { createFunding }): Actions {
	return {
		default: async (event) => {
			const rateLimit = consumeRateLimit(
				event,
				RATE_LIMIT_POLICIES.publicSubmit,
				'/funding/submit'
			);
			if (!rateLimit.allowed) {
				return fail(429, {
					error: `Too many submissions. Please wait ${rateLimit.retryAfterSeconds} seconds and try again.`
				});
			}

			const { request, locals } = event;
			const formData = await request.formData();
			const opportunity_name = formData.get('opportunity_name')?.toString().trim() ?? '';
			const funder = formData.get('funder')?.toString().trim() ?? '';
			const funding_type = formData.get('funding_type')?.toString().trim() ?? '';
			const status = formData.get('status')?.toString().trim() ?? '';
			const focus = formData.get('focus')?.toString().trim() ?? '';
			const geography = formData.get('geography')?.toString().trim() ?? '';
			const amount = formData.get('amount')?.toString().trim() ?? '';
			const description = formData.get('description')?.toString().trim() ?? '';
			const open_date_raw = formData.get('open_date')?.toString().trim() ?? '';
			const deadline_raw = formData.get('deadline')?.toString().trim() ?? '';
			const apply_url = formData.get('apply_url')?.toString().trim() ?? '';
			const contact_name = formData.get('contact_name')?.toString().trim() ?? '';
			const email = formData.get('email')?.toString().trim() ?? '';

			const values = {
				opportunity_name,
				funder,
				funding_type,
				status,
				focus,
				geography,
				amount,
				description,
				open_date: open_date_raw,
				deadline: deadline_raw,
				apply_url,
				contact_name,
				email
			};

			if (!opportunity_name || !funder || !status || !description || !contact_name || !email) {
				return fail(400, {
					error:
						'Please fill in all required fields: Opportunity name, Funder, Status, Description, Your name, and Your email.',
					values
				});
			}

			await deps.createFunding({
				title: opportunity_name,
				description,
				funderName: funder,
				fundingType: funding_type || null,
				fundingTypes: funding_type ? [funding_type] : null,
				applicationStatus: status,
				focusAreas: focus ? [focus] : null,
				region: geography || null,
				amountDescription: amount || null,
				openDate: parseDateInput(open_date_raw),
				deadline: parseDateInput(deadline_raw),
				applyUrl: apply_url || null,
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
					'Thank you! Your funding opportunity has been submitted for review. Our moderation team will review it shortly.'
			};
		}
	};
}

export const actions = _createFundingSubmitActions();
