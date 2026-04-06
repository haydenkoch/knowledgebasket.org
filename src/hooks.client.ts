import type { ClientInit, HandleClientError } from '@sveltejs/kit';
import * as Sentry from '@sentry/sveltekit';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/public';
import { CONSENT_UPDATED_EVENT, getConsent, type ConsentRecord } from '$lib/privacy/consent';
import { syncAnalyticsConsent } from '$lib/analytics/posthog.client';

let sentryInitialized = false;

function configuredSampleRate(value: string | undefined, fallback: number): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback;
}

function initializeSentry() {
	const dsn = env.PUBLIC_SENTRY_DSN?.trim();
	if (!dsn || sentryInitialized) return;

	Sentry.init({
		dsn,
		enabled: !dev || env.PUBLIC_SENTRY_ENABLE_DEV === 'true',
		environment: env.PUBLIC_SENTRY_ENVIRONMENT?.trim() || undefined,
		release: env.PUBLIC_SENTRY_RELEASE?.trim() || undefined,
		sendDefaultPii: false,
		tracesSampleRate: configuredSampleRate(env.PUBLIC_SENTRY_TRACES_SAMPLE_RATE, dev ? 1 : 0.1)
	});

	sentryInitialized = true;
}

function applyAnalyticsConsent(record: ConsentRecord) {
	syncAnalyticsConsent(record.categories.analytics);
}

export const init: ClientInit = () => {
	initializeSentry();
	applyAnalyticsConsent(getConsent());

	window.addEventListener(CONSENT_UPDATED_EVENT, (event) => {
		applyAnalyticsConsent((event as CustomEvent<ConsentRecord>).detail);
	});
};

export const handleError: HandleClientError = Sentry.handleErrorWithSentry();
