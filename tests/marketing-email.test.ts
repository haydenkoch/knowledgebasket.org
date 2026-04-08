import { describe, expect, it } from 'vitest';
import {
	buildFollowDigestEmail,
	buildInterestDigestEmail,
	buildNewsletterEmail
} from '../src/lib/server/marketing-email';

describe('marketing email templates', () => {
	it('builds a follow digest with html and text output', () => {
		const message = buildFollowDigestEmail({
			recipientName: 'River',
			organizations: ['River House'],
			items: [
				{
					title: 'Community Gathering',
					meta: 'Events',
					body: 'A follow-based digest card for an upcoming event.',
					href: 'https://example.com/events/community-gathering'
				}
			],
			managePreferencesUrl: 'https://example.com/account/notifications',
			unsubscribeUrl: 'https://example.com/account/privacy'
		});

		expect(message.subject).toContain('follow');
		expect(message.html).toContain('Community Gathering');
		expect(message.html).toContain('Manage preferences');
		expect(message.text).toContain('https://example.com/events/community-gathering');
	});

	it('builds an interest digest with a CTA', () => {
		const message = buildInterestDigestEmail({
			interestLabel: 'remote jobs',
			items: [
				{
					title: 'Programs Lead',
					meta: 'Jobs',
					body: 'A role matched to an explicit interest signal.',
					href: 'https://example.com/jobs/programs-lead'
				}
			],
			primaryCta: {
				label: 'Browse more jobs',
				href: 'https://example.com/jobs'
			}
		});

		expect(message.subject).toContain('remote jobs');
		expect(message.html).toContain('Browse more jobs');
		expect(message.text).toContain('Primary CTA: Browse more jobs');
	});

	it('builds a generic newsletter template', () => {
		const message = buildNewsletterEmail({
			subject: 'Knowledge Basket weekly',
			preheader: 'This week across the network.',
			title: 'Weekly roundup',
			intro: 'A broad update for subscribers.',
			sections: [
				{
					title: 'Highlights',
					items: [{ title: 'One', body: 'First highlight.' }]
				}
			]
		});

		expect(message.preheader).toBe('This week across the network.');
		expect(message.html).toContain('Weekly roundup');
		expect(message.text).toContain('Highlights');
	});
});
