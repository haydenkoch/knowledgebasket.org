<script lang="ts">
	import type { ToolboxItem } from '$lib/data/kb';
	import { stripHtml } from '$lib/utils/format';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import CoilDetailActionRail from '$lib/components/organisms/CoilDetailActionRail.svelte';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import SourceProvenanceCard from '$lib/components/public/source-provenance-card.svelte';

	let { data } = $props();
	let item = $derived(data.item as ToolboxItem | null);
	const origin = $derived(data.origin ?? '');
	const isBookmarked = $derived(Boolean(data.isBookmarked));
	const fileUrl = $derived(item?.fileUrl ?? null);
	const externalUrl = $derived(item?.externalUrl ?? null);
	const loginHref = $derived(
		item?.slug
			? `/auth/login?redirect=${encodeURIComponent(`/toolbox/${item.slug}`)}`
			: '/auth/login?redirect=%2Ftoolbox'
	);

	const canonicalUrl = $derived(
		item?.slug ? `${origin}/toolbox/${item.slug}` : `${origin}/toolbox`
	);
	const metaDescription = $derived(
		item
			? item.description
				? stripHtml(String(item.description)).slice(0, 160)
				: `${item.title}${item.sourceName ? ` from ${item.sourceName}` : ''}${item.category ? `. ${item.category}` : ''}.`
			: ''
	);

	const isFile = $derived(item?.contentMode === 'file');
	const isHosted = $derived(item?.contentMode === 'hosted');
	const previewUrl = $derived.by(() => {
		if (fileUrl && /\.pdf(?:$|[?#])/i.test(fileUrl)) return fileUrl;
		if (item?.slug && externalUrl && /\.pdf(?:$|[?#])/i.test(externalUrl)) {
			return `/toolbox/${item.slug}/preview`;
		}
		return null;
	});
	const hasPdfPreview = $derived(Boolean(previewUrl));

	const primaryUrl = $derived(isFile ? (fileUrl ?? externalUrl) : externalUrl);
</script>

<svelte:head>
	<title
		>{item
			? `${item.title} | Toolbox | Knowledge Basket`
			: 'Resource not found | Knowledge Basket'}</title
	>
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
		<Button variant="outline" href="/toolbox" class="mt-4"
			><ArrowLeft class="inline h-4 w-4" /> Back to Toolbox</Button
		>
	</div>
{:else}
	<div class="kb-tb-wrap">
		<!-- Hero: PDF preview IS the hero when one exists; gradient fallback otherwise -->
		{#if hasPdfPreview && previewUrl}
			<div class="kb-tb-hero kb-tb-hero--pdf">
				<div class="kb-tb-hero-head">
					<div class="kb-tb-hero-badges">
						{#if item.mediaType}
							<span class="kb-tb-hero-badge kb-tb-hero-badge--accent">{item.mediaType}</span>
						{/if}
						{#if item.resourceType && item.resourceType !== item.mediaType}
							<span class="kb-tb-hero-badge">{item.resourceType}</span>
						{/if}
						{#if item.category}
							<span class="kb-tb-hero-badge">{item.category}</span>
						{/if}
					</div>
					<h1 class="kb-tb-hero-title">{item.title}</h1>
					{#if item.sourceName}
						<p class="kb-tb-hero-source">{item.sourceName}</p>
					{/if}
				</div>
				<div class="kb-tb-hero-frame">
					<iframe
						title="PDF: {item.title}"
						class="kb-tb-hero-iframe"
						src={`${previewUrl}#toolbar=1`}
					></iframe>
				</div>
			</div>
		{:else}
			<div class="kb-tb-hero kb-tb-hero--gradient">
				<div class="kb-tb-hero-icon" aria-hidden="true">
					<FileTextIcon class="size-10" />
				</div>
				<div class="kb-tb-hero-head">
					<div class="kb-tb-hero-badges">
						{#if item.mediaType}
							<span class="kb-tb-hero-badge kb-tb-hero-badge--accent">{item.mediaType}</span>
						{/if}
						{#if item.resourceType && item.resourceType !== item.mediaType}
							<span class="kb-tb-hero-badge">{item.resourceType}</span>
						{/if}
						{#if item.category}
							<span class="kb-tb-hero-badge">{item.category}</span>
						{/if}
					</div>
					<h1 class="kb-tb-hero-title">{item.title}</h1>
					{#if item.sourceName}
						<p class="kb-tb-hero-source">{item.sourceName}</p>
					{/if}
				</div>
			</div>
		{/if}

		<CoilDetailActionRail
			isAuthed={!!data.user}
			{isBookmarked}
			{loginHref}
			saveLabel="resource"
			accent="var(--color-lakebed-700, #1a3a66)"
		>
			{#snippet breadcrumb()}
				<Breadcrumb.Root>
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
			{/snippet}
			{#snippet meta()}
				{#if item.author}
					<span class="kb-tb-meta-author">By {item.author}</span>
				{/if}
				{#if item.publishDate}
					{#if item.author}<span class="kb-tb-meta-dot" aria-hidden="true">·</span>{/if}
					<span class="kb-tb-meta-date">{item.publishDate}</span>
				{/if}
			{/snippet}
			{#snippet primary()}
				{#if hasPdfPreview && (primaryUrl ?? previewUrl)}
					<a
						href={primaryUrl ?? previewUrl!}
						target="_blank"
						rel="noopener"
						class="kb-tb-primary-btn"
					>
						Open PDF <ExternalLinkIcon class="size-[14px]" />
					</a>
				{:else if primaryUrl}
					{#if isFile}
						<a href={primaryUrl} download class="kb-tb-primary-btn">
							<DownloadIcon class="size-[14px]" /> Download
						</a>
					{:else}
						<a href={primaryUrl} target="_blank" rel="noopener" class="kb-tb-primary-btn">
							Open resource <ExternalLinkIcon class="size-[14px]" />
						</a>
					{/if}
				{/if}
			{/snippet}
		</CoilDetailActionRail>

		<div class="kb-tb-grid">
			<!-- Main content -->
			<div class="min-w-0">
				{#if item.description}
					<section class="kb-toolbox-section">
						<h2 class="kb-toolbox-section-title">About this resource</h2>
						<div
							class="prose prose-sm text-[var(--muted-foreground)] [&_a]:text-[var(--teal)] [&_a]:no-underline [&_a:hover]:underline"
						>
							{@html item.description}
						</div>
					</section>
				{/if}

				{#if isHosted && item.body}
					<section class="kb-toolbox-section">
						<div
							class="prose prose-sm text-[var(--foreground)] [&_a]:text-[var(--teal)] [&_a]:no-underline [&_a:hover]:underline"
						>
							{@html item.body}
						</div>
					</section>
				{/if}

				{#if !hasPdfPreview && primaryUrl}
					{#if isFile}
						<Button href={primaryUrl} download class="mt-2">
							<DownloadIcon class="mr-1.5 size-4" /> Download resource
						</Button>
					{:else}
						<Button href={primaryUrl} target="_blank" rel="noopener" class="mt-2">
							<ExternalLinkIcon class="mr-1.5 size-4" /> Open resource
						</Button>
					{/if}
				{/if}
			</div>

			<!-- Sidebar -->
			<aside class="flex flex-col gap-4">
				<div class="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
					<h3
						class="mb-3 border-b border-[var(--rule)] pb-3 font-sans text-xs font-bold tracking-[0.1em] text-[var(--muted-foreground)] uppercase"
					>
						Details
					</h3>
					<dl class="flex flex-col gap-3 text-sm">
						{#if item.sourceName}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Source
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{item.sourceName}</dd>
							</div>
						{/if}
						{#if item.author}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Author
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{item.author}</dd>
							</div>
						{/if}
						{#if item.publishDate}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Published
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{item.publishDate}</dd>
							</div>
						{/if}
						{#if item.mediaType}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Media type
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{item.mediaType}</dd>
							</div>
						{/if}
						{#if item.category}
							<div>
								<dt
									class="text-[11px] font-semibold tracking-[0.06em] text-[var(--muted-foreground)] uppercase"
								>
									Category
								</dt>
								<dd class="mt-0.5 text-[var(--foreground)]">{item.category}</dd>
							</div>
						{/if}
					</dl>
				</div>
				<SourceProvenanceCard provenance={item.provenance} />

				<Button variant="outline" href="/toolbox" class="w-full"
					><ArrowLeft class="inline h-4 w-4" /> Back to Toolbox</Button
				>
			</aside>
		</div>
	</div>
{/if}

<style>
	.kb-tb-wrap {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1.5rem 1.5rem 3rem;
	}
	.kb-tb-grid {
		display: grid;
		gap: 2rem;
		margin-top: 2rem;
		align-items: start;
	}
	@media (min-width: 1024px) {
		.kb-tb-grid {
			grid-template-columns: minmax(0, 1fr) 320px;
			gap: 2.5rem;
		}
	}
	.kb-tb-meta-author,
	.kb-tb-meta-date {
		font-weight: 600;
		color: var(--foreground);
		white-space: nowrap;
	}
	.kb-tb-meta-dot {
		opacity: 0.4;
	}
	.kb-tb-primary-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.55rem 1.1rem;
		border-radius: 999px;
		background: var(--color-lakebed-700, #1a3a66);
		color: white;
		font-weight: 600;
		font-size: 0.875rem;
		letter-spacing: 0.01em;
		text-decoration: none;
		white-space: nowrap;
		transition:
			opacity 0.15s ease,
			transform 0.15s ease,
			box-shadow 0.15s ease;
		box-shadow: 0 2px 8px rgba(26, 58, 102, 0.35);
	}
	.kb-tb-primary-btn:hover {
		opacity: 0.95;
		text-decoration: none;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(26, 58, 102, 0.45);
	}
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

	/* ── Hero ───────────────────────────────────────────── */
	.kb-tb-hero {
		position: relative;
		border-radius: 18px 18px 0 0;
		background: linear-gradient(
			135deg,
			var(--color-lakebed-900, #0c2540) 0%,
			var(--color-lakebed-950, #061526) 55%,
			var(--color-elderberry-950, #3f0d16) 100%
		);
		color: white;
		padding: 2.25rem 2rem 0;
		overflow: hidden;
		isolation: isolate;
	}
	@media (min-width: 1024px) {
		.kb-tb-hero {
			padding: 3rem 2.5rem 0;
		}
	}
	.kb-tb-hero--gradient {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		padding: 2.5rem 2rem;
	}
	@media (min-width: 1024px) {
		.kb-tb-hero--gradient {
			padding: 3rem 2.5rem;
		}
	}
	.kb-tb-hero-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 72px;
		height: 72px;
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.18);
		flex-shrink: 0;
		color: white;
	}
	.kb-tb-hero-head {
		min-width: 0;
	}
	.kb-tb-hero-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin-bottom: 0.625rem;
	}
	.kb-tb-hero-badge {
		display: inline-block;
		padding: 0.2rem 0.55rem;
		background: rgba(255, 255, 255, 0.14);
		border-radius: 4px;
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: white;
	}
	.kb-tb-hero-badge--accent {
		background: var(--color-flicker-500, #f97316);
		color: rgba(0, 0, 0, 0.85);
	}
	.kb-tb-hero-title {
		font-family: var(--font-display, var(--font-serif));
		font-size: clamp(1.625rem, 4.25vw, 2.75rem);
		font-weight: 700;
		line-height: 1.05;
		letter-spacing: -0.01em;
		margin: 0 0 0.5rem 0;
		color: white;
	}
	.kb-tb-hero-source {
		font-family: var(--font-serif);
		font-style: italic;
		font-size: 1rem;
		opacity: 0.88;
		margin: 0;
	}
	.kb-tb-hero--pdf .kb-tb-hero-head {
		padding-bottom: 1.5rem;
	}
	.kb-tb-hero-frame {
		position: relative;
		margin: 0 -2rem;
		padding: 1.25rem 2rem 1.5rem;
		background: rgba(0, 0, 0, 0.32);
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}
	@media (min-width: 1024px) {
		.kb-tb-hero-frame {
			margin: 0 -2.5rem;
			padding: 1.5rem 2.5rem 1.75rem;
		}
	}
	.kb-tb-hero-iframe {
		display: block;
		width: 100%;
		min-height: 720px;
		border: 0;
		border-radius: 10px;
		background: white;
		box-shadow: 0 14px 40px rgba(0, 0, 0, 0.4);
	}
	@media (max-width: 640px) {
		.kb-tb-hero-iframe {
			min-height: 460px;
		}
		.kb-tb-hero--gradient {
			flex-direction: column;
			align-items: flex-start;
			padding: 1.75rem;
		}
	}
</style>
