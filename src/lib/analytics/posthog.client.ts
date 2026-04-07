import { browser, dev } from '$app/environment';
import { env } from '$env/dynamic/public';
import posthog from 'posthog-js';

type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;
type AnalyticsIdentity = {
	id: string;
	properties?: AnalyticsProperties;
};

let initialized = false;
let consentGranted = false;
let identifiedUser: AnalyticsIdentity | null = null;

function configuredApiKey(): string | null {
	const apiKey = env.PUBLIC_POSTHOG_KEY?.trim();
	return apiKey ? apiKey : null;
}

function configuredHost(): string {
	return env.PUBLIC_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com';
}

function applyIdentifiedUser() {
	if (!initialized || !consentGranted || !identifiedUser) return;

	posthog.identify(identifiedUser.id, identifiedUser.properties);
}

function initializePostHog() {
	const apiKey = configuredApiKey();
	if (!browser || dev || initialized || !apiKey) return;

	posthog.init(apiKey, {
		api_host: configuredHost(),
		defaults: '2026-01-30',
		autocapture: true,
		capture_pageview: 'history_change',
		capture_pageleave: true,
		disable_surveys: true,
		disable_web_experiments: true,
		mask_personal_data_properties: true,
		opt_out_capturing_by_default: true,
		person_profiles: 'identified_only',
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

export function resetAnalyticsUser() {
	identifiedUser = null;
	if (!initialized) return;
	posthog.reset();
}
