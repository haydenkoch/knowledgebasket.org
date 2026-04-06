import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import { CONSENT_VERSION } from '$lib/legal/config';

export const CONSENT_COOKIE_NAME = 'kb_consent';
export const CONSENT_STORAGE_KEY = 'kb:consent';
export const CONSENT_UPDATED_EVENT = 'kb:consent-updated';
export const privacyChoicesOpen = writable(false);

export const CONSENT_CATEGORIES = ['essential', 'preferences', 'analytics', 'marketing'] as const;

export type ConsentCategory = (typeof CONSENT_CATEGORIES)[number];

export type ConsentRecord = {
	version: string;
	updatedAt: string;
	source: 'banner' | 'preferences';
	globalPrivacyControl: boolean;
	categories: Record<ConsentCategory, boolean>;
};

type PartialConsentCategories = Partial<Record<ConsentCategory, boolean>>;

function detectGlobalPrivacyControl(): boolean {
	if (!browser) return false;
	return (
		(navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
	);
}

function defaultCategories(gpc = detectGlobalPrivacyControl()): Record<ConsentCategory, boolean> {
	return {
		essential: true,
		preferences: false,
		analytics: false,
		marketing: !gpc ? false : false
	};
}

export function createConsentRecord(
	categories: PartialConsentCategories = {},
	source: ConsentRecord['source'] = 'preferences'
): ConsentRecord {
	const globalPrivacyControl = detectGlobalPrivacyControl();
	return {
		version: CONSENT_VERSION,
		updatedAt: new Date().toISOString(),
		source,
		globalPrivacyControl,
		categories: {
			...defaultCategories(globalPrivacyControl),
			...categories,
			essential: true,
			marketing: globalPrivacyControl ? false : (categories.marketing ?? false)
		}
	};
}

function parseConsentRecord(value: string | null | undefined): ConsentRecord | null {
	if (!value) return null;
	try {
		const parsed = JSON.parse(value) as ConsentRecord;
		if (parsed.version !== CONSENT_VERSION) return null;
		return createConsentRecord(parsed.categories, parsed.source);
	} catch {
		return null;
	}
}

function readConsentCookie(): ConsentRecord | null {
	if (!browser) return null;
	const rawCookie = document.cookie
		.split('; ')
		.find((entry) => entry.startsWith(`${CONSENT_COOKIE_NAME}=`))
		?.split('=')
		.slice(1)
		.join('=');
	if (!rawCookie) return null;
	try {
		return parseConsentRecord(decodeURIComponent(rawCookie));
	} catch {
		return null;
	}
}

export function readStoredConsent(): ConsentRecord | null {
	if (!browser) return null;
	const fromStorage = parseConsentRecord(localStorage.getItem(CONSENT_STORAGE_KEY));
	return fromStorage ?? readConsentCookie();
}

export function getConsent(): ConsentRecord {
	return readStoredConsent() ?? createConsentRecord({}, 'banner');
}

export function hasResolvedConsent(): boolean {
	return readStoredConsent() != null;
}

export function hasConsent(category: ConsentCategory): boolean {
	return getConsent().categories[category];
}

export function persistConsent(record: ConsentRecord): ConsentRecord {
	if (!browser) return record;
	const serialized = JSON.stringify(record);
	localStorage.setItem(CONSENT_STORAGE_KEY, serialized);
	document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(serialized)}; path=/; max-age=${60 * 60 * 24 * 180}; SameSite=Lax`;
	window.dispatchEvent(new CustomEvent<ConsentRecord>(CONSENT_UPDATED_EVENT, { detail: record }));
	return record;
}

export function clearConsent(): void {
	if (!browser) return;
	localStorage.removeItem(CONSENT_STORAGE_KEY);
	document.cookie = `${CONSENT_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
	window.dispatchEvent(
		new CustomEvent<ConsentRecord>(CONSENT_UPDATED_EVENT, {
			detail: createConsentRecord({}, 'preferences')
		})
	);
}

export function saveConsent(
	categories: PartialConsentCategories,
	source: ConsentRecord['source'] = 'preferences'
): ConsentRecord {
	return persistConsent(createConsentRecord(categories, source));
}

export function openPrivacyChoices(): void {
	if (!browser) return;
	privacyChoicesOpen.set(true);
}

export function closePrivacyChoices(): void {
	privacyChoicesOpen.set(false);
}
