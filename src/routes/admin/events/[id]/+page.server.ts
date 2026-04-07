import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import {
	getEventById,
	getEventSubmissionInfo,
	updateEvent,
	approveEvent,
	rejectEvent,
	cancelEvent,
	deleteEvent,
	getChildEvents,
	cloneEvent
} from '$lib/server/events';
import { indexEvent, removeDocument } from '$lib/server/meilisearch';
import { getAllOrganizations } from '$lib/server/organizations';
import { getAllVenues } from '$lib/server/venues';
import { getTags, getOptions } from '$lib/server/taxonomy';
import { uploadImage } from '$lib/server/upload';
import type { PricingTier } from '$lib/data/kb';
import {
	parseString,
	nullableString,
	parseList,
	normalizeStatus,
	validateRequired,
	validateDateOrder,
	validateHttpUrl,
	buildModerationFields
} from '$lib/server/admin-content';

export const load: PageServerLoad = async ({ params }) => {
	const [event, orgs, vens, tags, regionOpts, audienceOpts, costOpts, submissionInfo] =
		await Promise.all([
			getEventById(params.id),
			getAllOrganizations(),
			getAllVenues(),
			getTags(),
			getOptions('region'),
			getOptions('audience'),
			getOptions('cost'),
			getEventSubmissionInfo(params.id)
		]);
	if (!event) throw error(404, 'Event not found');
	const children = await getChildEvents(params.id);
	return {
		event: { ...event, ...submissionInfo },
		children,
		organizations: orgs.map((o) => ({ id: o.id, name: o.name })),
		venues: vens.map((v) => ({ id: v.id, name: v.name })),
		taxonomyTags: tags,
		regionOptions: regionOpts,
		audienceOptions: audienceOpts,
		costOptions: costOpts
	};
};

export const actions: Actions = {
	update: async ({ params, request, locals }) => {
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
		const priceMinRaw = (fd.get('priceMin') as string | null)?.trim() ?? '';
		const priceMaxRaw = (fd.get('priceMax') as string | null)?.trim() ?? '';
		const priceMin = priceMinRaw ? Number(priceMinRaw) : null;
		const priceMax = priceMaxRaw ? Number(priceMaxRaw) : null;
		if (priceMinRaw && !Number.isFinite(priceMin))
			issues.push('Minimum price must be a valid number.');
		if (priceMaxRaw && !Number.isFinite(priceMax))
			issues.push('Maximum price must be a valid number.');
		if (priceMin != null && priceMax != null && priceMax < priceMin) {
			issues.push('Maximum price must be greater than or equal to minimum price.');
		}
		if (issues.length > 0) return fail(400, { error: issues[0], issues });
		const current = await getEventById(params.id);
		if (!current) return fail(404, { error: 'Event not found' });

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
		const status = normalizeStatus(
			fd.get('status'),
			['draft', 'pending', 'published', 'rejected', 'cancelled'] as const,
			'draft'
		);

		const capacityStr = (fd.get('capacity') as string)?.trim();
		const capacityNum = capacityStr ? parseInt(capacityStr, 10) : null;
		const slug = (fd.get('slug') as string | null)?.trim() || undefined;
		const imageUrlInput = (fd.get('imageUrl') as string | null)?.trim() || undefined;
		const imageUrlsRaw = (fd.get('imageUrls') as string) ?? '';
		const imageUrls = imageUrlsRaw
			? imageUrlsRaw
					.split(/\r?\n/)
					.map((s) => s.trim())
					.filter(Boolean)
			: [];

		const moderationFields = buildModerationFields(current, {
			status,
			reviewerId: locals.user?.id ?? current.reviewedById ?? null,
			rejectionReason: nullableString(fd, 'rejectionReason'),
			allowCancelled: true,
			preservePublishedOnCancel: true
		});

		await updateEvent(params.id, {
			title,
			...(slug ? { slug } : {}),
			description: (fd.get('description') as string) || null,
			location: (fd.get('location') as string) || null,
			address: (fd.get('address') as string) || null,
			region: (fd.get('region') as string) || null,
			audience: (fd.get('audience') as string) || null,
			cost: (fd.get('cost') as string) || null,
			eventUrl: (fd.get('eventUrl') as string) || null,
			startDate: (fd.get('startDate') as string) ? new Date(fd.get('startDate') as string) : null,
			endDate: (fd.get('endDate') as string) ? new Date(fd.get('endDate') as string) : null,
			hostOrg: (fd.get('hostOrg') as string) || null,
			type: (fd.get('type') as string) || null,
			organizationId: (fd.get('organizationId') as string) || null,
			venueId: (fd.get('venueId') as string) || null,
			parentEventId: (fd.get('parentEventId') as string) || null,
			registrationUrl: (fd.get('registrationUrl') as string) || null,
			registrationDeadline: (fd.get('registrationDeadline') as string)
				? new Date(fd.get('registrationDeadline') as string)
				: null,
			eventFormat: (fd.get('eventFormat') as string) || null,
			timezone: (fd.get('timezone') as string) || null,
			doorsOpenAt: (fd.get('doorsOpenAt') as string)
				? new Date(fd.get('doorsOpenAt') as string)
				: null,
			capacity: Number.isInteger(capacityNum) && capacityNum! >= 0 ? capacityNum : null,
			soldOut: fd.has('soldOut'),
			ageRestriction: (fd.get('ageRestriction') as string) || null,
			accessibilityNotes: (fd.get('accessibilityNotes') as string) || null,
			virtualEventUrl: (fd.get('virtualEventUrl') as string) || null,
			waitlistUrl: (fd.get('waitlistUrl') as string) || null,
			imageUrls: imageUrls.length > 0 ? imageUrls : null,
			contactEmail: (fd.get('contactEmail') as string) || null,
			contactName: (fd.get('contactName') as string) || null,
			contactPhone: (fd.get('contactPhone') as string) || null,
			adminNotes: (fd.get('adminNotes') as string) || null,
			tags: tags.length > 0 ? tags : null,
			isAllDay: fd.has('isAllDay'),
			featured: fd.has('featured'),
			pricingTiers,
			priceMin,
			priceMax,
			imageUrl: imageUrl ?? imageUrlInput ?? null,
			lat: Number.isFinite(lat) ? lat! : null,
			lng: Number.isFinite(lng) ? lng! : null,
			...moderationFields,
			unlisted: fd.has('unlisted')
		});
		if (status === 'published') {
			const item = await getEventById(params.id);
			if (item) await indexEvent(item);
		} else {
			await removeDocument('events', params.id);
		}

		return { success: true };
	},
	approve: async ({ params, locals }) => {
		await approveEvent(params.id, locals.user!.id);
		return { success: true };
	},
	reject: async ({ params, request, locals }) => {
		const fd = await request.formData();
		const reason = fd.get('reason') as string | null;
		await rejectEvent(params.id, locals.user!.id, reason ?? undefined);
		return { success: true };
	},
	cancel: async ({ params }) => {
		await cancelEvent(params.id);
		return { success: true };
	},
	delete: async ({ params }) => {
		await deleteEvent(params.id);
		throw redirect(303, '/admin/events');
	},
	clone: async ({ params }) => {
		const cloned = await cloneEvent(params.id);
		if (!cloned) throw error(404, 'Event not found');
		throw redirect(303, '/admin/events/' + cloned.id);
	}
};
