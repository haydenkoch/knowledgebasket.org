import type { sources } from '$lib/server/db/schema';
import type { Coil } from './types';

type FetchCadence = typeof sources.$inferSelect.fetchCadence;

export function computeHealthStatus(
	consecutiveFailures: number,
	lastContentChangeAt: Date | null,
	lastCheckedAt: Date | null,
	fetchCadence: FetchCadence,
	lastFetchErrorCategory: string | null
): 'healthy' | 'degraded' | 'unhealthy' | 'stale' | 'broken' | 'auth_required' | 'unknown' {
	if (lastFetchErrorCategory === 'auth') return 'auth_required';
	if (consecutiveFailures >= 10) return 'broken';
	if (consecutiveFailures >= 4) return 'unhealthy';
	if (consecutiveFailures >= 1) return 'degraded';

	if (lastContentChangeAt && lastCheckedAt && fetchCadence !== 'manual') {
		const staleDays = getStalenessThresholdDays(fetchCadence);
		if (staleDays) {
			const daysSinceChange = (Date.now() - lastContentChangeAt.getTime()) / (1000 * 60 * 60 * 24);
			if (daysSinceChange > staleDays) return 'stale';
		}
	}

	if (!lastCheckedAt) return 'unknown';
	return 'healthy';
}

export function computeCandidatePriority(
	confidenceScore: number | null,
	coil: Coil,
	normalizedData: Record<string, unknown>
): 'low' | 'normal' | 'high' {
	if (confidenceScore && confidenceScore >= 4) {
		if (coil === 'events') {
			const startDate = normalizedData.start_date;
			if (typeof startDate === 'string') {
				const daysUntilEvent = (new Date(startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
				if (daysUntilEvent <= 14) return 'high';
			}
		}

		if (coil === 'funding') {
			const deadline = normalizedData.deadline;
			if (typeof deadline === 'string') {
				const daysUntilDeadline =
					(new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
				if (daysUntilDeadline <= 30) return 'high';
			}
		}

		if (coil === 'jobs') return 'high';
	}

	if (confidenceScore && confidenceScore <= 2) return 'low';
	if (coil === 'toolbox' || coil === 'red_pages') return 'low';
	return 'normal';
}

export function computeNextCheckAt(fetchCadence: FetchCadence, base = new Date()): Date | null {
	switch (fetchCadence) {
		case 'hourly':
			return new Date(base.getTime() + 60 * 60 * 1000);
		case 'every_6h':
			return new Date(base.getTime() + 6 * 60 * 60 * 1000);
		case 'daily':
			return new Date(base.getTime() + 24 * 60 * 60 * 1000);
		case 'weekly':
			return new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000);
		case 'biweekly':
			return new Date(base.getTime() + 14 * 24 * 60 * 60 * 1000);
		case 'monthly':
			return new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
		case 'manual':
		default:
			return null;
	}
}

function getStalenessThresholdDays(fetchCadence: FetchCadence): number | null {
	switch (fetchCadence) {
		case 'hourly':
		case 'every_6h':
		case 'daily':
			return 7;
		case 'weekly':
			return 21;
		case 'biweekly':
		case 'monthly':
			return 60;
		default:
			return null;
	}
}
