import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { createEvent } from '$lib/server/events';
import { RATE_LIMIT_POLICIES, consumeRateLimit } from '$lib/server/rate-limit';
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE, uploadImage } from '$lib/server/upload';

type EventSubmitDeps = {
	createEvent: (data: Parameters<typeof createEvent>[0]) => Promise<unknown>;
	uploadImage: (file: File, scope: 'events') => Promise<string>;
};

export function _createEventSubmitActions(
	deps: EventSubmitDeps = { createEvent, uploadImage }
): Actions {
	return {
		default: async (event) => {
			const rateLimit = consumeRateLimit(event, RATE_LIMIT_POLICIES.publicSubmit, '/events/submit');
			if (!rateLimit.allowed) {
				return fail(429, {
					error: `Too many submissions. Please wait ${rateLimit.retryAfterSeconds} seconds and try again.`
				});
			}

			const { request, locals } = event;
			const formData = await request.formData();
			const event_name = (formData.get('event_name') as string)?.trim();
			const host_org = (formData.get('host_org') as string)?.trim();
			const event_type_raw = (formData.get('event_type') as string)?.trim() ?? '';
			const event_types = event_type_raw
				? event_type_raw
						.split(',')
						.map((s) => s.trim())
						.filter(Boolean)
				: [];
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

			let imageUrl: string | undefined;
			if (image && image.size > 0) {
				imageUrl = await deps.uploadImage(image, 'events');
			}

			const locationParts = [venue, address, city_state].filter(Boolean);
			const location =
				locationParts.length > 0 ? locationParts.join(', ') : city_state || undefined;
			const lat = latStr ? parseFloat(latStr) : undefined;
			const lng = lngStr ? parseFloat(lngStr) : undefined;

			await deps.createEvent({
				title: event_name,
				description: description || undefined,
				location: location || undefined,
				address: address || undefined,
				region: geography || undefined,
				audience: audience || undefined,
				cost: cost || undefined,
				eventUrl: event_url || undefined,
				startDate: start_date || undefined,
				endDate: end_date || undefined,
				hostOrg: host_org || undefined,
				lat: Number.isFinite(lat) ? lat : undefined,
				lng: Number.isFinite(lng) ? lng : undefined,
				type: event_type || undefined,
				types: event_types.length > 0 ? event_types : undefined,
				imageUrl,
				contactName: contact_name || undefined,
				contactEmail: email || undefined,
				submittedById: locals.user?.id,
				status: 'pending',
				source: 'submission'
			});

			return {
				success: true,
				message:
					'Thank you! Your event has been submitted for review. Our moderation team will review it shortly.'
			};
		}
	};
}

export const actions = _createEventSubmitActions();
