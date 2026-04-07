import * as Sentry from '@sentry/sveltekit';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import {
	configuredBoolean,
	configuredSampleRate,
	sanitizeSentryAttributes
} from '$lib/shared/sentry';

const serverDsn = privateEnv.SENTRY_DSN?.trim() || publicEnv.PUBLIC_SENTRY_DSN?.trim();

if (serverDsn) {
	Sentry.init({
		dsn: serverDsn,
		enabled:
			process.env.NODE_ENV !== 'development' || publicEnv.PUBLIC_SENTRY_ENABLE_DEV === 'true',
		environment:
			privateEnv.SENTRY_ENVIRONMENT?.trim() ||
			privateEnv.RAILWAY_ENVIRONMENT_NAME?.trim() ||
			publicEnv.PUBLIC_SENTRY_ENVIRONMENT?.trim() ||
			process.env.NODE_ENV ||
			undefined,
		release:
			privateEnv.SENTRY_RELEASE?.trim() ||
			privateEnv.RAILWAY_GIT_COMMIT_SHA?.trim() ||
			publicEnv.PUBLIC_SENTRY_RELEASE?.trim() ||
			undefined,
		sendDefaultPii: false,
		enableLogs: configuredBoolean(privateEnv.SENTRY_ENABLE_LOGS, true),
		strictTraceContinuation: true,
		tracesSampleRate: configuredSampleRate(
			privateEnv.SENTRY_TRACES_SAMPLE_RATE ?? publicEnv.PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
			process.env.NODE_ENV === 'development' ? 1 : 0.1
		),
		beforeSend(event) {
			if (event.request?.headers && typeof event.request.headers === 'object') {
				event.request.headers = sanitizeSentryAttributes(
					event.request.headers as Record<string, unknown>
				) as Record<string, string>;
			}

			return event;
		},
		beforeSendLog(log) {
			return {
				...log,
				attributes: sanitizeSentryAttributes(log.attributes ?? {})
			};
		}
	});

	Sentry.setTag('runtime', 'railway');
	Sentry.setTag('service', 'site');
}
