<script lang="ts">
	import { SlidersHorizontal } from '@lucide/svelte';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import * as Drawer from '$lib/components/ui/drawer/index.js';
	import Input from '$lib/components/ui/input/input.svelte';
	import { cn } from '$lib/utils.js';
	import type { Snippet } from 'svelte';

	interface Props {
		sidebar?: Snippet;
		children?: Snippet;
		mobileFilterLabel?: string;
		mobileFilterTitle?: string;
		mobileActiveFilterCount?: number;
		onMobileClear?: (() => void) | undefined;
		mobileSearchPlaceholder?: string;
		mobileSearchQuery?: string;
	}
	let {
		sidebar,
		children,
		mobileFilterLabel = 'Filters',
		mobileFilterTitle = 'Refine results',
		mobileActiveFilterCount = 0,
		onMobileClear,
		mobileSearchPlaceholder = 'Search…',
		mobileSearchQuery = $bindable('')
	}: Props = $props();

	let mobileFiltersOpen = $state(false);
</script>

<div class="kb-two-col">
	{#if sidebar}
		<aside class="kb-two-col__side">
			<div class="kb-two-col__side-inner">
				{@render sidebar()}
			</div>
		</aside>
	{/if}
	<main class="kb-two-col__main">
		{#if sidebar}
			<div class="kb-two-col__mobile-toolbar">
				<div class="kb-two-col__mobile-search">
					<Input
						type="search"
						placeholder={mobileSearchPlaceholder}
						bind:value={mobileSearchQuery}
					/>
				</div>
				<button
					type="button"
					class={cn(
						buttonVariants({
							variant: mobileActiveFilterCount > 0 ? 'default' : 'outline',
							size: 'default'
						}),
						'kb-two-col__mobile-trigger'
					)}
					onclick={() => (mobileFiltersOpen = true)}
				>
					<SlidersHorizontal class="h-4 w-4" />
					<span>{mobileFilterLabel}</span>
					{#if mobileActiveFilterCount > 0}
						<span class="kb-two-col__mobile-count">{mobileActiveFilterCount}</span>
					{/if}
				</button>
			</div>
		{/if}
		{@render children?.()}
	</main>

	{#if sidebar}
		<Drawer.Root bind:open={mobileFiltersOpen}>
			<Drawer.Content class="kb-two-col__mobile-sheet">
				<Drawer.Header class="kb-two-col__mobile-sheet-header">
					<div class="kb-two-col__mobile-sheet-kicker">Filters</div>
					<Drawer.DrawerTitle>{mobileFilterTitle}</Drawer.DrawerTitle>
					<Drawer.DrawerDescription class="sr-only">
						Refine the current results using search and filters.
					</Drawer.DrawerDescription>
				</Drawer.Header>
				<div class="kb-two-col__mobile-sheet-body">
					{@render sidebar()}
				</div>
				<Drawer.Footer class="kb-two-col__mobile-sheet-footer">
					{#if mobileActiveFilterCount > 0 && onMobileClear}
						<button
							type="button"
							class={buttonVariants({ variant: 'outline', size: 'default' })}
							onclick={onMobileClear}
						>
							Clear all
						</button>
					{/if}
					<button
						type="button"
						class={buttonVariants({ variant: 'default', size: 'default' })}
						onclick={() => (mobileFiltersOpen = false)}
					>
						Show results
					</button>
				</Drawer.Footer>
			</Drawer.Content>
		</Drawer.Root>
	{/if}
</div>

<style>
	.kb-two-col {
		display: flex;
		min-height: calc(100dvh - 144px);
		align-items: stretch;
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--background) 92%, white) 0%,
			var(--background) 100%
		);
	}
	.kb-two-col__side {
		width: 272px;
		flex: 0 0 272px;
		padding: 1.25rem 0.75rem;
		background: color-mix(in srgb, var(--color-alpine-50, #fafaf8) 78%, white);
		border-right: 1px solid color-mix(in srgb, var(--rule, #e5e5e5) 78%, transparent);
		min-height: 0;
	}
	.kb-two-col__side-inner {
		position: sticky;
		top: 1rem;
		max-height: calc(100vh - 2rem);
		overflow-y: auto;
		padding-right: 0.25rem;
	}
	.kb-two-col__main {
		flex: 1 1 0%;
		min-width: 0;
		padding: 1.5rem 1.75rem 2rem;
	}
	.kb-two-col__mobile-toolbar {
		display: none;
		margin-bottom: 1rem;
		gap: 0.75rem;
	}
	.kb-two-col__mobile-search {
		flex: 1 1 auto;
		min-width: 0;
	}
	:global(.kb-two-col__mobile-trigger) {
		flex: 0 0 auto;
		justify-content: space-between;
	}
	.kb-two-col__mobile-count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.5rem;
		height: 1.5rem;
		padding: 0 0.42rem;
		border-radius: 9999px;
		background: color-mix(in srgb, white 18%, transparent);
		font-size: 0.74rem;
		font-weight: 700;
	}
	:global(.kb-two-col__mobile-sheet) {
		max-height: min(88vh, 48rem);
		border-top-left-radius: 1.25rem;
		border-top-right-radius: 1.25rem;
	}
	:global(.kb-two-col__mobile-sheet-header) {
		padding-bottom: 0.5rem;
	}
	.kb-two-col__mobile-sheet-kicker {
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted-foreground);
	}
	.kb-two-col__mobile-sheet-body {
		overflow-y: auto;
		padding: 0 1rem 1rem;
	}
	:global(.kb-two-col__mobile-sheet-body [data-kb-sidebar-search]) {
		display: none;
	}
	:global(.kb-two-col__mobile-sheet-footer) {
		border-top: 1px solid color-mix(in srgb, var(--rule, #e5e5e5) 75%, transparent);
		padding-top: 0.9rem;
	}
	@media (max-width: 768px) {
		.kb-two-col {
			display: block;
		}
		.kb-two-col__main {
			padding: 1rem;
		}
		.kb-two-col__mobile-toolbar {
			display: flex;
			align-items: center;
		}
	}
</style>
