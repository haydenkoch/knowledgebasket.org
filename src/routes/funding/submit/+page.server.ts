import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { readSubmissions, appendSubmission, generateSlug, getExistingIds } from '$lib/server/submissions';
import { kbData } from '$lib/data/kb';
import type { FundingItem } from '$lib/data/kb';

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const opportunity_name = (formData.get('opportunity_name') as string)?.trim();
		const funder = (formData.get('funder') as string)?.trim();
		const funding_type = (formData.get('funding_type') as string)?.trim();
		const status = (formData.get('status') as string)?.trim();
		const focus = (formData.get('focus') as string)?.trim();
		const geography = (formData.get('geography') as string)?.trim();
		const amount = (formData.get('amount') as string)?.trim();
		const description = (formData.get('description') as string)?.trim();
		const apply_url = (formData.get('apply_url') as string)?.trim();
		const contact_name = (formData.get('contact_name') as string)?.trim();
		const email = (formData.get('email') as string)?.trim();

		const values = {
			opportunity_name,
			funder,
			funding_type,
			status,
			focus,
			geography,
			amount,
			description,
			apply_url,
			contact_name,
			email
		};

		if (!opportunity_name || !funder || !status || !description || !contact_name || !email) {
			return fail(400, {
				error: 'Please fill in all required fields: Opportunity name, Funder, Status, Description, Your name, and Your email.',
				values
			});
		}

		const existing = [...kbData.funding, ...(await readSubmissions('funding'))];
		const id = generateSlug(opportunity_name, getExistingIds(existing));

		const item: FundingItem = {
			id,
			title: opportunity_name,
			description: description || undefined,
			coil: 'funding',
			funder: funder || undefined,
			status: status || undefined,
			amount: amount || undefined,
			region: geography || undefined,
			focus: focus || undefined,
			fundingType: funding_type || undefined,
			applyUrl: apply_url || undefined
		};

		await appendSubmission('funding', item);

		return {
			success: true,
			message:
				'Thank you! Your funding opportunity has been submitted and is now live. IFS staff may follow up within 3–5 business days.'
		};
	}
};
