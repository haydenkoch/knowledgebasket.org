# Analytics And Marketing Email Notes

This repo now treats PostHog as an explicit, low-noise analytics integration instead of a broad autocapture layer.

## PostHog capture contract

- Consent gate: PostHog only starts after the visitor opts into analytics cookies.
- Development gate: the client does not initialize while `pnpm dev` is running.
- Explicit events only: generic click autocapture, automatic pageviews, and automatic pageleave capture are disabled.
- Replay safety: session replay stays available after consent, with masked inputs and optional extra blocking via `[data-sensitive]` and `[data-private]`.

### Identified person properties

When a signed-in user has granted analytics consent, the client may set these person properties in PostHog:

- `email`
- `role`
- `email_submission_updates`
- `email_org_activity`
- `email_followed_orgs`
- `email_bookmark_reminders`
- `email_newsletter`
- `in_app_submission_updates`
- `in_app_org_activity`
- `in_app_followed_orgs`
- `in_app_bookmark_reminders`

The app does not send arbitrary form bodies, rich text, search bodies that look like URLs or email addresses, or automatic route URLs with query strings.

### Event inventory

Current event helpers live in [src/lib/analytics/events.ts](/Users/hayden/Desktop/kb/site/src/lib/analytics/events.ts).

- `content_viewed`
- `save_clicked`
- `external_link_clicked`
- `search_performed`
- `search_result_clicked`
- `global_search_opened`
- `auth_page_viewed`
- `auth_submitted`
- `submission_started`
- `submission_submitted`
- `submission_completed`
- `organization_action_clicked`
- `organization_follow_changed`
- `job_interest_changed`
- `notification_preferences_saved`

For the full property list, see [src/lib/analytics/catalog.ts](/Users/hayden/Desktop/kb/site/src/lib/analytics/catalog.ts).

## Marketing email readiness

Reusable email builders now live in [src/lib/server/marketing-email.ts](/Users/hayden/Desktop/kb/site/src/lib/server/marketing-email.ts).

Available helpers:

- `buildMarketingEmailTemplate(...)`
- `buildFollowDigestEmail(...)`
- `buildInterestDigestEmail(...)`
- `buildNewsletterEmail(...)`

Each helper returns:

- `subject`
- `preheader`
- `html`
- `text`

`sendMail(...)` in [src/lib/server/email.ts](/Users/hayden/Desktop/kb/site/src/lib/server/email.ts) now accepts the optional `text` part as well.

## How to make a new template

1. Start with `buildMarketingEmailTemplate(...)` if the email shape is new.
2. Use a wrapper like `buildFollowDigestEmail(...)` when the email is a repeatable campaign type.
3. Keep the data model simple: title, summary, meta label, and optional link for each card.
4. Keep audience logic outside the template builder. The template should format content, not decide who receives it.
5. Pass `managePreferencesUrl` and `unsubscribeUrl` whenever the send is campaign-like instead of purely transactional.

Example:

```ts
import { sendMail } from '$lib/server/email';
import { buildInterestDigestEmail } from '$lib/server/marketing-email';

const message = buildInterestDigestEmail({
	recipientName: 'River',
	interestLabel: 'remote jobs',
	items: [
		{
			title: 'Community Programs Manager',
			meta: 'Jobs',
			body: 'A remote-friendly role with Indigenous program leadership focus.',
			href: 'https://example.com/jobs/community-programs-manager'
		}
	],
	primaryCta: {
		label: 'Browse more jobs',
		href: 'https://kb.example.com/jobs'
	},
	managePreferencesUrl: 'https://kb.example.com/account/notifications',
	unsubscribeUrl: 'https://kb.example.com/account/privacy'
});

await sendMail({
	to: 'river@example.com',
	subject: message.subject,
	html: message.html,
	text: message.text
});
```

## Segments that are now practical

- People who followed a specific organization
- People who marked interest on a job
- People who kept `email_followed_orgs` enabled
- People who kept `email_newsletter` enabled
- Combined cohorts, such as “followed org X and still wants follow emails”
