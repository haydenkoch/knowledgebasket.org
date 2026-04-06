<script lang="ts">
	import LegalPage from '$lib/components/organisms/LegalPage.svelte';
	import { legalConfig } from '$lib/legal/config';
</script>

<svelte:head>
	<title>Privacy Policy | Knowledge Basket</title>
	<meta
		name="description"
		content="Learn what personal data Knowledge Basket collects, how it is used, which vendors help run the product, and how to exercise your privacy rights."
	/>
</svelte:head>

<LegalPage
	eyebrow="Privacy"
	title="Privacy Policy"
	description="This policy explains what Knowledge Basket collects, why we collect it, how long we keep it, and how you can exercise account, correction, deletion, and marketing-choice rights."
>
	<h2>Who operates Knowledge Basket</h2>
	<p>
		Knowledge Basket is operated by {legalConfig.operatorName}. We run the product to help people
		find events, funding, jobs, directories, and practical resources connected to Indigenous
		communities and organizations.
	</p>

	<h2>What we collect</h2>
	<ul>
		<li>
			Account data such as your name, email address, role, verification state, and session metadata.
		</li>
		<li>
			Submission data such as the content you send us, contact details used for moderation, and
			attached files or images.
		</li>
		<li>
			Operational data such as rate limiting, request logs, security events, and search/indexing
			records.
		</li>
		<li>
			Browser-level preference data such as consent choices, submit-banner dismissal state, and
			sidebar state when you opt into preferences storage.
		</li>
	</ul>

	<h2>How we use personal information</h2>
	<ul>
		<li>To create and secure accounts, verify email addresses, and support password resets.</li>
		<li>To review, moderate, publish, edit, reject, or remove submissions.</li>
		<li>
			To communicate with you about your submissions, account, privacy rights, or safety issues.
		</li>
		<li>To run search, uploads, security monitoring, and reliability tooling.</li>
	</ul>

	<h2>Third-party services and processors</h2>
	<p>We use service providers to run the product. Current providers and purposes include:</p>
	<ul>
		{#each legalConfig.vendors as vendor}
			<li><strong>{vendor.name}:</strong> {vendor.purpose}</li>
		{/each}
	</ul>

	<h2>Geocoding and address lookup</h2>
	<p>
		When you use event location assistance in the submission flow, the text you type may be sent
		server-side to Mapbox, Photon, or the US Census Geocoder so we can suggest normalized addresses.
		Knowledge Basket does not currently request browser geolocation permission.
	</p>

	<h2>Cookies and similar technologies</h2>
	<p>
		Essential cookies are used for authentication, security, and abuse protection. Preferences,
		analytics, and marketing technologies remain off until you opt in. Read more on the
		<a href="/cookies">Cookies page</a>.
	</p>

	<h2>Retention</h2>
	<ul>
		<li>
			Account and session records are kept while the account remains active and for reasonable
			security and audit needs.
		</li>
		<li>
			Submission content is retained as part of the published or moderated knowledge base unless
			removal is required by law, policy, or an approved request.
		</li>
		<li>Privacy request records are retained to document how we responded.</li>
		<li>
			Uploads and operational logs are retained according to product, security, and moderation
			needs.
		</li>
	</ul>

	<h2>Your rights and choices</h2>
	<ul>
		<li>Access/export your account-linked data.</li>
		<li>Request correction of inaccurate content or records.</li>
		<li>
			Request deletion of your account or removal of identifying submission details where
			appropriate.
		</li>
		<li>Manage browser-level privacy choices and marketing preferences.</li>
	</ul>
	<p>
		You can use the self-serve controls at <a href="/account/privacy">Privacy &amp; data</a> when
		signed in, or visit <a href="/privacy/requests">Privacy Requests</a> for additional guidance.
	</p>

	<h2>Contact</h2>
	<p>
		Email <a href={`mailto:${legalConfig.privacyEmail}`}>{legalConfig.privacyEmail}</a> for privacy
		questions or rights requests. General support can be sent to
		<a href={`mailto:${legalConfig.supportEmail}`}>{legalConfig.supportEmail}</a>.
	</p>
</LegalPage>
