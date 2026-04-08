<script lang="ts">
	import SeoHead from '$lib/components/SeoHead.svelte';
	import LegalPage from '$lib/components/organisms/LegalPage.svelte';
	import { legalConfig } from '$lib/legal/config';
	import { buildOgImagePath } from '$lib/seo/metadata';

	let { data } = $props();
	const origin = $derived((data.seoOrigin ?? '') as string);
</script>

<SeoHead
	{origin}
	pathname="/support"
	title="Support | Knowledge Basket"
	description="Find the current support contact for Knowledge Basket and learn where account, privacy, content, and technical issues should be routed."
	ogImage={buildOgImagePath({
		title: 'Support',
		eyebrow: 'Get help with Knowledge Basket',
		theme: 'neutral',
		meta: 'Support contact and routing guidance'
	})}
	ogImageAlt="Knowledge Basket support page social preview"
	breadcrumbItems={[
		{ name: 'Knowledge Basket', pathname: '/' },
		{ name: 'Support', pathname: '/support' }
	]}
/>

<LegalPage
	eyebrow="Support"
	title="Get support"
	description="Use this page for general help with accounts, submissions, broken pages, and product questions. Privacy and legal requests have their own route below."
>
	<h2>Email support</h2>
	<p>
		Email <a href={`mailto:${legalConfig.supportEmail}`}>{legalConfig.supportEmail}</a>. This is the
		main support inbox for Knowledge Basket right now.
	</p>

	<h2>What support can help with</h2>
	<ul>
		<li>Account access problems such as login, verification, or password-reset issues.</li>
		<li>Submission questions for events, funding, jobs, Red Pages, or Toolbox entries.</li>
		<li>Broken links, missing pages, display bugs, and other technical problems on the site.</li>
		<li>
			General questions about how Knowledge Basket works or where something should be submitted.
		</li>
	</ul>

	<h2>What to include in your message</h2>
	<ul>
		<li>Your email address or account details, if the problem is tied to a sign-in.</li>
		<li>The page URL or listing URL involved, if there is one.</li>
		<li>A short description of what happened, what you expected, and what you need help with.</li>
		<li>Screenshots or copied error text when available.</li>
	</ul>

	<h2>Privacy and data requests</h2>
	<p>
		For privacy rights, account deletion, data export, or correction and removal requests, use
		<a href="/account/privacy">Privacy &amp; data</a> when signed in or visit
		<a href="/privacy/requests">Privacy Requests</a>. You can also email
		<a href={`mailto:${legalConfig.privacyEmail}`}>{legalConfig.privacyEmail}</a> for privacy-specific
		help.
	</p>

	<h2>Current support channel</h2>
	<p>
		Support is email-based for now. If the support process changes, this page will be updated with
		the new path.
	</p>
</LegalPage>
