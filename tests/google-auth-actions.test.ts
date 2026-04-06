import { beforeEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
	signInSocial: vi.fn(),
	linkSocialAccount: vi.fn(),
	signInEmail: vi.fn(),
	getSession: vi.fn()
}));

const rateLimitMocks = vi.hoisted(() => ({
	consumeRateLimit: vi.fn()
}));

const googleProfileMocks = vi.hoisted(() => ({
	findLinkedGoogleAccount: vi.fn()
}));

vi.mock('$lib/server/auth', () => ({
	auth: {
		api: {
			signInSocial: authMocks.signInSocial,
			linkSocialAccount: authMocks.linkSocialAccount,
			signInEmail: authMocks.signInEmail,
			getSession: authMocks.getSession
		}
	},
	googleAuthEnabled: true
}));

vi.mock('$lib/server/rate-limit', () => ({
	RATE_LIMIT_POLICIES: {
		authLogin: { key: 'auth:login', limit: 8, windowMs: 600000 },
		authRegister: { key: 'auth:register', limit: 6, windowMs: 600000 }
	},
	consumeRateLimit: rateLimitMocks.consumeRateLimit
}));

vi.mock('$lib/server/google-profile', () => ({
	findLinkedGoogleAccount: googleProfileMocks.findLinkedGoogleAccount
}));

const loginModule = await import('../src/routes/auth/login/+page.server');
const registerModule = await import('../src/routes/auth/register/+page.server');
const settingsModule = await import('../src/routes/account/settings/+page.server');

function makeRequest(path: string, formData: FormData): Request {
	return new Request(`http://localhost${path}`, {
		method: 'POST',
		body: formData
	});
}

describe('google auth actions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		rateLimitMocks.consumeRateLimit.mockReturnValue({
			allowed: true,
			key: 'test',
			limit: 8,
			remaining: 7,
			resetAt: Date.now() + 60000,
			retryAfterSeconds: 60
		});
		googleProfileMocks.findLinkedGoogleAccount.mockResolvedValue(null);
	});

	it('starts the Google sign-in flow from the login page with the expected callbacks', async () => {
		authMocks.signInSocial.mockResolvedValue({
			url: 'https://google.test/oauth',
			redirect: false
		});

		const formData = new FormData();
		formData.set('redirect', '/events');
		const request = makeRequest('/auth/login', formData);

		await expect(
			loginModule.actions.signInGoogle({
				request
			} as never)
		).rejects.toMatchObject({
			status: 302,
			location: 'https://google.test/oauth'
		});

		expect(authMocks.signInSocial).toHaveBeenCalledWith({
			body: {
				provider: 'google',
				disableRedirect: true,
				callbackURL: '/auth/google/complete?next=%2Fevents',
				newUserCallbackURL: '/auth/google/complete?next=%2Faccount',
				errorCallbackURL: '/auth/login?google=error'
			}
		});
	});

	it('starts the Google sign-up flow from the register page with the expected callbacks', async () => {
		authMocks.signInSocial.mockResolvedValue({
			url: 'https://google.test/signup',
			redirect: false
		});

		const request = makeRequest('/auth/register', new FormData());

		await expect(
			registerModule.actions.signUpWithGoogle({
				request
			} as never)
		).rejects.toMatchObject({
			status: 302,
			location: 'https://google.test/signup'
		});

		expect(authMocks.signInSocial).toHaveBeenCalledWith({
			body: {
				provider: 'google',
				disableRedirect: true,
				callbackURL: '/auth/google/complete?next=%2F',
				newUserCallbackURL: '/auth/google/complete?next=%2Faccount',
				errorCallbackURL: '/auth/register?google=error'
			}
		});
	});

	it('starts Google account linking from account settings with the expected callbacks', async () => {
		authMocks.linkSocialAccount.mockResolvedValue({
			url: 'https://google.test/link',
			redirect: false
		});

		const request = makeRequest('/account/settings', new FormData());

		await expect(
			settingsModule.actions.linkGoogle({
				locals: {
					user: {
						id: 'user-1'
					}
				},
				request
			} as never)
		).rejects.toMatchObject({
			status: 302,
			location: 'https://google.test/link'
		});

		expect(authMocks.linkSocialAccount).toHaveBeenCalledWith({
			body: {
				provider: 'google',
				disableRedirect: true,
				callbackURL: '/auth/google/complete?next=%2Faccount%2Fsettings%3Fgoogle%3Dlinked',
				errorCallbackURL: '/account/settings?google=error'
			},
			headers: request.headers
		});
	});
});
