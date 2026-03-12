import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { readSubmissions, appendSubmission, generateSlug, getExistingIds } from '$lib/server/submissions';
import { kbData } from '$lib/data/kb';
import type { EventItem } from '$lib/data/kb';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const EXT_MAP: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const event_name = (formData.get('event_name') as string)?.trim();
		const host_org = (formData.get('host_org') as string)?.trim();
		const event_type_raw = (formData.get('event_type') as string)?.trim() ?? '';
		const event_types = event_type_raw ? event_type_raw.split(',').map((s) => s.trim()).filter(Boolean) : [];
		const event_type = event_types.length > 0 ? event_types.join(', ') : '';
		const geography = (formData.get('geography') as string)?.trim();
		const audience = (formData.get('audience') as string)?.trim();
		const cost = (formData.get('cost') as string)?.trim();
		const description = (formData.get('description') as string)?.trim();
		const start_date = (formData.get('start_date') as string)?.trim();
		const end_date = (formData.get('end_date') as string)?.trim();
		const venue = (formData.get('venue') as string)?.trim();
		const address = (formData.get('address') as string)?.trim();
		const city_state = (formData.get('city_state') as string)?.trim();
		const latStr = (formData.get('lat') as string)?.trim();
		const lngStr = (formData.get('lng') as string)?.trim();
		const event_url = (formData.get('event_url') as string)?.trim();
		const contact_name = (formData.get('contact_name') as string)?.trim();
		const email = (formData.get('email') as string)?.trim();
		const image = formData.get('image') as File | null;

		const values = {
			event_name,
			host_org,
			event_type: event_type_raw,
			geography,
			audience,
			cost,
			description,
			start_date,
			end_date,
			venue,
			address,
			city_state,
			lat: latStr,
			lng: lngStr,
			event_url,
			contact_name,
			email
		};

		if (
			!event_name ||
			!host_org ||
			event_types.length === 0 ||
			!geography ||
			!audience ||
			!cost ||
			!description ||
			!start_date ||
			!city_state ||
			!event_url ||
			!contact_name ||
			!email
		) {
			return fail(400, {
				error:
					'Please fill in all required fields: Event name, Host organization, Event type, Geography, Audience, Cost, Description, Start date, City/State, Event URL, Your name, and Your email.',
				values
			});
		}

		if (image && image.size > 0) {
			if (image.size > MAX_IMAGE_SIZE) {
				return fail(400, { error: 'Image must be 5 MB or smaller.', values });
			}
			if (!ALLOWED_IMAGE_TYPES.includes(image.type)) {
				return fail(400, { error: 'Image must be JPG, PNG, or WebP.', values });
			}
		}

		const existing = [...kbData.events, ...(await readSubmissions('events'))];
		const id = generateSlug(event_name, getExistingIds(existing));

		let imageUrl: string | undefined;
		if (image && image.size > 0) {
			const ext = EXT_MAP[image.type] || 'jpg';
			const dir = join(process.cwd(), 'static', 'uploads', 'events');
			await mkdir(dir, { recursive: true });
			const path = join(dir, `${id}.${ext}`);
			const buf = Buffer.from(await image.arrayBuffer());
			await writeFile(path, buf);
			imageUrl = `/uploads/events/${id}.${ext}`;
		}

		const locationParts = [venue, address, city_state].filter(Boolean);
		const location = locationParts.length > 0 ? locationParts.join(', ') : city_state || undefined;
		const lat = latStr ? parseFloat(latStr) : undefined;
		const lng = lngStr ? parseFloat(lngStr) : undefined;
		const item: EventItem = {
			id,
			title: event_name,
			description: description || undefined,
			coil: 'events',
			location: location || undefined,
			address: address || undefined,
			lat: Number.isFinite(lat) ? lat : undefined,
			lng: Number.isFinite(lng) ? lng : undefined,
			region: geography || undefined,
			type: event_type || undefined,
			types: event_types.length > 0 ? event_types : undefined,
			audience: audience || undefined,
			cost: cost || undefined,
			eventUrl: event_url || undefined,
			startDate: start_date || undefined,
			endDate: end_date || undefined,
			hostOrg: host_org || undefined,
			imageUrl
		};

		await appendSubmission('events', item);

		return {
			success: true,
			message:
				'Thank you! Your event has been submitted and is now live. IFS staff may follow up within 3–5 business days.'
		};
	}
};
