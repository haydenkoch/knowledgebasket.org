import { beforeEach, describe, expect, it, vi } from 'vitest';

const posthogMock = vi.hoisted(() => ({
	init: vi.fn(),
	opt_in_capturing: vi.fn(),
	opt_out_capturing: vi.fn(),
	capture: vi.fn(),
	identify: vi.fn(),
	reset: vi.fn()
}));

async function loadModule(options?: {
	browser?: boolean;
	dev?: boolean;
	publicPosthogKey?: string;
	publicPosthogHost?: string;
}) {
	vi.resetModules();

	vi.doMock('$app/environment', () => ({
		browser: options?.browser ?? true,
		dev: options?.dev ?? false
	}));

	vi.doMock('$env/dynamic/public', () => ({
		env: {
			PUBLIC_POSTHOG_KEY: options?.publicPosthogKey ?? 'phc_test_key',
			PUBLIC_POSTHOG_HOST: options?.publicPosthogHost ?? 'https://us.i.posthog.com'
		}
	}));

	vi.doMock('posthog-js', () => ({
		default: posthogMock
	}));

	return import('../src/lib/analytics/posthog.client');
}

describe('posthog client integration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('initializes PostHog in production with the current defaults bundle', async () => {
		const module = await loadModule({ dev: false });

		module.syncAnalyticsConsent(true);

		expect(posthogMock.init).toHaveBeenCalledWith(
			'phc_test_key',
			expect.objectContaining({
				api_host: 'https://us.i.posthog.com',
				defaults: '2026-01-30',
				autocapture: true,
				opt_out_capturing_by_default: true
			})
		);
	});

	it('does not initialize PostHog while the dev server is running', async () => {
		const module = await loadModule({ dev: true });

		module.syncAnalyticsConsent(true);

		expect(posthogMock.init).not.toHaveBeenCalled();
	});
});
