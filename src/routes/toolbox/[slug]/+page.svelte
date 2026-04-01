<script lang="ts">
	import type { ToolboxItem } from '$lib/data/kb';
	import { stripHtml } from '$lib/utils/format';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import DownloadIcon from '@lucide/svelte/icons/download';

	let { data } = $props();
	let item = $derived(data.item as ToolboxItem | null);
	const origin = $derived(data.origin ?? '');

	const canonicalUrl = $derived(item?.slug ? `${origin}/toolbox/${item.slug}` : `${origin}/toolbox`);
	const metaDescription = $derived(
		item
			? (item.description
				? stripHtml(String(item.description)).slice(0, 160)
				: `${item.title}${item.sourceName ? ` from ${item.sourceName}` : ''}${item.category ? `. ${item.category}` : ''}.`)
			: ''
	);

	const isPdf = $derived(!!item?.externalUrl && /\.pdf$/i.test(item.externalUrl));
	const isFile = $derived(item?.contentMode === 'file');
	const isHosted = $derived(item?.contentMode === 'hosted');

	const primaryUrl = $derived(isFile ? (item?.fileUrl ?? item?.externalUrl) : item?.externalUrl);
</script>

<svelte:head>
	<title>{item ? `${item.title} | Toolbox | Knowledge Basket` : 'Resource not found | Knowledge Basket'}</title>
	{#if item}
		<meta name="description" content={metaDescription} />
		<link rel="canonical" href={canonicalUrl} />
		<meta property="og:title" content={item.title} />
		<meta property="og:description" content={metaDescription} />
		{#if item.imageUrl}<meta property="og:image" content={item.imageUrl} />{/if}
		<meta property="og:url" content={canonicalUrl} />
		<meta property="og:type" content="website" />
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:title" content={item.title} />
		<meta name="twitter:description" content={metaDescription} />
		{#if item.imageUrl}<meta name="twitter:image" content={item.imageUrl} />{/if}
	{/if}
</svelte:head>

{#if !item}
	<div class="mx-auto max-w-3xl px-4 py-12 sm:px-6">
		<p class="text-[var(--muted-foreground)]">This resource is no longer available.</p>
		<Button variant="outline" href="/toolbox" class="mt-4">← Back to Toolbox</Button>
	</div>
{:else}
<div class="mx-auto max-w-3xl px-4 py-6 sm:px-6">

	<Breadcrumb.Root class="mb-5">
		<Breadcrumb.List>
			<Breadcrumb.Item>
				<Breadcrumb.Link href="/toolbox">Toolbox</Breadcrumb.Link>
			</Breadcrumb.Item>
			<Breadcrumb.Separator />
			<Breadcrumb.Item>
				<Breadcrumb.Page>{item.title}</Breadcrumb.Page>
			</Breadcrumb.Item>
		</Breadcrumb.List>
	</Breadcrumb.Root>

	<!-- Header -->
	<header class="mb-6">
		<div class="flex flex-wrap gap-1.5 mb-3">
			{#if item.mediaType}
				<span class="inline-block px-2.5 py-0.5 text-[11px] font-semibold rounded bg-[var(--color-lakebed-100)] text-[var(--color-lakebed-800)]">{item.mediaType}</span>
			{/if}
			{#if item.resourceType && item.resourceType !== item.mediaType}
				<span class="inline-block px-2.5 py-0.5 text-[11px] font-semibold rounded bg-[var(--muted)] text-[var(--muted-foreground)]">{item.resourceType}</span>
			{/if}
			{#if item.category}
				<span class="inline-block px-2.5 py-0.5 text-[11px] font-semibold rounded bg-[var(--muted)] text-[var(--muted-foreground)]">{item.category}</span>
			{/if}
		</div>
		<h1 class="font-serif text-2xl font-bold text-[var(--foreground)] sm:text-3xl leading-tight mb-2">{item.title}</h1>
		{#if item.sourceName}
			<p class="text-sm text-[var(--muted-foreground)]">{item.sourceName}</p>
		{/if}
	</header>

	<!-- PDF embed -->
	{#if isPdf && item.externalUrl}
		<div class="mb-6">
			<iframe
				title="PDF: {item.title}"
				class="w-full border border-[var(--border)] rounded-lg min-h-[600px]"
				src="{item.externalUrl}#toolbar=1"
			></iframe>
			<p class="text-sm text-[var(--muted-foreground)] mt-2">
				Can't see the document?
				<a href={item.externalUrl} target="_blank" rel="noopener" class="text-[var(--teal)]">Open PDF in new tab</a>.
			</p>
		</div>
	{/if}

	<div class="grid gap-8 lg:grid-cols-[1fr_280px] items-start">
		<!-- Main content -->
		<div class="min-w-0">
			{#if item.description}
				<section class="kb-toolbox-section">
					<h2 class="kb-toolbox-section-title">About this resource</h2>
					<div class="prose prose-sm text-[var(--muted-foreground)] [&_a]:text-[var(--teal)] [&_a]:no-underline [&_a:hover]:underline">{@html item.description}</div>
				</section>
			{/if}

			{#if isHosted && item.body}
				<section class="kb-toolbox-section">
					<div class="prose prose-sm text-[var(--foreground)] [&_a]:text-[var(--teal)] [&_a]:no-underline [&_a:hover]:underline">{@html item.body}</div>
				</section>
			{/if}

			{#if !isPdf && primaryUrl}
				{#if isFile}
					<Button href={primaryUrl} download class="mt-2">
						<DownloadIcon class="size-4 mr-1.5" /> Download resource
					</Button>
				{:else}
					<Button href={primaryUrl} target="_blank" rel="noopener" class="mt-2">
						<ExternalLinkIcon class="size-4 mr-1.5" /> Open resource
					</Button>
				{/if}
			{/if}
		</div>

		<!-- Sidebar -->
		<aside class="flex flex-col gap-4">
			<div class="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
				<h3 class="font-sans text-xs font-bold tracking-[0.1em] uppercase text-[var(--muted-foreground)] pb-3 border-b border-[var(--rule)] mb-3">Details</h3>
				<dl class="flex flex-col gap-3 text-sm">
					{#if item.sourceName}
						<div>
							<dt class="font-semibold text-[var(--muted-foreground)] text-[11px] uppercase tracking-[0.06em]">Source</dt>
							<dd class="text-[var(--foreground)] mt-0.5">{item.sourceName}</dd>
						</div>
					{/if}
					{#if item.author}
						<div>
							<dt class="font-semibold text-[var(--muted-foreground)] text-[11px] uppercase tracking-[0.06em]">Author</dt>
							<dd class="text-[var(--foreground)] mt-0.5">{item.author}</dd>
						</div>
					{/if}
					{#if item.publishDate}
						<div>
							<dt class="font-semibold text-[var(--muted-foreground)] text-[11px] uppercase tracking-[0.06em]">Published</dt>
							<dd class="text-[var(--foreground)] mt-0.5">{item.publishDate}</dd>
						</div>
					{/if}
					{#if item.mediaType}
						<div>
							<dt class="font-semibold text-[var(--muted-foreground)] text-[11px] uppercase tracking-[0.06em]">Media type</dt>
							<dd class="text-[var(--foreground)] mt-0.5">{item.mediaType}</dd>
						</div>
					{/if}
					{#if item.category}
						<div>
							<dt class="font-semibold text-[var(--muted-foreground)] text-[11px] uppercase tracking-[0.06em]">Category</dt>
							<dd class="text-[var(--foreground)] mt-0.5">{item.category}</dd>
						</div>
					{/if}
				</dl>
			</div>

			<Button variant="outline" href="/toolbox" class="w-full">← Back to Toolbox</Button>
		</aside>
	</div>
</div>
{/if}

<style>
	.kb-toolbox-section {
		margin-bottom: 1.75rem;
	}
	.kb-toolbox-section-title {
		font-family: var(--font-serif);
		font-size: 1.0625rem;
		font-weight: 600;
		margin: 0 0 0.625rem 0;
		color: var(--foreground);
	}
</style>
