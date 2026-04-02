import { coilLabels, type CoilKey } from '$lib/data/kb';
import {
	getEventStatusCounts,
	getEventsForAdmin,
	type AdminEventListItem
} from '$lib/server/events';
import { getFundingForAdmin, getFundingStatusCounts } from '$lib/server/funding';
import {
	getImportCandidatesForReview,
	type ImportCandidateListItem
} from '$lib/server/import-candidates';
import { getJobStatusCounts, getJobsForAdmin } from '$lib/server/jobs';
import { getBusinessStatusCounts, getBusinessesForAdmin } from '$lib/server/red-pages';
import { getSourceHealthSummary } from '$lib/server/sources';
import { getResourceStatusCounts, getResourcesForAdmin } from '$lib/server/toolbox';
import { stripHtml } from '$lib/utils/format';

export type AdminQueueKey =
	| 'events'
	| 'source_candidates'
	| 'funding'
	| 'jobs'
	| 'redpages'
	| 'toolbox';

export type AdminReviewItem = {
	id: string;
	kind: AdminQueueKey;
	coil: CoilKey;
	title: string;
	status: string;
	href?: string;
	excerpt?: string;
	meta: string[];
	priority?: string;
	dedupeResult?: string;
};

export type AdminQueueSection = {
	key: AdminQueueKey;
	title: string;
	description: string;
	href: string;
	count: number;
	items: AdminReviewItem[];
};

export type AdminQueueSnapshot = {
	metrics: {
		totalAttention: number;
		pendingSubmissions: number;
		pendingEvents: number;
		sourceQueue: number;
		highPrioritySources: number;
		needsInfoSources: number;
		staleSources: number;
		brokenSources: number;
		reviewRequiredSources: number;
	};
	queueTotals: Array<{
		key: AdminQueueKey;
		label: string;
		description: string;
		count: number;
		href: string;
		tone: 'lake' | 'forest' | 'gold' | 'ember' | 'stone';
	}>;
	sections: AdminQueueSection[];
	sourceHealth: Awaited<ReturnType<typeof getSourceHealthSummary>>;
};

function normalizeCandidateCoil(coil: ImportCandidateListItem['coil']): CoilKey {
	return coil === 'red_pages' ? 'redpages' : (coil as CoilKey);
}

function excerpt(value?: string | null, max = 150): string | undefined {
	if (!value) return undefined;
	const text = stripHtml(value).replace(/\s+/g, ' ').trim();
	return text ? text.slice(0, max) : undefined;
}

function formatShortDate(value?: string | null): string | null {
	if (!value) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return date.toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric'
	});
}

function toEventItem(item: AdminEventListItem): AdminReviewItem {
	const meta = [item.organizationName ?? item.hostOrg ?? 'No organization'];
	if (item.startDate) {
		meta.push(
			new Date(item.startDate).toLocaleDateString(undefined, {
				month: 'short',
				day: 'numeric'
			})
		);
	}
	if (item.location) meta.push(item.location);
	return {
		id: item.id,
		kind: 'events',
		coil: 'events',
		title: item.title,
		status: item.status ?? 'pending',
		href: `/admin/events/${item.id}`,
		excerpt: excerpt(item.description),
		meta
	};
}

function toFundingItem(
	item: Awaited<ReturnType<typeof getFundingForAdmin>>['items'][number]
): AdminReviewItem {
	const meta = [item.funderName ?? item.organizationName ?? 'No funder'];
	const deadline = formatShortDate(item.deadline);
	if (deadline) meta.push(`Deadline ${deadline}`);
	if (item.region) meta.push(item.region);
	return {
		id: item.id,
		kind: 'funding',
		coil: 'funding',
		title: item.title,
		status: item.status ?? 'pending',
		excerpt: excerpt(item.description),
		meta
	};
}

