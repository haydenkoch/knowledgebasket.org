<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';
	import KbHeader from '$lib/components/organisms/KbHeader.svelte';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';

	let { data, children } = $props();

	const isAdmin = $derived($page.url.pathname.startsWith('/admin'));
	const isAuth = $derived($page.url.pathname.startsWith('/auth'));
	const faviconHref = $derived(data.brandFaviconUrl ?? favicon);
</script>

<svelte:head>
	<link rel="icon" href={faviconHref} />
	<link rel="manifest" href="/manifest.webmanifest" />
	<meta name="theme-color" content="#132533" />
	<link
		rel="stylesheet"
		href="https://use.typekit.net/fkv3aem.css"
		media="print"
		onload={(e) => ((e.currentTarget as HTMLLinkElement).media = 'all')}
	/>
	<noscript>
		<link rel="stylesheet" href="https://use.typekit.net/fkv3aem.css" />
	</noscript>
</svelte:head>

{#if isAdmin || isAuth}
	{@render children()}
{:else}
	<a href="#main" class="skip-link">Skip to main content</a>
	<KbHeader logoUrl={data.brandLogoUrl} user={data.user} />
	<Tooltip.Provider>
		<main id="main" class="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
			{@render children()}
		</main>
	</Tooltip.Provider>
{/if}
