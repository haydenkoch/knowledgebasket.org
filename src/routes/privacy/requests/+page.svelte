<script lang="ts">
	import LegalPage from '$lib/components/organisms/LegalPage.svelte';
	import { legalConfig } from '$lib/legal/config';

	let { data } = $props();
</script>

<svelte:head>
	<title>Privacy Requests | Knowledge Basket</title>
	<meta
		name="description"
		content="Learn how to request access, deletion, correction, removal, and privacy-related support from Knowledge Basket."
	/>
</svelte:head>

<LegalPage
	eyebrow="Privacy Requests"
	title="How to make a privacy request"
	description="Knowledge Basket supports access, export, deletion, correction, suppression, and marketing-choice requests. Signed-in users can self-serve some of these actions directly."
>
	<h2>Signed-in self-serve options</h2>
	<p>
		{#if data.user}
			You are signed in, so you can use <a href="/account/privacy">Privacy &amp; data</a> to download
			your data, delete your account, and submit correction or removal requests.
		{:else}
			Sign in to <a href="/account/privacy">Privacy &amp; data</a> for self-serve export and account deletion
			tools.
		{/if}
	</p>

	<h2>Requests we support</h2>
	<ul>
		<li>Access or export of data linked to your account.</li>
		<li>Deletion or anonymization of your account record.</li>
		<li>Correction of inaccurate content or personal information.</li>
		<li>Removal or suppression requests for published content where appropriate.</li>
		<li>Opt-out requests related to marketing or future tracking technologies.</li>
	</ul>

	<h2>Verification</h2>
	<p>
		We only ask for the minimum information needed to verify you. For signed-in requests, your
		current session is used as the primary verification step. For email requests, we may ask you to
		confirm from the same address tied to the account or submission.
	</p>

	<h2>Response timing</h2>
	<p>
		We aim to acknowledge requests promptly and respond within a reasonable period, including the
		timelines expected under applicable California and Canadian privacy rules when those laws apply.
	</p>

	<h2>Contact us directly</h2>
	<p>
		Email <a href={`mailto:${legalConfig.privacyEmail}`}>{legalConfig.privacyEmail}</a> if you cannot
		sign in, need an alternative process, or have a question about how your information is handled.
	</p>
</LegalPage>
