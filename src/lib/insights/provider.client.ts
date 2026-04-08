import { browser, dev } from '$app/environment';
import { env } from '$env/dynamic/public';
import posthog from 'posthog-js/lib/src/entrypoints/module.slim.es.js';
import { SessionReplayExtensions } from 'posthog-js/lib/src/entrypoints/extension-bundles.es.js';
import { POSTHOG_DEFAULT_HOST } from '$lib/insights/catalog';

type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;
type AnalyticsIdentity = {
	id: string;
	properties?: AnalyticsProperties;
};
type SlimPostHogConfig = import('posthog-js/lib/src/entrypoints/module.slim.es').PostHogConfig;

let initialized = false;
let consentGranted = false;
let identifiedUser: AnalyticsIdentity | null = null;
let personProperties: AnalyticsProperties = {};
const sessionReplayExtensions = SessionReplayExtensions as unknown as NonNullable<
	SlimPostHogConfig['__extensionClasses']
>;

function configuredApiKey(): string | null {
	const apiKey = env.PUBLIC_POSTHOG_KEY?.trim();
	return apiKey ? apiKey : null;
}

function configuredHost(): string {
	return env.PUBLIC_POSTHOG_HOST?.trim() || POSTHOG_DEFAULT_HOST;
}

function applyIdentifiedUser() {
	if (!initialized || !consentGranted || !identifiedUser) return;

	posthog.identify(identifiedUser.id, identifiedUser.properties);
	if (Object.keys(personProperties).length > 0) {
		posthog.setPersonProperties(personProperties);
	}
}

function initializePostHog() {
	const apiKey = configuredApiKey();
	if (!browser || dev || initialized || !apiKey) return;

	posthog.init(apiKey, {
		api_host: configuredHost(),
		__extensionClasses: sessionReplayExtensions,
		defaults: '2026-01-30',
		autocapture: false,
		capture_pageview: false,
		capture_pageleave: false,
		disable_surveys: true,
		disable_web_experiments: true,
		mask_personal_data_properties: true,
		opt_out_capturing_by_default: true,
		person_profiles: 'identified_only',
		session_recording: {
			maskAllInputs: true,
			blockSelector: '[data-sensitive], [data-private]'
		},
		loaded() {
			if (consentGranted) {
				posthog.opt_in_capturing();
				applyIdentifiedUser();
			}
		}
	});

	initialized = true;
}

export function syncAnalyticsConsent(enabled: boolean) {
	consentGranted = enabled;

	if (!enabled && initialized) {
		posthog.reset();
		posthog.opt_out_capturing();
		return;
	}

	initializePostHog();

	if (enabled && initialized) {
		posthog.opt_in_capturing();
		applyIdentifiedUser();
	}
}

export function captureAnalyticsEvent(event: string, properties?: AnalyticsProperties) {
	if (!initialized || !consentGranted) return;
	posthog.capture(event, properties);
}

export function identifyAnalyticsUser(id: string, properties?: AnalyticsProperties) {
	identifiedUser = { id, properties };
	initializePostHog();

	if (!initialized || !consentGranted) return;
	posthog.identify(id, properties);
}

export function updateAnalyticsPersonProperties(properties: AnalyticsProperties) {
	personProperties = {
		...personProperties,
		...properties
	};
	initializePostHog();

	if (!initialized || !consentGranted) return;
	posthog.setPersonProperties(properties);
}

export function resetAnalyticsUser() {
	identifiedUser = null;
	personProperties = {};
	if (!initialized) return;
	posthog.reset();
}
