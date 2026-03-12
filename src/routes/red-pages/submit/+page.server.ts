import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { readSubmissions, appendSubmission, generateSlug, getExistingIds } from '$lib/server/submissions';
import { kbData } from '$lib/data/kb';
import type { RedPagesItem } from '$lib/data/kb';

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const business_name = (formData.get('business_name') as string)?.trim();
		const tribal_affiliation = (formData.get('tribal_affiliation') as string)?.trim();
		const service_type = (formData.get('service_type') as string)?.trim();
		const service_area = (formData.get('service_area') as string)?.trim();
		const description = (formData.get('description') as string)?.trim();
		const website = (formData.get('website') as string)?.trim();
		const contact_name = (formData.get('contact_name') as string)?.trim();
		const email = (formData.get('email') as string)?.trim();
		const contact_phone = (formData.get('contact_phone') as string)?.trim();

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

		if (!business_name || !tribal_affiliation || !service_type || !description || !contact_name || !email) {
			return fail(400, {
				error: 'Please fill in all required fields: Business name, Tribal affiliation, Service type, Description, Your name, and Your email. Listings must be Native/Indigenous-owned or led.',
				values
			});
		}

		const existing = [...kbData.redpages, ...(await readSubmissions('redpages'))];
		const id = generateSlug(business_name, getExistingIds(existing));

		const item: RedPagesItem = {
			id,
			title: business_name,
			description: description || undefined,
			coil: 'redpages',
			tribe: tribal_affiliation || undefined,
			serviceType: service_type || undefined,
			region: service_area || undefined,
			website: website || undefined
		};

		await appendSubmission('redpages', item);

		return {
			success: true,
			message:
				'Thank you! Your listing has been submitted and is now live. IFS staff may follow up within 3–5 business days.'
		};
	}
};
