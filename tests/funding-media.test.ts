import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFundingRows = vi.hoisted(() => [] as Record<string, unknown>[]);

vi.mock('$env/dynamic/public', () => ({
	env: {
		PUBLIC_ASSET_BASE_URL: 'https://assets.example.com/kb-uploads'
	}
}));

vi.mock('$lib/server/db', () => {
	const orderBy = vi.fn(async () => mockFundingRows);
	const where = vi.fn(() => ({ orderBy }));
	const from = vi.fn(() => ({ where }));
	const select = vi.fn(() => ({ from }));

	return {
		db: { select },
		type: {}
	};
});

vi.mock('$lib/server/meilisearch', () => ({
	indexDocument: vi.fn(),
	removeDocument: vi.fn()
}));

vi.mock('$lib/server/source-provenance', () => ({
	getSourceProvenanceByPublishedRecord: vi.fn()
}));

vi.mock('$lib/server/sanitize-rich-text', () => ({
	sanitizeRichTextHtml: (value: string | undefined) => value
}));

vi.mock('$lib/server/admin-content', () => ({
	buildModerationFields: vi.fn(() => ({}))
}));

describe('funding media normalization', () => {
	beforeEach(() => {
		mockFundingRows.length = 0;
		vi.resetModules();
	});

	it('rewrites legacy local object storage URLs on published funding items', async () => {
		mockFundingRows.push({
			id: 'funding-1',
			slug: 'native-cultures-fund-grants',
			title: 'Native Cultures Fund Grants',
			description: null,
			funderName: 'Native Cultures Fund',
			organizationId: null,
			fundingType: 'grant',
			fundingTypes: ['grant'],
			eligibilityType: null,
			eligibilityTypes: null,
			focusAreas: null,
			tags: null,
			applicationStatus: 'open',
			openDate: null,
			deadline: null,
			awardDate: null,
			fundingCycleNotes: null,
			isRecurring: false,
			recurringSchedule: null,
			amountMin: null,
			amountMax: null,
			amountDescription: null,
			fundingTerm: null,
			matchRequired: false,
			matchRequirements: null,
			eligibleCosts: null,
			region: 'California',
			geographicRestrictions: null,
			applyUrl: 'https://example.com/apply',
			contactEmail: null,
			contactName: null,
			contactPhone: null,
			imageUrl: 'http://localhost:9000/kb-uploads/logos/funding/native-cultures-fund.png',
			imageUrls: ['http://localhost:9000/kb-uploads/logos/funding/california-hcd.png'],
			status: 'published',
			source: null,
			featured: false,
			unlisted: false,
			createdAt: new Date('2026-04-07T00:00:00.000Z'),
			updatedAt: new Date('2026-04-07T00:00:00.000Z'),
			publishedAt: new Date('2026-04-07T00:00:00.000Z'),
			rejectedAt: null,
			rejectionReason: null,
			adminNotes: null,
			submittedById: null,
			reviewedById: null
		});

		const { getPublishedFunding } = await import('../src/lib/server/funding');
		const items = await getPublishedFunding();

		expect(items).toHaveLength(1);
		expect(items[0]?.imageUrl).toBe(
			'https://assets.example.com/kb-uploads/logos/funding/native-cultures-fund.png'
		);
		expect(items[0]?.imageUrls).toEqual([
			'https://assets.example.com/kb-uploads/logos/funding/california-hcd.png'
		]);
	});
});
