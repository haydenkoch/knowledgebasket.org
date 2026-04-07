import { captureAnalyticsEvent } from '$lib/analytics/posthog.client';

type ContentType = 'event' | 'funding' | 'redpage' | 'job' | 'toolbox' | 'organization';
type SubmissionType = 'event' | 'funding' | 'redpage' | 'toolbox';
type SearchSurface = 'global' | 'autocomplete';
type SearchScope = 'all' | 'events' | 'funding' | 'redpages' | 'jobs' | 'toolbox';

function normalizeText(value: string | null | undefined, maxLength = 120): string | undefined {
	const normalized = value?.trim().replace(/\s+/g, ' ');
	if (!normalized) return undefined;
	return normalized.slice(0, maxLength);
}

function normalizeSearchQuery(query: string | null | undefined): {
	query?: string;
	query_redacted?: boolean;
	query_length: number;
	query_terms: number;
} {
	const trimmed = query?.trim() ?? '';
	if (!trimmed) {
		return {
			query_length: 0,
			query_terms: 0
		};
	}

	const queryLength = trimmed.length;
	const queryTerms = trimmed.split(/\s+/).filter(Boolean).length;
	const looksSensitive = /@|https?:\/\/|www\./i.test(trimmed);

	return {
		query: looksSensitive ? undefined : trimmed.slice(0, 120),
		query_redacted: looksSensitive || undefined,
		query_length: queryLength,
		query_terms: queryTerms
	};
}

function destinationHost(href: string | null | undefined): string | undefined {
	if (!href) return undefined;

	try {
		return new URL(href).host;
	} catch {
		return undefined;
	}
}

export function trackContentViewed(options: {
	contentType: ContentType;
	slug: string | null | undefined;
	signedIn?: boolean;
	organizationSlug?: string | null;
}) {
	const slug = normalizeText(options.slug, 160);
	if (!slug) return;

	captureAnalyticsEvent('content_viewed', {
		content_type: options.contentType,
		slug,
		signed_in: options.signedIn ?? false,
		organization_slug: normalizeText(options.organizationSlug, 160) ?? null
	});
}

export function trackSaveClicked(options: {
	contentType: ContentType;
	slug: string | null | undefined;
	signedIn?: boolean;
	isBookmarked?: boolean;
	requiresAuth?: boolean;
}) {
	const slug = normalizeText(options.slug, 160);
	if (!slug) return;

	captureAnalyticsEvent('save_clicked', {
		content_type: options.contentType,
		slug,
		signed_in: options.signedIn ?? false,
		already_saved: options.isBookmarked ?? false,
		requires_auth: options.requiresAuth ?? false
	});
}

export function trackExternalLinkClicked(options: {
	contentType: ContentType;
	slug: string | null | undefined;
	action: string;
	href: string | null | undefined;
	signedIn?: boolean;
}) {
	const slug = normalizeText(options.slug, 160);
	const action = normalizeText(options.action, 80);
	if (!slug || !action) return;

	captureAnalyticsEvent('external_link_clicked', {
		content_type: options.contentType,
		slug,
		action,
		signed_in: options.signedIn ?? false,
		destination_host: destinationHost(options.href) ?? null
	});
}

export function trackSearchPerformed(options: {
	surface: SearchSurface;
	query: string | null | undefined;
	scope: SearchScope;
	resultCount: number;
	sort?: string | null;
	hasFilters?: boolean;
	resultSource?: string | null;
	isDegraded?: boolean;
}) {
	captureAnalyticsEvent('search_performed', {
		surface: options.surface,
		scope: options.scope,
		result_count: options.resultCount,
		sort: normalizeText(options.sort, 40) ?? null,
		has_filters: options.hasFilters ?? false,
		result_source: normalizeText(options.resultSource, 40) ?? null,
		degraded: options.isDegraded ?? false,
		...normalizeSearchQuery(options.query)
	});
}

export function trackSearchResultClicked(options: {
	surface: SearchSurface;
	query: string | null | undefined;
	scope: SearchScope;
	resultScope: string;
	resultKind: string;
	resultSlug?: string | null;
	href: string;
	position?: number | null;
}) {
	captureAnalyticsEvent('search_result_clicked', {
		surface: options.surface,
		scope: options.scope,
		result_scope: normalizeText(options.resultScope, 40) ?? null,
		result_kind: normalizeText(options.resultKind, 40) ?? null,
		result_slug: normalizeText(options.resultSlug, 160) ?? null,
		destination_host: destinationHost(options.href) ?? null,
		position: options.position ?? null,
		...normalizeSearchQuery(options.query)
	});
}

export function trackGlobalSearchOpened(scope?: SearchScope | null) {
	captureAnalyticsEvent('global_search_opened', {
		scope: scope ?? 'all'
	});
}

export function trackAuthPageViewed(flow: 'login' | 'register', hasRedirect = false) {
	captureAnalyticsEvent('auth_page_viewed', {
		flow,
		has_redirect: hasRedirect
	});
}

export function trackAuthSubmitted(flow: 'login' | 'register', method: 'password' | 'google') {
	captureAnalyticsEvent('auth_submitted', {
		flow,
		method
	});
}

export function trackSubmissionStarted(type: SubmissionType) {
	captureAnalyticsEvent('submission_started', {
		submission_type: type
	});
}

export function trackSubmissionSubmitted(type: SubmissionType) {
	captureAnalyticsEvent('submission_submitted', {
		submission_type: type
	});
}

export function trackSubmissionCompleted(type: SubmissionType) {
	captureAnalyticsEvent('submission_completed', {
		submission_type: type
	});
}

export function trackOrganizationAction(action: string, slug: string | null | undefined) {
	const normalizedAction = normalizeText(action, 80);
	const normalizedSlug = normalizeText(slug, 160);
	if (!normalizedAction || !normalizedSlug) return;

	captureAnalyticsEvent('organization_action_clicked', {
		action: normalizedAction,
		slug: normalizedSlug
	});
}
