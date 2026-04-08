import type { EventItem, PricingTier } from '$lib/data/kb';

export const EVENT_COST_FILTERS = [
	{ id: 'free', label: 'Free' },
	{ id: 'under-25', label: 'Under $25' },
	{ id: '25-99', label: '$25-$99' },
	{ id: '100-plus', label: '$100+' },
	{ id: 'sliding-scale', label: 'Sliding scale / donation' },
	{ id: 'cost-varies', label: 'Cost varies' }
] as const;

export type EventCostFilterId = (typeof EVENT_COST_FILTERS)[number]['id'];

type EventPricingTone = 'free' | 'paid' | 'variable' | 'muted';

export type EventPricingSummary = {
	badgeLabel: string | null;
	badgeTone: EventPricingTone;
	summaryLabel: string | null;
	detailNote: string | null;
	filterBucket: EventCostFilterId | null;
	minPrice: number | null;
	maxPrice: number | null;
	pricingTiers: PricingTier[];
	isFree: boolean;
	isSlidingScale: boolean;
	hasKnownPrice: boolean;
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	maximumFractionDigits: 2,
	minimumFractionDigits: 0
});

const genericCostLabels = new Set([
	'cost varies',
	'free',
	'free / sponsored',
	'free, registration required',
	'free/sponsored',
	'member / discounted pricing available',
	'paid',
	'registration fee required',
	'sliding scale',
	'suggested donation / pay what you can'
]);

function cleanText(value?: string | null): string | null {
	const cleaned = value?.replace(/\s+/g, ' ').trim();
	return cleaned ? cleaned : null;
}

function normalizeCostValue(value?: string | null): string {
	return cleanText(value)?.toLowerCase() ?? '';
}

function isFiniteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function formatUsd(value: number): string {
	return currencyFormatter.format(value);
}

function sortPricingTiers(tiers?: PricingTier[]): PricingTier[] {
	return [...(tiers ?? [])]
		.filter((tier) => cleanText(tier.label) || isFiniteNumber(tier.price))
		.sort((a, b) => {
			const aOrder = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
			const bOrder = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
			if (aOrder !== bOrder) return aOrder - bOrder;
			const aPrice = isFiniteNumber(a.price) ? a.price : Number.MAX_SAFE_INTEGER;
			const bPrice = isFiniteNumber(b.price) ? b.price : Number.MAX_SAFE_INTEGER;
			if (aPrice !== bPrice) return aPrice - bPrice;
			return (a.label ?? '').localeCompare(b.label ?? '');
		});
}

function extractDollarAmounts(text?: string | null): number[] {
	if (!text) return [];
	const values = Array.from(text.matchAll(/\$\s*([0-9][\d,]*(?:\.\d{1,2})?)/g))
		.map((match) => Number.parseFloat(match[1].replace(/,/g, '')))
		.filter((value) => Number.isFinite(value));
	return Array.from(new Set(values)).sort((a, b) => a - b);
}

function derivePriceBounds(
	event: Pick<EventItem, 'priceMin' | 'priceMax' | 'pricingTiers' | 'cost'>
) {
	const tierPrices = sortPricingTiers(event.pricingTiers)
		.map((tier) => tier.price)
		.filter(isFiniteNumber);
	const parsedTextPrices = extractDollarAmounts(event.cost);
	const min =
		(isFiniteNumber(event.priceMin) ? event.priceMin : null) ??
		(tierPrices.length ? Math.min(...tierPrices) : null) ??
		(parsedTextPrices.length ? Math.min(...parsedTextPrices) : null);
	const max =
		(isFiniteNumber(event.priceMax) ? event.priceMax : null) ??
		(tierPrices.length ? Math.max(...tierPrices) : null) ??
		(parsedTextPrices.length ? Math.max(...parsedTextPrices) : null) ??
		min;
	if (min == null && max == null) return { minPrice: null, maxPrice: null };
	if (min != null && max != null && max < min) {
		return { minPrice: max, maxPrice: min };
	}
	return { minPrice: min, maxPrice: max };
}

function getPriceRangeLabel(minPrice: number | null, maxPrice: number | null): string | null {
	if (minPrice == null && maxPrice == null) return null;
	if (minPrice != null && maxPrice != null) {
		if (minPrice === maxPrice) return formatUsd(minPrice);
		if (minPrice === 0) return `Free to ${formatUsd(maxPrice)}`;
		return `${formatUsd(minPrice)}-${formatUsd(maxPrice)}`;
	}
	if (minPrice != null) return `From ${formatUsd(minPrice)}`;
	if (maxPrice != null) return `Up to ${formatUsd(maxPrice)}`;
	return null;
}

function isFreeEvent(costText: string, minPrice: number | null): boolean {
	if (minPrice === 0) return true;
	if (
		costText.includes('free') ||
		costText.includes('complimentary') ||
		costText.includes('no cost')
	)
		return true;
	if (costText.includes('sponsored')) return true;
	return false;
}

function isSlidingScaleEvent(costText: string): boolean {
	return (
		costText.includes('sliding scale') ||
		costText.includes('pay what you can') ||
		costText.includes('suggested donation') ||
		costText.includes('donation')
	);
}

