import * as Sentry from '@sentry/sveltekit';
import { env } from '$env/dynamic/private';
import { sanitizeSentryAttributes, sanitizeSentryValue } from '$lib/shared/sentry';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
	debug: 10,
	info: 20,
	warn: 30,
	error: 40
};

function configuredLogLevel(): LogLevel {
	const level = env.LOG_LEVEL?.trim().toLowerCase();
	if (level === 'debug' || level === 'info' || level === 'warn' || level === 'error') {
		return level;
	}

	return 'info';
}

function shouldLog(level: LogLevel): boolean {
	return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[configuredLogLevel()];
}

function serializeError(error: unknown) {
	if (error instanceof Error) {
		return {
			name: error.name,
			message: error.message,
			stack: error.stack
		};
	}

	return {
		message: typeof error === 'string' ? error : 'Unknown error',
		value: error
	};
}

async function sendErrorWebhook(payload: Record<string, unknown>) {
	const webhookUrl = env.ERROR_WEBHOOK_URL?.trim();
	if (!webhookUrl) return;

	try {
		await fetch(webhookUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(payload)
		});
	} catch (webhookError) {
		console.error(
			JSON.stringify({
				timestamp: new Date().toISOString(),
				level: 'warn',
				event: 'observability.webhook_failed',
				error: serializeError(webhookError)
			})
		);
	}
}

export function logServerEvent(
	event: string,
	details: Record<string, unknown> = {},
	level: LogLevel = 'info'
) {
	if (!shouldLog(level)) return;

	const payload = {
		timestamp: new Date().toISOString(),
		level,
		event,
		...details
	};

	const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
	console[method](JSON.stringify(payload));

	const sentryAttributes = sanitizeSentryAttributes({
		event,
		...details
	});

	switch (level) {
		case 'debug':
			Sentry.logger.debug(event, sentryAttributes);
			return;
		case 'warn':
			Sentry.logger.warn(event, sentryAttributes);
			return;
		case 'error':
			Sentry.logger.error(event, sentryAttributes);
			return;
		default:
			Sentry.logger.info(event, sentryAttributes);
	}
}

export async function captureServerError(
	event: string,
	error: unknown,
	details: Record<string, unknown> = {},
	options: { reportToSentry?: boolean } = {}
) {
	const payload = {
		timestamp: new Date().toISOString(),
		level: 'error',
		event,
		...details,
		error: serializeError(error)
	};

	console.error(JSON.stringify(payload));

	const sentryDetails = sanitizeSentryAttributes(details);
	const sentryError =
		error instanceof Error
			? {
					name: error.name,
					message: error.message
				}
			: (sanitizeSentryValue(payload.error, 'error') ?? payload.error);

	Sentry.logger.error(event, {
		...sentryDetails,
		error: sentryError
	});

	if (options.reportToSentry !== false) {
		Sentry.withScope((scope) => {
			scope.setLevel('error');
			scope.setTag('observability.event', event);
			scope.setContext('observability', {
				event,
				...sentryDetails,
				error: sentryError
			});

			if (error instanceof Error) {
				Sentry.captureException(error);
				return;
			}

			Sentry.captureMessage(
				typeof payload.error.message === 'string'
					? `${event}: ${payload.error.message}`
					: `${event}: unknown error`,
				'error'
			);
		});
	}

	await sendErrorWebhook(payload);
}
