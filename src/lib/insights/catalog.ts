export const POSTHOG_DEFAULT_HOST = 'https://us.i.posthog.com';

export const POSTHOG_IDENTIFIED_PERSON_PROPERTIES = [
	'email',
	'role',
	'email_submission_updates',
	'email_org_activity',
	'email_followed_orgs',
	'email_bookmark_reminders',
	'email_newsletter',
	'in_app_submission_updates',
	'in_app_org_activity',
	'in_app_followed_orgs',
	'in_app_bookmark_reminders'
] as const;

export const POSTHOG_GUARDS = [
	'Analytics consent is required before any PostHog capture or identify calls run.',
	'PostHog stays disabled while `pnpm dev` is running.',
	'No generic click/form autocapture is enabled.',
	'No automatic pageview or pageleave capture is enabled.',
	'Session replay stays available only after consent and keeps inputs masked.'
] as const;

export const POSTHOG_MARKETING_SIGNALS = [
	'organization_follow_changed',
	'job_interest_changed',
	'notification_preferences_saved'
] as const;

export type AnalyticsEventCatalogEntry = {
	name: string;
	description: string;
	properties: readonly string[];
	notes?: string;
};

export const POSTHOG_EVENT_CATALOG: readonly AnalyticsEventCatalogEntry[] = [
	{
		name: 'content_viewed',
		description: 'Explicit views on public detail pages.',
		properties: ['content_type', 'slug', 'signed_in', 'organization_slug']
	},
	{
		name: 'save_clicked',
		description: 'Save/bookmark intent from public detail pages.',
		properties: ['content_type', 'slug', 'signed_in', 'already_saved', 'requires_auth']
	},
	{
		name: 'external_link_clicked',
		description: 'Outbound CTA clicks such as apply, visit site, email, or call.',
		properties: ['content_type', 'slug', 'action', 'signed_in', 'destination_host']
	},
	{
		name: 'search_performed',
		description: 'Global and on-page search usage.',
		properties: [
			'surface',
			'scope',
			'result_count',
			'sort',
			'has_filters',
			'result_source',
			'degraded',
			'query',
			'query_redacted',
			'query_length',
			'query_terms'
		],
		notes: 'Raw search text is withheld when the query looks like a URL or email address.'
	},
	{
		name: 'search_result_clicked',
		description: 'Which search results users open.',
		properties: [
			'surface',
			'scope',
			'result_scope',
			'result_kind',
			'result_slug',
			'destination_host',
			'position',
			'query',
			'query_redacted',
			'query_length',
			'query_terms'
		]
	},
	{
		name: 'global_search_opened',
		description: 'Global search launcher opens.',
		properties: ['scope']
	},
	{
		name: 'auth_page_viewed',
		description: 'Login and register page views tracked manually.',
		properties: ['flow', 'has_redirect']
	},
	{
		name: 'auth_submitted',
		description: 'Submitted auth intent by method.',
		properties: ['flow', 'method']
	},
	{
		name: 'submission_started',
		description: 'Public submission forms started.',
		properties: ['submission_type']
	},
	{
		name: 'submission_submitted',
		description: 'Public submission forms posted.',
		properties: ['submission_type']
	},
	{
		name: 'submission_completed',
		description: 'Successful public submissions.',
		properties: ['submission_type']
	},
	{
		name: 'organization_action_clicked',
		description: 'Non-follow organization CTA clicks such as claim intent or auth prompts.',
		properties: ['action', 'slug']
	},
	{
		name: 'organization_follow_changed',
		description: 'Successful follow or unfollow changes.',
		properties: ['slug', 'following', 'signed_in']
	},
	{
		name: 'job_interest_changed',
		description: 'Successful job interest changes.',
		properties: ['slug', 'interested', 'signed_in']
	},
	{
		name: 'notification_preferences_saved',
		description: 'Saved inbox and email delivery preferences.',
		properties: [
			'email_submission_updates',
			'email_org_activity',
			'email_followed_orgs',
			'email_bookmark_reminders',
			'email_newsletter',
			'in_app_submission_updates',
			'in_app_org_activity',
			'in_app_followed_orgs',
			'in_app_bookmark_reminders'
		]
	}
] as const;
