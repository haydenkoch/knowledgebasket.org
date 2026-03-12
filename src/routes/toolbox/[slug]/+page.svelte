<script lang="ts">
	import type { ToolboxItem } from '$lib/data/kb';

	let { data } = $props();
	let item = $derived(data.item as ToolboxItem | null);
	const isPdf = $derived(!!item?.url && /\.pdf$/i.test(item.url));
</script>

{#if !item}
	<div class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
		<p class="text-[var(--color-kb-slate)]">This section is being updated. No listing found.</p>
		<a href="/toolbox" class="text-[var(--color-kb-teal)] underline hover:no-underline">Back to Toolbox</a>
	</div>
{:else}
<div class="kb-library-detail">
	<nav class="kb-library-breadcrumb">
		<a href="/toolbox">Toolbox</a>
		<span>›</span>
		<span>{item.title}</span>
	</nav>

	<header class="kb-library-header">
		<div class="kb-library-meta">
			{#if item.mediaType}
				<span class="kb-library-tag">{item.mediaType}</span>
			{/if}
			{#if item.category}
				<span class="kb-library-tag">{item.category}</span>
			{/if}
		</div>
		<h1 class="kb-library-title">{item.title}</h1>
		{#if item.source}
			<p class="kb-library-source">{item.source}</p>
		{/if}
	</header>

	{#if isPdf}
		<div class="kb-pdf-viewer-wrap">
			<iframe
				title="PDF: {item.title}"
				class="kb-pdf-viewer"
				src="{item.url}#toolbar=1"
			></iframe>
			<p class="kb-pdf-hint">Can’t see the document? <a href={item.url} target="_blank" rel="noopener">Open PDF in new tab</a>.</p>
		</div>
	{/if}

	<div class="kb-library-content">
		<div class="kb-library-main">
			<h2 class="kb-library-heading">About this resource</h2>
			{#if item.description}
				<div class="kb-detail-description">{@html item.description}</div>
			{/if}
			{#if !isPdf && item.url}
				<a href={item.url} target="_blank" rel="noopener" class="kb-library-external">Open resource →</a>
			{/if}
		</div>
		<aside class="kb-library-sidebar">
			<h3 class="kb-library-sidebar-title">Details</h3>
			<dl class="kb-library-dl">
				{#if item.source}
					<dt>Source</dt>
					<dd>{item.source}</dd>
				{/if}
				{#if item.mediaType}
					<dt>Media type</dt>
					<dd>{item.mediaType}</dd>
				{/if}
				{#if item.category}
					<dt>Category</dt>
					<dd>{item.category}</dd>
				{/if}
			</dl>
			<a href="/toolbox" class="kb-library-back">← Back to Toolbox</a>
		</aside>
	</div>
</div>
{/if}