function toJobItem(
	item: Awaited<ReturnType<typeof getJobsForAdmin>>['items'][number]
): AdminReviewItem {
	const meta = [item.employerName ?? item.organizationName ?? 'No employer'];
	const deadline = formatShortDate(item.applicationDeadline);
	if (deadline) meta.push(`Deadline ${deadline}`);
	if (item.location) meta.push(item.location);
	return {
		id: item.id,
		kind: 'jobs',
		coil: 'jobs',
		title: item.title,
		status: item.status ?? 'pending',
		excerpt: excerpt(item.description),
		meta
	};
}

function toBusinessItem(
	item: Awaited<ReturnType<typeof getBusinessesForAdmin>>['items'][number]
): AdminReviewItem {
	const meta = [item.serviceType ?? 'Business'];
	if (item.city || item.state) {
		meta.push([item.city, item.state].filter(Boolean).join(', '));
	}
	if (item.tribalAffiliation) meta.push(item.tribalAffiliation);
	return {
		id: item.id,
		kind: 'redpages',
		coil: 'redpages',
		title: item.name ?? item.title,
		status: item.status ?? 'pending',
		excerpt: excerpt(item.description),
		meta
	};
}

function toToolboxItem(
	item: Awaited<ReturnType<typeof getResourcesForAdmin>>['items'][number]
): AdminReviewItem {
	const meta = [item.resourceType, item.sourceName, item.category].filter(
		(value): value is string => Boolean(value)
	);
	return {
		id: item.id,
		kind: 'toolbox',
		coil: 'toolbox',
		title: item.title,
		status: item.status ?? 'pending',
		excerpt: excerpt(item.description ?? item.body),
		meta
	};
}

function toCandidateItem(item: ImportCandidateListItem): AdminReviewItem {
	const title =
		(typeof item.normalizedData === 'object' &&
			item.normalizedData &&
			((item.normalizedData as Record<string, unknown>).title ||
				(item.normalizedData as Record<string, unknown>).name)) ||
		item.sourceItemId ||
		item.id;

	const meta = [
		item.sourceName,
		item.dedupeResult.replace(/_/g, ' '),
		item.status.replace(/_/g, ' ')
	];
	if (item.matchedCanonicalTitle) meta.push(`Match: ${item.matchedCanonicalTitle}`);

	return {
		id: item.id,
		kind: 'source_candidates',
		coil: normalizeCandidateCoil(item.coil),
		title: String(title),
		status: item.status,
		href: `/admin/sources/review/${item.id}`,
		meta,
		priority: item.priority,
		dedupeResult: item.dedupeResult,
		excerpt:
			typeof item.sourceAttribution === 'string' && item.sourceAttribution.trim()
				? item.sourceAttribution
				: (item.sourceItemUrl ?? undefined)
	};
}

