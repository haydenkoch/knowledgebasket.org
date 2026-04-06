export const GOOGLE_PROVIDER_ID = 'google';

const GOOGLE_COMPLETE_PATH = '/auth/google/complete';

export function safeRedirectPath(redirectTo: string | null | undefined, fallback = '/'): string {
	if (!redirectTo) return fallback;
	if (redirectTo.startsWith('/') && !redirectTo.startsWith('//')) return redirectTo;
	return fallback;
}

export function buildGoogleCompletionURL(next: string): string {
	const params = new URLSearchParams({ next });
	return `${GOOGLE_COMPLETE_PATH}?${params.toString()}`;
}

export function buildGoogleErrorURL(basePath: string): string {
	const params = new URLSearchParams({ google: 'error' });
	return `${basePath}?${params.toString()}`;
}

export function buildGoogleLinkedURL(basePath: string): string {
	const params = new URLSearchParams({ google: 'linked' });
	return `${basePath}?${params.toString()}`;
}

export function buildGoogleSignInTargets(options: {
	next: string;
	newUserNext: string;
	errorPath: string;
}) {
	return {
		callbackURL: buildGoogleCompletionURL(options.next),
		newUserCallbackURL: buildGoogleCompletionURL(options.newUserNext),
		errorCallbackURL: buildGoogleErrorURL(options.errorPath)
	};
}

export function buildGoogleLinkTargets(options: { next: string; errorPath: string }) {
	return {
		callbackURL: buildGoogleCompletionURL(options.next),
		errorCallbackURL: buildGoogleErrorURL(options.errorPath)
	};
}

export function getGoogleAuthErrorMessage(errorCode: string | null | undefined): string {
	switch (errorCode) {
		case 'account_not_linked':
			return 'We could not match that Google account to an existing sign-in method.';
		case "email_doesn't_match":
			return 'That Google account uses a different email address than this Knowledge Basket account.';
		case 'account_already_linked_to_different_user':
			return 'That Google account is already linked to another Knowledge Basket account.';
		case 'unable_to_link_account':
			return 'We could not finish linking your Google account. Please try again.';
		case 'email_not_found':
			return 'Google did not return an email address for that account.';
		case 'oauth_provider_not_found':
		case 'provider_not_found':
			return 'Google sign-in is not configured for this environment yet.';
		case 'invalid_code':
		case 'no_code':
			return 'Google sign-in expired or was interrupted. Please try again.';
		case 'unable_to_get_user_info':
			return 'We could not read your Google profile. Please try again.';
		case 'signup_disabled':
			return 'Google sign-up is currently unavailable.';
		default:
			return 'We could not complete Google sign-in. Please try again.';
	}
}
