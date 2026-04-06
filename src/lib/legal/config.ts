export const LEGAL_EFFECTIVE_DATE = 'April 5, 2026';
export const LEGAL_LAST_UPDATED_DATE = 'April 5, 2026';
export const CONSENT_VERSION = '2026-04-05';

export const legalConfig = {
	operatorName: 'Indigenous Futures Society',
	productName: 'Knowledge Basket',
	privacyEmail: 'privacy@knowledgebasket.ca',
	supportEmail: 'hello@knowledgebasket.ca',
	mailingAddress: [
		'Indigenous Futures Society',
		'California and Canada operations',
		'Contact us by email for privacy requests requiring mailed records'
	],
	vendors: [
		{
			name: 'Better Auth',
			purpose: 'Account authentication, session handling, and email verification'
		},
		{
			name: 'Postgres',
			purpose:
				'Primary application database for accounts, submissions, moderation, and request history'
		},
		{
			name: 'MinIO / S3-compatible object storage',
			purpose: 'Uploaded image and file storage'
		},
		{
			name: 'Meilisearch',
			purpose: 'Cross-coil search indexing'
		},
		{
			name: 'SMTP mail provider',
			purpose: 'Password reset, verification, and operational email delivery'
		},
		{
			name: 'Mapbox',
			purpose: 'Server-side address and place lookup for event submissions when configured'
		},
		{
			name: 'Photon (Komoot)',
			purpose: 'Server-side address and place lookup fallback'
		},
		{
			name: 'US Census Geocoder',
			purpose: 'Server-side US address lookup fallback'
		}
	]
} as const;

export const legalNavLinks = [
	{ href: '/about', label: 'About' },
	{ href: '/privacy', label: 'Privacy' },
	{ href: '/terms', label: 'Terms' },
	{ href: '/cookies', label: 'Cookies' },
	{ href: '/privacy/requests', label: 'Privacy Requests' }
] as const;
