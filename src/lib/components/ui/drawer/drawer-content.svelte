<script lang="ts">
	import { Drawer as DrawerPrimitive } from 'vaul-svelte';
	import { cn, type WithoutChildrenOrChild } from '$lib/utils.js';
	import type { Snippet } from 'svelte';

	let {
		ref = $bindable(null),
		class: className,
		children,
		showHandle = true,
		...restProps
	}: WithoutChildrenOrChild<DrawerPrimitive.ContentProps> & {
		children: Snippet;
		showHandle?: boolean;
	} = $props();
</script>

<DrawerPrimitive.Portal>
	<DrawerPrimitive.Overlay
		class="fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
	/>
	<DrawerPrimitive.Content
		bind:ref
		data-slot="drawer-content"
		class={cn(
			'fixed inset-x-0 bottom-0 z-50 mt-24 flex max-h-[90vh] flex-col rounded-t-[1.35rem] border bg-background shadow-lg outline-none',
			className
		)}
		{...restProps}
	>
		{#if showHandle}
			<div class="flex justify-center pt-3 pb-2">
				<div class="h-1.5 w-12 rounded-full bg-muted-foreground/25"></div>
			</div>
		{/if}
		{@render children()}
	</DrawerPrimitive.Content>
</DrawerPrimitive.Portal>
