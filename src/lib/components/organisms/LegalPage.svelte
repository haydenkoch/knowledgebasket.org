<script lang="ts">
	import type { Snippet } from 'svelte';
	import { LEGAL_LAST_UPDATED_DATE } from '$lib/legal/config';

	interface Props {
		eyebrow?: string;
		title: string;
		description: string;
		lastUpdated?: string;
		children?: Snippet;
	}

	let {
		eyebrow = 'Legal',
		title,
		description,
		lastUpdated = LEGAL_LAST_UPDATED_DATE,
		children
	}: Props = $props();
</script>

<section class="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
	<header class="max-w-3xl space-y-4">
		<p class="text-sm font-semibold tracking-[0.18em] text-muted-foreground uppercase">{eyebrow}</p>
		<h1 class="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{title}</h1>
		<p class="text-lg leading-8 text-muted-foreground">{description}</p>
		<p class="text-sm text-muted-foreground">Last updated {lastUpdated}</p>
	</header>

	<div
		class="prose prose-slate prose-headings:scroll-mt-24 prose-headings:font-semibold prose-p:text-foreground/90 prose-li:text-foreground/90 max-w-none"
	>
		{@render children?.()}
	</div>
</section>
