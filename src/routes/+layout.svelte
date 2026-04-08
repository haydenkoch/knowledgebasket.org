<script lang="ts">
	import './layout.css';
	import * as Sentry from '@sentry/sveltekit';
	import { browser } from '$app/environment';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';
	import { identifyAnalyticsUser, resetAnalyticsUser } from '$lib/insights/provider.client';
	import KbHeader from '$lib/components/organisms/KbHeader.svelte';
	import KbPublicNavSidebar from '$lib/components/organisms/KbPublicNavSidebar.svelte';
	import ConsentManager from '$lib/components/organisms/ConsentManager.svelte';
	import KbActionDock from '$lib/components/organisms/KbActionDock.svelte';
	import PublicCommandPalette from '$lib/components/organisms/PublicCommandPalette.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';

	let { data, children } = $props();
	let publicNavOpen = $state(false);

	const isAdmin = $derived($page.url.pathname.startsWith('/admin'));
	const isAuth = $derived($page.url.pathname.startsWith('/auth'));
	const isHome = $derived($page.url.pathname === '/');
	const faviconHref = $derived(data.brandFaviconUrl ?? favicon);

	function openGlobalSearch() {
		if (isHome) {
			window.dispatchEvent(new CustomEvent('kb:focus-home-search'));
		} else {
			window.dispatchEvent(new CustomEvent('kb:open-global-search'));
		}
	}

	$effect(() => {
		if (!browser) return;

		const user = data.user;

		if (user?.id) {
			const email = user.email?.trim() || undefined;
			const role = user.role?.trim() || undefined;

			Sentry.setUser({
				id: user.id,
				email
			});
			identifyAnalyticsUser(user.id, {
				email: email ?? null,
				role: role ?? null
			});
			return;
		}

		Sentry.setUser(null);
		resetAnalyticsUser();
	});
</script>

<svelte:head>
	<link rel="icon" href={faviconHref} />
	<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
	<link rel="icon" type="image/x-icon" href="/favicon.ico" />
	<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
	<link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
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
			<nav aria-label="Skip links">
				<a href="#main" class="skip-link">Skip to main content</a>
			</nav>
			<svelte:boundary onerror={(e) => console.error('KbHeader error:', e)}>
				<KbHeader logoUrl={data.brandLogoUrl} user={data.user} />
			</svelte:boundary>
			<main id="main" class="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
				{@render children()}
			</main>
			{#if !isHome && !publicNavOpen}
				<button
					type="button"
					class="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-1 rounded-full border border-[color:var(--rule)] bg-white/94 px-4 py-2 font-sans text-[11px] font-semibold tracking-[0.08em] text-[var(--dark)] uppercase shadow-[0_18px_30px_rgba(15,23,42,0.16)] backdrop-blur md:hidden"
					onclick={openGlobalSearch}
					aria-label="Open search drawer"
				>
					<span class="h-1 w-8 rounded-full bg-[var(--muted-foreground)]/35"></span>
					<span>Search</span>
				</button>
			{/if}
			<ConsentManager />
			<KbActionDock />
			<PublicCommandPalette />
		</div>
	</Sidebar.Provider>
{/if}
