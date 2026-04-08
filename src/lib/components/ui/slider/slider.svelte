<script lang="ts">
	import { Slider as SliderPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';

	// bits-ui Slider is a discriminated union over `type: "single" | "multiple"`,
	// which blows up TS's checker when wrapped. We accept a wide prop shape
	// here and forward via a cast — consumers still see the bits-ui types
	// at the call site when they set `type`.
	/* eslint-disable @typescript-eslint/no-explicit-any */
	let {
		ref = $bindable(null),
		value = $bindable(),
		orientation = 'horizontal',
		class: className,
		...restProps
	}: {
		ref?: HTMLSpanElement | null;
		value?: number | number[];
		orientation?: 'horizontal' | 'vertical';
		class?: string;
		[key: string]: any;
	} = $props();
</script>

<SliderPrimitive.Root
	bind:ref
	bind:value={value as any}
	{orientation}
	data-slot="slider"
	class={cn(
		'relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col',
		className
	)}
	{...restProps as any}
>
	{#snippet children({ thumbs }: { thumbs: number[] })}
		<span
			data-slot="slider-track"
			class="relative grow overflow-hidden rounded-full bg-muted data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
		>
			<SliderPrimitive.Range
				data-slot="slider-range"
				class="absolute bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
			/>
		</span>
		{#each thumbs as index (index)}
			<SliderPrimitive.Thumb
				{index}
				data-slot="slider-thumb"
				class="block size-4 shrink-0 rounded-full border border-primary bg-background shadow-sm ring-ring/50 transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
			/>
		{/each}
	{/snippet}
</SliderPrimitive.Root>
