import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { readSubmissions, appendSubmission, generateSlug, getExistingIds } from '$lib/server/submissions';
import { kbData } from '$lib/data/kb';
import type { ToolboxItem } from '$lib/data/kb';

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const resource_title = (formData.get('resource_title') as string)?.trim();
		const url = (formData.get('url') as string)?.trim();
		const media_type = (formData.get('media_type') as string)?.trim();
		const category = (formData.get('category') as string)?.trim();
		const source = (formData.get('source') as string)?.trim();
		const description = (formData.get('description') as string)?.trim();
		const contact_name = (formData.get('contact_name') as string)?.trim();
		const email = (formData.get('email') as string)?.trim();

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
				error: 'Please fill in all required fields: Resource title, URL, Description, Your name, and Your email.',
				values
			});
		}

		try {
			new URL(url);
		} catch {
			return fail(400, { error: 'Please enter a valid URL.', values });
		}

		const existing = [...kbData.toolbox, ...(await readSubmissions('toolbox'))];
		const id = generateSlug(resource_title, getExistingIds(existing));

		const item: ToolboxItem = {
			id,
			title: resource_title,
			description: description || undefined,
			coil: 'toolbox',
			source: source || undefined,
			mediaType: media_type || undefined,
			category: category || undefined,
			url: url || undefined
		};

		await appendSubmission('toolbox', item);

		return {
			success: true,
			message:
				'Thank you! Your resource has been submitted and is now live. IFS staff may add it to curated collections within 3–5 business days.'
		};
	}
};