export async function getAdminQueueSnapshot(limitPerSection = 6): Promise<AdminQueueSnapshot> {
	const [
		eventCounts,
		fundingCounts,
		jobCounts,
		businessCounts,
		resourceCounts,
		eventQueue,
		fundingQueue,
		jobQueue,
		businessQueue,
		resourceQueue,
		sourceQueue,
		sourceHighPriority,
		sourceNeedsInfo,
		sourceHealth
	] = await Promise.all([
		getEventStatusCounts(),
		getFundingStatusCounts(),
		getJobStatusCounts(),
		getBusinessStatusCounts(),
		getResourceStatusCounts(),
		getEventsForAdmin({ status: 'pending', page: 1, limit: limitPerSection }),
		getFundingForAdmin({ status: 'pending', page: 1, limit: limitPerSection }),
		getJobsForAdmin({ status: 'pending', page: 1, limit: limitPerSection }),
		getBusinessesForAdmin({ status: 'pending', page: 1, limit: limitPerSection }),
		getResourcesForAdmin({ status: 'pending', page: 1, limit: limitPerSection }),
		getImportCandidatesForReview({ status: 'open', page: 1, limit: limitPerSection }),
		getImportCandidatesForReview({ status: 'open', priority: 'high', page: 1, limit: 1 }),
		getImportCandidatesForReview({ status: 'needs_info', page: 1, limit: 1 }),
		getSourceHealthSummary()
	]);

	const pendingEvents = eventCounts.pending ?? 0;
	const pendingFunding = fundingCounts.pending ?? 0;
	const pendingJobs = jobCounts.pending ?? 0;
	const pendingBusinesses = businessCounts.pending ?? 0;
	const pendingResources = resourceCounts.pending ?? 0;
	const pendingSubmissions = pendingFunding + pendingJobs + pendingBusinesses + pendingResources;

	const sections: AdminQueueSection[] = [
		{
			key: 'source_candidates',
			title: 'Source candidate queue',
			description: 'Imported records needing review, follow-up, or merge decisions.',
			href: '/admin/sources/review?status=open',
			count: sourceQueue.total,
			items: sourceQueue.items.map(toCandidateItem)
		},
		{
			key: 'events',
			title: 'Pending events',
			description: 'Event submissions and drafts waiting on moderation or final edits.',
			href: '/admin/events?status=pending',
			count: pendingEvents,
			items: eventQueue.events.map(toEventItem)
		},
		{
			key: 'funding',
			title: `${coilLabels.funding} submissions`,
			description: 'Pending funding opportunities submitted by the public or staff.',
			href: '/admin/inbox?tab=submissions',
			count: pendingFunding,
			items: fundingQueue.items.map(toFundingItem)
		},
		{
			key: 'jobs',
			title: `${coilLabels.jobs} submissions`,
			description: 'Jobs waiting for review, cleanup, and approval.',
			href: '/admin/inbox?tab=submissions',
			count: pendingJobs,
			items: jobQueue.items.map(toJobItem)
		},
		{
			key: 'redpages',
			title: `${coilLabels.redpages} submissions`,
			description: 'Business listings that need moderation and data-quality review.',
			href: '/admin/inbox?tab=submissions',
			count: pendingBusinesses,
			items: businessQueue.items.map(toBusinessItem)
		},
		{
			key: 'toolbox',
			title: `${coilLabels.toolbox} submissions`,
			description: 'Resources waiting for editorial review or publication.',
			href: '/admin/inbox?tab=submissions',
			count: pendingResources,
			items: resourceQueue.items.map(toToolboxItem)
		}
	];

	const queueTotals: AdminQueueSnapshot['queueTotals'] = [
		{
			key: 'source_candidates',
			label: 'Source queue',
			description: 'Imported candidates waiting on moderation',
			count: sourceQueue.total,
			href: '/admin/sources/review?status=open',
			tone: 'lake'
		},
		{
			key: 'events',
			label: 'Events',
			description: 'Pending event review',
			count: pendingEvents,
			href: '/admin/events?status=pending',
			tone: 'forest'
		},
		{
			key: 'funding',
			label: 'Funding',
			description: 'Pending funding submissions',
			count: pendingFunding,
			href: '/admin/inbox?tab=submissions',
			tone: 'gold'
		},
		{
			key: 'jobs',
			label: 'Jobs',
			description: 'Pending job submissions',
			count: pendingJobs,
			href: '/admin/inbox?tab=submissions',
			tone: 'lake'
		},
		{
			key: 'redpages',
			label: 'Red Pages',
			description: 'Pending business submissions',
			count: pendingBusinesses,
			href: '/admin/inbox?tab=submissions',
			tone: 'ember'
		},
		{
			key: 'toolbox',
			label: 'Toolbox',
			description: 'Pending resource submissions',
			count: pendingResources,
			href: '/admin/inbox?tab=submissions',
			tone: 'stone'
		}
	];

	return {
		metrics: {
			totalAttention: pendingEvents + pendingSubmissions + sourceQueue.total,
			pendingSubmissions,
			pendingEvents,
			sourceQueue: sourceQueue.total,
			highPrioritySources: sourceHighPriority.total,
			needsInfoSources: sourceNeedsInfo.total,
			staleSources: sourceHealth.healthCounts.stale ?? 0,
			brokenSources:
				(sourceHealth.healthCounts.broken ?? 0) + (sourceHealth.healthCounts.auth_required ?? 0),
			reviewRequiredSources: sourceHealth.reviewRequired
		},
		queueTotals,
		sections,
		sourceHealth
	};
}
