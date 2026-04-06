<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		eyebrow?: string;
		title: string;
		description?: string;
		actions?: Snippet;
		meta?: Snippet;
	}

	let { eyebrow, title, description, actions, meta }: Props = $props();
</script>

<section
	data-admin-page-header
	class="-mx-4 mb-6 overflow-hidden rounded-b-[22px] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-lakebed-950)_96%,white),color-mix(in_srgb,var(--color-lakebed-800)_80%,white))] text-white sm:-mx-6"
>
	<div class="grid gap-6 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
		<div class="space-y-3">
			{#if eyebrow}
				<p class="text-[11px] font-bold tracking-[0.16em] text-white/75 uppercase">{eyebrow}</p>
			{/if}
			<div class="space-y-2">
				<h1 class="font-display text-3xl leading-tight font-bold sm:text-[2.4rem]">{title}</h1>
				{#if description}
					<p class="max-w-3xl text-sm leading-6 text-white/88 sm:text-[15px]">{description}</p>
				{/if}
			</div>
		</div>

		{#if actions}
			<div class="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
				{@render actions()}
			</div>
		{/if}
	</div>

	{#if meta}
		<div
			class="border-t border-white/12 bg-[color:color-mix(in_srgb,var(--color-lakebed-950)_72%,transparent)] px-5 py-3 sm:px-6"
		>
			<div class="flex flex-wrap gap-3 text-sm text-white/88">
				{@render meta()}
			</div>
		</div>
	{/if}
</section>
