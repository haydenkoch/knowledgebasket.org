<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		coil?: 'home' | 'events' | 'funding' | 'redpages' | 'jobs' | 'toolbox';
		eyebrow?: string;
		title?: string;
		description?: string;
		weave?: Snippet;
		stats?: Snippet;
	}

	let { coil = 'home', eyebrow, title, description, weave, stats }: Props = $props();

	const gradients: Record<string, string> = {
		home: 'linear-gradient(135deg, var(--color-lakebed-950), var(--color-lakebed-800))',
		events: 'linear-gradient(135deg, var(--color-lakebed-950), var(--color-lakebed-800))',
		funding: 'linear-gradient(135deg, var(--color-flicker-900), var(--color-flicker-100))',
		redpages: 'linear-gradient(135deg, var(--color-salmonberry-900), var(--color-salmonberry-100))',
		jobs: 'linear-gradient(135deg, var(--color-pinyon-800), var(--color-pinyon-200))',
		toolbox: 'linear-gradient(135deg, var(--color-glacier-600), var(--color-glacier-200))'
	};

	const bgGradient = $derived(gradients[coil] ?? gradients.home);
</script>

<section class="relative overflow-hidden pt-14 pb-12 px-10 flex flex-col justify-end">
	<div class="absolute inset-0" style="background: {bgGradient}"></div>

	{#if weave}
		<div class="absolute top-0 right-0 w-[340px] h-full opacity-[0.12]" aria-hidden="true">
			{@render weave()}
		</div>
	{/if}

	<div class="relative z-[1] max-w-[680px]">
		{#if eyebrow}
			<p class="font-sans text-[11px] font-bold tracking-[0.12em] uppercase text-white opacity-90 mb-[10px]">{eyebrow}</p>
		{/if}
		{#if title}
			<h1 class="font-display text-[42px] font-bold text-white leading-[1.15] mt-0 mb-3">{title}</h1>
		{/if}
		{#if description}
			<p class="text-base text-white/95 max-w-[520px] leading-relaxed">{description}</p>
		{/if}
		{#if stats}
			<div class="flex gap-8 mt-6">
				{@render stats()}
			</div>
		{/if}
	</div>
</section>
