export function parseString(formData: FormData, key: string): string {
	return formData.get(key)?.toString().trim() ?? '';
}

export function nullableString(formData: FormData, key: string): string | null {
	const value = parseString(formData, key);
	return value ? value : null;
}

export function parseDateValue(formData: FormData, key: string): Date | null {
	const value = parseString(formData, key);
	return value ? new Date(`${value}T00:00:00`) : null;
}

export function parseNumberValue(formData: FormData, key: string): number | null {
	const value = parseString(formData, key);
	if (!value) return null;
	const number = Number(value);
	return Number.isFinite(number) ? number : null;
}

export function parseList(formData: FormData, key: string): string[] | null {
	const value = parseString(formData, key);
	const items = value
		.split(/\r?\n|,/)
		.map((entry) => entry.trim())
		.filter(Boolean);
	return items.length > 0 ? items : null;
}

export function normalizeStatus<T extends string>(
	raw: FormDataEntryValue | null,
	allowed: readonly T[],
	fallback: T
): T {
	const value = typeof raw === 'string' ? raw.trim() : '';
	return allowed.includes(value as T) ? (value as T) : fallback;
}

export function isValidHttpUrl(value: string | null | undefined): boolean {
	const normalized = value?.trim() ?? '';
	if (!normalized) return true;
	try {
		const parsed = new URL(normalized);
		return parsed.protocol === 'http:' || parsed.protocol === 'https:';
	} catch {
		return false;
	}
}

export function validateRequired(
	issues: string[],
	value: string | null | undefined,
	message: string
): void {
	if (!value?.trim()) issues.push(message);
}

export function validateHttpUrl(
	issues: string[],
	value: string | null | undefined,
	message: string
): void {
	if (!isValidHttpUrl(value)) issues.push(message);
}

export function validateDateOrder(
	issues: string[],
	start: string | Date | null | undefined,
	end: string | Date | null | undefined,
	message: string
): void {
	if (!start || !end) return;
	const startDate = start instanceof Date ? start : new Date(start);
	const endDate = end instanceof Date ? end : new Date(end);
	if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return;
	if (endDate.getTime() < startDate.getTime()) issues.push(message);
}

export function validateNumberOrder(
	issues: string[],
	min: number | null | undefined,
	max: number | null | undefined,
	message: string
): void {
	if (min == null || max == null) return;
	if (min > max) issues.push(message);
}

function coerceDate(value: string | Date | null | undefined): Date | null {
	if (!value) return null;
	if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

type ModerationState = {
	publishedAt?: string | Date | null;
	rejectedAt?: string | Date | null;
	rejectionReason?: string | null;
	cancelledAt?: string | Date | null;
	reviewedById?: string | null;
};

export type ModerationStatus = 'draft' | 'pending' | 'published' | 'rejected' | 'cancelled';

export function buildModerationFields(
	current: ModerationState,
	options: {
		status: ModerationStatus;
		reviewerId?: string | null;
		rejectionReason?: string | null;
		allowCancelled?: boolean;
		preservePublishedOnCancel?: boolean;
	}
) {
	const reviewerId = options.reviewerId ?? current.reviewedById ?? null;

	if (options.status === 'published') {
		return {
			status: options.status,
			publishedAt: coerceDate(current.publishedAt) ?? new Date(),
			rejectedAt: null,
			rejectionReason: null,
			cancelledAt: null,
			reviewedById: reviewerId
		};
	}

	if (options.status === 'rejected') {
		return {
			status: options.status,
			publishedAt: null,
			rejectedAt: coerceDate(current.rejectedAt) ?? new Date(),
			rejectionReason: options.rejectionReason ?? null,
			cancelledAt: null,
			reviewedById: reviewerId
		};
	}

	if (options.status === 'cancelled' && options.allowCancelled) {
		return {
			status: options.status,
			publishedAt: options.preservePublishedOnCancel
				? (coerceDate(current.publishedAt) ?? null)
				: null,
			rejectedAt: null,
			rejectionReason: null,
			cancelledAt: coerceDate(current.cancelledAt) ?? new Date(),
			reviewedById: reviewerId
		};
	}

	return {
		status: options.status,
		publishedAt: null,
		rejectedAt: null,
		rejectionReason: null,
		cancelledAt: null,
		reviewedById: current.reviewedById ?? null
	};
}