function isGenericCostText(value?: string | null): boolean {
	const normalized = normalizeCostValue(value);
	return !normalized || genericCostLabels.has(normalized);
}

export function getEventCostFilterLabel(id: string): string {
	return EVENT_COST_FILTERS.find((option) => option.id === id)?.label ?? id;
}

export function formatEventCostFilterSelectionLabel(selected: string[]): string {
	if (selected.length === 0) return 'Any cost';
	if (selected.length === 1) return getEventCostFilterLabel(selected[0]);
	return `${selected.length} selected`;
}

export function getEventCostBucket(
	event: Pick<EventItem, 'cost' | 'priceMin' | 'priceMax' | 'pricingTiers'>
) {
	const costText = normalizeCostValue(event.cost);
	const { minPrice, maxPrice } = derivePriceBounds(event);
	if (isFreeEvent(costText, minPrice)) return 'free' satisfies EventCostFilterId;
	if (isSlidingScaleEvent(costText)) return 'sliding-scale' satisfies EventCostFilterId;
	const entryPrice = minPrice ?? maxPrice;
	if (entryPrice != null) {
		if (entryPrice < 25) return 'under-25' satisfies EventCostFilterId;
		if (entryPrice < 100) return '25-99' satisfies EventCostFilterId;
		return '100-plus' satisfies EventCostFilterId;
	}
	if (
		costText.includes('varies') ||
		costText.includes('member') ||
		costText.includes('discount') ||
		costText.includes('paid') ||
		costText.includes('ticket') ||
		costText.includes('registration fee')
	) {
		return 'cost-varies' satisfies EventCostFilterId;
	}
	return null;
}

export function countEventsByCostBucket(
	events: Array<Pick<EventItem, 'cost' | 'priceMin' | 'priceMax' | 'pricingTiers'>>
): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const option of EVENT_COST_FILTERS) counts[option.id] = 0;
	for (const event of events) {
		const bucket = getEventCostBucket(event);
		if (!bucket) continue;
		counts[bucket] = (counts[bucket] ?? 0) + 1;
	}
	return counts;
}

export function eventMatchesCostFilters(
	event: Pick<EventItem, 'cost' | 'priceMin' | 'priceMax' | 'pricingTiers'>,
	selected: string[]
): boolean {
	if (selected.length === 0) return true;
	const bucket = getEventCostBucket(event);
	return bucket != null && selected.includes(bucket);
}

export function getEventPricingSummary(
	event: Pick<EventItem, 'cost' | 'priceMin' | 'priceMax' | 'pricingTiers'>
): EventPricingSummary {
	const pricingTiers = sortPricingTiers(event.pricingTiers);
	const { minPrice, maxPrice } = derivePriceBounds(event);
	const costText = cleanText(event.cost);
	const normalizedCost = normalizeCostValue(event.cost);
	const isFree = isFreeEvent(normalizedCost, minPrice);
	const isSlidingScale = isSlidingScaleEvent(normalizedCost);
	const rangeLabel = getPriceRangeLabel(minPrice, maxPrice);
	const filterBucket = getEventCostBucket(event);

	let badgeLabel: string | null = null;
	let badgeTone: EventPricingTone = 'muted';

	if (filterBucket === 'free') {
		badgeLabel = 'Free';
		badgeTone = 'free';
	} else if (filterBucket === 'sliding-scale') {
		badgeLabel = 'Sliding scale';
		badgeTone = 'variable';
	} else if (filterBucket === 'under-25') {
		badgeLabel = 'Under $25';
		badgeTone = 'paid';
	} else if (filterBucket === '25-99') {
		badgeLabel = '$25-$99';
		badgeTone = 'paid';
	} else if (filterBucket === '100-plus') {
		badgeLabel = '$100+';
		badgeTone = 'paid';
	} else if (filterBucket === 'cost-varies') {
		badgeLabel = 'Cost varies';
		badgeTone = 'variable';
	}

	const detailNote =
		costText && !isGenericCostText(costText) && costText !== badgeLabel ? costText : null;

	return {
		badgeLabel,
		badgeTone,
		summaryLabel: rangeLabel ?? badgeLabel ?? costText,
		detailNote,
		filterBucket,
		minPrice,
		maxPrice,
		pricingTiers,
		isFree,
		isSlidingScale,
		hasKnownPrice: minPrice != null || maxPrice != null
	};
}

export function getEventRegistrationCtaLabel(
	event: Pick<EventItem, 'cost' | 'priceMin' | 'priceMax' | 'pricingTiers'>,
	options?: { long?: boolean }
): string {
	const pricing = getEventPricingSummary(event);
	if (pricing.isFree) return options?.long ? 'Register for free' : 'Register';
	if (pricing.hasKnownPrice || pricing.badgeTone === 'paid') return 'Get tickets';
	if (pricing.isSlidingScale) return options?.long ? 'Reserve your spot' : 'Register';
	return options?.long ? 'Learn more & register' : 'Learn more';
}
