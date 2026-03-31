<script lang="ts">
	import type { ToolboxItem } from '$lib/data/kb';

	let { data } = $props();
	let item = $derived(data.item as ToolboxItem | null);
	const isPdf = $derived(!!item?.externalUrl && /\.pdf$/i.test(item.externalUrl));
</script>

{#if !item}
	<div class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
		<p class="text-[var(--muted-foreground)]">This section is being updated. No listing found.</p>
		<a href="/toolbox" class="text-[var(--teal)] underline hover:no-underline">Back to Toolbox</a>
	</div>
{:else}
<div class="max-w-4xl mx-auto px-6 py-8">
	<nav class="flex items-center gap-2 text-sm text-[var(--muted-foreground)] mb-6 flex-wrap">
		<a href="/toolbox" class="hover:text-[var(--foreground)] hover:underline">Toolbox</a>
		<span>›</span>
		<span class="text-[var(--foreground)]">{item.title}</span>
	</nav>

	<header class="mb-6">
		<div class="flex flex-wrap gap-[5px] mb-2">
			{#if item.mediaType}
				<span class="text-[11px] font-semibold px-2 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">{item.mediaType}</span>
			{/if}
			{#if item.category}
				<span class="text-[11px] font-semibold px-2 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">{item.category}</span>
			{/if}
		</div>
		<h1 class="font-serif text-3xl font-bold text-[var(--dark)] mb-2">{item.title}</h1>
		{#if item.sourceName}
			<p class="text-sm text-[var(--muted-foreground)]">{item.sourceName}</p>
		{/if}
	</header>

	{#if isPdf}
		<div class="mb-6">
			<iframe
				title="PDF: {item.title}"
				class="w-full border border-[var(--border)] rounded min-h-[600px]"
				src="{item.externalUrl}#toolbar=1"
			></iframe>
			<p class="text-sm text-[var(--muted-foreground)] mt-2">Can't see the document? <a href={item.externalUrl} target="_blank" rel="noopener" class="underline">Open PDF in new tab</a>.</p>
		</div>
	{/if}

	<div class="grid gap-8 lg:grid-cols-[1fr_280px] items-start">
		<div class="min-w-0">
			<h2 class="text-lg font-semibold text-[var(--muted-foreground)] mb-3">About this resource</h2>
			{#if item.description}
				<div class="max-w-[65ch] leading-relaxed prose prose-sm">{@html item.description}</div>
			{/if}
			{#if !isPdf && item.externalUrl}
				<a href={item.externalUrl} target="_blank" rel="noopener" class="inline-block mt-4 text-sm text-[var(--teal)] underline hover:no-underline">Open resource →</a>
			{/if}
		</div>
		<aside class="flex flex-col gap-3">
			<h3 class="font-sans text-xs font-bold tracking-[0.1em] uppercase text-[var(--muted-foreground)] pb-3 border-b border-[var(--rule)]">Details</h3>
			<dl class="flex flex-col gap-2 text-sm">
				{#if item.sourceName}
					<dt class="font-semibold text-[var(--muted-foreground)] text-[11px] uppercase tracking-[0.06em]">Source</dt>
					<dd class="text-[var(--foreground)] mt-0">{item.sourceName}</dd>
				{/if}
				{#if item.mediaType}
					<dt class="font-semibold text-[var(--muted-foreground)] text-[11px] uppercase tracking-[0.06em]">Media type</dt>
					<dd class="text-[var(--foreground)] mt-0">{item.mediaType}</dd>
				{/if}
				{#if item.category}
					<dt class="font-semibold text-[var(--muted-foreground)] text-[11px] uppercase tracking-[0.06em]">Category</dt>
					<dd class="text-[var(--foreground)] mt-0">{item.category}</dd>
				{/if}
			</dl>
			<a href="/toolbox" class="inline-block mt-2 text-sm text-[var(--muted-foreground)] underline hover:text-[var(--foreground)]">← Back to Toolbox</a>
		</aside>
	</div>
</div>
{/if}
