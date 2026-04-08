<script lang="ts">
	import LegalPage from '$lib/components/organisms/LegalPage.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { openPrivacyChoices } from '$lib/privacy/consent';
</script>

<svelte:head>
	<title>Cookie Policy | Knowledge Basket</title>
	<meta
		name="description"
		content="See which essential, preference, analytics, and marketing technologies Knowledge Basket uses and how to reopen privacy choices."
	/>
</svelte:head>

<LegalPage
	eyebrow="Cookies"
	title="Cookie Policy"
	description="Knowledge Basket uses a small number of cookies and browser storage entries to keep sign-in secure, preserve consent choices, and remember optional interface preferences when you allow them."
>
	<h2>Categories we use</h2>
	<ul>
		<li>
			<strong>Essential:</strong> authentication, security, abuse prevention, and consent state.
		</li>
		<li>
			<strong>Preferences:</strong> optional UI state such as sidebar state and dismissed submit banners.
		</li>
		<li>
			<strong>Analytics:</strong> privacy-respecting usage analytics, off unless you opt in.
		</li>
		<li>
			<strong>Marketing:</strong> marketing, retargeting, and ad-related technologies, off unless you
			opt in.
		</li>
	</ul>

	<h2>Current preference storage examples</h2>
	<ul>
		<li>
			The public navigation sidebar state is written to a cookie only when preference storage is
			allowed.
		</li>
		<li>
			Dismissed submit-banner state is stored in the browser only when preference storage is
			allowed.
		</li>
		<li>Consent choices are stored so the site remembers what you selected.</li>
	</ul>

	<h2>Analytics technologies in use</h2>
	<ul>
		<li>
			Knowledge Basket uses PostHog for explicit product analytics and masked session replay after
			analytics consent is granted.
		</li>
		<li>The app does not use broad click autocapture or automatic pageview capture for PostHog.</li>
		<li>
			For signed-in users who opt in, PostHog may receive account-level properties such as email,
			role, and email-delivery preferences so the team can understand opted-in cohorts and prepare
			relevant follow-up campaigns.
		</li>
	</ul>

	<h2>How to change your choices</h2>
	<p>
		Use the persistent privacy launcher in the lower corner of the site, the Legal section in the
		public sidebar, or the button below.
	</p>
	<p>
		<Button type="button" onclick={openPrivacyChoices}>Open privacy choices</Button>
	</p>

	<h2>Global Privacy Control</h2>
	<p>
		If your browser sends a Global Privacy Control signal, Knowledge Basket treats it conservatively
		and keeps marketing-related choices turned off unless you deliberately change them.
	</p>
</LegalPage>
