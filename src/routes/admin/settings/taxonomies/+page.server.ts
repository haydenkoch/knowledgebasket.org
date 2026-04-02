import type { Actions, PageServerLoad } from './$types';
import {
	getTags,
	getAllOptions,
	createTag,
	updateTag,
	deleteTag,
	createOption,
	updateOption,
	deleteOption
} from '$lib/server/taxonomy';
import {
	geographyOptions,
	eventTypeTags,
	eventAudienceOptions,
	eventCostOptions
} from '$lib/data/formSchema';
import { db } from '$lib/server/db';
import { taxonomyTags, taxonomyOptions } from '$lib/server/db/schema';

export const load: PageServerLoad = async () => {
	const tags = await getTags();
	const options = await getAllOptions();

	// Seed from formSchema if empty (one-time)
	const tagCount = tags.length;
	const optionCount = options.length;
	if (tagCount === 0 || optionCount === 0) {
		// Seed tags from event types
		if (tagCount === 0) {
			for (let i = 0; i < eventTypeTags.length; i++) {
				const label = eventTypeTags[i];
				const base =
					label
						.toLowerCase()
						.replace(/[^a-z0-9]+/g, '-')
						.replace(/^-|-$/g, '') || 'tag';
				await db.insert(taxonomyTags).values({
					slug: `${base}-${i}`,
					label,
					group: 'event_type',
					sortOrder: i
				});
			}
		}
		// Seed options: region, audience, cost
		if (optionCount === 0) {
			const regionValues = geographyOptions.filter((o) => o.value !== '');
			for (let i = 0; i < regionValues.length; i++) {
				await db.insert(taxonomyOptions).values({
					key: 'region',
					value: regionValues[i].value,
					label: regionValues[i].label,
					sortOrder: i
				});
			}
			for (let i = 0; i < eventAudienceOptions.length; i++) {
				const o = eventAudienceOptions[i];
				if (o.value)
					await db.insert(taxonomyOptions).values({
						key: 'audience',
						value: o.value,
						label: o.label,
						sortOrder: i
					});
			}
			for (let i = 0; i < eventCostOptions.length; i++) {
				const o = eventCostOptions[i];
				if (o.value)
					await db.insert(taxonomyOptions).values({
						key: 'cost',
						value: o.value,
						label: o.label,
						sortOrder: i
					});
			}
		}
		// Reload after seed
		return {
			tags: await getTags(),
			options: await getAllOptions()
		};
	}

	return { tags, options };
};

export const actions: Actions = {
	// Tags
	createTag: async ({ request }) => {
		const form = await request.formData();
		const label = (form.get('label') as string)?.trim();
		const group = (form.get('group') as string) || 'event_type';
		if (!label) return { success: false, error: 'Label required' };
		await createTag({ label, group, sortOrder: 0 });
		return { success: true };
	},
	updateTag: async ({ request }) => {
		const form = await request.formData();
		const id = form.get('id') as string;
		const label = (form.get('label') as string)?.trim();
		const group = (form.get('group') as string)?.trim();
		if (!id) return { success: false, error: 'ID required' };
		await updateTag(id, { label: label || undefined, group: group || undefined });
		return { success: true };
	},
	deleteTag: async ({ request }) => {
		const form = await request.formData();
		const id = form.get('id') as string;
		if (!id) return { success: false, error: 'ID required' };
		await deleteTag(id);
		return { success: true };
	},
	// Options
	createOption: async ({ request }) => {
		const form = await request.formData();
		const key = (form.get('key') as string)?.trim();
		const value = (form.get('value') as string)?.trim();
		const label = (form.get('label') as string)?.trim() || value;
		if (!key || !value) return { success: false, error: 'Key and value required' };
		await createOption({ key, value, label, sortOrder: 0 });
		return { success: true };
	},
	updateOption: async ({ request }) => {
		const form = await request.formData();
		const id = form.get('id') as string;
		const value = (form.get('value') as string)?.trim();
		const label = (form.get('label') as string)?.trim();
		if (!id) return { success: false, error: 'ID required' };
		await updateOption(id, { value: value || undefined, label: label || undefined });
		return { success: true };
	},
	deleteOption: async ({ request }) => {
		const form = await request.formData();
		const id = form.get('id') as string;
		if (!id) return { success: false, error: 'ID required' };
		await deleteOption(id);
		return { success: true };
	}
};
