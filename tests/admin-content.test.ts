import { describe, expect, it } from 'vitest';
import {
	buildModerationFields,
	validateDateOrder,
	validateHttpUrl,
	validateNumberOrder
} from '../src/lib/server/admin-content';

describe('admin content helpers', () => {
	it('normalizes moderation transitions for publish, reject, and cancel states', () => {
		const current = {
			publishedAt: '2026-04-01T12:00:00.000Z',
			rejectedAt: '2026-03-29T12:00:00.000Z',
			rejectionReason: 'Old reason',
			cancelledAt: '2026-03-30T12:00:00.000Z',
			reviewedById: 'reviewer-1'
		};

		const published = buildModerationFields(current, {
			status: 'published',
			reviewerId: 'reviewer-2'
		});
		expect(published).toMatchObject({
			status: 'published',
			rejectedAt: null,
			rejectionReason: null,
			cancelledAt: null,
			reviewedById: 'reviewer-2'
		});

		const rejected = buildModerationFields(current, {
			status: 'rejected',
			reviewerId: 'reviewer-3',
			rejectionReason: 'Needs more detail'
		});
		expect(rejected).toMatchObject({
			status: 'rejected',
			publishedAt: null,
			rejectionReason: 'Needs more detail',
			cancelledAt: null,
			reviewedById: 'reviewer-3'
		});

		const cancelled = buildModerationFields(current, {
			status: 'cancelled',
			allowCancelled: true,
			preservePublishedOnCancel: true
		});
		expect(cancelled).toMatchObject({
			status: 'cancelled',
			rejectedAt: null,
			rejectionReason: null
		});
		expect(cancelled.publishedAt).toBeInstanceOf(Date);
	});

	it('captures invalid URLs, inverted dates, and inverted numeric ranges', () => {
		const issues: string[] = [];

		validateHttpUrl(issues, 'ftp://example.com/file', 'Bad URL');
		validateDateOrder(
			issues,
			new Date('2026-04-12T00:00:00.000Z'),
			new Date('2026-04-10T00:00:00.000Z'),
			'Bad dates'
		);
		validateNumberOrder(issues, 5000, 1000, 'Bad range');

		expect(issues).toEqual(['Bad URL', 'Bad dates', 'Bad range']);
	});
});
