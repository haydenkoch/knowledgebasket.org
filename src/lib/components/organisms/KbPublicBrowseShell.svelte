<script lang="ts">
	import type { CoilKey } from '$lib/data/kb';
	import type { Snippet } from 'svelte';
	import CoilTheme from '$lib/components/organisms/CoilTheme.svelte';
	import MobilePeekPanel from '$lib/components/organisms/MobilePeekPanel.svelte';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';

	interface Props {
		coil: CoilKey;
		sidebar?: Snippet<[boolean]>;
		children?: Snippet;
		mobileFiltersExpanded?: boolean;
		peekHeight?: number;
	}

	let {
		coil,
		sidebar,
		children,
		mobileFiltersExpanded = $bindable(false),
		peekHeight = 70
	}: Props = $props();

	const publicSidebar = useSidebar();

	$effect(() => {
		if (publicSidebar.openMobile) mobileFiltersExpanded = false;
	});

	function collapseMobileFilters() {
		mobileFiltersExpanded = false;
	}
</script>

<CoilTheme {coil}>
	<div
		class="coil-layout flex w-full flex-col flex-nowrap md:flex-row"
		style="min-height: calc(100dvh - 144px - var(--kb-submit-banner-offset, 76px))"
		role="presentation"
	>
		<div
			class="coil-layout__left order-1 hidden w-full flex-none overflow-hidden overflow-y-auto border-b border-[var(--rule)] bg-[var(--color-alpine-50,#fafaf8)] p-3 md:block md:w-[272px] md:border-r md:border-b-0 md:px-3 md:py-5"
		>
			{@render sidebar?.(false)}
		</div>
		<main
			class="coil-layout__main order-2 min-w-0 flex-1 p-4 md:p-6 md:pl-7"
			style="padding-bottom: calc(7rem + var(--kb-consent-banner-offset, 0px));"
		>
			{@render children?.()}
		</main>
	</div>

	{#if mobileFiltersExpanded && !publicSidebar.openMobile}
		<button
			type="button"
			class="kb-public-browse-shell__mobile-overlay md:hidden"
			onclick={collapseMobileFilters}
			aria-label="Collapse filters"
		></button>
	{/if}
	<MobilePeekPanel
		bind:expanded={mobileFiltersExpanded}
		{peekHeight}
		class="kb-public-browse-shell__mobile-panel md:hidden {publicSidebar.openMobile
			? 'kb-public-browse-shell__mobile-panel--behind-nav'
			: ''}"
	>
		<div class="kb-public-browse-shell__mobile-drawer-body">
			{@render sidebar?.(true)}
		</div>
	</MobilePeekPanel>
</CoilTheme>

<style>
	:global(.kb-public-browse-shell__mobile-overlay) {
		position: fixed;
		inset: 0;
		z-index: 40;
		border: none;
		background: rgba(15, 23, 42, 0.18);
	}

	.kb-public-browse-shell__mobile-drawer-body {
		overflow-y: auto;
		padding: 0.25rem 1.25rem 0.5rem;
	}

	:global(.kb-public-browse-shell__mobile-panel--behind-nav.mobile-peek-panel) {
		z-index: 39;
	}
</style>
