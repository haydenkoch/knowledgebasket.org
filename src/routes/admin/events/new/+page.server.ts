import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createEvent } from '$lib/server/events';
import { getAllOrganizations } from '$lib/server/organizations';
import { getAllVenues } from '$lib/server/venues';
import { getTags, getOptions } from '$lib/server/taxonomy';
import { uploadImage } from '$lib/server/upload';
import type { PricingTier } from '$lib/data/kb';
import {
	parseString,
	nullableString,
	parseList,
	validateRequired,
	validateDateOrder,
	validateHttpUrl
} from '$lib/server/admin-content';

export const load: PageServerLoad = async () => {
	const [orgs, vens, tags, regionOpts, audienceOpts, costOpts] = await Promise.all([
		getAllOrganizations(),
		getAllVenues(),
		getTags(),
		getOptions('region'),
		getOptions('audience'),
		getOptions('cost')
	]);
	return {
		organizations: orgs.map((o) => ({ id: o.id, name: o.name })),
		venues: vens.map((v) => ({ id: v.id, name: v.name })),
		taxonomyTags: tags,
		regionOptions: regionOpts,
		audienceOptions: audienceOpts,
		costOptions: costOpts
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const fd = await request.formData();
		const title = parseString(fd, 'title');
		const issues: string[] = [];
		validateRequired(issues, title, 'Title is required');
		validateDateOrder(
			issues,
			parseString(fd, 'startDate'),
			parseString(fd, 'endDate'),
			'End date must be after the start date.'
		);
		validateHttpUrl(
			issues,
			nullableString(fd, 'eventUrl'),
			'Event URL must be a valid http or https URL.'
		);
		validateHttpUrl(
			issues,
			nullableString(fd, 'registrationUrl'),
			'Registration URL must be a valid http or https URL.'
		);
		validateHttpUrl(
			issues,
			nullableString(fd, 'imageUrl'),
			'Image URL must be a valid http or https URL.'
		);
		validateHttpUrl(
			issues,
			nullableString(fd, 'virtualEventUrl'),
			'Virtual event URL must be a valid http or https URL.'
		);
		validateHttpUrl(
			issues,
			nullableString(fd, 'waitlistUrl'),
			'Waitlist URL must be a valid http or https URL.'
		);
		if (issues.length > 0) return fail(400, { error: issues[0], issues });

		let pricingTiers: PricingTier[] = [];
		try {
			const raw = fd.get('pricingTiers') as string;
			if (raw) pricingTiers = JSON.parse(raw);
		} catch {
			/* ignore */
		}

		const tags = parseList(fd, 'tags') ?? [];

		let imageUrl: string | undefined;
		const image = fd.get('image') as File | null;
		if (image && image.size > 0) {
			try {
				imageUrl = await uploadImage(image, 'events');
			} catch (e) {
				return fail(400, { error: e instanceof Error ? e.message : 'Image upload failed' });
			}
		}

		const latStr = (fd.get('lat') as string)?.trim();
		const lngStr = (fd.get('lng') as string)?.trim();
		const lat = latStr ? parseFloat(latStr) : undefined;
		const lng = lngStr ? parseFloat(lngStr) : undefined;

		const capacityStr = (fd.get('capacity') as string)?.trim();
		const capacityNum = capacityStr ? parseInt(capacityStr, 10) : undefined;
		const imageUrlInput = nullableString(fd, 'imageUrl') ?? undefined;
		const imageUrlsRaw = (fd.get('imageUrls') as string) ?? '';
		const imageUrls = imageUrlsRaw
			? imageUrlsRaw
					.split(/\r?\n/)
					.map((s) => s.trim())
					.filter(Boolean)
			: [];

		const event = await createEvent({
			title,
			description: (fd.get('description') as string) || undefined,
			location: (fd.get('location') as string) || undefined,
			address: (fd.get('address') as string) || undefined,
			region: (fd.get('region') as string) || undefined,
			lat: Number.isFinite(lat) ? lat : undefined,
			lng: Number.isFinite(lng) ? lng : undefined,
			audience: (fd.get('audience') as string) || undefined,
			cost: (fd.get('cost') as string) || undefined,
			eventUrl: (fd.get('eventUrl') as string) || undefined,
			startDate: (fd.get('startDate') as string) || undefined,
			endDate: (fd.get('endDate') as string) || undefined,
			hostOrg: (fd.get('hostOrg') as string) || undefined,
			type: (fd.get('type') as string) || undefined,
			organizationId: (fd.get('organizationId') as string) || undefined,
			venueId: (fd.get('venueId') as string) || undefined,
			parentEventId: (fd.get('parentEventId') as string) || undefined,
			registrationUrl: (fd.get('registrationUrl') as string) || undefined,
			registrationDeadline: (fd.get('registrationDeadline') as string) || undefined,
			eventFormat: (fd.get('eventFormat') as string) || undefined,
			timezone: (fd.get('timezone') as string) || undefined,
			doorsOpenAt: (fd.get('doorsOpenAt') as string) || undefined,
			capacity: Number.isInteger(capacityNum) && capacityNum! >= 0 ? capacityNum : undefined,
			soldOut: fd.has('soldOut'),
			ageRestriction: (fd.get('ageRestriction') as string) || undefined,
			accessibilityNotes: (fd.get('accessibilityNotes') as string) || undefined,
			virtualEventUrl: (fd.get('virtualEventUrl') as string) || undefined,
			waitlistUrl: (fd.get('waitlistUrl') as string) || undefined,
			imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
			contactEmail: (fd.get('contactEmail') as string) || undefined,
			contactName: (fd.get('contactName') as string) || undefined,
			contactPhone: (fd.get('contactPhone') as string) || undefined,
			adminNotes: (fd.get('adminNotes') as string) || undefined,
			tags: tags.length > 0 ? tags : undefined,
			isAllDay: fd.has('isAllDay'),
			pricingTiers,
			imageUrl: imageUrl ?? imageUrlInput,
			submittedById: locals.user?.id,
			status: 'draft',
			source: 'admin',
			publishedAt: undefined,
			unlisted: fd.has('unlisted')
		});

		throw redirect(303, `/admin/events/${event.id}`);
	}
};
