import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import {
	POSTHOG_DEFAULT_HOST,
	POSTHOG_EVENT_CATALOG,
	POSTHOG_GUARDS,
	POSTHOG_IDENTIFIED_PERSON_PROPERTIES,
	POSTHOG_MARKETING_SIGNALS
} from '$lib/insights/catalog';

export const load: PageServerLoad = async () => {
	const mapboxConfigured = !!(env.MAPBOX_ACCESS_TOKEN ?? env.MAPBOX_TOKEN);
	const meilisearchConfigured = !!(env.MEILISEARCH_HOST && env.MEILISEARCH_API_KEY);
	const posthogConfigured = !!publicEnv.PUBLIC_POSTHOG_KEY?.trim();
	const posthogHost = publicEnv.PUBLIC_POSTHOG_HOST?.trim() || POSTHOG_DEFAULT_HOST;
	const smtpConfigured = !!(env.SMTP_HOST?.trim() && env.SMTP_FROM?.trim());
	const smtpTransportSecurity = env.SMTP_SECURE?.trim() === 'true'
		? 'SMTPS'
		: env.SMTP_REQUIRE_TLS?.trim() === 'true'
			? 'STARTTLS'
			: 'Not enforced';

	return {
		mapboxConfigured,
		meilisearchConfigured,
		posthogConfigured,
		posthogHost,
		posthogGuards: POSTHOG_GUARDS,
		posthogIdentifiedPersonProperties: POSTHOG_IDENTIFIED_PERSON_PROPERTIES,
		posthogMarketingSignals: POSTHOG_MARKETING_SIGNALS,
		posthogEventCatalog: POSTHOG_EVENT_CATALOG,
		smtpConfigured,
		smtpFrom: env.SMTP_FROM?.trim() || null,
		smtpTransportSecurity
	};
};
