<script lang="ts">
	import LegalPage from '$lib/components/organisms/LegalPage.svelte';
	import { legalConfig } from '$lib/legal/config';
</script>

<svelte:head>
	<title>Terms of Service | Knowledge Basket</title>
	<meta
		name="description"
		content="Read the rules for using Knowledge Basket, submitting content, creating an account, and interacting with curated community listings."
	/>
</svelte:head>

<LegalPage
	eyebrow="Terms"
	title="Terms of Service"
	description="These terms govern access to Knowledge Basket, user accounts, submissions, and how curated or community-submitted information may appear on the site."
>
	<h2>Using the service</h2>
	<p>
		By using Knowledge Basket, you agree to use the service lawfully, accurately, and in a way that
		does not interfere with other users, moderators, or the safety of the product.
	</p>

	<h2>Accounts</h2>
	<ul>
		<li>
			You are responsible for the accuracy of the information you provide when creating an account.
		</li>
		<li>
			You must protect your credentials and notify us if you believe your account has been
			compromised.
		</li>
		<li>
			We may suspend or remove accounts used for abuse, fraud, scraping that harms the service, or
			repeated policy violations.
		</li>
	</ul>

	<h2>Submitting content</h2>
	<ul>
		<li>You may submit events, funding, jobs, directory entries, and resources for moderation.</li>
		<li>You represent that you have the right to submit the content and any files you upload.</li>
		<li>
			You grant {legalConfig.operatorName} the right to review, edit, format, publish, depublish, or remove
			the submission to operate Knowledge Basket.
		</li>
		<li>
			Moderation remains discretionary. We may reject, pause, or remove submissions that are
			inaccurate, harmful, unlawful, infringing, misleading, abusive, or outside our mission.
		</li>
	</ul>

	<h2>Acceptable use</h2>
	<ul>
		<li>
			Do not upload malicious files, spam, deceptive content, or content that violates third-party
			rights.
		</li>
		<li>Do not attempt to bypass authentication, rate limits, or security controls.</li>
		<li>Do not impersonate individuals, organizations, or rights holders.</li>
	</ul>

	<h2>Directory and listing disclaimers</h2>
	<p>
		Knowledge Basket includes curated and user-submitted information. We aim for trustworthy
		listings, but we do not guarantee that every third-party event, job, grant, business, or
		resource is complete, current, or suitable for every use.
	</p>

	<h2>Takedown and reporting</h2>
	<p>
		If you believe material on Knowledge Basket infringes rights, exposes unsafe information, or
		should be corrected or removed, use <a href="/privacy/requests">Privacy Requests</a> or contact
		<a href={`mailto:${legalConfig.privacyEmail}`}>{legalConfig.privacyEmail}</a>.
	</p>

	<h2>Liability and service changes</h2>
	<p>
		We may change, pause, or discontinue features at any time. To the extent permitted by law,
		Knowledge Basket is provided on an “as available” basis without guarantees of uninterrupted
		service.
	</p>
</LegalPage>
