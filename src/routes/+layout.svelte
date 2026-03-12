<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import KbHeader from '$lib/components/organisms/KbHeader.svelte';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<!-- Typekit: load async so ad blockers blocking it don't affect rendering (fallback: sans-serif/serif) -->
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
<a href="#main" class="skip-link">Skip to main content</a>
<KbHeader />
<Tooltip.Provider>
	<main id="main" class="min-h-screen bg-[var(--color-kb-sand)] text-[#1c1c1c]">
		{@render children()}
	</main>
</Tooltip.Provider>
