import { describe, expect, it } from 'vitest';

import {
	formatDisplayDate,
	formatDisplayDateTime,
	formatDisplayValue,
	humanizeIdentifier
} from '../src/lib/utils/display';

describe('display formatting', () => {
	it('keeps UTC midnight dates on the intended calendar day', () => {
		expect(formatDisplayDate('2026-06-15T00:00:00.000Z')).toBe('Jun 15, 2026');
		expect(formatDisplayValue('2026-06-15T00:00:00.000Z', { key: 'applicationDeadline' })).toBe(
			'Jun 15, 2026'
		);
	});

	it('formats enum-like job metadata into readable labels', () => {
		expect(formatDisplayValue('full_time', { key: 'jobType' })).toBe('Full-time');
		expect(formatDisplayValue('in_office', { key: 'workArrangement' })).toBe('In-office');
		expect(formatDisplayValue('economic-development', { key: 'sector' })).toBe(
			'Economic Development'
		);
	});

	it('formats funding statuses and eligibility values into readable labels', () => {
		expect(formatDisplayValue('open', { key: 'applicationStatus' })).toBe('Open');
		expect(formatDisplayValue('tribal_gov', { key: 'eligibilityType' })).toBe('Tribal government');
		expect(
			formatDisplayValue(['nonprofit', 'tribal_gov', 'individual'], { key: 'eligibilityType' })
		).toBe('Nonprofit, Tribal government, Individual');
	});

	it('formats datetime fields with time for admin metadata', () => {
		expect(formatDisplayDateTime('2026-06-15T18:45:00.000Z')).toContain('2026');
		expect(formatDisplayValue('2026-06-15T18:45:00.000Z', { key: 'publishedAt' })).toContain(
			'2026'
		);
	});

	it('humanizes fallback identifiers when no explicit label map exists', () => {
		expect(humanizeIdentifier('job_type')).toBe('Job type');
		expect(formatDisplayValue('pending_review')).toBe('Pending review');
	});
});
