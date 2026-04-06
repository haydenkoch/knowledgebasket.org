import {
	formatDisplayDate,
	formatDisplayDateTime,
	humanizeIdentifier
} from '$lib/utils/display.js';

/**
 * Operator-friendly label maps for all internal enum values used in the admin UI.
 * Use these instead of displaying raw database values.
 */

export const statusLabel: Record<string, string> = {
	pending: 'Pending',
	pending_review: 'Needs review',
	needs_info: 'Waiting on info',
	published: 'Published',
	approved: 'Approved',
	auto_approved: 'Auto-approved',
	rejected: 'Rejected',
	cancelled: 'Cancelled',
	archived: 'Archived',
	draft: 'Draft',
	closed: 'Closed',
	unknown: 'Unknown'
};

export const healthLabel: Record<string, string> = {
	healthy: 'Healthy',
	degraded: 'Needs attention',
	unhealthy: 'Unhealthy',
	stale: 'Stale',
	broken: 'Broken',
	auth_required: 'Auth needed',
	unknown: 'Unknown'
};

export const sourceStatusLabel: Record<string, string> = {
	discovered: 'Discovered',
	configuring: 'Setting up',
	active: 'Active',
	paused: 'Paused',
	deprecated: 'Phasing out',
	disabled: 'Disabled',
	manual_only: 'Manual only'
};

export const ingestionLabel: Record<string, string> = {
	manual_only: 'Manual entry',
	manual_with_reminder: 'Manual with reminders',
	rss_import: 'RSS feed',
	ical_import: 'Calendar feed',
	api_import: 'API connection',
	html_scrape: 'Web page import',
	directory_sync: 'Directory sync',
	document_extraction: 'Document parsing',
	newsletter_triage: 'Email / newsletter',
	hybrid: 'Mixed methods'
};

export const coilLabel: Record<string, string> = {
	events: 'Events',
	funding: 'Funding',
	jobs: 'Jobs',
	red_pages: 'Red Pages',
	redpages: 'Red Pages',
	toolbox: 'Toolbox'
};

export const dedupeLabel: Record<string, string> = {
	new: 'New item',
	duplicate: 'Same listing',
	update: 'Update to existing listing',
	ambiguous: 'Needs review'
};

export const priorityLabel: Record<string, string> = {
	high: 'High priority',
	normal: 'Normal',
	low: 'Low priority'
};

export const categoryLabel: Record<string, string> = {
	government_federal: 'Government (Federal)',
	government_state: 'Government (State)',
	government_tribal: 'Government (Tribal)',
	nonprofit: 'Nonprofit',
	foundation: 'Foundation',
	aggregator: 'Aggregator',
	news_media: 'News media',
	academic: 'Academic',
	professional_association: 'Professional association',
	private_business: 'Private business',
	community: 'Community'
};

export const rejectionLabel: Record<string, string> = {
	duplicate: 'Duplicate entry',
	irrelevant: 'Not relevant',
	expired: 'Already expired',
	low_quality: 'Needs more detail',
	inaccurate: 'Inaccurate information',
	incomplete: 'Missing key info',
	out_of_scope: 'Outside our scope',
	spam: 'Spam',
	other: 'Other reason'
};

export const curationReasonLabel: Record<string, string> = {
	'invalid config': 'Configuration problem',
	broken: 'Fetch is failing',
	'duplicate heavy': 'Many duplicates',
	'low yield': 'Rarely finds new items',
	'update heavy': 'Mostly updates, few new items',
	stale: 'Overdue for a check'
};

/** Look up a label from a map, falling back to a humanized version of the key. */
export function friendly(map: Record<string, string>, key: string | null | undefined): string {
	if (!key) return '—';
	return map[key] ?? humanizeIdentifier(key);
}

/** Format a ratio (0–1) as a percentage string. */
export function pct(ratio: number | null | undefined, decimals = 0): string {
	if (ratio == null || isNaN(ratio)) return '—';
	return `${(ratio * 100).toFixed(decimals)}%`;
}

/** Format a date as a friendly absolute date: "Apr 15, 2026" */
export function formatDate(date: Date | string | null | undefined): string {
	return formatDisplayDate(date);
}

/** Format a date and time for admin metadata. */
export function formatDateTime(date: Date | string | null | undefined): string {
	return formatDisplayDateTime(date);
}

/** Format a date as a relative "time ago" string. */
export function timeAgo(date: Date | string | null | undefined): string {
	if (!date) return 'Never';
	const d = typeof date === 'string' ? new Date(date) : date;
	if (isNaN(d.getTime())) return '—';
	const diffMs = Date.now() - d.getTime();
	const diffSec = Math.floor(diffMs / 1000);
	if (diffSec < 60) return 'Just now';
	const diffMin = Math.floor(diffSec / 60);
	if (diffMin < 60) return `${diffMin}m ago`;
	const diffHr = Math.floor(diffMin / 60);
	if (diffHr < 24) return `${diffHr}h ago`;
	const diffDay = Math.floor(diffHr / 24);
	if (diffDay < 7) return `${diffDay}d ago`;
	if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
	if (diffDay < 365) return `${Math.floor(diffDay / 30)}mo ago`;
	return `${Math.floor(diffDay / 365)}y ago`;
}

/** Human-readable field labels for normalized candidate data. */
export const candidateFieldLabel: Record<string, string> = {
	title: 'Title',
	name: 'Name',
	description: 'Description',
	startDate: 'Start date',
	endDate: 'End date',
	startTime: 'Start time',
	endTime: 'End time',
	timezone: 'Timezone',
	location: 'Location',
	address: 'Address',
	city: 'City',
	state: 'State',
	region: 'Region',
	url: 'URL',
	sourceUrl: 'Source URL',
	imageUrl: 'Image',
	organizationName: 'Organization',
	organization: 'Organization',
	hostOrg: 'Host organization',
	contactEmail: 'Contact email',
	contactName: 'Contact name',
	format: 'Format',
	eventType: 'Event type',
	cost: 'Cost',
	registrationUrl: 'Registration link',
	deadline: 'Deadline',
	amount: 'Amount',
	eligibility: 'Eligibility',
	employer: 'Employer',
	jobType: 'Job type',
	salary: 'Salary',
	applicationUrl: 'Application link',
	sector: 'Sector',
	services: 'Services',
	phone: 'Phone',
	email: 'Email',
	website: 'Website',
	tags: 'Tags',
	notes: 'Notes'
};
