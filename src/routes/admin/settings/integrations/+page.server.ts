import type { PageServerLoad } from './$types';
import { env as publicEnv } from '$env/dynamic/public';
import {
	POSTHOG_DEFAULT_HOST,
	POSTHOG_EVENT_CATALOG,
	POSTHOG_GUARDS,
	POSTHOG_IDENTIFIED_PERSON_PROPERTIES,
	POSTHOG_MARKETING_SIGNALS
} from '$lib/insights/catalog';
import { readBoolean } from '$lib/config/runtime-config-core';
import { readRuntimeConfigValue } from '$lib/server/runtime-secrets';

export const load: PageServerLoad = async () => {
	const mapboxConfigured = !!(
		readRuntimeConfigValue('MAPBOX_ACCESS_TOKEN') ?? readRuntimeConfigValue('MAPBOX_TOKEN')
	);
	const meilisearchConfigured = !!(
		readRuntimeConfigValue('MEILISEARCH_HOST') && readRuntimeConfigValue('MEILISEARCH_API_KEY')
	);
	const posthogConfigured = !!publicEnv.PUBLIC_POSTHOG_KEY?.trim();
	const posthogHost = publicEnv.PUBLIC_POSTHOG_HOST?.trim() || POSTHOG_DEFAULT_HOST;
	const smtpConfigured = !!(
		readRuntimeConfigValue('SMTP_HOST')?.trim() && readRuntimeConfigValue('SMTP_FROM')?.trim()
	);
	const smtpTransportSecurity = readBoolean(readRuntimeConfigValue('SMTP_SECURE'))
		? 'SMTPS'
		: readBoolean(readRuntimeConfigValue('SMTP_REQUIRE_TLS'))
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
		smtpFrom: readRuntimeConfigValue('SMTP_FROM')?.trim() || null,
		smtpTransportSecurity
	};
};
