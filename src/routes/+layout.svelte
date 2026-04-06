<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';
	import KbHeader from '$lib/components/organisms/KbHeader.svelte';
	import KbPublicNavSidebar from '$lib/components/organisms/KbPublicNavSidebar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';

	let { data, children } = $props();
	let publicNavOpen = $state(false);

	const isAdmin = $derived($page.url.pathname.startsWith('/admin'));
	const isAuth = $derived($page.url.pathname.startsWith('/auth'));
	const faviconHref = $derived(data.brandFaviconUrl ?? favicon);
</script>

<svelte:head>
	<link rel="icon" href={faviconHref} />
	<link rel="manifest" href="/manifest.webmanifest" />
	<meta name="theme-color" content="#132533" />
	<link rel="dns-prefetch" href="//use.typekit.net" />
	<link rel="dns-prefetch" href="//p.typekit.net" />
	<link rel="preconnect" href="https://use.typekit.net" />
	<link rel="preconnect" href="https://p.typekit.net" crossorigin="anonymous" />
	<link rel="preload" href="https://use.typekit.net/fkv3aem.css" as="style" />
	<link rel="stylesheet" href="https://use.typekit.net/fkv3aem.css" />
	<noscript>
		<link rel="stylesheet" href="https://use.typekit.net/fkv3aem.css" />
	</noscript>
</svelte:head>

{#if isAdmin || isAuth}
	{@render children()}
{:else}
	<Sidebar.Provider bind:open={publicNavOpen} class="block min-h-screen">
		<KbPublicNavSidebar logoUrl={data.brandLogoUrl} user={data.user} />
		<div class="flex min-h-screen w-full flex-col">
			<a href="#main" class="skip-link">Skip to main content</a>
			<KbHeader logoUrl={data.brandLogoUrl} user={data.user} />
			<Tooltip.Provider>
				<main id="main" class="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
					{@render children()}
				</main>
			</Tooltip.Provider>
		</div>
	</Sidebar.Provider>
{/if}
