import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import posthog from 'posthog-js';

type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

let initialized = false;
let consentGranted = false;

function configuredApiKey(): string | null {
	const apiKey = env.PUBLIC_POSTHOG_KEY?.trim();
	return apiKey ? apiKey : null;
}

function configuredHost(): string {
	return env.PUBLIC_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com';
}

function initializePostHog() {
	const apiKey = configuredApiKey();
	if (!browser || initialized || !apiKey) return;

	posthog.init(apiKey, {
		api_host: configuredHost(),
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
			}
		}
	});

	initialized = true;
}

export function syncAnalyticsConsent(enabled: boolean) {
	consentGranted = enabled;

	if (!enabled && initialized) {
		posthog.opt_out_capturing();
		return;
	}

	initializePostHog();

	if (enabled && initialized) {
		posthog.opt_in_capturing();
	}
}

export function captureAnalyticsEvent(event: string, properties?: AnalyticsProperties) {
	if (!initialized || !consentGranted) return;
	posthog.capture(event, properties);
}

export function identifyAnalyticsUser(id: string, properties?: AnalyticsProperties) {
	if (!initialized || !consentGranted) return;
	posthog.identify(id, properties);
}

export function resetAnalyticsUser() {
	if (!initialized) return;
	posthog.reset();
}
