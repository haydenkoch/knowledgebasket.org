<script lang="ts" module>
	import { tv } from 'tailwind-variants';

	export const navigationMenuLinkVariants = tv({
		base: 'inline-flex min-h-11 items-center rounded-full px-4 py-2 font-sans text-[13px] font-semibold tracking-[0.03em] transition-[background-color,color,box-shadow,transform] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-lakebed-950)]',
		variants: {
			active: {
				true: 'bg-white text-[var(--color-lakebed-950)] shadow-[0_10px_24px_rgba(15,23,42,0.18)]',
				false:
					'text-white/72 hover:bg-white/12 hover:text-white data-[highlighted]:bg-white/12 data-[highlighted]:text-white'
			}
		},
		defaultVariants: {
			active: false
		}
	});
</script>

<script lang="ts">
	import { NavigationMenu as NavigationMenuPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		active = false,
		...restProps
	}: NavigationMenuPrimitive.LinkProps = $props();
</script>

<NavigationMenuPrimitive.Link
	bind:ref
	data-slot="navigation-menu-link"
	{active}
	class={cn(navigationMenuLinkVariants({ active }), className)}
	{...restProps}
/>
