import type { ClientInit, HandleClientError } from '@sveltejs/kit';
import * as Sentry from '@sentry/sveltekit';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/public';
import { CONSENT_UPDATED_EVENT, getConsent, type ConsentRecord } from '$lib/privacy/consent';
import { syncAnalyticsConsent } from '$lib/insights/provider.client';
import {
	configuredBoolean,
	configuredSampleRate,
	SENTRY_CLIENT_IGNORED_ERRORS
} from '$lib/shared/sentry';

let sentryInitialized = false;

function initializeSentry() {
	const dsn = env.PUBLIC_SENTRY_DSN?.trim();
	if (!dsn || sentryInitialized) return;

	const replayEnabled = configuredBoolean(env.PUBLIC_SENTRY_ENABLE_REPLAY, true);
	const feedbackEnabled = configuredBoolean(env.PUBLIC_SENTRY_ENABLE_FEEDBACK, true);
	const integrations = [];

	if (feedbackEnabled) {
		integrations.push(
			Sentry.feedbackIntegration({
				// Our custom Help dock owns the visible trigger, so never let Sentry
				// inject a parallel floating "Report a bug" button.
				autoInject: false,
				showBranding: false,
				colorScheme: 'system',
				formTitle: 'Report a bug',
				triggerLabel: 'Report a bug',
				triggerAriaLabel: 'Open bug report form',
				showName: false,
				showEmail: true,
				isEmailRequired: false,
				enableScreenshot: true,
				useSentryUser: {
					email: 'email',
					name: 'name'
				},
				tags: {
					app_area: 'site'
				}
			})
		);
	}

	if (replayEnabled) {
		integrations.push(
			Sentry.replayIntegration({
				maskAllText: true,
				blockAllMedia: true
			})
		);
	}

	Sentry.init({
		dsn,
		enabled: !dev || env.PUBLIC_SENTRY_ENABLE_DEV === 'true',
		environment: env.PUBLIC_SENTRY_ENVIRONMENT?.trim() || (dev ? 'development' : undefined),
		release: env.PUBLIC_SENTRY_RELEASE?.trim() || undefined,
		sendDefaultPii: false,
		strictTraceContinuation: true,
		tracesSampleRate: configuredSampleRate(env.PUBLIC_SENTRY_TRACES_SAMPLE_RATE, dev ? 1 : 0.1),
		replaysSessionSampleRate: replayEnabled
			? configuredSampleRate(env.PUBLIC_SENTRY_REPLAY_SESSION_SAMPLE_RATE, dev ? 1 : 0.05)
			: 0,
		replaysOnErrorSampleRate: replayEnabled
			? configuredSampleRate(env.PUBLIC_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE, 1)
			: 0,
		ignoreErrors: [...SENTRY_CLIENT_IGNORED_ERRORS],
		integrations
	});

	sentryInitialized = true;
}

function applyAnalyticsConsent(record: ConsentRecord) {
	syncAnalyticsConsent(record.categories.analytics);

	if (!sentryInitialized) return;

	Sentry.setTag('consent.analytics', record.categories.analytics ? 'granted' : 'denied');
	Sentry.setTag('privacy.global_privacy_control', record.globalPrivacyControl ? 'true' : 'false');
}

export const init: ClientInit = () => {
	initializeSentry();
	applyAnalyticsConsent(getConsent());

	window.addEventListener(CONSENT_UPDATED_EVENT, (event) => {
		applyAnalyticsConsent((event as CustomEvent<ConsentRecord>).detail);
	});
};

export const handleError: HandleClientError = Sentry.handleErrorWithSentry();
