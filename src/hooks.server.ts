import type { Handle, HandleServerError } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import * as Sentry from '@sentry/sveltekit';
import { building, dev } from '$app/environment';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { auth } from '$lib/server/auth';
import { guardAdminRequest } from '$lib/server/access-control';
import { captureServerError } from '$lib/server/observability';
import { assertProductionRuntimeConfig } from '$lib/server/runtime-config';
import { svelteKitHandler } from 'better-auth/svelte-kit';

function configuredSampleRate(value: string | undefined, fallback: number): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback;
}

function telemetryOrigin(value: string | undefined): string | null {
	if (!value?.trim()) return null;

	try {
		return new URL(value).origin;
	} catch {
		return null;
	}
}

const serverDsn = privateEnv.SENTRY_DSN?.trim() || publicEnv.PUBLIC_SENTRY_DSN?.trim();

if (!building && !dev) {
	assertProductionRuntimeConfig();
}

if (serverDsn) {
	Sentry.init({
		dsn: serverDsn,
		enabled: !building && (!dev || publicEnv.PUBLIC_SENTRY_ENABLE_DEV === 'true'),
		environment:
			privateEnv.SENTRY_ENVIRONMENT?.trim() ||
			privateEnv.RAILWAY_ENVIRONMENT_NAME?.trim() ||
			publicEnv.PUBLIC_SENTRY_ENVIRONMENT?.trim() ||
			undefined,
		release:
			privateEnv.SENTRY_RELEASE?.trim() ||
			privateEnv.RAILWAY_GIT_COMMIT_SHA?.trim() ||
			publicEnv.PUBLIC_SENTRY_RELEASE?.trim() ||
			undefined,
		sendDefaultPii: false,
		tracesSampleRate: configuredSampleRate(
			privateEnv.SENTRY_TRACES_SAMPLE_RATE ?? publicEnv.PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
			dev ? 1 : 0.1
		)
	});
}

function buildContentSecurityPolicy(): string {
	const connectSrc = [
		"'self'",
		'https://photon.komoot.io',
		'https://geocoding.geo.census.gov',
		'https://api.mapbox.com'
	];

	const sentryOrigin = telemetryOrigin(publicEnv.PUBLIC_SENTRY_DSN);
	if (sentryOrigin) connectSrc.push(sentryOrigin);

	const posthogOrigin = telemetryOrigin(publicEnv.PUBLIC_POSTHOG_HOST);
	if (posthogOrigin) connectSrc.push(posthogOrigin);

	if (dev) {
		connectSrc.push('ws:', 'wss:', 'http://localhost:*', 'http://127.0.0.1:*', 'http://0.0.0.0:*');
	}

	const scriptSrc = ["'self'"];
	scriptSrc.push("'unsafe-inline'");
	if (dev) {
		scriptSrc.push("'unsafe-eval'");
	}

	return [
		"default-src 'self'",
		`script-src ${scriptSrc.join(' ')}`,
		"style-src 'self' 'unsafe-inline' https://use.typekit.net https://p.typekit.net",
		"font-src 'self' data: https://use.typekit.net https://p.typekit.net",
		"img-src 'self' data: blob: https:",
		`connect-src ${connectSrc.join(' ')}`,
		"object-src 'none'",
		"frame-ancestors 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"manifest-src 'self'"
	].join('; ');
}

function applySecurityHeaders(response: Response): Response {
	response.headers.set('Content-Security-Policy', buildContentSecurityPolicy());
	response.headers.set(
		'Permissions-Policy',
		'camera=(), microphone=(), geolocation=(), payment=(), usb=(), midi=(), autoplay=(self), fullscreen=(self), clipboard-read=(), clipboard-write=(self)'
	);
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('X-Content-Type-Options', 'nosniff');

	if (!dev) {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}

	return response;
}

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;

		Sentry.setUser({
			id: session.user.id,
			email: session.user.email ?? undefined
		});
	} else {
		Sentry.setUser(null);
	}

	const url = event.url.toString();
	if (url.includes('/api/auth/')) {
		const { isAuthPath } = await import('better-auth/svelte-kit');
		const matched = isAuthPath(url, auth.options);
		if (matched) {
			return applySecurityHeaders(await auth.handler(event.request));
		}
	}

	const adminGuardResponse = guardAdminRequest(event);
	if (adminGuardResponse) {
		return applySecurityHeaders(adminGuardResponse);
	}

	Sentry.setTag('runtime', 'railway');
	if (privateEnv.RAILWAY_ENVIRONMENT_NAME) {
		Sentry.setTag('railway.environment', privateEnv.RAILWAY_ENVIRONMENT_NAME);
	}
	if (privateEnv.RAILWAY_DEPLOYMENT_ID) {
		Sentry.setTag('railway.deployment_id', privateEnv.RAILWAY_DEPLOYMENT_ID);
	}
	if (privateEnv.RAILWAY_SERVICE_NAME) {
		Sentry.setTag('railway.service', privateEnv.RAILWAY_SERVICE_NAME);
	}
	if (event.route.id) {
		Sentry.setTag('sveltekit.route_id', event.route.id);
	}

	const response = await svelteKitHandler({ event, resolve, auth, building });
	return applySecurityHeaders(response);
};

export const handle: Handle = sequence(Sentry.sentryHandle(), handleBetterAuth);

export const handleError: HandleServerError = Sentry.handleErrorWithSentry(
	({ error, event, status, message }) => {
		void captureServerError('request.unhandled', error, {
			path: event.url.pathname,
			method: event.request.method,
			status,
			message
		});

		return {
			message
		};
	}
);
