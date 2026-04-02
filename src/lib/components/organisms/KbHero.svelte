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

<section
	class="relative flex flex-col justify-end overflow-hidden px-4 pt-14 pb-12 sm:px-6 lg:px-10"
>
	<div class="pointer-events-none absolute inset-0" style="background: {bgGradient}"></div>

	{#if weave}
		<div
			class="pointer-events-none absolute top-0 right-0 h-full w-[340px] opacity-[0.12]"
			aria-hidden="true"
		>
			{@render weave()}
		</div>
	{/if}

	<div class="relative z-[1] max-w-[680px]">
		{#if eyebrow}
			<p
				class="mb-[10px] font-sans text-[11px] font-bold tracking-[0.12em] text-white uppercase opacity-90"
			>
				{eyebrow}
			</p>
		{/if}
		{#if title}
			<h1 class="font-display mt-0 mb-3 text-[42px] leading-[1.15] font-bold text-white">
				{title}
			</h1>
		{/if}
		{#if description}
			<p class="max-w-[520px] text-base leading-relaxed text-white/95">{description}</p>
		{/if}
		{#if stats}
			<div class="mt-6 flex gap-8">
				{@render stats()}
			</div>
		{/if}
	</div>
</section>
